import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';

export const config = {
    api: {
        bodyParser: false, // Disabling bodyParser to handle raw stream
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const fileName = req.headers['x-filename'];
    if (!fileName) {
        return res.status(400).send('Missing x-filename header');
    }

    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}-${fileName}`);
    console.log(`Saving upload to ${tempPath}`);

    try {
        // Step 1: Save the raw body to a file
        const writeStream = fs.createWriteStream(tempPath);
        
        await new Promise((resolve, reject) => {
            req.pipe(writeStream);
            req.on('end', resolve);
            req.on('error', reject);
        });

        // Step 2: Stream the response back
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        res.write(`Upload complete: ${fileName}\n`);
        res.write(`Triggering AI Import logic...\n\n`);
        
        // Step 3: Run the import script
        const scriptPath = path.resolve(process.cwd(), 'scripts', 'smart-import.js');
        res.write(`Running script: ${scriptPath}\n`);

        const child = spawn('node', [scriptPath, tempPath]);

        child.stdout.on('data', (data) => {
            res.write(data.toString());
        });

        child.stderr.on('data', (data) => {
            res.write(`Error: ${data.toString()}`);
        });

        child.on('close', (code) => {
            res.write(`\n--- Process finished with code ${code} ---\n`);
            
            // Cleanup temp file
            try {
                fs.unlinkSync(tempPath);
            } catch (e) {}

            if (code === 0) {
                res.write(`SUCCESS: ${fileName} has been imported to the library.`);
            } else {
                res.write(`FAILED: Import process failed. Check the logs above.`);
            }
            res.end();
        });

    } catch (error) {
        console.error('Import API error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    }
}
