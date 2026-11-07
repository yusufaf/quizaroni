import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import {
    addUser,
    openTestDb,
    rowOf,
    SET_ID,
    T0,
    T1,
    T2,
} from '../testing/studysets';
import { buildPublicCopy, copyPublicStudyset } from './copy-public';
import { createStudyset } from './store';

let current: ReturnType<typeof openTestDb> | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const OTHER_SET = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const FILE = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

const SOURCE_CARDS = [
    {
        cardUUID: 'c1',
        term: 'cell',
        definition: 'unit of life',
        notes: [{ noteUUID: 'n', text: 'secret note' }],
        categories: ['Cat'],
        important: true,
        backgroundColor: 'red',
        textColor: 'blue',
        files: [
            { key: `${SET_ID}/${FILE}`, association: 'term', name: 'me.png', size: 9 },
            { key: `${SET_ID}/user/legacy.png`, association: 'term' },
            { key: `${OTHER_SET}/${FILE}`, association: 'term' },
            { key: `${SET_ID}/${OTHER_SET}`, association: 'audio' },
        ],
    },
    'not a card',
    { cardUUID: 'c2', term: 7, definition: 'd' },
];

function publishedSource(db: Db, owner: string) {
    createStudyset(db, owner, { studysetUUID: SET_ID }, T0);
    db.update(studyset)
        .set({
            cards: SOURCE_CARDS as never,
            labels: ['secret label'],
            isPublic: true,
            publishedAt: T1,
            subject: 'science',
            featuredAt: T1,
            metadata: { authorNote: 'x' },
        })
        .where(eq(studyset.studysetUUID, SET_ID))
        .run();
    return rowOf(db, SET_ID)!;
}

describe('buildPublicCopy', () => {
    test('keeps only what the public page shows', () => {
        const db = freshDb();
        const source = publishedSource(db, addUser(db, 'a'));
        let n = 0;
        const copy = buildPublicCopy(source, {
            newUUID: 'new-id',
            now: T2,
            ownerId: 'b',
            username: 'bob',
            newId: () => `id${++n}`,
        });
        expect(copy.cards).toEqual([
            {
                cardUUID: 'id1',
                term: 'cell',
                definition: 'unit of life',
                categories: [],
                important: false,
                notes: [],
                files: [
                    {
                        key: `${SET_ID}/${FILE}`,
                        association: 'term',
                        size: 9,
                        signedURL: '',
                        name: 'Term image',
                    },
                ],
            },
            {
                cardUUID: 'id2',
                term: '',
                definition: 'd',
                categories: [],
                important: false,
                notes: [],
                files: [],
            },
        ]);
        expect(copy).toMatchObject({
            ownerId: 'b',
            username: 'bob',
            labels: [],
            categories: [],
            copiedFrom: SET_ID,
            isPublic: false,
            saveCount: 0,
            subject: null,
            publishedAt: null,
            hiddenAt: null,
            featuredAt: null,
        });
        expect(copy.metadata).not.toHaveProperty('authorNote');
    });
});

describe('copyPublicStudyset', () => {
    test('saves a copy with re-keyed files and counts the save', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b', 'bob');
        const before = publishedSource(db, a);
        const result = copyPublicStudyset(db, b, SET_ID, T2);
        if (result.status !== 'ok') throw new Error(result.status);
        const id = result.studyset.studysetUUID;
        const key = (rowOf(db, id)!.cards[0]!.files as { key: string }[])[0]!
            .key;
        expect(key).toStartWith(`${id}/`);
        expect(result.fileCopies).toEqual([{ from: `${SET_ID}/${FILE}`, to: key }]);
        expect(result.studyset).toMatchObject({
            userUUID: b,
            username: 'bob',
            copiedFrom: { studysetUUID: SET_ID },
        });
        expect(rowOf(db, SET_ID)).toEqual({ ...before, saveCount: 1 });
    });

    test.each([
        ['unpublished', { isPublic: false }],
        ['hidden', { hiddenAt: T2 }],
        ['never published', { publishedAt: null }],
    ])('a %s source is not found', (_name, change) => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        publishedSource(db, a);
        db.update(studyset)
            .set(change)
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        expect(copyPublicStudyset(db, b, SET_ID)).toEqual({
            status: 'not_found',
        });
        expect(rowOf(db, SET_ID)?.saveCount).toBe(0);
    });

    test('a missing source is not found', () => {
        const db = freshDb();
        const b = addUser(db, 'b');
        expect(copyPublicStudyset(db, b, SET_ID)).toEqual({
            status: 'not_found',
        });
    });
});
