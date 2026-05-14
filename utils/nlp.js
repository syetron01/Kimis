/**
 * utils/nlp.js
 * ─────────────────────────────────────────────────────────
 * Lightweight NLP utility for keyword extraction.
 * NO machine learning, NO embeddings, NO external libraries.
 * ─────────────────────────────────────────────────────────
 */

// Expanded English stop-word list
const STOP_WORDS = new Set([
    // Articles / determiners
    "a", "an", "the",
    // Conjunctions
    "and", "or", "but", "nor", "so", "yet",
    // Prepositions
    "at", "by", "for", "from", "in", "into", "of", "on", "onto",
    "out", "through", "to", "up", "with", "about", "above", "after",
    "against", "before", "below", "between", "during", "without",
    // Pronouns
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
    "they", "them", "their", "its", "this", "that", "these", "those",
    // Verbs (common)
    "am", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "shall", "should", "may", "might", "must", "can", "could",
    "get", "got", "make", "let", "go", "come",
    // Question words
    "how", "what", "where", "when", "who", "which", "why", "whose",
    // Other filler words
    "if", "then", "else", "also", "just", "more", "some", "any",
    "all", "each", "both", "few", "own", "same", "than", "too",
    "very", "here", "there", "now", "only", "please"
]);

/**
 * Extracts meaningful keywords from a natural-language query.
 *
 * Steps:
 *  1. Lowercase everything
 *  2. Strip punctuation / special characters (keep letters, digits, spaces)
 *  3. Split on whitespace
 *  4. Remove stop words and tokens shorter than 2 chars
 *  5. Return unique tokens
 *
 * @param {string} query  - Raw user input string
 * @returns {string[]}    - Array of unique, meaningful keywords
 *
 * @example
 *   extractKeywords("How do I safely deploy updates?")
 *   // → ["safely", "deploy", "updates"]
 */
function extractKeywords(query) {
    if (!query || typeof query !== 'string') return [];

    // 1. Lowercase + remove everything except letters, digits, whitespace
    const clean = query.toLowerCase().replace(/[^\w\s]/g, '');

    // 2. Split on whitespace
    const tokens = clean.split(/\s+/);

    // 3. Filter: drop stop words, short tokens, pure numbers
    const keywords = tokens.filter(word =>
        word.length >= 2 &&
        !STOP_WORDS.has(word) &&
        !/^\d+$/.test(word)   // skip standalone numbers
    );

    // 4. Deduplicate while preserving order
    return [...new Set(keywords)];
}

module.exports = { extractKeywords };
