export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const target = req.query.url;

  if (!target) {
    return res.status(400).json({ error: "No URL provided" });
  }

  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "UptimeMetricPro-Bot/1.0",
      },
    });

    clearTimeout(timeout);

    const latency = Date.now() - start;
    const statusCode = response.ok ? "green" : response.status >= 500 ? "red" : "yellow";

    return res.status(200).json({
      statusCode,
      latency,
      uptime: (response.ok ? 99.9 : 95).toFixed(2),
      incidents: response.ok ? 0 : 1,
    });
  } catch (err) {
    return res.status(200).json({
      statusCode: "red",
      latency: 0,
      uptime: "0.00",
      incidents: 1,
    });
  }
}