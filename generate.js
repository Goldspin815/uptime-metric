const fs = require("fs");
const path = require("path");

// Load data
const dataPath = path.join(__dirname, "data", "seo_950_pages.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// Output folder
const outputDir = path.join(__dirname, "status");

// Ensure output folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Base domain (CHANGE THIS to your real domain)
const DOMAIN = "https://uptimemetricpro.com";

// Simple HTML template (SEO optimized but clean)
function template(page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${page.title}</title>
  <meta name="description" content="${page.description}" />

  <link rel="canonical" href="${DOMAIN}/status/${page.slug}.html" />

  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${DOMAIN}/status/${page.slug}.html" />

  <meta name="robots" content="index, follow" />

  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      line-height: 1.6;
      padding: 0 20px;
    }
    h1 { font-size: 28px; }
    .status { font-weight: bold; color: green; }
  </style>
</head>

<body>
  <h1>${page.title}</h1>
  <p class="status">${page.status || "Status: Operational"}</p>

  <p>${page.content}</p>

  <hr />
  <p><small>Last updated: ${page.updated || "Today"}</small></p>
</body>
</html>`;
}

// Track sitemap URLs
let urls = [];

// Generate pages
data.pages.forEach(page => {
  const filePath = path.join(outputDir, `${page.slug}.html`);
  const html = template(page);

  fs.writeFileSync(filePath, html, "utf-8");

  urls.push(`${DOMAIN}/status/${page.slug}.html`);
});

// Generate sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(url => {
    return `
  <url>
    <loc>${url}</loc>
  </url>`;
  })
  .join("")}
</urlset>`;

fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemap, "utf-8");

console.log("✅ All pages generated successfully!");
console.log("✅ Sitemap generated!");
