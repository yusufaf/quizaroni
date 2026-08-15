import { Card } from 'shared/types';
import { EMPTY_CARD } from 'constants/index';

/**
 * Parses JSON string and returns parsed object or null on error
 */
export const parseImportedJSON = (
    jsonString: string
): { parsed: unknown; error: string | null } => {
    try {
        const parsed = JSON.parse(jsonString);
        return { parsed, error: null };
    } catch (err) {
        return {
            parsed: null,
            error: 'Invalid JSON format. Please check your input.',
        };
    }
};

/**
 * Normalizes parsed JSON to an array of raw card objects
 * Accepts both single object and array of objects
 */
export const normalizeToCardArray = (
    parsed: unknown
): { rawCards: any[]; error: string | null } => {
    // Check if it's an object
    if (typeof parsed === 'object' && parsed !== null) {
        // If it's an array, return it
        if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
                return { rawCards: [], error: 'Empty array provided' };
            }
            return { rawCards: parsed, error: null };
        }
        // If it's a single object, wrap it in an array
        return { rawCards: [parsed], error: null };
    }

    return { rawCards: [], error: 'Invalid data structure' };
};

/**
 * Validates and normalizes a single raw card object
 * Returns normalized Card object or null if invalid
 */
export const validateAndNormalizeCard = (rawCard: any): Card | null => {
    // Check if rawCard is an object
    if (typeof rawCard !== 'object' || rawCard === null) {
        return null;
    }

    // Required fields check
    if (
        !rawCard.term ||
        typeof rawCard.term !== 'string' ||
        !rawCard.term.trim()
    ) {
        return null;
    }

    if (
        !rawCard.definition ||
        typeof rawCard.definition !== 'string' ||
        !rawCard.definition.trim()
    ) {
        return null;
    }

    // Normalize with EMPTY_CARD defaults
    const normalized: Card = {
        term: rawCard.term.trim(),
        definition: rawCard.definition.trim(),
        cardUUID: rawCard.cardUUID || crypto.randomUUID(),
        categories: Array.isArray(rawCard.categories)
            ? rawCard.categories.filter((cat: any) => typeof cat === 'string')
            : [],
        files: Array.isArray(rawCard.files) ? rawCard.files : [],
        notes: Array.isArray(rawCard.notes) ? rawCard.notes : [],
        important: rawCard.important === true,
        backgroundColor: rawCard.backgroundColor || undefined,
        textColor: rawCard.textColor || undefined,
    };

    return normalized;
};

/* ============================================================================
 * Delimited-text imports (Quizlet / Anki)
 *
 * Quizlet and Anki both export cards as delimited plain text: each row is a
 * card, with a field separator between term and definition and a row separator
 * between cards. This lets users migrate their existing decks by pasting an
 * export instead of hand-authoring JSON.
 * ==========================================================================*/

export type ImportFormat = 'json' | 'quizlet' | 'anki' | 'markdown' | 'apkg';

/**
 * Named separators offered by the Quizlet/Anki export UIs, mapped to the actual
 * characters they represent.
 */
const NAMED_SEPARATORS: Record<string, string> = {
    tab: '\t',
    comma: ',',
    semicolon: ';',
    space: ' ',
    pipe: '|',
    colon: ':',
    newline: '\n',
    blankline: '\n\n',
};

/**
 * Resolves a separator descriptor to the literal string it represents. Accepts
 * a named token ('tab', 'newline', …), a literal character, or a value with
 * escape sequences (`\t`, `\n`) typed by the user in a custom field.
 */
export const resolveSeparator = (value: string): string => {
    const token = value.trim().toLowerCase();
    const named = NAMED_SEPARATORS[token];
    if (named !== undefined) {
        return named;
    }
    return value.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
};

/**
 * Parses delimited text into validated cards using the given separators.
 * Each row is split on the first occurrence of the field separator so that
 * definitions may themselves contain the separator character.
 */
