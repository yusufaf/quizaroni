import { z } from 'zod';
import {
    isPlainObject,
    isStorableValue,
    type JsonObject,
    type ParseResult,
} from '../users/metadata';

// The display settings a brand-new set starts with (the Lambda's
// defaultStudysetMetadata).
export const DEFAULT_STUDYSET_METADATA: Readonly<JsonObject> = Object.freeze({
    backgroundColorVisible: false,
    cardCountVisible: true,
    contentOnly: false,
    customLabelTerminology: '',
    customTerminology: '',
    labelTerminology: 'Card',
    notesDrawerInitial: 'open',
    notesDrawerPosition: 'right',
    publiclyViewable: false,
    terminology: 'Term/Definition',
    textColorVisible: false,
});

export const CLIENT_EDITABLE_STUDYSET_FIELDS = [
    'cards',
    'categories',
    'description',
    'favorited',
    'labels',
    'lastViewed',
    'title',
] as const;

// DynamoDB's item limit, which a set had to fit before.
export const MAX_STUDYSET_BYTES = 400 * 1024;

const uuidSchema = z.uuid();

// Lowercase only, the form crypto.randomUUID() makes, so one id can't be
// stored twice under different letter cases.
export function isStudysetUUID(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value === value.toLowerCase() &&
        uuidSchema.safeParse(value).success
    );
}

export const MAX_BATCH_STUDYSETS = 500;

export function parseStudysetUUIDList(
    value: unknown,
    max: number
): ParseResult<string[]> {
    if (
        !Array.isArray(value) ||
        !value.every(isStudysetUUID) ||
        new Set(value).size !== value.length
    ) {
        return invalid('Invalid studysetUUIDs');
    }
    if (value.length > max) return invalid('Too many study sets');
    return { ok: true, value };
}

export type StudysetFields = {
    title?: string;
    description?: string;
    favorited?: boolean;
    lastViewed?: Date;
    cards?: JsonObject[];
    categories?: string[];
    labels?: string[];
};

// `metadata` is a per-key patch over the stored metadata.
export type StudysetWrite = { fields: StudysetFields; metadata: JsonObject };

export const EMPTY_WRITE: StudysetWrite = Object.freeze({
    fields: Object.freeze({}),
    metadata: Object.freeze({}),
}) as StudysetWrite;

// publiclyViewable belongs to publishing (#261), never to a save.
const DROPPED_METADATA_KEYS = new Set(['', '__proto__', 'publiclyViewable']);

function pickMetadataPatch(source: JsonObject): JsonObject {
    const patch: JsonObject = {};
    for (const [key, value] of Object.entries(source)) {
        if (!DROPPED_METADATA_KEYS.has(key)) patch[key] = value;
    }
    return patch;
}

const FIELD_SCHEMAS = {
    title: z.string(),
    description: z.string(),
    favorited: z.boolean(),
    lastViewed: z.iso.datetime().transform((value) => new Date(value)),
    categories: z.array(z.string()),
    labels: z.array(z.string()),
} as const;

const invalid = (message: string): ParseResult<never> => ({
    ok: false,
    status: 400,
    message,
});

// Lambda rules: allowlisted fields, a per-key metadata patch, every other key
// dropped silently. Unlike the Lambda, each field must also have its type.
export function parseStudysetUpdates(
    updates: unknown,
    isMetadataUpdate: boolean
): ParseResult<StudysetWrite> {
    if (!isPlainObject(updates) || !isStorableValue(updates)) {
        return invalid('Invalid updates');
    }
    if (isMetadataUpdate) {
        return {
            ok: true,
            value: { fields: {}, metadata: pickMetadataPatch(updates) },
        };
    }

    const fields: StudysetFields = {};
    if (Object.hasOwn(updates, 'cards')) {
        const { malformed } = collectCardFileKeys(updates.cards);
        if (malformed) return invalid('Invalid cards');
        fields.cards = updates.cards as JsonObject[];
    }
    for (const [name, schema] of Object.entries(FIELD_SCHEMAS)) {
        if (!Object.hasOwn(updates, name)) continue;
        const parsed = schema.safeParse(updates[name]);
        if (!parsed.success) return invalid('Invalid updates');
        (fields as Record<string, unknown>)[name] = parsed.data;
    }
    const metadata = isPlainObject(updates.metadata)
        ? pickMetadataPatch(updates.metadata)
        : {};
    return { ok: true, value: { fields, metadata } };
}

