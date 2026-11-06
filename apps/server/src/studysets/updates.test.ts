import { describe, expect, test } from 'bun:test';
import {
    collectCardFileKeys,
    disallowedCardFileKeys,
    isStudysetUUID,
    parseStudysetUpdates,
    studysetUUIDOfKey,
} from './updates';

const SET_ID = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const OTHER_ID = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const NOW = '2026-08-25T00:00:00.000Z';
const CARD = {
    cardUUID: 'c1',
    term: 't',
    definition: 'd',
    files: [],
    categories: [],
    important: false,
    notes: [],
};

// A set as CreateSet gets it from get-studyset: every stored attribute.
const FETCHED_SET = {
    cards: [CARD],
    categories: ['A'],
    createdAt: '2026-01-01T00:00:00.000Z',
    description: 'desc',
    favorited: false,
    labels: ['l1'],
    lastViewed: '2026-02-01T00:00:00.000Z',
    metadata: {
        publiclyViewable: true,
        textColorVisible: true,
        viewSetLayout: 'grid',
    },
    publishedAt: '2026-01-02T00:00:00.000Z',
    studysetUUID: SET_ID,
    subject: 'science',
    title: 'Title',
    username: 'author',
    userUUID: 'u1',
    updatedAt: '2026-01-03T00:00:00.000Z',
    updatedBy: 'someone',
    moderation: { hiddenAt: null },
    copiedFrom: 's0',
    featuredAt: '2026-01-04T00:00:00.000Z',
};

const FULL_SAVE = {
    fields: {
        cards: [CARD],
        categories: ['A'],
        description: 'edited',
        favorited: false,
        labels: ['l2'],
        lastViewed: new Date('2026-02-01T00:00:00.000Z'),
        title: 'Edited',
    },
    metadata: { textColorVisible: true, viewSetLayout: 'grid' },
};

function ok(updates: unknown, isMetadataUpdate = false) {
    const result = parseStudysetUpdates(updates, isMetadataUpdate);
    if (!result.ok) throw new Error(`rejected: ${result.message}`);
    return result.value;
}

describe('parseStudysetUpdates', () => {
    test('ignores server-written, publication, identity and author fields', () => {
        expect(
            ok({
                title: 'T',
                updatedAt: '2020-01-01T00:00:00.000Z',
                updatedBy: 'x',
                publishedAt: NOW,
                subject: 's',
                moderation: { hiddenAt: NOW },
                featuredAt: NOW,
                copiedFrom: OTHER_ID,
                studysetUUID: OTHER_ID,
                userUUID: 'u2',
                createdAt: NOW,
                uuid: 'x',
                PK: 'x',
                SK: 'x',
                username: 'someone',
            })
        ).toEqual({ fields: { title: 'T' }, metadata: {} });
    });

    test('drops unknown, empty and prototype keys', () => {
        const updates = JSON.parse(
            '{"title":"T","notAField":1,"":1,"__proto__":{"x":1}}'
        );
        expect(ok(updates)).toEqual({ fields: { title: 'T' }, metadata: {} });
    });

    test('a full save patches metadata without publiclyViewable', () => {
        expect(
            ok({ metadata: { publiclyViewable: true, textColorVisible: true } })
                .metadata
        ).toEqual({ textColorVisible: true });
    });

    test('a metadata update patches every key but the dropped ones', () => {
        expect(
            ok({ notesSortBy: 'date', publiclyViewable: true, '': 1 }, true)
        ).toEqual({ fields: {}, metadata: { notesSortBy: 'date' } });
    });

    test('a metadata update never touches the prototype', () => {
        const updates = JSON.parse('{"__proto__":{"x":1},"contentOnly":true}');
        const write = ok(updates, true);
        expect(write.metadata).toEqual({ contentOnly: true });
        expect(({} as { x?: number }).x).toBeUndefined();
    });

    test('drops a metadata value that is not an object', () => {
        expect(ok({ title: 'T', metadata: null }).metadata).toEqual({});
        expect(ok({ title: 'T', metadata: [1] }).metadata).toEqual({});
    });

    test.each([
        [[]],
        ['x'],
        [null],
        [{ title: 1 }],
        [{ favorited: 'yes' }],
        [{ lastViewed: 'yesterday' }],
        [{ labels: [1] }],
        [{ categories: 'A' }],
        [JSON.parse('{"title":"T","x":1e999}')],
    ])('rejects %p', (updates) => {
        expect(parseStudysetUpdates(updates, false)).toEqual({
            ok: false,
            status: 400,
            message: 'Invalid updates',
        });
    });

    test('rejects very deep nesting without throwing', () => {
        let deep: unknown = [];
        for (let i = 0; i < 100_000; i++) deep = [deep];
        expect(parseStudysetUpdates({ cards: deep }, false)).toMatchObject({
            ok: false,
            status: 400,
        });
    });

    test.each([
        ['x'],
        [[1]],
        [[{ files: 'x' }]],
        [[{ files: [{ key: 42 }] }]],
    ])('rejects cards %p', (cards) => {
        expect(parseStudysetUpdates({ cards }, false)).toEqual({
            ok: false,
            status: 400,
            message: 'Invalid cards',
        });
    });

    test('a metadata update skips card checks', () => {
        expect(
            ok({ cards: [{ files: [{ key: 42 }] }] }, true).fields
        ).toEqual({});
    });
});

