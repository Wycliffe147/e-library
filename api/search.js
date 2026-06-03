import fs from "fs";
import path from "path";

function searchFiles(dir, query, relativePath = "") {
    let results = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const itemPath = relativePath ? path.join(relativePath, item) : item;

        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(searchFiles(fullPath, query, itemPath));
        } else if (item.toLowerCase().includes(query.toLowerCase())) {
            results.push({ name: item, path: itemPath });
        }
    });

    return results;
}

export default function handler(req, res) {
    const { category, query, subpath = "" } = req.query;

    if (!category || !query) return res.status(400).json({ error: "Missing parameters" });

    const baseDir = path.join(process.cwd(), "Media", category);
    if (!fs.existsSync(baseDir)) return res.status(404).json({ error: "Category not found" });

    // Scope search to current folder if subpath provided
    const safePath = path.normalize(subpath).replace(/^(\.\.(\/|\\|$))+/, "");
    const searchDir = path.join(baseDir, safePath);

    if (!fs.existsSync(searchDir)) return res.status(404).json({ error: "Folder not found" });

    // Prefix results with category/subpath so download links work correctly
    const prefix = subpath ? `${category}/${subpath}` : category;
    const rawResults = searchFiles(searchDir, query);
    const results = rawResults.map(r => ({
        name: r.name,
        path: `${prefix}/${r.path}`
    }));

    res.status(200).json(results);
}
