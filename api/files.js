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

function getRealSize(fullPath) {
    const stats = fs.statSync(fullPath);
    let size = stats.size;

    // If it's small, it might be a Git LFS pointer
    if (size > 0 && size < 500) {
        try {
            const content = fs.readFileSync(fullPath, "utf8");
            if (content.startsWith("version https://git-lfs.github.com/spec/v0")) {
                const match = content.match(/size\s+(\d+)/);
                if (match) {
                    return parseInt(match[1], 10);
                }
            }
        } catch (e) {
            // Not a text file or other error, just use the stat size
        }
    }
    return size;
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
            const size = getRealSize(fullPath);
            files.push({ name: item, size });
        }
    });

    res.status(200).json({ folders, files });
}
