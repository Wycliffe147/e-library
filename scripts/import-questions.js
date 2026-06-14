import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

async function extractText(filePath) {
    const stats = fs.statSync(filePath);
    let buffer;

    if (stats.size < 1000) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('https://git-lfs.github.com/spec/')) {
            console.log("Detected Git LFS pointer. Fetching actual file from GitHub...");
            const relPath = path.relative(path.join(projectRoot, 'public'), filePath);
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
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isQuestion = line.includes('____') || line.includes('___') || line.endsWith('?');
        
        if (isQuestion && i + 4 < lines.length) {
            const opt1 = lines[i+1];
            const opt2 = lines[i+2];
            const opt3 = lines[i+3];
            const opt4 = lines[i+4];

            const looksLikeOptions = [opt1, opt2, opt3, opt4].every(opt => 
                opt.length < 100 && !opt.includes('____') && !opt.endsWith('?')
            );

            if (looksLikeOptions) {
                questions.push({
                    topic: "Imported",
                    question: line,
                    options: [opt1, opt2, opt3, opt4],
                    answer: 0, 
                    explanation: `From ${source}.`,
                    source: source
                });
                i += 4;
            }
        }
    }
    return questions;
}

async function run() {
    const testFile = process.argv[2];
    if (!testFile) {
        console.log("Usage: node scripts/import-questions.js <path-to-docx>");
        return;
    }

    const quizDataPath = path.join(projectRoot, 'public', 'quiz-data.json');

    try {
        const text = await extractText(testFile);
        const source = path.basename(testFile);
        const newQuestions = parseMCQs(text, source);
        
        console.log(`\n--- Results for ${source} ---`);
        console.log(`Found ${newQuestions.length} potential questions.`);
        
        if (newQuestions.length > 0) {
            let existingData = [];
            if (fs.existsSync(quizDataPath)) {
                existingData = JSON.parse(fs.readFileSync(quizDataPath, 'utf8'));
            }

            let addedCount = 0;
            newQuestions.forEach(newQ => {
                const isDuplicate = existingData.some(oldQ => 
                    oldQ.question.trim().toLowerCase() === newQ.question.trim().toLowerCase()
                );

                if (!isDuplicate) {
                    existingData.push(newQ);
                    addedCount++;
                }
            });

            fs.writeFileSync(quizDataPath, JSON.stringify(existingData, null, 2));
            console.log(`Successfully merged ${addedCount} new questions into public/quiz-data.json.`);
            if (newQuestions.length > addedCount) {
                console.log(`${newQuestions.length - addedCount} duplicates were skipped.`);
            }
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