export const parseDelimitedCards = (
    text: string,
    fieldSeparator: string,
    rowSeparator: string
): { cards: Card[]; error: string | null } => {
    const fieldSep = resolveSeparator(fieldSeparator);
    const rowSep = resolveSeparator(rowSeparator);

    if (!fieldSep) {
        return { cards: [], error: 'Missing term/definition separator' };
    }
    if (!rowSep) {
        return { cards: [], error: 'Missing row separator' };
    }

    // Normalize line endings so newline separators behave across platforms.
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = normalized.split(rowSep);

    const cards: Card[] = [];
    let sawSeparator = false;

    rows.forEach((rawRow) => {
        const row = rawRow.trim();
        if (!row) return;

        const sepIndex = row.indexOf(fieldSep);
        if (sepIndex === -1) return;

        sawSeparator = true;
        const term = row.slice(0, sepIndex).trim();
        const definition = row.slice(sepIndex + fieldSep.length).trim();

        const normalizedCard = validateAndNormalizeCard({ term, definition });
        if (normalizedCard) {
            cards.push(normalizedCard);
        }
    });

    if (cards.length === 0) {
        return {
            cards: [],
            error: sawSeparator
                ? 'No valid cards found. Each row needs both a term and a definition.'
                : 'No rows contained the chosen separator between term and definition. Check your separator settings.',
        };
    }

    return { cards, error: null };
};

/**
 * Parses an Anki "Notes in Plain Text" (.txt) export. Strips the leading
 * `#`-prefixed header lines, honoring a `#separator:` directive if present
 * (defaults to tab). The first field is the term, the second the definition.
 */
export const parseAnkiExport = (
    text: string
): { cards: Card[]; error: string | null } => {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    let fieldSeparator = 'tab';
    const contentLines: string[] = [];

    lines.forEach((line) => {
        if (line.startsWith('#')) {
            const match = line.match(/^#separator:(.+)$/i);
            if (match && match[1]) {
                fieldSeparator = match[1].trim();
            }
            return;
        }
        contentLines.push(line);
    });

    return parseDelimitedCards(
        contentLines.join('\n'),
        fieldSeparator,
        'newline'
    );
};

/* ============================================================================
 * Markdown import
 *
 * Accepts two conventions:
 *  - The app's own Markdown export shape (`## Card N` blocks with
 *    `**Term:**` / `**Definition:**` / `**Notes:**`), so a downloaded set can
 *    be re-imported unchanged.
 *  - A simple line-oriented `Term:: Definition` convention (optionally
 *    bulleted with `-`/`*`), for hand-written or third-party Markdown notes.
 * ==========================================================================*/

const MD_CARD_HEADING = /^##\s*Card\s+\d+/i;
const MD_TERM_LINE = /^\*\*Term:\*\*\s*(.*)$/i;
const MD_DEFINITION_LINE = /^\*\*Definition:\*\*\s*(.*)$/i;
const MD_NOTES_LINE = /^\*\*Notes:\*\*\s*$/i;
const MD_BULLET_LINE = /^[-*]\s+(.*)$/;
const MD_LINE_SHAPE = /^[-*]?\s*(.+?)\s*::\s*(.+)$/;

/**
 * Parses the app's own `## Card N` / `**Term:**` / `**Definition:**` export
 * shape, including optional `**Notes:**` bullet lists under a card. Lines
 * outside of a `## Card N` block (e.g. the `# Title` / `## Description` /
 * `## Label` / `## Downloaded on` metadata header) are ignored.
 */
const parseMarkdownCardBlocks = (
    lines: string[]
): { cards: Card[]; error: string | null } => {
    const cards: Card[] = [];

    let inCard = false;
    let term: string | null = null;
    let definition: string | null = null;
    let inNotes = false;
    let notes: string[] = [];

    const flush = () => {
        if (term && definition) {
            const normalized = validateAndNormalizeCard({
                term,
                definition,
                notes: notes.map((text) => ({
                    text,
                    noteUUID: crypto.randomUUID(),
                })),
            });
            if (normalized) {
                cards.push(normalized);
            }
        }
        term = null;
        definition = null;
        inNotes = false;
        notes = [];
    };

    lines.forEach((line) => {
        if (MD_CARD_HEADING.test(line)) {
            if (inCard) flush();
            inCard = true;
            return;
        }
        if (!inCard) return;

        const termMatch = line.match(MD_TERM_LINE);
        if (termMatch) {
            term = (termMatch[1] ?? '').trim();
            inNotes = false;
            return;
        }

        const definitionMatch = line.match(MD_DEFINITION_LINE);
        if (definitionMatch) {
            definition = (definitionMatch[1] ?? '').trim();
            inNotes = false;
            return;
        }

        if (MD_NOTES_LINE.test(line)) {
            inNotes = true;
            return;
        }

        if (inNotes) {
            const bulletMatch = line.match(MD_BULLET_LINE);
            if (bulletMatch) {
                const noteText = (bulletMatch[1] ?? '').trim();
                if (noteText) notes.push(noteText);
            }
        }
    });

    if (inCard) flush();

    if (cards.length === 0) {
        return {
            cards: [],
            error: 'No valid cards found. Each Card block needs both a **Term:** and a **Definition:** line.',
        };
    }

    return { cards, error: null };
};

/**
 * Parses simple `Term:: Definition` lines (optionally bulleted with `-`/`*`).
 * Blank lines and Markdown headings are ignored.
 */
const parseMarkdownLineShape = (
    lines: string[]
): { cards: Card[]; error: string | null } => {
    const cards: Card[] = [];

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) return;

        const match = line.match(MD_LINE_SHAPE);
        if (!match) return;

        const term = (match[1] ?? '').trim();
        const definition = (match[2] ?? '').trim();
        const normalized = validateAndNormalizeCard({ term, definition });
        if (normalized) {
            cards.push(normalized);
        }
    });

    if (cards.length === 0) {
        return {
            cards: [],
            error: 'No valid cards found. Use "Term:: Definition" on each line.',
        };
    }

    return { cards, error: null };
};

