const fs = require("fs");
const path = require("path");

// Load data
const dataPath = path.join(__dirname, "data", "seo_950_pages.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// Output folder
const outputDir = path.join(__dirname, "public", "status");

// Ensure output folder exists
fs.mkdirSync(outputDir, { recursive: true });

// Base domain
const DOMAIN = "https://uptimemetricpro.com";

// HTML template
function template(page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${page.title}</title>
  <meta name="description" content="${page.description}" />

  <link rel="canonical" href="${DOMAIN}/status/${page.slug}.html" />

  <!-- FAVICONS -->
  <link rel="icon" href="/assets/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/assets/site.webmanifest">

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

// Track URLs for sitemap
let urls = [];

// Generate pages
data.pages.forEach(page => {

  let cleanSlug = page.slug
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^status\//, "")
    .replace(/\//g, "-");

  const filePath = path.join(outputDir, `${cleanSlug}.html`);

  const html = template({
    ...page,
    slug: cleanSlug
  });

  fs.writeFileSync(filePath, html, "utf-8");

  urls.push(`${DOMAIN}/status/${cleanSlug}.html`);
});

// Generate sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `
  <url>
    <loc>${url}</loc>
  </url>`).join("")}
</urlset>`;

fs.writeFileSync(
  path.join(__dirname, "public", "sitemap.xml"),
  sitemap,
  "utf-8"
);

console.log("✅ All pages generated successfully!");
console.log("✅ Sitemap generated!");
