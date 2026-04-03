const fs = require("fs");
const path = require("path");

console.log("🚀 Script started...");

// SAFE LOAD JSON
let data = { pages: [] };
try {
  const raw = fs.readFileSync("./data/seo_950_pages.json", "utf-8");
  data = raw.trim() ? JSON.parse(raw) : { pages: [] };
} catch (e) {
  console.log("⚠️ JSON load failed, continuing with empty data");
}

if (!Array.isArray(data.pages)) data.pages = [];

console.log("📦 Loaded pages:", data.pages.length);

// HELPERS
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log("📁 Created folder:", dir);
  }
};

const cleanSlug = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// SIMPLE PAGE WRITER
const createPage = (filePath, name) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
<title>${name}</title>
<meta name="description" content="${name} status check">
<link rel="icon" href="/favicon.ico">
</head>
<body>
<h1>${name}</h1>
<p>Check status of ${name}.</p>
</body>
</html>
`;

  fs.writeFileSync(filePath, html);
};

// CONFIG
const TARGET = 5000;
const BRANDS = ["Slack","Discord","Spotify","Notion","YouTube","Instagram","TikTok","Zoom"];
const INTENTS = ["down","not working","status","outage"];

let pages = [];
let seen = new Set();

// CLEAN EXISTING
data.pages.forEach(p => {
  const name = (p.software_name || p.slug || "").trim();
  if (!name) return;

  const slug = cleanSlug(name);
  if (!slug || seen.has(slug)) return;

  seen.add(slug);
  pages.push({ name, slug });
});

// FILL TO 5000
let i = 0;
while (pages.length < TARGET) {
  const name = `${BRANDS[i % BRANDS.length]} ${INTENTS[Math.floor(i / BRANDS.length) % INTENTS.length]} ${i}`;
  const slug = cleanSlug(name);

  if (!seen.has(slug)) {
    seen.add(slug);
    pages.push({ name, slug });
  }
  i++;
}

console.log("🧠 Final pages:", pages.length);

// ENSURE OUTPUT FOLDERS
ensureDir("./public/status");
ensureDir("./public/down");
ensureDir("./public/fixes");

// GENERATE FILES
let count = 0;

pages.forEach(p => {
  createPage(`./public/status/${p.slug}.html`, p.name);
  createPage(`./public/down/${p.slug}.html`, p.name);
  createPage(`./public/fixes/${p.slug}-not-working.html`, p.name);
  count += 3;
});

// SITEMAP
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

pages.forEach(p => {
  sitemap += `<url><loc>https://yourdomain.com/status/${p.slug}.html</loc></url>`;
});

sitemap += `</urlset>`;

fs.writeFileSync("./public/sitemap.xml", sitemap);

// ✅ FIXED LINE (removed stray "s")
console.log(`✅ DONE: ${count} pages created`);