/**
 * Parses Markdown into validated cards, auto-detecting whether the text uses
 * the app's own export shape or the simpler `Term:: Definition` line shape.
 */
export const parseMarkdownCards = (
    text: string
): { cards: Card[]; error: string | null } => {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    const usesCardBlockShape = lines.some((line) => MD_TERM_LINE.test(line));

    return usesCardBlockShape
        ? parseMarkdownCardBlocks(lines)
        : parseMarkdownLineShape(lines);
};

/**
 * Format-aware import entry point used by the import modal. Delegates to the
 * JSON, Quizlet, or Anki parser based on the selected format.
 */
export const processImport = (
    text: string,
    format: ImportFormat,
    options?: { fieldSeparator?: string; rowSeparator?: string }
): { cards: Card[]; error: string | null } => {
    switch (format) {
        case 'quizlet':
            return parseDelimitedCards(
                text,
                options?.fieldSeparator ?? 'tab',
                options?.rowSeparator ?? 'newline'
            );
        case 'anki':
            return parseAnkiExport(text);
        case 'markdown':
            return parseMarkdownCards(text);
        case 'apkg':
            // Binary format: parsed asynchronously via parseApkg() in
            // ankiApkg.ts, not through this synchronous text pipeline.
            return {
                cards: [],
                error: 'Anki .apkg files must be parsed with parseApkg(), not processImport().',
            };
        case 'json':
        default:
            return processImportedCards(text);
    }
};

/**
 * Main import processing function
 * Takes JSON string and returns validated cards array or error
 */
export const processImportedCards = (
    jsonString: string
): { cards: Card[]; error: string | null } => {
    // Step 1: Parse JSON
    const { parsed, error: parseError } = parseImportedJSON(jsonString);
    if (parseError) {
        return { cards: [], error: parseError };
    }

    // Step 2: Normalize to array
    const { rawCards, error: normalizeError } = normalizeToCardArray(parsed);
    if (normalizeError) {
        return { cards: [], error: normalizeError };
    }

    // Step 3: Validate and normalize each card
    const validCards: Card[] = [];
    const invalidCount: number[] = [];

    rawCards.forEach((rawCard, index) => {
        const normalized = validateAndNormalizeCard(rawCard);
        if (normalized) {
            validCards.push(normalized);
        } else {
            invalidCount.push(index);
        }
    });

    // Step 4: Return results
    if (validCards.length === 0) {
        if (invalidCount.length > 0) {
            return {
                cards: [],
                error: "No valid cards found. Cards must have 'term' and 'definition' fields.",
            };
        }
        return { cards: [], error: 'No cards found to import' };
    }

    // Success - return valid cards (potentially with a warning if some were invalid)
    return { cards: validCards, error: null };
};
