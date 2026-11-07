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
    write,
} from '../testing/studysets';
import { publishStudyset, unpublishStudyset } from './publishing';
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

const CARDS = Array.from({ length: 4 }, (_, i) => ({
    cardUUID: `c${i}`,
    term: `t${i}`,
    definition: `d${i}`,
}));

function setup() {
    const db = freshDb();
    const a = addUser(db, 'a');
    const b = addUser(db, 'b');
    const r = createStudyset(
        db,
        a,
        { studysetUUID: SET_ID, write: write({ cards: CARDS }) },
        T0
    );
    if (r.status !== 'ok') throw new Error(r.status);
    return { db, a, b };
}

describe('publishStudyset', () => {
    test('the first publish sets the subject and keeps its time', () => {
        const { db, a } = setup();
        expect(publishStudyset(db, a, SET_ID, 'science', T1).status).toBe('ok');
        expect(rowOf(db, SET_ID)).toMatchObject({
            isPublic: true,
            subject: 'science',
            publishedAt: T1,
            updatedAt: T1,
        });
        publishStudyset(db, a, SET_ID, 'math', T2);
        expect(rowOf(db, SET_ID)).toMatchObject({
            subject: 'math',
            publishedAt: T1,
        });
    });

    test('a hidden set is refused and left alone', () => {
        const { db, a } = setup();
        db.update(studyset)
            .set({ hiddenAt: T0 })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        const before = rowOf(db, SET_ID);
        expect(publishStudyset(db, a, SET_ID, 'science')).toEqual({
            status: 'refused',
            errors: [{ code: 'hidden' }],
        });
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test("another owner's set is not found", () => {
        const { db, b } = setup();
        const before = rowOf(db, SET_ID);
        expect(publishStudyset(db, b, SET_ID, 'science')).toEqual({
            status: 'not_found',
        });
        expect(rowOf(db, SET_ID)).toEqual(before);
    });
});

describe('unpublishStudyset', () => {
    test('clears public and featured, keeps subject and publish time', () => {
        const { db, a } = setup();
        publishStudyset(db, a, SET_ID, 'science', T1);
        db.update(studyset)
            .set({ featuredAt: T1 })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        expect(unpublishStudyset(db, a, SET_ID, T2).status).toBe('ok');
        expect(rowOf(db, SET_ID)).toMatchObject({
            isPublic: false,
            featuredAt: null,
            subject: 'science',
            publishedAt: T1,
        });
    });

    test('works on a hidden set', () => {
        const { db, a } = setup();
        publishStudyset(db, a, SET_ID, 'science', T1);
        db.update(studyset)
            .set({ hiddenAt: T1 })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        expect(unpublishStudyset(db, a, SET_ID).status).toBe('ok');
    });
});
