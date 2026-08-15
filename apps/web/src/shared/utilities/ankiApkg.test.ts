import { describe, it, expect, vi, afterEach } from 'vitest';
import { zipSync } from 'fflate';
import { pickCollectionEntry, stripAnkiHtml, parseApkg } from './ankiApkg';

/**
 * Builds a minimal `notes` table SQLite database (as sql.js would produce it
 * inside a real .apkg) with the given rows, and returns the raw bytes.
 */
const buildNotesDb = async (
    rows: { flds: string; tags?: string }[]
): Promise<Uint8Array> => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(
        'CREATE TABLE notes (id INTEGER PRIMARY KEY, guid TEXT, mid INTEGER, mod INTEGER, usn INTEGER, tags TEXT, flds TEXT, sfld TEXT, csum INTEGER, flags INTEGER, data TEXT)'
    );
    rows.forEach((row) => {
        db.run('INSERT INTO notes (flds, tags) VALUES (?, ?)', [
            row.flds,
            row.tags ?? '',
        ]);
    });
    const bytes = db.export();
    db.close();
    return bytes;
};

describe('pickCollectionEntry', () => {
    it('prefers collection.anki21b over anki21 over anki2', () => {
        expect(
            pickCollectionEntry([
                'collection.anki2',
                'collection.anki21',
                'collection.anki21b',
                'media',
            ])
        ).toBe('collection.anki21b');
        expect(
            pickCollectionEntry(['collection.anki2', 'collection.anki21'])
        ).toBe('collection.anki21');
        expect(pickCollectionEntry(['collection.anki2', 'media'])).toBe(
            'collection.anki2'
        );
    });

    it('returns null when no known collection entry is present', () => {
        expect(pickCollectionEntry(['media', 'media.json'])).toBeNull();
    });
});

describe('stripAnkiHtml', () => {
    it('strips <img> tags and reports media', () => {
        const { text, hadMedia } = stripAnkiHtml(
            'Front text <img src="pic.jpg"> more'
        );
        expect(text).toBe('Front text  more');
        expect(hadMedia).toBe(true);
    });

    it('strips [sound:...] tokens and reports media', () => {
        const { text, hadMedia } = stripAnkiHtml('Hola [sound:hola.mp3]');
        expect(text).toBe('Hola');
        expect(hadMedia).toBe(true);
    });

    it('converts <br> and block tags to newlines', () => {
        const { text } = stripAnkiHtml(
            'Line one<br>Line two<div>Line three</div>'
        );
        expect(text).toBe('Line one\nLine two\nLine three');
    });

    it('decodes common HTML entities', () => {
        const { text } = stripAnkiHtml('Tom &amp; Jerry &#39;s &lt;show&gt;');
        expect(text).toBe("Tom & Jerry 's <show>");
    });

    it('reports no media for plain text fields', () => {
        const { hadMedia } = stripAnkiHtml('Just plain text');
        expect(hadMedia).toBe(false);
    });
});

describe('parseApkg', () => {
    afterEach(() => {
        vi.doUnmock('fzstd');
    });

    it('parses a legacy collection.anki2 package into cards', async () => {
        const dbBytes = await buildNotesDb([
            {
                flds: 'Mitochondria\x1fThe powerhouse of the cell',
                tags: ' bio cell ',
            },
            { flds: 'DNA\x1fGenetic material', tags: '' },
        ]);
        const zipped = zipSync({ 'collection.anki2': dbBytes });

        const { cards, error, mediaSkippedCount } = await parseApkg(zipped);

        expect(error).toBeNull();
        expect(cards).toHaveLength(2);
        expect(cards[0]).toMatchObject({
            term: 'Mitochondria',
            definition: 'The powerhouse of the cell',
        });
        expect(cards[0]?.categories).toEqual(['bio', 'cell']);
        expect(cards[1]).toMatchObject({
            term: 'DNA',
            definition: 'Genetic material',
        });
        expect(mediaSkippedCount).toBe(0);
    });

    it('skips notes with an empty back field', async () => {
        const dbBytes = await buildNotesDb([
            { flds: 'OnlyFront\x1f' },
            { flds: 'Term\x1fDefinition' },
        ]);
        const zipped = zipSync({ 'collection.anki2': dbBytes });

        const { cards, error } = await parseApkg(zipped);

        expect(error).toBeNull();
        expect(cards).toHaveLength(1);
        expect(cards[0]?.term).toBe('Term');
    });

    it('strips media and counts affected cards', async () => {
        const dbBytes = await buildNotesDb([
            { flds: 'Hola [sound:hola.mp3]\x1fHello' },
            { flds: 'Term\x1fDefinition' },
        ]);
        const zipped = zipSync({ 'collection.anki2': dbBytes });

        const { cards, mediaSkippedCount } = await parseApkg(zipped);

        expect(cards[0]).toMatchObject({ term: 'Hola', definition: 'Hello' });
        expect(mediaSkippedCount).toBe(1);
    });

    it('errors when the archive has no recognizable collection entry', async () => {
        const zipped = zipSync({ 'media.json': new Uint8Array([1, 2, 3]) });

        const { cards, error } = await parseApkg(zipped);

        expect(cards).toHaveLength(0);
        expect(error).toMatch(/not a valid Anki package|Anki package/i);
    });

    it('decompresses a modern collection.anki21b package via fzstd', async () => {
        vi.doMock('fzstd', () => ({
            decompress: vi.fn((bytes: Uint8Array) => bytes),
        }));
        const { parseApkg: parseApkgFresh } = await import('./ankiApkg');
        const fzstd = await import('fzstd');

        const dbBytes = await buildNotesDb([{ flds: 'Term\x1fDefinition' }]);
        const zipped = zipSync({ 'collection.anki21b': dbBytes });

        const { cards, error } = await parseApkgFresh(zipped);

        expect(error).toBeNull();
        expect(cards).toHaveLength(1);
        expect(fzstd.decompress).toHaveBeenCalled();
    });
});
