import fs from "fs";
import path from "path";

function searchFiles(dir, query, relativePath = "") {
    let results = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const itemPath = path.join(relativePath, item);

        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(searchFiles(fullPath, query, itemPath));
        } else if (item.toLowerCase().includes(query.toLowerCase())) {
            results.push({ name: item, path: itemPath });
        }
    });

    return results;
}

export default function handler(req, res) {
    const { category, query } = req.query;

    if (!category || !query) return res.status(400).json({ error: "Missing parameters" });

    const baseDir = path.join(process.cwd(), "Media", category);
    if (!fs.existsSync(baseDir)) return res.status(404).json({ error: "Category not found" });

    const results = searchFiles(baseDir, query);
    res.status(200).json(results);
}