describe('web callers keep the fields they edit (#204)', () => {
    test.each([
        [
            'CreateSet full save',
            {
                ...FETCHED_SET,
                title: 'Edited',
                description: 'edited',
                labels: ['l2'],
            },
            false,
            FULL_SAVE,
        ],
        [
            'CombineSets',
            {
                title: 'T',
                cards: [CARD],
                description: 'd',
                labels: ['l'],
                metadata: { publiclyViewable: true, terminology: 'x' },
            },
            false,
            {
                fields: {
                    title: 'T',
                    cards: [CARD],
                    description: 'd',
                    labels: ['l'],
                },
                metadata: { terminology: 'x' },
            },
        ],
        [
            'ManageCategoriesDialog rename/delete',
            { cards: [CARD], categories: ['A', 'B'] },
            false,
            {
                fields: { cards: [CARD], categories: ['A', 'B'] },
                metadata: {},
            },
        ],
        [
            'ManageCategoriesDialog create/import',
            { categories: ['A'] },
            false,
            { fields: { categories: ['A'] }, metadata: {} },
        ],
        [
            'SuggestedCards / mark important / reorder',
            { cards: [CARD] },
            false,
            { fields: { cards: [CARD] }, metadata: {} },
        ],
        [
            'favorite toggle',
            { favorited: true },
            false,
            { fields: { favorited: true }, metadata: {} },
        ],
        [
            'ViewStudySet lastViewed',
            { lastViewed: NOW },
            false,
            { fields: { lastViewed: new Date(NOW) }, metadata: {} },
        ],
        [
            'NotesDrawer',
            { notesSortBy: 'date', notesSortDirection: 'asc' },
            true,
            {
                fields: {},
                metadata: { notesSortBy: 'date', notesSortDirection: 'asc' },
            },
        ],
        [
            'PrintDialog',
            { printConfig: { layout: 'grid' } },
            true,
            { fields: {}, metadata: { printConfig: { layout: 'grid' } } },
        ],
        [
            'StudysetActions control menu',
            { contentOnly: true },
            true,
            { fields: {}, metadata: { contentOnly: true } },
        ],
        // The whole local Dexie row, which may hold server fields from an import.
        [
            'SyncEngine',
            {
                ...FETCHED_SET,
                title: 'Edited',
                description: 'edited',
                labels: ['l2'],
                uuid: 's1',
            },
            false,
            FULL_SAVE,
        ],
    ])('%s', (_caller, updates, isMetadataUpdate, expected) => {
        expect(ok(updates, isMetadataUpdate)).toEqual(expected);
    });
});

describe('isStudysetUUID', () => {
    test('accepts a lowercase UUID only', () => {
        expect(isStudysetUUID(SET_ID)).toBe(true);
        expect(isStudysetUUID(SET_ID.toUpperCase())).toBe(false);
        for (const value of ['abc', '', 42, null]) {
            expect(isStudysetUUID(value)).toBe(false);
        }
    });
});

describe('card file keys', () => {
    const card = (...keys: unknown[]) => ({
        files: keys.map((key) => ({ key })),
    });

    test('collects string keys and skips empty ones', () => {
        const { keys, malformed } = collectCardFileKeys([
            card(`${SET_ID}/f1`, '', null),
            { term: 'no files' },
        ]);
        expect(malformed).toBe(false);
        expect([...keys]).toEqual([`${SET_ID}/f1`]);
    });

    test('a key names the set in its first segment, legacy layout included', () => {
        expect(studysetUUIDOfKey(`${SET_ID}/f1`)).toBe(SET_ID);
        expect(studysetUUIDOfKey(`${SET_ID}/user/name.png`)).toBe(SET_ID);
        expect(studysetUUIDOfKey(`${SET_ID}/`)).toBeUndefined();
        expect(studysetUUIDOfKey('f1')).toBeUndefined();
    });

    test('allows own keys and already-stored foreign keys only', () => {
        const stored = [card(`${OTHER_ID}/kept`)];
        expect(
            disallowedCardFileKeys(
                [
                    card(
                        `${SET_ID}/mine`,
                        `${OTHER_ID}/kept`,
                        `${OTHER_ID}/new`,
                        `${SET_ID.toUpperCase()}/shouty`
                    ),
                ],
                SET_ID,
                stored
            )
        ).toEqual([`${OTHER_ID}/new`, `${SET_ID.toUpperCase()}/shouty`]);
    });
});
