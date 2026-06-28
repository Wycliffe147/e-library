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

const mimeTypes = {
    pdf:  'application/pdf',
    zip:  'application/zip',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    gif:  'image/gif',
    svg:  'image/svg+xml',
    txt:  'text/plain',
    html: 'text/html',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls:  'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt:  'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export default async function handler(req, res) {
    const { file, mode } = req.query;

    if (!file) {
        return res.status(400).send('File parameter required');
    }

    const ext = file.split('.').pop().toLowerCase();
    const cleanPath = file.split('/')
        .map(part => encodeURIComponent(part))
        .join('/');

    // Look up which repo this file was indexed from, then hit that repo's
    // LFS CDN directly — no token needed for public repos.
    const repo = repoForFile(file);
    const sourceUrl = `https://media.githubusercontent.com/media/${MEDIA_USER}/${repo}/${MEDIA_BRANCH}/${cleanPath}`;

    try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch file: ${response.statusText}`);
        }

        const contentType = mimeTypes[ext] || response.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Cache at Vercel's edge so repeat opens/downloads of the same file
        // don't re-cost Fast Origin Transfer on every request.
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

        if (mode === 'download') {
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.split('/').pop())}"`);
        } else {
            res.setHeader('Content-Disposition', 'inline');
        }

        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Error fetching file');
    }
}
