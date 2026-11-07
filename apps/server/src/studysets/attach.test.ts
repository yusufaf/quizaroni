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
    write,
} from '../testing/studysets';
import {
    attachCardFile,
    createStudyset,
    StudysetTooLargeError,
} from './store';

let current: ReturnType<typeof openTestDb> | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const FILE = { name: 'f.png', key: `${SET_ID}/x`, size: 3 };

function setup() {
    const db = freshDb();
    const a = addUser(db, 'a');
    const b = addUser(db, 'b');
    const result = createStudyset(
        db,
        a,
        {
            studysetUUID: SET_ID,
            write: write({
                cards: [
                    { cardUUID: 'c1', term: 't' },
                    { cardUUID: 'c2', files: [{ key: `${SET_ID}/old` }] },
                ],
            }),
        },
        T0
    );
    if (result.status !== 'ok') throw new Error(result.status);
    return { db, a, b };
}

describe('attachCardFile', () => {
    test('appends to the matching card and bumps updatedAt', () => {
        const { db, a } = setup();
        expect(attachCardFile(db, a, SET_ID, 'c1', FILE, T1)).toBe('attached');
        expect(attachCardFile(db, a, SET_ID, 'c2', FILE, T1)).toBe('attached');
        const row = rowOf(db, SET_ID)!;
        expect(row.cards[0]?.files).toEqual([FILE]);
        expect(row.cards[1]?.files).toEqual([{ key: `${SET_ID}/old` }, FILE]);
        expect(row.updatedAt).toEqual(T1);
    });

    test('an unknown card writes nothing', () => {
        const { db, a } = setup();
        const before = rowOf(db, SET_ID);
        expect(attachCardFile(db, a, SET_ID, 'nope', FILE)).toBe('no_card');
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test("another user's set is not found", () => {
        const { db, b } = setup();
        const before = rowOf(db, SET_ID);
        expect(attachCardFile(db, b, SET_ID, 'c1', FILE)).toBe('not_found');
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test('a set at the cap refuses the file', () => {
        const { db, a } = setup();
        db.update(studyset)
            .set({ description: 'x'.repeat(410 * 1024) })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        const before = rowOf(db, SET_ID);
        expect(() => attachCardFile(db, a, SET_ID, 'c1', FILE)).toThrow(
            StudysetTooLargeError
        );
        expect(rowOf(db, SET_ID)).toEqual(before);
    });
});
