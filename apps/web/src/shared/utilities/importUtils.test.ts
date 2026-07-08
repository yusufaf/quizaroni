import { describe, it, expect } from 'vitest';
import {
    resolveSeparator,
    parseDelimitedCards,
    parseAnkiExport,
    processImport,
    processImportedCards,
} from './importUtils';

describe('resolveSeparator', () => {
    it('maps named tokens to characters', () => {
        expect(resolveSeparator('tab')).toBe('\t');
        expect(resolveSeparator('Tab')).toBe('\t');
        expect(resolveSeparator('comma')).toBe(',');
        expect(resolveSeparator('newline')).toBe('\n');
        expect(resolveSeparator('blankline')).toBe('\n\n');
    });

    it('unescapes literal escape sequences', () => {
        expect(resolveSeparator('\\t')).toBe('\t');
        expect(resolveSeparator('\\n')).toBe('\n');
    });

    it('passes through custom literal separators', () => {
        expect(resolveSeparator(' - ')).toBe(' - ');
        expect(resolveSeparator('::')).toBe('::');
    });
});

describe('parseDelimitedCards (Quizlet)', () => {
    it('parses the default tab / newline export', () => {
        const text =
            'Mitochondria\tThe powerhouse of the cell\nDNA\tGenetic material';
        const { cards, error } = parseDelimitedCards(text, 'tab', 'newline');

        expect(error).toBeNull();
        expect(cards).toHaveLength(2);
        expect(cards[0]?.term).toBe('Mitochondria');
        expect(cards[0]?.definition).toBe('The powerhouse of the cell');
        expect(cards[1]?.term).toBe('DNA');
        // normalized cards get generated identifiers and defaulted fields
        expect(cards[0]?.cardUUID).toBeTruthy();
        expect(cards[0]?.categories).toEqual([]);
        expect(cards[0]?.important).toBe(false);
    });

    it('supports custom field and row separators', () => {
        const text = 'Biblioteca - Library; Casa - House';
        const { cards, error } = parseDelimitedCards(text, ' - ', ';');

        expect(error).toBeNull();
        expect(cards).toHaveLength(2);
        expect(cards[0]).toMatchObject({
            term: 'Biblioteca',
            definition: 'Library',
        });
        expect(cards[1]).toMatchObject({ term: 'Casa', definition: 'House' });
    });

    it('splits only on the first field separator so definitions may contain it', () => {
        const text = 'Ratio a : b comparison';
        const { cards } = parseDelimitedCards(text, 'space', 'newline');

        expect(cards[0]?.term).toBe('Ratio');
        expect(cards[0]?.definition).toBe('a : b comparison');
    });

    it('skips blank rows and rows missing a separator', () => {
        const text = 'Term1\tDef1\n\nOnlyTermNoTab\nTerm2\tDef2';
        const { cards, error } = parseDelimitedCards(text, 'tab', 'newline');

        expect(error).toBeNull();
        expect(cards.map((c) => c.term)).toEqual(['Term1', 'Term2']);
    });

    it('normalizes CRLF line endings', () => {
        const text = 'A\t1\r\nB\t2';
        const { cards } = parseDelimitedCards(text, 'tab', 'newline');
        expect(cards.map((c) => c.term)).toEqual(['A', 'B']);
    });

    it('errors when no row contains the separator', () => {
        const { cards, error } = parseDelimitedCards(
            'just some prose without tabs',
            'tab',
            'newline'
        );
        expect(cards).toHaveLength(0);
        expect(error).toMatch(/separator/i);
    });
});

describe('parseAnkiExport', () => {
    it('parses a plain tab-separated export with no header', () => {
        const text = 'Hola\tHello\nAdios\tGoodbye';
        const { cards, error } = parseAnkiExport(text);

        expect(error).toBeNull();
        expect(cards.map((c) => c.term)).toEqual(['Hola', 'Adios']);
        expect(cards[1]?.definition).toBe('Goodbye');
    });

    it('strips # header lines and honors #separator directive', () => {
        const text = [
            '#separator:comma',
            '#html:false',
            '#columns:Front,Back',
            'Front1,Back1',
            'Front2,Back2',
        ].join('\n');
        const { cards, error } = parseAnkiExport(text);

        expect(error).toBeNull();
        expect(cards).toHaveLength(2);
        expect(cards[0]).toMatchObject({ term: 'Front1', definition: 'Back1' });
    });

    it('defaults to tab separator when no directive is present', () => {
        const text = '#html:true\nQ\tA';
        const { cards } = parseAnkiExport(text);
        expect(cards[0]).toMatchObject({ term: 'Q', definition: 'A' });
    });
});

describe('processImport (format dispatch)', () => {
    it('routes json to the JSON parser', () => {
        const json = JSON.stringify([{ term: 'T', definition: 'D' }]);
        const { cards, error } = processImport(json, 'json');
        expect(error).toBeNull();
        expect(cards[0]).toMatchObject({ term: 'T', definition: 'D' });
    });

    it('routes quizlet with default separators', () => {
        const { cards } = processImport('T\tD', 'quizlet');
        expect(cards[0]).toMatchObject({ term: 'T', definition: 'D' });
    });

    it('routes quizlet with provided separator options', () => {
        const { cards } = processImport('T=D', 'quizlet', {
            fieldSeparator: '=',
            rowSeparator: 'newline',
        });
        expect(cards[0]).toMatchObject({ term: 'T', definition: 'D' });
    });

    it('routes anki to the Anki parser', () => {
        const { cards } = processImport('#separator:tab\nT\tD', 'anki');
        expect(cards[0]).toMatchObject({ term: 'T', definition: 'D' });
    });
});

describe('processImportedCards (JSON) remains intact', () => {
    it('parses a single object and an array', () => {
        expect(
            processImportedCards('{"term":"A","definition":"B"}').cards
        ).toHaveLength(1);
        expect(
            processImportedCards(
                '[{"term":"A","definition":"B"},{"term":"C","definition":"D"}]'
            ).cards
        ).toHaveLength(2);
    });

    it('reports invalid JSON', () => {
        const { cards, error } = processImportedCards('{not json');
        expect(cards).toHaveLength(0);
        expect(error).toMatch(/Invalid JSON/i);
    });
});
