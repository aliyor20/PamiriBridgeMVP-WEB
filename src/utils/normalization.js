/**
 * Normalizes user input for "Fuzzy" search in Pamiri languages.
 * Maps informal "chat script" to standard phonemes.
 * 
 * Rules:
 * kh -> x (Uvular Fricative)
 * xh -> x
 * gh -> ɣ (Voiced Uvular Fricative)
 * ch -> č (Affricate)
 * sh -> š (Fricative)
 * zh -> ž (Voiced Fricative)
 * th -> θ (Dental Fricative - Bartangi)
 * dh -> ð (Voiced Dental)
 * ā/ȧ/a -> a (Vowel insensitivity)
 */
export const normalizePamiriInput = (input) => {
    if (!input) return "";

    return input
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/kh/g, 'x')
        .replace(/xh/g, 'x')
        .replace(/gh/g, 'ɣ')
        .replace(/ch/g, 'č')
        .replace(/sh/g, 'š')
        .replace(/zh/g, 'ž')
        .replace(/th/g, 'θ')
        .replace(/dh/g, 'ð')
        .replace(/[āȧa]/g, 'a')
        .trim();
};

/**
 * Helper to generate search tokens for Firestore array-contains
 * Includes both the Pamiri word variants and English meaning words
 * @param {string} word - The Pamiri word
 * @param {string} meaning - Optional English meaning
 * @returns {string[]} - Array of search tokens
 */
export const generateSearchTokens = (word, meaning = '') => {
    if (!word) return [];
    const lower = word.toLowerCase();
    const normalized = normalizePamiriInput(lower);

    // We should store both exact user input parts and normalized version
    const tokens = new Set();
    tokens.add(lower);
    tokens.add(normalized);

    // Add common romanization variants
    // e.g., for "xats" also add "khats"
    if (lower.includes('x')) {
        tokens.add(lower.replace(/x/g, 'kh'));
    }
    if (lower.includes('kh')) {
        tokens.add(lower.replace(/kh/g, 'x'));
    }

    // Add English meaning words (critical for English-to-Pamiri search)
    if (meaning) {
        const meaningWords = meaning.toLowerCase()
            .split(/[\s,;]+/) // Split on whitespace and common punctuation
            .filter(w => w.length > 1); // Filter out single characters

        meaningWords.forEach(w => tokens.add(w));
    }

    return Array.from(tokens);
};
