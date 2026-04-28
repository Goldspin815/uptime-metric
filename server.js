const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const TIMEOUT_MS = 8000;
const RETRIES = 2;

// ─────────────────────────────────────────────
// RATE LIMITING (prevent abuse)
// ─────────────────────────────────────────────

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 requests per IP per minute

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > RATE_LIMIT_MAX;
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ─────────────────────────────────────────────
// SSRF PROTECTION — block internal/private URLs
// ─────────────────────────────────────────────

function isBlockedUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block non-http(s) protocols
    if (!["http:", "https:"].includes(parsed.protocol)) return true;

    // Block localhost and loopback
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    ) return true;

    // Block private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,   // link-local
      /^fc00:/,        // IPv6 private
      /^fe80:/,        // IPv6 link-local
    ];

    for (const range of privateRanges) {
      if (range.test(hostname)) return true;
    }

    // Block metadata endpoints (AWS, GCP, Azure)
    if (
      hostname === "169.254.169.254" ||
      hostname === "metadata.google.internal"
    ) return true;

    return false;
  } catch {
    return true;
  }
}

// ─────────────────────────────────────────────
// VALIDATE AND NORMALIZE URL
// ─────────────────────────────────────────────

function normalizeUrl(url) {
  if (!url || typeof url !== "string") return null;

  // Trim and limit length
  url = url.trim().slice(0, 500);

  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    return new URL(url).toString();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// SAFE FETCH WITH TIMEOUT
// ─────────────────────────────────────────────

async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "UptimeMetricPro-Bot/1.0"
      }
    });

    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────
// CORE CHECK LOGIC (WITH RETRIES)
// ─────────────────────────────────────────────

async function checkSite(url) {
  let lastError = null;
  const startTotal = Date.now();

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const start = Date.now();
      const res = await fetchWithTimeout(url, TIMEOUT_MS);
      const latency = Date.now() - start;

      return {
        status: res.ok ? "green" : res.status >= 500 ? "red" : "yellow",
        latency,
        statusCode: res.status,
        attempts: attempt + 1,
        totalTime: Date.now() - startTotal
      };
    } catch (err) {
      lastError = err;
    }
  }

  return {
    status: "red",
    latency: null,
    statusCode: "down",
    error: lastError?.name || "RequestFailed",
    attempts: RETRIES + 1,
    totalTime: Date.now() - startTotal
  };
}

// ─────────────────────────────────────────────
// API ROUTE — /check
// ─────────────────────────────────────────────

app.get("/check", async (req, res) => {
  // Rate limiting
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Too many requests. Please wait a moment before trying again."
    });
  }

  // Validate URL
  const url = normalizeUrl(req.query.url);
  if (!url) {
    return res.status(400).json({ error: "Invalid or missing URL" });
  }

  // Block internal/private URLs
  if (isBlockedUrl(url)) {
    return res.status(400).json({ error: "URL not permitted" });
  }

  try {
    const result = await checkSite(url);
    res.json({
      url,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "red",
      error: "InternalServerError",
      message: err.message
    });
  }
});

// ─────────────────────────────────────────────
// HEALTH CHECK ENDPOINT
// ─────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`UptimeMetricPro server running on port ${PORT}`);
});