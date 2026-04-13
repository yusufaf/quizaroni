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
