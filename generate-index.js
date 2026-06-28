import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = path.join(__dirname, 'files-index.json');

const MEDIA_USER = 'Wycliffe147';
const MEDIA_REPO = 'e-library-media';
const MEDIA_BRANCH = 'main';

// Limits how many pointer-file fetches run at once, so we don't hammer
// raw.githubusercontent.com with 2000+ simultaneous requests.
const CONCURRENCY = 20;

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

// Git LFS pointer files look like:
//   version https://git-lfs.github.com/spec/v1
//   oid sha256:...
//   size 1399011
// Small text blobs (anything under a few hundred bytes) might be a pointer;
// fetch the raw content and pull the real size out of it. Anything that
// isn't a pointer (genuinely small files actually committed to the repo)
// just keeps its reported blob size.
async function getRealSize(blobSize, rawUrl) {
    if (blobSize > 0 && blobSize < 500) {
        try {
            const res = await fetch(rawUrl);
            if (res.ok) {
                const text = await res.text();
                if (text.includes('https://git-lfs.github.com/spec/')) {
                    const match = text.match(/size\s+(\d+)/);
                    if (match) {
                        return parseInt(match[1], 10);
                    }
                }
            }
        } catch (e) {
            // fall through to reported size if the fetch fails
        }
    }
    return blobSize;
}

async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (true) {
            const current = nextIndex++;
            if (current >= items.length) return;
            results[current] = await fn(items[current], current);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
    return results;
}

async function buildIndex() {
    console.log(`Fetching file tree from ${MEDIA_USER}/${MEDIA_REPO}@${MEDIA_BRANCH}...`);

    const treeUrl = `https://api.github.com/repos/${MEDIA_USER}/${MEDIA_REPO}/git/trees/${MEDIA_BRANCH}?recursive=1`;
    const tree = await fetchJson(treeUrl);

    if (tree.truncated) {
        console.warn('Warning: tree response was truncated by GitHub API; some files may be missing from the index.');
    }

    const blobs = (tree.tree || []).filter(item => item.type === 'blob' && item.path !== '.gitattributes');

    console.log(`Found ${blobs.length} files. Resolving real sizes for LFS pointers...`);

    const results = await mapWithConcurrency(blobs, CONCURRENCY, async (blob) => {
        const rawUrl = `https://raw.githubusercontent.com/${MEDIA_USER}/${MEDIA_REPO}/${MEDIA_BRANCH}/${blob.path}`;
        const realSize = await getRealSize(blob.size, rawUrl);
        return {
            name: path.basename(blob.path),
            path: blob.path,
            size: realSize
        };
    });

    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`Index generated with ${results.length} files.`);
}

buildIndex().catch(err => {
    console.error('Failed to generate files-index.json:', err);
    // Write an empty index rather than leaving a stale/missing file, so the
    // site degrades to "0 files" instead of crashing the build.
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
    process.exit(0);
});
