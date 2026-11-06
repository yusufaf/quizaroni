import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { closeDatabase, type Db, openDatabase } from '../db';
import { studyset, user, userProfile } from '../db/schema';
import {
    createStudyset,
    deleteStudyset,
    getStudyset,
    listStudysets,
    restampAuthor,
    StudysetTooLargeError,
    updateStudyset,
} from './store';
import { DEFAULT_STUDYSET_METADATA, type StudysetWrite } from './updates';

let root: string | undefined;
let sqlite: Database | undefined;

function freshDb(): Db {
    root = mkdtempSync(join(tmpdir(), 'qz-studysets-'));
    const opened = openDatabase(root);
    sqlite = opened.sqlite;
    return opened.db;
}

afterEach(() => {
    if (sqlite) closeDatabase(sqlite);
    sqlite = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

const T0 = new Date('2026-11-01T10:00:00.000Z');
const T1 = new Date('2026-11-02T10:00:00.000Z');
const T2 = new Date('2026-11-03T10:00:00.000Z');
const SET_ID = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const OTHER_ID = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';

function addUser(db: Db, id: string, username?: string): string {
    db.insert(user)
        .values({
            id,
            name: id,
            email: `${id}@example.com`,
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    if (username !== undefined) {
        db.insert(userProfile)
            .values({
                userId: id,
                username,
                metadata: {},
                labels: [],
                updatedAt: T0,
            })
            .run();
    }
    return id;
}

const write = (
    fields: StudysetWrite['fields'] = {},
    metadata: StudysetWrite['metadata'] = {}
): StudysetWrite => ({ fields, metadata });

const fileCard = (key: string) => ({ term: 't', files: [{ key }] });

function rowOf(db: Db, id: string) {
    return db
        .select()
        .from(studyset)
        .where(eq(studyset.studysetUUID, id))
        .get();
}

function created(result: ReturnType<typeof createStudyset>) {
    if (result.status !== 'ok') throw new Error(result.status);
    return result.studyset;
}

describe('createStudyset', () => {
    test('starts with the Lambda defaults and the author name', () => {
        const db = freshDb();
        const a = addUser(db, 'a', 'ada');
        const set = created(createStudyset(db, a, {}, T0));
        expect(set).toEqual({
            studysetUUID: expect.stringMatching(/^[0-9a-f-]{36}$/),
            userUUID: a,
            username: 'ada',
            title: 'Untitled Studyset',
            description: '',
            favorited: false,
            cards: [],
            categories: [],
            labels: [],
            metadata: { ...DEFAULT_STUDYSET_METADATA },
            lastViewed: T0.toISOString(),
            createdAt: T0.toISOString(),
            updatedAt: T0.toISOString(),
        });
    });

    test('has no author name without a profile', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        expect(created(createStudyset(db, a)).username).toBeNull();
    });

    test('keeps a client id and its editable fields', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const set = created(
            createStudyset(
                db,
                a,
                {
                    studysetUUID: SET_ID,
                    write: write(
                        { title: 'Offline', cards: [{ term: 'x' }] },
                        { textColorVisible: true }
                    ),
                },
                T0
            )
        );
        expect(set).toMatchObject({
            studysetUUID: SET_ID,
            title: 'Offline',
            cards: [{ term: 'x' }],
            metadata: {
                ...DEFAULT_STUDYSET_METADATA,
                textColorVisible: true,
                publiclyViewable: false,
            },
        });
    });

    test('a repeated create of an own id applies the newer write', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        createStudyset(
            db,
            a,
            { studysetUUID: SET_ID, write: write({ title: 'One' }) },
            T0
        );
        const again = created(
            createStudyset(
                db,
                a,
                { studysetUUID: SET_ID, write: write({ title: 'Two' }) },
                T1
            )
        );
        expect(again).toMatchObject({
            title: 'Two',
            createdAt: T0.toISOString(),
            updatedAt: T1.toISOString(),
        });
        expect(listStudysets(db, a)).toHaveLength(1);
    });

    test("refuses another owner's id and leaves their set alone", () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        createStudyset(
            db,
            a,
            { studysetUUID: SET_ID, write: write({ title: 'Mine' }) },
            T0
        );
        const before = rowOf(db, SET_ID);
        expect(
            createStudyset(db, b, {
                studysetUUID: SET_ID,
                write: write({ title: 'pwned' }),
            })
        ).toEqual({ status: 'forbidden' });
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test("refuses a new set pointing at another set's files", () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        expect(
            createStudyset(db, a, {
                studysetUUID: SET_ID,
                write: write({ cards: [fileCard(`${OTHER_ID}/f`)] }),
            })
        ).toEqual({ status: 'forbidden' });
        expect(rowOf(db, SET_ID)).toBeUndefined();
    });
});

describe('get and list', () => {
    test('are scoped to the owner and listed oldest first', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        const second = created(createStudyset(db, a, {}, T1));
        const first = created(createStudyset(db, a, {}, T0));
        created(createStudyset(db, b, {}, T0));
        expect(
            listStudysets(db, a).map((s) => s.studysetUUID)
        ).toEqual([first.studysetUUID, second.studysetUUID]);
        expect(getStudyset(db, a, first.studysetUUID)).toEqual(first);
        expect(getStudyset(db, b, first.studysetUUID)).toBeNull();
    });
});

