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
        status: res.ok ? "green" : "red",
        latency,
        statusCode: res.status,
        attempts: attempt + 1,
        totalTime: Date.now() - startTotal
      };
    } catch (err) {
      lastError = err;
    }
  }

  // if all retries fail
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
// VALIDATE URL
// ─────────────────────────────────────────────

function normalizeUrl(url) {
  if (!url) return null;

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
// API ROUTE
// ─────────────────────────────────────────────

app.get("/check", async (req, res) => {
  let { url } = req.query;

  url = normalizeUrl(url);

  if (!url) {
    return res.status(400).json({
      error: "Invalid or missing URL"
    });
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
// HEALTH CHECK ENDPOINT (important for scaling later)
// ─────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime()
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`UptimeMetricPro server running on port ${PORT}`);
});