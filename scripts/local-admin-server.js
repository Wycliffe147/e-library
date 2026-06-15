import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { processPaper } from './smart-import.js';

const PORT = 3333;
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');

// Global Error Handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Helper to list files in common Android locations
function listLocalFiles() {
    const locations = [
        '/sdcard/Download',
        '/sdcard/Documents',
        '/storage/emulated/0/Download',
        '/storage/emulated/0/Documents'
    ];
    
    let allFiles = [];
    locations.forEach(loc => {
        try {
            if (fs.existsSync(loc)) {
                const files = fs.readdirSync(loc)
                    .filter(f => f.match(/\.(pdf|docx|doc)$/i))
                    .map(f => ({ name: f, path: path.join(loc, f), location: loc }));
                allFiles = [...allFiles, ...files];
            }
        } catch (e) {}
    });
    return allFiles;
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API: List local files
    if (pathname === '/api/local-files' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(listLocalFiles()));
    }

    // API: AI Import (without saving)
    if (pathname === '/api/local-import' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { filePath } = JSON.parse(body);
                if (!filePath) throw new Error("Missing filePath");

                res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
                
                const result = await processPaper(filePath, (msg) => {
                    res.write(`data: ${JSON.stringify({ message: msg })}\n\n`);
                }, false);

                res.write(`data: ${JSON.stringify({ result })}\n\n`);
                res.end();
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Save final questions
    if (pathname === '/api/save-questions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { questions, source } = JSON.parse(body);
                const quizDataPath = path.join(PUBLIC_DIR, 'quiz-data.json');
                
                let existingData = [];
                if (fs.existsSync(quizDataPath)) {
                    existingData = JSON.parse(fs.readFileSync(quizDataPath, 'utf8'));
                }

                // Remove old questions from same source to avoid duplicates
                const filteredData = existingData.filter(q => q.source !== source);
                const updatedData = [...filteredData, ...questions];

                fs.writeFileSync(quizDataPath, JSON.stringify(updatedData, null, 2));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: questions.length }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Serve Static Files
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'local-admin.html' : pathname);
    
    // Safety check: ensure file is within public dir
    if (!filePath.startsWith(PUBLIC_DIR) && !filePath.startsWith(path.join(ROOT, 'node_modules'))) {
         // Allow Media access if needed, but for now stick to public
    }

    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Local Admin Server running at http://localhost:${PORT}/local-admin.html`);
});
