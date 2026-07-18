/**
 * Levenshtein edit distance between two strings.
 *
 * Uses a rolling single-row buffer rather than a full matrix: each cell only
 * ever depends on the cell to its left, the one above, and the one diagonally
 * above-left, so one row of history is enough. That also keeps every read a
 * plain variable rather than an unchecked index into a 2D array.
 */
export const levenshteinDistance = (str1: string, str2: string): number => {
    // Row 0: the cost of deleting each leading character of str1.
    let previousRow = Array.from({ length: str1.length + 1 }, (_, i) => i);

    for (let j = 1; j <= str2.length; j++) {
        // Column 0: the cost of inserting the first j characters of str2.
        const currentRow: number[] = [j];

        let left = j; // currentRow[i - 1]
        let diagonal = previousRow[0] ?? 0; // previousRow[i - 1]

        for (let i = 1; i <= str1.length; i++) {
            const above = previousRow[i] ?? 0;
            const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;

            const cost = Math.min(
                left + 1, // deletion
                above + 1, // insertion
                diagonal + substitutionCost // substitution
            );

            currentRow.push(cost);
            left = cost;
            diagonal = above;
        }

        previousRow = currentRow;
    }

    return previousRow[str1.length] ?? 0;
};

/**
 * Similarity of two strings in the range 0..1, where 1 is an exact match.
 * Two empty strings are treated as identical rather than 0/0.
 */
export const stringSimilarity = (str1: string, str2: string): number => {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    return 1 - levenshteinDistance(str1, str2) / maxLength;
};
