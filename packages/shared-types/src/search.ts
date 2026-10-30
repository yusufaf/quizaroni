// #137: Community search. The API and the web fold queries the same way, so
// the web can tell whether a query has any words the API will search for.

// The API refuses a longer q; the web caps its field and URL reads to match.
export const EXPLORE_QUERY_MAX_CHARS = 100;

/**
 * Lowercases, strips accents and turns every run of punctuation or whitespace
 * into one space. Lowercasing first keeps `İ` from leaving a stray combining
 * dot. Only the Combining Diacritical Marks block is stripped (ñ -> n,
 * é -> e); other marks are kept so scripts whose vowel signs are marks
 * aren't split into pieces.
 */
export const foldForSearch = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
        .trim();

export const searchTokens = (query: string): string[] => {
    const folded = foldForSearch(query);
    return folded ? folded.split(' ') : [];
};
