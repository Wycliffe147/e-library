import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// --- AI CONFIG ---
// Get your key from https://aistudio.google.com/
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 

async function getAIAnswer(question, options) {
    if (!GEMINI_API_KEY) return null;
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `Solve this English MCQ. Return ONLY a JSON object with "index" (0-3) and "explanation" (max 2 sentences).
    Question: ${question}
    Options: ${options.join(", ")}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return JSON.parse(text.match(/\{.*\}/s)[0]);
    } catch (e) {
        console.error("AI Error:", e.message);
        return null;
    }
}

async function extractText(filePath) {
    const stats = fs.statSync(filePath);
    let buffer;
    if (stats.size < 1000) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('https://git-lfs.github.com/spec/')) {
            const relPath = path.relative(path.join(projectRoot, 'public'), filePath);
            const url = `https://media.githubusercontent.com/media/Wycliffe147/e-library/main/public/${relPath.split("/").map(encodeURIComponent).join("/")}`;
            const response = await fetch(url);
            buffer = Buffer.from(await response.arrayBuffer());
        }
    }
    if (!buffer) buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
}

function parseAnswers(keyText) {
    const answerMap = {};
    const regex = /(\d+)\.?[\)\s\:]+([A-D])\b/gi;
    let match;
    while ((match = regex.exec(keyText)) !== null) {
        answerMap[parseInt(match[1])] = "ABCD".indexOf(match[2].toUpperCase());
    }
    return answerMap;
}

async function parseMCQs(text, source, answerMap = {}, useAI = false) {
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let qCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if ((line.includes('____') || line.endsWith('?')) && i + 4 < lines.length) {
            const opts = [lines[i+1], lines[i+2], lines[i+3], lines[i+4]];
            if (opts.every(o => o.length < 100)) {
                qCounter++;
                let correctIdx = answerMap[qCounter] !== undefined ? answerMap[qCounter] : 0;
                let explanation = `From ${source}.`;

                if (useAI && GEMINI_API_KEY) {
                    process.stdout.write(`Asking AI for Q${qCounter}... `);
                    const aiResult = await getAIAnswer(line, opts);
                    if (aiResult) {
                        correctIdx = aiResult.index;
                        explanation = aiResult.explanation;
                        console.log("Done.");
                    } else {
                        console.log("Failed, using default.");
                    }
                }

                questions.push({
                    topic: "English Grammar",
                    question: line,
                    options: opts,
                    answer: correctIdx, 
                    explanation: explanation,
                    source: source
                });
                i += 4;
            }
        }
    }
    return questions;
}

async function run() {
    const args = process.argv.slice(2);
    const useAI = args.includes("--ai");
    const files = args.filter(a => !a.startsWith("--"));

    const examFile = files[0];
    const keyFile = files[1];

    if (!examFile) {
        console.log("Usage: node scripts/import-questions.js <exam-docx> [key-docx] [--ai]");
        return;
    }

    try {
        let answerMap = {};
        if (keyFile) {
            const keyText = await extractText(keyFile);
            answerMap = parseAnswers(keyText);
        }

        const examText = await extractText(examFile);
        const newQuestions = await parseMCQs(examText, path.basename(examFile), answerMap, useAI);
        
        const quizDataPath = path.join(projectRoot, 'public', 'quiz-data.json');
        let data = fs.existsSync(quizDataPath) ? JSON.parse(fs.readFileSync(quizDataPath, 'utf8')) : [];

        let added = 0;
        newQuestions.forEach(nq => {
            if (!data.some(oq => oq.question === nq.question)) {
                data.push(nq);
                added++;
            }
        });

        fs.writeFileSync(quizDataPath, JSON.stringify(data, null, 2));
        console.log(`Merged ${added} questions.`);
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
