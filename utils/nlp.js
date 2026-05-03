/**
 * NLP Utility for keyword extraction
 */

const STOP_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", 
    "at", "by", "from", "for", "with", "about", "against", "between", 
    "into", "through", "during", "before", "after", "above", "below", 
    "to", "of", "in", "on", "is", "are", "was", "were", "be", "been", 
    "being", "have", "has", "had", "do", "does", "did", "how", "what", 
    "where", "who", "which", "why"
]);

/**
 * Extracts meaningful keywords from a raw query string.
 * - Converts to lowercase
 * - Removes special characters
 * - Splits by whitespace
 * - Filters out common stop words
 * 
 * @param {string} query 
 * @returns {string[]} Array of keywords
 */
function extractKeywords(query) {
    if (!query || typeof query !== 'string') return [];

    // 1. Lowercase and remove punctuation (keeping letters, numbers, and spaces)
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, '');

    // 2. Split into words
    const words = cleanQuery.split(/\s+/);

    // 3. Filter out stop words and empty strings
    const keywords = words.filter(word => word.length > 0 && !STOP_WORDS.has(word));

    // 4. Return unique keywords
    return [...new Set(keywords)];
}

module.exports = {
    extractKeywords
};
