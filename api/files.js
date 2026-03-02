import fs from "fs";
import path from "path";

export default function handler(req, res) {
    const { category, subpath = "" } = req.query;

    if (!category) {
        return res.status(400).json({ error: "Category required" });
    }

    const baseDir = path.join(process.cwd(), "Media", category);
    const targetDir = path.join(baseDir, subpath);

    if (!fs.existsSync(targetDir)) {
        return res.status(404).json({ error: "Folder not found" });
    }

    const items = fs.readdirSync(targetDir);

    const folders = [];
    const files = [];

    items.forEach(item => {
        const fullPath = path.join(targetDir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            folders.push(item);
        } else {
            files.push(item);
        }
    });

    res.status(200).json({ folders, files });
}