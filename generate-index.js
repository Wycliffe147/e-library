import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mediaDir = path.join(__dirname, 'public', 'Media');
const outputFile = path.join(__dirname, 'files-index.json');

function getFilesRecursive(dir, baseDir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            results = results.concat(getFilesRecursive(fullPath, baseDir));
        } else {
            const relPath = path.relative(baseDir, fullPath);
            results.push({
                name: item,
                path: relPath,
                size: stats.size
            });
        }
    });
    return results;
}

console.log("Generating files-index.json...");
const allFiles = getFilesRecursive(mediaDir, mediaDir);
fs.writeFileSync(outputFile, JSON.stringify(allFiles, null, 2));
console.log(`Index generated with ${allFiles.length} files.`);
