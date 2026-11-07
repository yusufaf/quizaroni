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
import { publishStudyset } from './publishing';
import { createStudyset, updateStudyset } from './store';

let current: ReturnType<typeof openTestDb> | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const cards = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        cardUUID: `c${i}`,
        term: `t${i}`,
        definition: `d${i}`,
    }));

function published(n = 4) {
    const db = freshDb();
    const a = addUser(db, 'a');
    createStudyset(
        db,
        a,
        { studysetUUID: SET_ID, write: write({ cards: cards(n) }) },
        T0
    );
    expect(publishStudyset(db, a, SET_ID, 'science', T1).status).toBe('ok');
    db.update(studyset)
        .set({ featuredAt: T1 })
        .where(eq(studyset.studysetUUID, SET_ID))
        .run();
    return { db, a };
}

describe('the publish gate on save', () => {
    test('a card save below the gate unpublishes and says why', () => {
        const { db, a } = published();
        const result = updateStudyset(
            db,
            a,
            SET_ID,
            write({ cards: cards(3) }),
            T2
        );
        expect(result).toMatchObject({
            status: 'ok',
            unpublished: {
                errors: [{ code: 'notEnoughCards', required: 4, actual: 3 }],
            },
        });
        expect(rowOf(db, SET_ID)).toMatchObject({
            isPublic: false,
            featuredAt: null,
            publishedAt: T1,
            subject: 'science',
        });
    });

    test('a card save that still passes stays public', () => {
        const { db, a } = published();
        const result = updateStudyset(db, a, SET_ID, write({ cards: cards(4) }));
        expect(result).not.toHaveProperty('unpublished');
        expect(rowOf(db, SET_ID)?.isPublic).toBe(true);
    });

    test('only card saves are gated', () => {
        const { db, a } = published();
        db.update(studyset)
            .set({ cards: cards(3) })
            .where(eq(studyset.studysetUUID, SET_ID))
            .run();
        const result = updateStudyset(db, a, SET_ID, write({ title: 'T' }));
        expect(result).not.toHaveProperty('unpublished');
        expect(rowOf(db, SET_ID)?.isPublic).toBe(true);
    });

    test('an unpublished set is never reported', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        createStudyset(db, a, { studysetUUID: SET_ID });
        const result = updateStudyset(db, a, SET_ID, write({ cards: cards(1) }));
        expect(result).not.toHaveProperty('unpublished');
    });
});
