import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractText(filePath) {
    const stats = fs.statSync(filePath);
    let buffer;

    // Check if it's a Git LFS pointer
    if (stats.size < 1000) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('https://git-lfs.github.com/spec/')) {
            console.log("Detected Git LFS pointer. Fetching actual file from GitHub...");
            const relPath = path.relative(path.join(projectRoot, 'public'), filePath);
            
            // Use the same logic as download.js
            const user = "Wycliffe147";
            const repo = "e-library";
            const branch = "main";
            const cleanPath = relPath.split("/").map(part => encodeURIComponent(part)).join("/");
            const url = `https://media.githubusercontent.com/media/${user}/${repo}/${branch}/public/${cleanPath}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch from GitHub: ${response.statusText}`);
            buffer = Buffer.from(await response.arrayBuffer());
        }
    }

    if (!buffer) {
        buffer = fs.readFileSync(filePath);
    }

    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
}

function parseMCQs(text, source) {
    const questions = [];
    
    // Split into individual lines to analyze structure
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Potential question: contains "____" or ends with "?"
        const isQuestion = line.includes('____') || line.includes('___') || line.endsWith('?');
        
        if (isQuestion && i + 4 < lines.length) {
            // Check if next 4 lines are potential options (short and distinct)
            const opt1 = lines[i+1];
            const opt2 = lines[i+2];
            const opt3 = lines[i+3];
            const opt4 = lines[i+4];

            // Heuristic: options are usually short and don't look like new questions
            const looksLikeOptions = [opt1, opt2, opt3, opt4].every(opt => 
                opt.length < 100 && !opt.includes('____') && !opt.endsWith('?')
            );

            if (looksLikeOptions) {
                questions.push({
                    topic: "English Grammar",
                    question: line,
                    options: [opt1, opt2, opt3, opt4],
                    answer: 0, 
                    explanation: `From ${source}.`,
                    source: source
                });
                i += 4; // Skip the options
            }
        }
    }

    // If strategy 1 found nothing, try standard A. B. C. D. on the full text
    if (questions.length === 0) {
        // ... (previous standard regex logic could go here)
    }

    return questions;
}

async function run() {
    const testFile = process.argv[2];
    if (!testFile) {
        console.log("Usage: node scripts/import-questions.js <path-to-docx>");
        return;
    }

    try {
        const text = await extractText(testFile);
        const source = path.basename(testFile);
        const mcqs = parseMCQs(text, source);
        
        console.log(`\n--- Results for ${source} ---`);
        console.log(`Found ${mcqs.length} potential questions.`);
        
        if (mcqs.length > 0) {
            const outputPath = path.join(process.cwd(), 'pending-questions.json');
            fs.writeFileSync(outputPath, JSON.stringify(mcqs, null, 2));
            console.log(`Extracted questions saved to ${outputPath}`);
            console.log(`\nSample (Question 1):`);
            console.log(JSON.stringify(mcqs[0], null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
