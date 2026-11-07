import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset, user } from '../db/schema';
import {
    addUser,
    fileCard,
    OTHER_ID,
    openTestDb,
    rowOf,
    SET_ID,
    T0,
    T1,
    T2,
    write,
} from '../testing/studysets';
import {
    createStudyset,
    deleteStudyset,
    getStudyset,
    listStudysets,
    restampAuthor,
    StudysetTooLargeError,
    updateStudyset,
} from './store';
import { DEFAULT_STUDYSET_METADATA } from './updates';

let current: ReturnType<typeof openTestDb> | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

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
            fileCopies: [],
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

describe("card files from the caller's own sets (Combine)", () => {
    const A_SET = 'a0000000-0000-4000-8000-000000000001';
    const A_SET2 = 'a0000000-0000-4000-8000-000000000002';
    const B_SET = 'b0000000-0000-4000-8000-000000000001';

    function setup() {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        created(createStudyset(db, a, { studysetUUID: A_SET }, T0));
        created(createStudyset(db, a, { studysetUUID: A_SET2 }, T0));
        created(createStudyset(db, b, { studysetUUID: B_SET }, T0));
        // No upload route exists yet, so files are put in place directly.
        db.update(studyset)
            .set({ cards: [fileCard(`${A_SET}/f`)] })
            .where(eq(studyset.studysetUUID, A_SET))
            .run();
        db.update(studyset)
            .set({ cards: [fileCard(`${B_SET}/g`)] })
            .where(eq(studyset.studysetUUID, B_SET))
            .run();
        return { db, a, b };
    }

    const storedKeys = (db: Db, id: string) =>
        (rowOf(db, id)?.cards ?? []).flatMap((c) =>
            (c.files as { key: string }[]).map((f) => f.key)
        );

    test('a key under another own set is re-keyed and its copy listed', () => {
        const { db, a } = setup();
        const result = updateStudyset(
            db,
            a,
            A_SET2,
            write({ cards: [fileCard(`${A_SET}/f`)] }),
            T1
        );
        if (result.status !== 'ok') throw new Error(result.status);
        const key = storedKeys(db, A_SET2)[0]!;
        expect(key).toStartWith(`${A_SET2}/`);
        expect(result.fileCopies).toEqual([{ from: `${A_SET}/f`, to: key }]);
        expect(storedKeys(db, A_SET)).toEqual([`${A_SET}/f`]);
    });

    test("a key under another user's set is refused", () => {
        const { db, a } = setup();
        const before = rowOf(db, A_SET2);
        expect(
            updateStudyset(
                db,
                a,
                A_SET2,
                write({ cards: [fileCard(`${B_SET}/g`)] })
            )
        ).toEqual({ status: 'forbidden' });
        expect(rowOf(db, A_SET2)).toEqual(before);
    });

    test('a foreign-prefix key one of the own sets already holds is re-keyed', () => {
        const { db, a } = setup();
        db.update(studyset)
            .set({ cards: [fileCard(`${OTHER_ID}/legacy`)] })
            .where(eq(studyset.studysetUUID, A_SET))
            .run();
        const result = updateStudyset(
            db,
            a,
            A_SET2,
            write({ cards: [fileCard(`${OTHER_ID}/legacy`)] })
        );
        expect(result.status).toBe('ok');
        expect(storedKeys(db, A_SET2)[0]).toStartWith(`${A_SET2}/`);
    });

    test('unknown, unsafe and non-UUID keys are refused', () => {
        const { db, a } = setup();
        for (const key of [
            `${OTHER_ID}/f`,
            'not-a-set/f',
            `${A_SET}/../${B_SET}/g`,
            `${A_SET2}/../x`,
        ]) {
            const before = rowOf(db, A_SET2);
            expect(
                updateStudyset(db, a, A_SET2, write({ cards: [fileCard(key)] }))
            ).toEqual({ status: 'forbidden' });
            expect(rowOf(db, A_SET2)).toEqual(before);
        }
    });

    test('a create with a client id re-keys own-set keys too', () => {
        const { db, a } = setup();
        const result = createStudyset(db, a, {
            studysetUUID: SET_ID,
            write: write({ cards: [fileCard(`${A_SET}/f`)] }),
        });
        if (result.status !== 'ok') throw new Error(result.status);
        expect(storedKeys(db, SET_ID)[0]).toStartWith(`${SET_ID}/`);
        expect(result.fileCopies).toHaveLength(1);
    });

    test('a write without cards keeps the stored cards', () => {
        const { db, a } = setup();
        const result = updateStudyset(db, a, A_SET, write({ title: 'T' }));
        if (result.status !== 'ok') throw new Error(result.status);
        expect(result.studyset.cards).toEqual([fileCard(`${A_SET}/f`)]);
        expect(result.fileCopies).toEqual([]);
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

    test('takes view-state toggles and shrinking edits while still over', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        created(createStudyset(db, a, { studysetUUID: SET_ID }, T0));
        db.update(studyset)
            .set({ favorited: true, description: 'x'.repeat(410 * 1024) })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        // true -> false adds a byte; it's view state, so it's allowed.
        expect(
            updateStudyset(db, a, SET_ID, write({ favorited: false }), T1)
                .status
        ).toBe('ok');
        expect(
            updateStudyset(
                db,
                a,
                SET_ID,
                write({ lastViewed: T2, favorited: true }),
                T2
            ).status
        ).toBe('ok');
        // Still over the cap afterwards, but smaller: allowed.
        expect(
            updateStudyset(
                db,
                a,
                SET_ID,
                write({ description: 'x'.repeat(405 * 1024) }),
                T2
            ).status
        ).toBe('ok');
        expect(() =>
            updateStudyset(db, a, SET_ID, write({ labels: ['new'] }), T2)
        ).toThrow(StudysetTooLargeError);
        // Mixing in a view-state field doesn't exempt a growing write.
        expect(() =>
            updateStudyset(
                db,
                a,
                SET_ID,
                write({ favorited: false, labels: ['new'] }),
                T2
            )
        ).toThrow(StudysetTooLargeError);
        expect(() =>
            updateStudyset(
                db,
                a,
                SET_ID,
                write({ favorited: false }, { notesSortBy: 'date' }),
                T2
            )
        ).toThrow(StudysetTooLargeError);
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
