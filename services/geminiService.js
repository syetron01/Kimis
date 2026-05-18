/**
 * services/geminiService.js
 * ─────────────────────────────────────────────────────────
 * Gemini API integration layer.
 *
 * Gemini's ONLY role here is natural language generation.
 * It MUST NOT invent information or go outside the context
 * provided by the internal retrieval system.
 *
 * Env requirement: GEMINI_API_KEY
 * ─────────────────────────────────────────────────────────
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Instantiate Gemini client once (module-level singleton)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-1.5-flash: stable flash model
const MODEL_NAME = 'gemini-1.5-flash';

/**
 * Calls the Gemini API with a strictly grounded prompt.
 * Returns only the text content of the first candidate.
 *
 * @param {string} contextText  - The structured context built from retrieval
 * @returns {Promise<string>}   - Gemini's natural-language response
 */
async function generateGroundedAnswer(contextText) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in environment variables.');
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // ── System-level instructions ──────────────────────────
    const systemInstruction = `You are the AI assistant for KiMiS (Knowledge Intelligence Management System).
Your sole purpose is to help users understand and navigate information
retrieved from their internal knowledge base.

STRICT RULES — you MUST follow all of them:
1. Use ONLY the context provided below. Do NOT use any external knowledge.
2. Do NOT invent, fabricate, or infer information that is not in the context.
3. Do NOT answer questions that are outside the scope of the provided context.
4. If the provided context is insufficient to fully answer the question, clearly say:
   "The available knowledge base does not contain enough information to fully answer this question."
5. Keep responses concise, professional, and directly relevant to the question.
6. When workflow steps are present in the context, present them as a numbered list.
7. Reference specific article titles when drawing from them.
8. Never say "As an AI language model" or similar disclaimers.`;

    // ── Full prompt: system instructions + context ─────────
    const fullPrompt = `${systemInstruction}

─────────────────────────────────────────────
CONTEXT FROM KIMIS KNOWLEDGE BASE:
─────────────────────────────────────────────
${contextText}
─────────────────────────────────────────────

Based strictly on the above context, please provide a clear, helpful, and professional answer.
If workflow steps were provided, guide the user through them step-by-step.`;

    try {
        const result   = await model.generateContent(fullPrompt);
        const response = result.response;
        const text     = response.text();

        if (!text) throw new Error('Gemini returned an empty response.');
        return text.trim();

    } catch (err) {
        // ── 429 Rate-limit ──
        if (err.message && err.message.includes('429')) {
            const retryMatch = err.message.match(/retry in ([\d.]+)s/);
            const waitSec    = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
            throw new Error(
                `The AI service is temporarily rate-limited. ` +
                `Please try again in ${waitSec} seconds.`
            );
        }
        // ── 404 Model not found ──
        if (err.message && err.message.includes('404')) {
            throw new Error(
                'The configured Gemini model is unavailable for this API key. ' +
                'Please check GEMINI_API_KEY and model availability at ai.google.dev.'
            );
        }
        throw err;
    }
}

/**
 * Determines a simple confidence level based on the number of
 * retrieved source items — a heuristic for front-end display.
 *
 * @param {SourceMeta[]} sources
 * @returns {'high'|'medium'|'low'|'none'}
 */
function computeConfidence(sources) {
    const count = sources.length;
    if (count >= 3) return 'high';
    if (count === 2) return 'medium';
    if (count === 1) return 'low';
    return 'none';
}

module.exports = { generateGroundedAnswer, computeConfidence };
