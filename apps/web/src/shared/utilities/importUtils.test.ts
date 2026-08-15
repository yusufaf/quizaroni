import { describe, it, expect } from 'vitest';
import {
    resolveSeparator,
    parseDelimitedCards,
    parseAnkiExport,
    parseMarkdownCards,
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

describe('parseMarkdownCards', () => {
    it('round-trips the app\'s own "## Card N" export shape', () => {
        const text = [
            '## Card 1',
            '',
            '**Term:** Mitochondria',
            '',
            '**Definition:** The powerhouse of the cell',
            '',
            '## Card 2',
            '',
            '**Term:** DNA',
            '',
            '**Definition:** Genetic material',
            '',
        ].join('\n');
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards).toHaveLength(2);
        expect(cards[0]).toMatchObject({
            term: 'Mitochondria',
            definition: 'The powerhouse of the cell',
        });
        expect(cards[1]).toMatchObject({
            term: 'DNA',
            definition: 'Genetic material',
        });
    });

    it('preserves embedded newlines in Term/Definition, matching what DownloadSetModal writes for multiline cards', () => {
        // DownloadSetModal writes `**Definition:** ${definition}` verbatim,
        // so a definition containing "\n" produces a continuation line with
        // no "**Definition:**" prefix, e.g. multiline NewCardInput text.
        const text = [
            '## Card 1',
            '',
            '**Term:** Line one term',
            'Line two term',
            '',
            '**Definition:** Line one def',
            'Line two def',
            '',
        ].join('\n');
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({
            term: 'Line one term\nLine two term',
            definition: 'Line one def\nLine two def',
        });
    });

    it('parses **Notes:** bullets under a Card block into card.notes', () => {
        const text = [
            '## Card 1',
            '',
            '**Term:** Mitochondria',
            '',
            '**Definition:** The powerhouse of the cell',
            '',
            '**Notes:**',
            '- Found in eukaryotic cells',
            '- Has its own DNA',
            '',
        ].join('\n');
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards[0]?.notes.map((n) => n.text)).toEqual([
            'Found in eukaryotic cells',
            'Has its own DNA',
        ]);
    });

    it('skips the metadata header block (title/description/label/downloaded on)', () => {
        const text = [
            '# My Set',
            '',
            '## Description',
            'Some description',
            '',
            '## Label',
            'biology',
            '',
            '## Downloaded on',
            '1/1/2026',
            '',
            '## Card 1',
            '',
            '**Term:** A',
            '',
            '**Definition:** B',
            '',
        ].join('\n');
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({ term: 'A', definition: 'B' });
    });

    it('parses "Term:: Definition" lines', () => {
        const text =
            'Mitochondria:: Powerhouse of the cell\nDNA:: Genetic material';
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards).toHaveLength(2);
        expect(cards[0]).toMatchObject({
            term: 'Mitochondria',
            definition: 'Powerhouse of the cell',
        });
    });

    it('parses "- Term:: Definition" bulleted lines', () => {
        const text =
            '- Mitochondria:: Powerhouse of the cell\n* DNA:: Genetic material';
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards.map((c) => c.term)).toEqual(['Mitochondria', 'DNA']);
    });

    it('ignores blank lines and heading lines in the line-shape convention', () => {
        const text =
            '# Heading\n\nMitochondria:: Powerhouse of the cell\n\n## Sub';
        const { cards, error } = parseMarkdownCards(text);

        expect(error).toBeNull();
        expect(cards).toHaveLength(1);
    });

    it('errors with a helpful message when no cards are found', () => {
        const { cards, error } = parseMarkdownCards(
            'just some prose\nwith no markers'
        );
        expect(cards).toHaveLength(0);
        expect(error).toMatch(/no.*cards/i);
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

    it('routes markdown to the Markdown parser', () => {
        const { cards } = processImport('T:: D', 'markdown');
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
