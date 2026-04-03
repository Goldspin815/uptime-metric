const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "data", "seo_950_pages.json");
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

data.pages = data.pages.map(page => {
  let cleanSlug = page.slug
    .toString()
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^status\//, "")
    .replace(/\//g, "-");

  return {
    ...page,
    slug: cleanSlug
  };
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log("✅ JSON cleaned successfully!");
