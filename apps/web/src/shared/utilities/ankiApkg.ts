import { Card } from 'shared/types';
import { validateAndNormalizeCard } from './importUtils';

/**
 * Client-side parser for Anki `.apkg` packages: a zip archive containing a
 * SQLite `collection.anki2`/`.anki21`/`.anki21b` database (notes) plus media
 * files. Parsing happens entirely in the browser — no upload — since decks
 * may contain personal study data.
 *
 * `sql.js` and `fzstd` are dynamically imported so their WASM/JS payload
 * only loads when a user actually picks the .apkg import format.
 */

// Stable, locale-independent identifiers for each failure mode, so callers
// (ImportCardsModal) can map to a translated string instead of showing the
// English `error` message directly.
export type ApkgErrorKey =
    | 'tooLarge'
    | 'archiveUnreadable'
    | 'noCollection'
    | 'decompressFailed'
    | 'invalidCollection'
    | 'noCards';

export type ApkgParseResult = {
    cards: Card[];
    error: string | null;
    errorKey: ApkgErrorKey | null;
    mediaSkippedCount: number;
};

// Anki has used three collection-database entry names across export
// generations. Newer entries are zstd-compressed and preferred when present
// because they reflect the most recent export.
const COLLECTION_ENTRY_PRIORITY = [
    'collection.anki21b',
    'collection.anki21',
    'collection.anki2',
];

// Exported so the file-picker/drop-zone can reject an oversized file before
// reading it into memory, rather than only after the fact inside parseApkg.
export const MAX_APKG_BYTES = 100 * 1024 * 1024;

/**
 * Picks the collection database entry to read from an .apkg's file list,
 * preferring the newest schema generation present. Returns null if none of
 * the known entry names are found (not a valid Anki package).
 */
export const pickCollectionEntry = (names: string[]): string | null => {
    for (const candidate of COLLECTION_ENTRY_PRIORITY) {
        if (names.includes(candidate)) return candidate;
    }
    return null;
};

const NAMED_ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
};

/**
 * Converts an Anki note field's HTML into plain text: drops `[sound:…]` /
 * `<img>` media references (reporting that media was present), converts
 * block-level breaks to newlines, strips remaining tags, and decodes the
 * common HTML entities Anki fields use.
 */
export const stripAnkiHtml = (
    field: string
): { text: string; hadMedia: boolean } => {
    let hadMedia = false;
    let text = field;

    if (/\[sound:[^\]]*\]/i.test(text) || /<img\b[^>]*>/i.test(text)) {
        hadMedia = true;
    }

    text = text.replace(/\[sound:[^\]]*\]/gi, '');
    text = text.replace(/<img\b[^>]*>/gi, '');
    text = text.replace(/<br\s*\/?>|<\/?(div|p)\b[^>]*>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(
        /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/gi,
        (match) => NAMED_ENTITIES[match.toLowerCase()] ?? match
    );
    text = text.replace(/&#(\d+);/g, (_match, code) =>
        String.fromCharCode(Number(code))
    );
    text = text.replace(/\n{2,}/g, '\n');

    return { text: text.trim(), hadMedia };
};

/**
 * Parses an Anki `.apkg` file (already read into memory as bytes) into
 * validated Quizaroni cards. Media embedded in fields is stripped rather
 * than imported; `mediaSkippedCount` reports how many cards were affected so
 * callers can surface that to the user instead of silently dropping it.
 */
export const parseApkg = async (
    bytes: Uint8Array
): Promise<ApkgParseResult> => {
    if (bytes.byteLength > MAX_APKG_BYTES) {
        return {
            cards: [],
            error: 'This file is too large to be a valid Anki package.',
            errorKey: 'tooLarge',
            mediaSkippedCount: 0,
        };
    }

    let entries: Record<string, Uint8Array>;
    try {
        const { unzipSync } = await import('fflate');
        entries = unzipSync(bytes);
    } catch {
        return {
            cards: [],
            error: 'Could not read this file as an Anki package (.apkg) archive.',
            errorKey: 'archiveUnreadable',
            mediaSkippedCount: 0,
        };
    }

    const entryName = pickCollectionEntry(Object.keys(entries));
    if (!entryName) {
        return {
            cards: [],
            error: 'This does not look like a valid Anki package (no collection database found).',
            errorKey: 'noCollection',
            mediaSkippedCount: 0,
        };
    }

    // entryName was chosen from Object.keys(entries), so the lookup is safe.
    let dbBytes = entries[entryName] as Uint8Array;
    if (entryName.endsWith('21b')) {
        try {
            const { decompress } = await import('fzstd');
            dbBytes = decompress(dbBytes);
        } catch {
            return {
                cards: [],
                error: 'Could not decompress this Anki package.',
                errorKey: 'decompressFailed',
                mediaSkippedCount: 0,
            };
        }
    }

    let db: import('sql.js').Database | null = null;
    try {
        const initSqlJs = (await import('sql.js')).default;
        // eslint-disable-next-line import/no-unresolved -- Vite's `?url` asset import
        const wasmUrl = (await import('sql.js/dist/sql-wasm.wasm?url'))
            .default as string;
        const SQL = await initSqlJs({ locateFile: () => wasmUrl });
        db = new SQL.Database(dbBytes);

        const results = db.exec('SELECT flds, tags FROM notes');
        const rows = results[0]?.values ?? [];

        const cards: Card[] = [];
        let mediaSkippedCount = 0;

        rows.forEach((row) => {
            const [rawFlds, rawTags] = row as [string, string];
            const fields = rawFlds.split('\x1f');

            const front = stripAnkiHtml(fields[0] ?? '');
            const back = stripAnkiHtml(fields[1] ?? '');
            const categories = (rawTags ?? '')
                .split(/\s+/)
                .map((tag) => tag.trim())
                .filter(Boolean);

            const normalized = validateAndNormalizeCard({
                term: front.text,
                definition: back.text,
                categories,
            });

            if (normalized) {
                cards.push(normalized);
                if (front.hadMedia || back.hadMedia) {
                    mediaSkippedCount += 1;
                }
            }
        });

        return {
            cards,
            error:
                cards.length === 0
                    ? 'No valid cards found in this Anki package.'
                    : null,
            errorKey: cards.length === 0 ? 'noCards' : null,
            mediaSkippedCount,
        };
    } catch {
        return {
            cards: [],
            error: 'This does not look like a valid Anki collection database.',
            errorKey: 'invalidCollection',
            mediaSkippedCount: 0,
        };
    } finally {
        db?.close();
    }
};
