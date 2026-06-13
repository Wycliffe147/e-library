import fs from "fs";
import path from "path";

// Load the pre-generated index
const indexPath = path.join(process.cwd(), "files-index.json");

export default function handler(req, res) {
    const { category, subpath = "", count = "false", recursive = "false" } = req.query;

    if (!category) return res.status(400).json({ error: "Category required" });

    if (!fs.existsSync(indexPath)) {
        return res.status(500).json({ error: "Files index missing. Run generate-index.js" });
    }

    const allFiles = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    
    // Normalize path to category/subpath
    const normalizedRequestPath = path.join(category, subpath).replace(/\\/g, "/");

    // Filter files that belong to this category and subpath
    const filteredFiles = allFiles.filter(f => f.path.replace(/\\/g, "/").startsWith(normalizedRequestPath));

    if (count === "true") {
        return res.status(200).json({ total: filteredFiles.length });
    }

    if (recursive === "true") {
        return res.status(200).json({ 
            files: filteredFiles.map(f => f.path),
            filesWithInfo: filteredFiles 
        });
    }

    // For non-recursive view, we need to simulate a folder structure
    const folders = new Set();
    const files = [];

    // The current "folder" we are looking at
    const currentPath = normalizedRequestPath.endsWith("/") ? normalizedRequestPath : normalizedRequestPath + "/";

    filteredFiles.forEach(f => {
        const filePath = f.path.replace(/\\/g, "/");
        if (filePath === normalizedRequestPath) return; // Skip if it matches the folder itself (shouldn't happen)

        const relativeToCurrent = filePath.substring(currentPath.length);
        const parts = relativeToCurrent.split("/");

        if (parts.length > 1) {
            folders.add(parts[0]);
        } else {
            files.push({ name: f.name, size: f.size });
        }
    });

    const folderList = Array.from(folders).map(name => ({
        name,
        count: filteredFiles.filter(f => f.path.replace(/\\/g, "/").includes(`${currentPath}${name}/`)).length
    }));

    res.status(200).json({ folders: folderList, files });
}