// The file keys a client-sent `cards` value names. `malformed` flags any shape
// a stored card can't have, so the caller can reject it.
export function collectCardFileKeys(cards: unknown): {
    keys: Set<string>;
    malformed: boolean;
} {
    const keys = new Set<string>();
    if (!Array.isArray(cards)) return { keys, malformed: true };

    let malformed = false;
    for (const card of cards) {
        if (!isPlainObject(card)) {
            malformed = true;
            continue;
        }
        const { files } = card;
        if (files === undefined || files === null) continue;
        if (!Array.isArray(files)) {
            malformed = true;
            continue;
        }
        for (const file of files) {
            if (!isPlainObject(file)) {
                malformed = true;
                continue;
            }
            const { key } = file;
            if (key === undefined || key === null || key === '') continue;
            if (typeof key !== 'string') {
                malformed = true;
                continue;
            }
            keys.add(key);
        }
    }
    return { keys, malformed };
}

const UNSAFE_SEGMENTS = new Set(['', '.', '..']);

// A card file's set is the first segment of its key, in both the opaque
// (`set/file`) and the legacy (`set/user/name`) layouts. A key is later joined
// into a storage path (#259), so one that could leave its folder names none.
export function studysetUUIDOfKey(key: unknown): string | undefined {
    if (typeof key !== 'string') return undefined;
    if (/[\\\0]/.test(key)) return undefined;
    const parts = key.split('/');
    if (parts.length < 2 || parts.some((part) => UNSAFE_SEGMENTS.has(part))) {
        return undefined;
    }
    return isStudysetUUID(parts[0]) ? parts[0] : undefined;
}

// The keys this write can't store as they are: neither under this set nor
// already held by it.
export function disallowedCardFileKeys(
    cards: JsonObject[],
    studysetUUID: string,
    storedCards: JsonObject[]
): string[] {
    const stored = collectCardFileKeys(storedCards).keys;
    return [...collectCardFileKeys(cards).keys].filter(
        (key) => studysetUUIDOfKey(key) !== studysetUUID && !stored.has(key)
    );
}

export type FileCopy = { from: string; to: string };

// Gives the chosen card files new keys under this set, and lists the copies
// that makes necessary. A key shared by several cards maps to one new key.
export function planCardFileCopies(
    cards: JsonObject[],
    studysetUUID: string,
    shouldRekey: (key: string) => boolean = () => true,
    newFileKey: () => string = () => `${studysetUUID}/${crypto.randomUUID()}`
): { cards: JsonObject[]; copies: FileCopy[] } {
    const newKeys = new Map<string, string>();
    const rekey = (oldKey: string) => {
        let newKey = newKeys.get(oldKey);
        if (!newKey) {
            newKey = newFileKey();
            newKeys.set(oldKey, newKey);
        }
        return newKey;
    };
    const rekeyed = cards.map((card) => {
        if (!Array.isArray(card.files)) return card;
        return {
            ...card,
            files: card.files.map((file: unknown) => {
                if (!isPlainObject(file)) return file;
                const { key } = file;
                return typeof key === 'string' && key !== '' && shouldRekey(key)
                    ? { ...file, key: rekey(key) }
                    : file;
            }),
        };
    });
    return {
        cards: rekeyed,
        copies: [...newKeys].map(([from, to]) => ({ from, to })),
    };
}
