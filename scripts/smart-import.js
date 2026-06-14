/**
 * SMART IMPORT SYSTEM
 * 
 * TODO: Future Upgrade - Replace this CLI/Shortcut workflow with a 
 * Web-based Admin Interface (/admin) for better file management and previewing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { extractDocxWithUnderlines } from './docx-extractor.js';
import WordExtractor from 'word-extractor';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function processPaper(filePath) {
    if (!GEMINI_API_KEY) {
        console.error("Error: GEMINI_API_KEY is not set in .env");
        return;
    }

    const fileName = path.basename(filePath);
    const quizDataPath = path.join(projectRoot, 'public', 'quiz-data.json');
    let existingData = [];
    if (fs.existsSync(quizDataPath)) {
        existingData = JSON.parse(fs.readFileSync(quizDataPath, 'utf8'));
    }

    const isDuplicate = existingData.some(q => q.source === fileName);
    if (isDuplicate) {
        console.log(`\x1b[33mNotice: "${fileName}" has already been added to the library.\x1b[0m`);
        console.log(`Re-importing will replace the existing questions from this source.`);
    }

    const ext = path.extname(filePath).toLowerCase();
    let rawText = "";

    console.log(`Step 1: Extracting text from ${path.basename(filePath)}...`);
    
    if (ext === '.docx') {
        rawText = await extractDocxWithUnderlines(filePath);
    } else if (ext === '.doc') {
        const extractor = new WordExtractor();
        const extracted = await extractor.extract(filePath);
        rawText = extracted.getBody();
    } else if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        rawText = pdfData.text;
    } else {
        console.error(`Error: Unsupported file type: ${ext}. Only .docx, .doc and .pdf are supported.`);
        return;
    }

    console.log("Step 2: Asking Gemini to extract, solve, and format questions...");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use gemini-3.5-flash as confirmed by available models list
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `
    You are an expert exam processor. I will provide you with text from a school exam paper.
    
    YOUR TASKS:
    1. Identify all Multiple Choice Questions (MCQs).
    2. Extract them into a JSON array.
    3. For EACH question:
       - Keep the original question text. **IMPORTANT**: Preserve the <u> tags for underlined words.
       - Identify the 4 options.
       - Determine the CORRECT answer (0-3).
       - Write a concise 1-2 sentence explanation of why that answer is correct.
    
    RULES:
    - Only return valid JSON. No markdown code blocks.
    - Fields: "topic", "question", "options", "answer", "explanation", "source".
    - Topic should be based on the subject (e.g., "English Grammar").
    - Source should be: "${path.basename(filePath)}"

    EXAM TEXT:
    ${rawText}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text().trim();
        
        // Remove markdown formatting if the AI added it
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.split("```json")[1].split("```")[0].trim();
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.split("```")[1].split("```")[0].trim();
        }

        const newQuestions = JSON.parse(jsonText);
        console.log(`Step 3: AI found and solved ${newQuestions.length} questions.`);

        console.log("Step 4: Merging into public/quiz-data.json...");
        const quizDataPath = path.join(projectRoot, 'public', 'quiz-data.json');
        let data = [];
        if (fs.existsSync(quizDataPath)) {
            data = JSON.parse(fs.readFileSync(quizDataPath, 'utf8'));
        }

        // Remove old questions from this same source to avoid duplicates
        const filteredData = data.filter(q => q.source !== path.basename(filePath));
        
        // Add new ones
        const updatedData = [...filteredData, ...newQuestions];
        
        fs.writeFileSync(quizDataPath, JSON.stringify(updatedData, null, 2));
        console.log("Done! Your e-library is updated.");

    } catch (error) {
        console.error("AI Error:", error.message);
        if (error.message.includes("404")) {
            console.log("Tip: Check if your GEMINI_API_KEY is valid and the model name 'gemini-1.5-flash' is supported.");
        }
    }
}

const fileArg = process.argv[2];
if (!fileArg) {
    console.log("Usage: node scripts/smart-import.js <path-to-docx-or-pdf>");
} else {
    processPaper(fileArg);
}
