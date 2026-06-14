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

async function getAIAnswer(question, options, knownAnswerIndex = null) {
    if (!GEMINI_API_KEY) return null;
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    let prompt;
    if (knownAnswerIndex !== null) {
        prompt = `The correct answer to this English MCQ is option index ${knownAnswerIndex} ("${options[knownAnswerIndex]}"). 
        Provide a concise explanation (max 2 sentences) why this is correct.
        Return ONLY a JSON object with "index" (${knownAnswerIndex}) and "explanation".
        Question: ${question}
        Options: ${options.join(", ")}`;
    } else {
        prompt = `Solve this English MCQ. Return ONLY a JSON object with "index" (0-3) and "explanation" (max 2 sentences).
        Question: ${question}
        Options: ${options.join(", ")}`;
    }

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
    const regexWithNumber = /(\d+)\.?[\)\s\:]+([A-D])\b/gi;
    let match;
    let foundWithNumber = false;
    while ((match = regexWithNumber.exec(keyText)) !== null) {
        answerMap[parseInt(match[1])] = "ABCD".indexOf(match[2].toUpperCase());
        foundWithNumber = true;
    }
    
    if (!foundWithNumber) {
        // Try sequential parsing for lines like "B – Had been" or "A. something"
        const lines = keyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let qNum = 1;
        for (const line of lines) {
            const sequentialMatch = line.match(/^([A-D])\s*[–\-\.]/i);
            if (sequentialMatch) {
                answerMap[qNum++] = "ABCD".indexOf(sequentialMatch[1].toUpperCase());
            }
        }
    }
    return answerMap;
}

async function parseMCQs(text, source, answerMap = {}, useAI = false) {
    const questions = [];
    const allLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Find Section A and Section B to restrict scope
    const sectionAIndex = allLines.findIndex(l => l.match(/^Section\s+A/i));
    const sectionBIndex = allLines.findIndex(l => l.match(/^SECTION\s+B/i));
    
    if (sectionAIndex === -1) {
        console.warn("Could not find 'Section A'. Parsing full text.");
    }
    
    const lines = allLines.slice(
        sectionAIndex !== -1 ? sectionAIndex + 1 : 0,
        sectionBIndex !== -1 ? sectionBIndex : allLines.length
    );

    let qCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip headers, instructions, and metadata
        if (line.match(/^(Questions?|Section|Instructions?|Answer all|Choose the|In each|Turn over|PAPER I|Subject Number|Friday,|Time allowed:|Turn over|Questions \d+ to \d+)/i)) continue;
        if (line.length < 5) continue;
        if (line.match(/^[A-D](\.|\s|–|-)/i)) continue; // Skip lines starting with A., B., etc if they aren't part of an option block

        // Potential question found. Look ahead for options.
        let potentialOpts = [];
        let lookAhead = 1;
        while (potentialOpts.length < 4 && (i + lookAhead) < lines.length) {
            const nextLine = lines[i + lookAhead];
            // If we hit another question-like line or header, stop
            if (nextLine.match(/^(Questions?|Section|Instructions?|Answer all|Choose the|In each|Turn over|PAPER I|Questions \d+ to \d+)/i)) break;
            
            potentialOpts.push(nextLine);
            lookAhead++;
        }

        if (potentialOpts.length === 4) {
            qCounter++;
            let correctIdx = answerMap[qCounter] !== undefined ? answerMap[qCounter] : 0;
            let explanation = `From ${source}.`;

            if (useAI && GEMINI_API_KEY) {
                process.stdout.write(`Asking AI for Q${qCounter}... `);
                const aiResult = await getAIAnswer(line, potentialOpts, answerMap[qCounter] !== undefined ? answerMap[qCounter] : null);
                if (aiResult) {
                    correctIdx = aiResult.index;
                    explanation = aiResult.explanation;
                    console.log("Done.");
                } else {
                    console.log("Failed, using default.");
                }
                await new Promise(r => setTimeout(r, 12000));
            }

            questions.push({
                topic: "English Grammar",
                question: line,
                options: potentialOpts,
                answer: correctIdx, 
                explanation: explanation,
                source: source
            });
            i += (lookAhead - 1);
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