describe('updateStudyset', () => {
    test('a partial update keeps other fields and bumps updatedAt only', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const set = created(
            createStudyset(
                db,
                a,
                {
                    studysetUUID: SET_ID,
                    write: write({ title: 'T', cards: [{ term: 'x' }] }),
                },
                T0
            )
        );
        const result = updateStudyset(
            db,
            a,
            SET_ID,
            write({ favorited: true }),
            T1
        );
        expect(result).toEqual({
            status: 'ok',
            studyset: { ...set, favorited: true, updatedAt: T1.toISOString() },
        });
        expect(getStudyset(db, a, SET_ID)).toEqual(
            result.status === 'ok' ? result.studyset : null
        );
    });

    test('merges metadata and keeps a stored publiclyViewable', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        created(createStudyset(db, a, { studysetUUID: SET_ID }, T0));
        db.update(studyset)
            .set({
                metadata: { ...DEFAULT_STUDYSET_METADATA, publiclyViewable: true },
            })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        updateStudyset(db, a, SET_ID, write({}, { notesSortBy: 'date' }), T1);
        expect(getStudyset(db, a, SET_ID)?.metadata).toMatchObject({
            notesSortBy: 'date',
            publiclyViewable: true,
            terminology: 'Term/Definition',
        });
    });

    test('an empty write still bumps updatedAt', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        created(createStudyset(db, a, { studysetUUID: SET_ID }, T0));
        updateStudyset(db, a, SET_ID, write(), T2);
        expect(getStudyset(db, a, SET_ID)?.updatedAt).toBe(T2.toISOString());
    });

    test('another owner gets not_found and changes nothing', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        created(createStudyset(db, a, { studysetUUID: SET_ID }, T0));
        const before = rowOf(db, SET_ID);
        expect(
            updateStudyset(db, b, SET_ID, write({ title: 'pwned' }))
        ).toEqual({ status: 'not_found' });
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test('card file keys: own and already-stored keys only', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        created(
            createStudyset(db, a, {
                studysetUUID: SET_ID,
                write: write({ cards: [fileCard(`${SET_ID}/own`)] }),
            })
        );
        // A stored foreign key (e.g. from an import) stays allowed.
        db.update(studyset)
            .set({ cards: [fileCard(`${OTHER_ID}/kept`)] })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        expect(
            updateStudyset(
                db,
                a,
                SET_ID,
                write({
                    cards: [
                        fileCard(`${SET_ID}/own`),
                        fileCard(`${OTHER_ID}/kept`),
                    ],
                })
            ).status
        ).toBe('ok');
        const before = rowOf(db, SET_ID);
        expect(
            updateStudyset(
                db,
                a,
                SET_ID,
                write({ cards: [fileCard(`${OTHER_ID}/new`)] })
            )
        ).toEqual({ status: 'forbidden' });
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test('refuses a set over the size cap and leaves the row alone', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        created(createStudyset(db, a, { studysetUUID: SET_ID }, T0));
        const before = rowOf(db, SET_ID);
        expect(() =>
            updateStudyset(
                db,
                a,
                SET_ID,
                write({ description: 'x'.repeat(410 * 1024) })
            )
        ).toThrow(StudysetTooLargeError);
        expect(rowOf(db, SET_ID)).toEqual(before);
    });
});

describe('a set already over the size cap', () => {
    test('can still be edited or shrunk, but not grown', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        created(createStudyset(db, a, { studysetUUID: SET_ID }, T0));
        // As an import of a set near DynamoDB's limit could leave it.
        db.update(studyset)
            .set({ description: 'x'.repeat(410 * 1024) })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        expect(
            updateStudyset(db, a, SET_ID, write({ favorited: true }), T1)
                .status
        ).toBe('ok');
        expect(() =>
            updateStudyset(db, a, SET_ID, write({ title: 'A much longer title than the default one' }))
        ).toThrow(StudysetTooLargeError);
        expect(
            updateStudyset(db, a, SET_ID, write({ description: 'short' }), T2)
                .status
        ).toBe('ok');
        expect(getStudyset(db, a, SET_ID)?.description).toBe('short');
    });
});

describe('deleteStudyset', () => {
    test('deletes own, ignores unknown and refuses others', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        created(createStudyset(db, a, { studysetUUID: SET_ID }));
        expect(deleteStudyset(db, b, SET_ID)).toBe('not_owner');
        expect(rowOf(db, SET_ID)).toBeDefined();
        expect(deleteStudyset(db, a, SET_ID)).toBe('deleted');
        expect(rowOf(db, SET_ID)).toBeUndefined();
        expect(deleteStudyset(db, a, SET_ID)).toBe('absent');
    });
});

describe('restampAuthor', () => {
    test("renames only that owner's sets and keeps updatedAt", () => {
        const db = freshDb();
        const a = addUser(db, 'a', 'old');
        const b = addUser(db, 'b', 'bob');
        const a1 = created(createStudyset(db, a, {}, T0));
        const a2 = created(createStudyset(db, a, {}, T0));
        const b1 = created(createStudyset(db, b, {}, T0));
        const count = db.transaction((tx) => restampAuthor(tx, a, 'new'), {
            behavior: 'immediate',
        });
        expect(count).toBe(2);
        for (const id of [a1.studysetUUID, a2.studysetUUID]) {
            expect(getStudyset(db, a, id)).toMatchObject({
                username: 'new',
                updatedAt: T0.toISOString(),
            });
        }
        expect(getStudyset(db, b, b1.studysetUUID)?.username).toBe('bob');
        expect(restampAuthor(db, addUser(db, 'c'), 'x')).toBe(0);
    });
});

test('deleting the user removes their sets', () => {
    const db = freshDb();
    const a = addUser(db, 'a');
    created(createStudyset(db, a, { studysetUUID: SET_ID }));
    db.delete(user).where(eq(user.id, a)).run();
    expect(rowOf(db, SET_ID)).toBeUndefined();
});
