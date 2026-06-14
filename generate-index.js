import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mediaDir = path.join(__dirname, 'public', 'Media');
const outputFile = path.join(__dirname, 'files-index.json');

function getRealSize(fullPath, statSize) {
    // If it's small, it might be a Git LFS pointer
    if (statSize > 0 && statSize < 500) {
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('https://git-lfs.github.com/spec/')) {
                const match = content.match(/size\s+(\d+)/);
                if (match) {
                    return parseInt(match[1], 10);
                }
            }
        } catch (e) {}
    }
    return statSize;
}

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
            const realSize = getRealSize(fullPath, stats.size);
            results.push({
                name: item,
                path: relPath,
                size: realSize
            });
        }
    });
    return results;
}

console.log("Generating files-index.json...");
const allFiles = getFilesRecursive(mediaDir, mediaDir);
fs.writeFileSync(outputFile, JSON.stringify(allFiles, null, 2));
console.log(`Index generated with ${allFiles.length} files.`);
