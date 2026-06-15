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
import { PDFParse } from 'pdf-parse';
import { extractDocxWithUnderlines } from './docx-extractor.js';
import WordExtractor from 'word-extractor';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function processPaper(filePath, onLog = (msg) => console.log(msg)) {
    if (!GEMINI_API_KEY) {
        onLog("ERROR: GEMINI_API_KEY is missing!");
        onLog("Please add it to your Vercel Project Settings > Environment Variables.");
        return false;
    }

    const fileName = path.basename(filePath);
    const quizDataPath = path.join(projectRoot, 'public', 'quiz-data.json');
    let existingData = [];
    
    try {
        if (fs.existsSync(quizDataPath)) {
            existingData = JSON.parse(fs.readFileSync(quizDataPath, 'utf8'));
        }
    } catch (e) {
        onLog("Notice: Could not read existing quiz-data.json, starting fresh.");
    }

    const isDuplicate = existingData.some(q => q.source === fileName);
    if (isDuplicate) {
        onLog(`Notice: "${fileName}" has already been added.`);
    }

    const ext = path.extname(filePath).toLowerCase();
    let rawText = "";

    onLog(`Step 1: Extracting text from ${fileName}...`);
    
    try {
        if (ext === '.docx') {
            rawText = await extractDocxWithUnderlines(filePath);
        } else if (ext === '.doc') {
            const extractor = new WordExtractor();
            const extracted = await extractor.extract(filePath);
            rawText = extracted.getBody();
        } else if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse({ data: dataBuffer });
            const pdfData = await parser.getText();
            rawText = pdfData.text;
        } else {
            onLog(`Error: Unsupported file type: ${ext}`);
            return false;
        }
    } catch (e) {
        onLog(`Extraction Error: ${e.message}`);
        return false;
    }

    if (!rawText || rawText.length < 50) {
        onLog("Error: Could not extract enough text from the file.");
        return false;
    }

    onLog("Step 2: Sending to Gemini AI (rotating through models if quota hit)...");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    
    let result = null;
    let usedModel = "";

    const prompt = `
    Extract Multiple Choice Questions from this text into a JSON array.
    
    FOR EACH QUESTION:
    1. Identify the question text (preserve <u> tags for underlined words).
    2. Extract exactly 4 options into an array.
    3. Determine the correct answer and provide its INDEX (0, 1, 2, or 3).
    4. Write a 1-sentence explanation of why that specific answer is correct.
    
    CRITICAL RULES:
    - The "answer" field MUST be a number (0, 1, 2, or 3).
    - You MUST categorize each question into one of these specific topics:
      * Prepositional Structures
      * Registers
      * Verb Tenses
      * Conditional Sentences
      * Phrasal Verbs
      * Parts of Speech (Nouns, Pronouns, Verbs, Adjectives, Adverbs, Prepositions, Conjunctions)
      * Order of Adjectives
      * Subordinate Clauses
      * Phrases
    - Source must be: "${fileName}"

    JSON STRUCTURE:
    {
      "topic": "Selected Topic from List Above",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "...",
      "source": "..."
    }

    TEXT TO PROCESS:
    ${rawText.substring(0, 10000)}
    `;

    for (const modelName of models) {
        try {
            onLog(`Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const aiResult = await model.generateContent(prompt);
            const response = await aiResult.response;
            result = response.text().trim();
            usedModel = modelName;
            break; // Success! Exit the loop
        } catch (error) {
            const errorMsg = error.message.toLowerCase();
            if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit exceeded")) {
                onLog(`Quota hit for ${modelName}. Falling back...`);
                continue;
            }
            onLog(`AI Error with ${modelName}: ${error.message}`);
            return false;
        }
    }

    if (!result) {
        onLog("Error: All Gemini models reached their quota. Please try again tomorrow.");
        return false;
    }

    try {
        let jsonText = result;
        if (jsonText.includes("```json")) jsonText = jsonText.split("```json")[1].split("```")[0];
        else if (jsonText.includes("```")) jsonText = jsonText.split("```")[1].split("```")[0];

        const newQuestions = JSON.parse(jsonText.trim());
        onLog(`Step 3: AI (${usedModel}) found ${newQuestions.length} questions.`);

        onLog("Step 4: Attempting to save...");
        
        // Remove old questions from same source
        const filteredData = existingData.filter(q => q.source !== fileName);
        const updatedData = [...filteredData, ...newQuestions];
        
        try {
            fs.writeFileSync(quizDataPath, JSON.stringify(updatedData, null, 2));
            onLog("✅ SUCCESS: Library updated.");
            return true;
        } catch (writeErr) {
            onLog("⚠️ WARNING: Could not write to public/quiz-data.json.");
            onLog(`Reason: ${writeErr.message}`);
            onLog("Vercel's file system is read-only. You must run this locally or use a database.");
            onLog("\n--- GENERATED DATA (Copy this) ---\n");
            onLog(JSON.stringify(newQuestions, null, 2));
            return true; // We return true because the AI part actually worked
        }

    } catch (error) {
        onLog(`AI/JSON Error: ${error.message}`);
        return false;
    }
}

if (process.argv[1] === __filename) {
    const fileArg = process.argv[2];
    if (!fileArg) {
        console.log("Usage: node scripts/smart-import.js <path-to-docx-or-pdf>");
    } else {
        processPaper(fileArg);
    }
}
