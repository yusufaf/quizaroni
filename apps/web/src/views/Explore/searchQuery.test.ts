import { describe, it, expect } from 'vite-plus/test';
import {
    activeQuery,
    isSearchStart,
    parseQueryParam,
    SEARCH_START_STATE,
    withQuery,
} from './searchQuery';

describe('parseQueryParam', () => {
    it('reads a missing param as no query', () => {
        expect(parseQueryParam(null)).toBe('');
    });

    it('trims', () => {
        expect(parseQueryParam('  bio  ')).toBe('bio');
    });

    it('caps at 100 characters', () => {
        expect(parseQueryParam('a'.repeat(150))).toBe('a'.repeat(100));
    });

    it('caps by code point, never splitting an emoji', () => {
        const capped = parseQueryParam('😀'.repeat(101));
        expect(Array.from(capped)).toHaveLength(100);
        expect(capped).toBe('😀'.repeat(100));
    });
});

describe('activeQuery', () => {
    it('is empty for no param or a query with no words', () => {
        expect(activeQuery(null)).toBe('');
        expect(activeQuery('?!')).toBe('');
    });

    it('keeps the trimmed query when it has words', () => {
        expect(activeQuery(' C++ ')).toBe('C++');
    });
});

describe('withQuery', () => {
    it('sets q and keeps the subject', () => {
        expect(
            withQuery(new URLSearchParams('subject=law'), 'bio').toString()
        ).toBe('subject=law&q=bio');
    });

    it('trims the query', () => {
        expect(withQuery(new URLSearchParams(), ' bio ').toString()).toBe(
            'q=bio'
        );
    });

    it.each(['', '  '])('removes q for %p and keeps the subject', (query) => {
        expect(
            withQuery(
                new URLSearchParams('subject=law&q=bio'),
                query
            ).toString()
        ).toBe('subject=law');
    });

    it('does not change the params it was given', () => {
        const prev = new URLSearchParams('q=bio');
        withQuery(prev, 'chem');
        expect(prev.toString()).toBe('q=bio');
    });
});

describe('isSearchStart', () => {
    it('recognises the mark', () => {
        expect(isSearchStart(SEARCH_START_STATE)).toBe(true);
    });

    it.each([null, undefined, {}, 'x'])('is false for %p', (state) => {
        expect(isSearchStart(state)).toBe(false);
    });
});
