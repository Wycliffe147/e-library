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
            console.log(`Fetching LFS file from GitHub: ${path.basename(filePath)}`);
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

function parseAnswers(keyText) {
    const answerMap = {};
    // Match patterns like "1. B" or "2) A" or "3: C"
    const regex = /(\d+)\.?[\)\s\:]+([A-D])\b/gi;
    let match;
    while ((match = regex.exec(keyText)) !== null) {
        const qNum = parseInt(match[1]);
        const letter = match[2].toUpperCase();
        const index = "ABCD".indexOf(letter);
        answerMap[qNum] = index;
    }
    return answerMap;
}

function parseMCQs(text, source, answerMap = {}) {
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let qCounter = 0;
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
                qCounter++;
                const correctIdx = answerMap[qCounter] !== undefined ? answerMap[qCounter] : 0;
                
                questions.push({
                    topic: "Imported",
                    question: line,
                    options: [opt1, opt2, opt3, opt4],
                    answer: correctIdx, 
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
    const examFile = process.argv[2];
    const keyFile = process.argv[3];

    if (!examFile) {
        console.log("Usage: node scripts/import-questions.js <exam-docx> [key-docx]");
        return;
    }

    const quizDataPath = path.join(projectRoot, 'public', 'quiz-data.json');

    try {
        let answerMap = {};
        if (keyFile) {
            console.log(`Parsing Marking Key: ${path.basename(keyFile)}...`);
            const keyText = await extractText(keyFile);
            answerMap = parseAnswers(keyText);
            console.log(`Found ${Object.keys(answerMap).length} answers in key.`);
        }

        console.log(`Parsing Exam: ${path.basename(examFile)}...`);
        const examText = await extractText(examFile);
        const source = path.basename(examFile);
        const newQuestions = parseMCQs(examText, source, answerMap);
        
        console.log(`Found ${newQuestions.length} questions in exam.`);
        
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
            console.log(`Successfully merged ${addedCount} questions into public/quiz-data.json.`);
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
