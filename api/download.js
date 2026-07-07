import fs from 'fs';
import path from 'path';

const indexPath = path.join(process.cwd(), 'files-index.json');

// Cache the index in module scope so it's only read once per cold start,
// not on every request. On Vercel, a warm function instance reuses this.
let _indexCache = null;

function getIndex() {
    if (!_indexCache) {
        if (!fs.existsSync(indexPath)) {
            _indexCache = [];
        } else {
            _indexCache = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        }
    }
    return _indexCache;
}

// Given a relative file path, return which media repo it belongs to.
// Falls back to 'e-library-media' for any entry that pre-dates the
// multi-repo sharding (i.e. entries without a `repo` field).
function repoForFile(filePath) {
    const index = getIndex();
    const entry = index.find(f => f.path === filePath);
    return entry?.repo ?? 'e-library-media';
}

const MEDIA_USER = 'Wycliffe147';
const MEDIA_BRANCH = 'main';

export default async function handler(req, res) {
    const { file } = req.query;

    if (!file) {
        return res.status(400).send('File parameter required');
    }

    const cleanPath = file.split('/')
        .map(part => encodeURIComponent(part))
        .join('/');

    // Look up which repo this file was indexed from, then redirect the user's
    // browser directly to GitHub's LFS CDN — no file data passes through
    // Vercel at all, so this costs ZERO Fast Origin Transfer bandwidth.
    const repo = repoForFile(file);
    const sourceUrl = `https://media.githubusercontent.com/media/${MEDIA_USER}/${repo}/${MEDIA_BRANCH}/${cleanPath}`;

    // 302 redirect: the browser follows this and downloads/renders the file
    // directly from GitHub's CDN servers.
    return res.redirect(302, sourceUrl);
}
