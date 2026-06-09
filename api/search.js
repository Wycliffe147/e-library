import fs from "fs";
import path from "path";

function getRealSize(fullPath) {
    const stats = fs.statSync(fullPath);
    let size = stats.size;

    if (size > 0 && size < 500) {
        try {
            const content = fs.readFileSync(fullPath, "utf8");
            if (content.startsWith("version https://git-lfs.github.com/spec/v0")) {
                const match = content.match(/size\s+(\d+)/);
                if (match) {
                    return parseInt(match[1], 10);
                }
            }
        } catch (e) {}
    }
    return size;
}

function searchFiles(dir, query, relativePath = "") {
    let results = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const itemPath = relativePath ? path.join(relativePath, item) : item;

        if (fs.statSync(fullPath).isDirectory()) {
            results = results.concat(searchFiles(fullPath, query, itemPath));
        } else if (item.toLowerCase().includes(query.toLowerCase())) {
            const size = getRealSize(fullPath);
            results.push({ name: item, path: itemPath, size });
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
        path: `${prefix}/${r.path}`,
        size: r.size
    }));

    res.status(200).json(results);
}
