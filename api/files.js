import fs from "fs";
import path from "path";

function countFilesRecursive(dir) {
    let count = 0;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            count += countFilesRecursive(fullPath);
        } else {
            count++;
        }
    });
    return count;
}

export default function handler(req, res) {
    const { category, subpath = "", count = "false" } = req.query;

    if (!category) return res.status(400).json({ error: "Category required" });

    const baseDir = path.join(process.cwd(), "Media", category);
    if (!fs.existsSync(baseDir)) return res.status(404).json({ error: "Category not found" });

    // ?count=true → just return total recursive file count for home cards
    if (count === "true") {
        const total = countFilesRecursive(baseDir);
        return res.status(200).json({ total });
    }

    const safePath = path.normalize(subpath).replace(/^(\.\.(\/|\\|$))+/, "");
    const targetDir = path.join(baseDir, safePath);

    if (!fs.existsSync(targetDir)) return res.status(404).json({ error: "Folder not found" });

    const items = fs.readdirSync(targetDir);
    const folders = [];
    const files = [];

    items.forEach(item => {
        const fullPath = path.join(targetDir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            const fileCount = countFilesRecursive(fullPath);
            folders.push({ name: item, count: fileCount });
        } else {
            files.push(item);
        }
    });

    res.status(200).json({ folders, files });
}
