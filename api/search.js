import fs from "fs";
import path from "path";

// Load the pre-generated index
const indexPath = path.join(process.cwd(), "files-index.json");

export default function handler(req, res) {
    const { category, query, subpath = "" } = req.query;

    if (!category || !query) return res.status(400).json({ error: "Missing parameters" });

    if (!fs.existsSync(indexPath)) {
        return res.status(500).json({ error: "Files index missing" });
    }

    const allFiles = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const normalizedRequestPath = path.join(category, subpath).replace(/\\/g, "/");

    // Filter by path (starting with category/subpath) AND by search query
    const results = allFiles.filter(f => {
        const filePath = f.path.replace(/\\/g, "/");
        const matchesPath = filePath.startsWith(normalizedRequestPath);
        const matchesQuery = f.name.toLowerCase().includes(query.toLowerCase());
        return matchesPath && matchesQuery;
    });

    res.status(200).json(results);
}
