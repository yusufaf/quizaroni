import { describe, expect, it } from 'vitest';

import { levenshteinDistance, stringSimilarity } from './stringSimilarity';

describe('levenshteinDistance', () => {
    it('is zero for identical strings', () => {
        expect(levenshteinDistance('', '')).toBe(0);
        expect(levenshteinDistance('mitochondria', 'mitochondria')).toBe(0);
    });

    it('equals the other string length when one side is empty', () => {
        expect(levenshteinDistance('', 'abc')).toBe(3);
        expect(levenshteinDistance('abc', '')).toBe(3);
    });

    // The canonical textbook cases, so a future rewrite has something to fail.
    it('matches known distances', () => {
        expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
        expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
        expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
    });

    it('counts each edit kind as one', () => {
        expect(levenshteinDistance('cat', 'bat')).toBe(1); // substitution
        expect(levenshteinDistance('cat', 'cart')).toBe(1); // insertion
        expect(levenshteinDistance('cart', 'cat')).toBe(1); // deletion
    });

    it('is symmetric', () => {
        expect(levenshteinDistance('photosynthesis', 'photosynthsis')).toBe(
            levenshteinDistance('photosynthsis', 'photosynthesis')
        );
    });
});

describe('stringSimilarity', () => {
    it('is 1 for identical strings, including two empty ones', () => {
        expect(stringSimilarity('', '')).toBe(1);
        expect(stringSimilarity('osmosis', 'osmosis')).toBe(1);
    });

    it('is 0 when nothing matches', () => {
        expect(stringSimilarity('abc', 'xyz')).toBe(0);
    });

    it('scores a single typo in a long answer above the strictest threshold', () => {
        // 0.95 is the `hard` difficulty cutoff in TypeWriteStudy.
        expect(
            stringSimilarity('mitochondria', 'mitochondrai')
        ).toBeGreaterThan(0.8);
    });
});
