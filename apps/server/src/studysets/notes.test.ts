import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { addUser, openTestDb, rowOf, SET_ID, T0, T1, T2 } from '../testing/studysets';
import { createNote, deleteNote, editNote } from './notes';
import { createStudyset, StudysetTooLargeError } from './store';

let current: ReturnType<typeof openTestDb> | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const CARDS = [
    { cardUUID: 'c1', term: 'cell', notes: [] },
    { cardUUID: 'c2', term: 'atp' },
];

function setup() {
    const db = freshDb();
    const a = addUser(db, 'a');
    const b = addUser(db, 'b');
    const result = createStudyset(db, a, { studysetUUID: SET_ID }, T0);
    if (result.status !== 'ok') throw new Error(result.status);
    db.update(studyset)
        .set({ cards: CARDS })
        .where(eq(studyset.studysetUUID, SET_ID))
        .run();
    return { db, a, b };
}

const notesOn = (db: Db, cardUUID: string) =>
    (rowOf(db, SET_ID)?.cards.find((c) => c.cardUUID === cardUUID)?.notes ??
        []) as { noteUUID: string; text: string; createdAt?: string }[];

describe('notes', () => {
    test('create, edit and delete a note on one card', () => {
        const { db, a } = setup();
        expect(createNote(db, a, SET_ID, 'c1', T1, 'n1')).toEqual({
            status: 'ok',
            noteUUID: 'n1',
        });
        expect(notesOn(db, 'c1')).toEqual([
            { noteUUID: 'n1', text: '', createdAt: T1.toISOString() },
        ]);
        expect(rowOf(db, SET_ID)?.updatedAt).toEqual(T1);
        expect(rowOf(db, SET_ID)?.cards[1]).toEqual(CARDS[1]!);

        createNote(db, a, SET_ID, 'c2', T1, 'n2');
        expect(
            editNote(db, a, {
                studysetUUID: SET_ID,
                cardUUID: 'c1',
                noteUUID: 'n1',
                text: 'hello',
            })
        ).toEqual({ status: 'ok' });
        expect(notesOn(db, 'c1')[0]?.text).toBe('hello');
        expect(notesOn(db, 'c2')[0]?.text).toBe('');

        const del = { studysetUUID: SET_ID, cardUUID: 'c1', noteUUID: 'n1' };
        expect(deleteNote(db, a, del, T2)).toEqual({ status: 'ok' });
        expect(notesOn(db, 'c1')).toEqual([]);
        expect(notesOn(db, 'c2')).toHaveLength(1);
        expect(deleteNote(db, a, del)).toEqual({ status: 'ok' });
    });

    test('a missing card or note is not found', () => {
        const { db, a } = setup();
        expect(createNote(db, a, SET_ID, 'nope')).toEqual({
            status: 'not_found',
            what: 'card',
        });
        expect(
            editNote(db, a, {
                studysetUUID: SET_ID,
                cardUUID: 'c1',
                noteUUID: 'nope',
                text: 'x',
            })
        ).toEqual({ status: 'not_found', what: 'note' });
    });

    test("another user can't touch the notes", () => {
        const { db, a, b } = setup();
        createNote(db, a, SET_ID, 'c1', T1, 'n1');
        const before = rowOf(db, SET_ID);
        const notFound = { status: 'not_found', what: 'studyset' } as const;
        expect(createNote(db, b, SET_ID, 'c1')).toEqual(notFound);
        expect(
            editNote(db, b, {
                studysetUUID: SET_ID,
                cardUUID: 'c1',
                noteUUID: 'n1',
                text: 'pwned',
            })
        ).toEqual(notFound);
        expect(
            deleteNote(db, b, {
                studysetUUID: SET_ID,
                cardUUID: 'c1',
                noteUUID: 'n1',
            })
        ).toEqual(notFound);
        expect(rowOf(db, SET_ID)).toEqual(before);
    });

    test('a note edit that grows the set past the cap is refused', () => {
        const { db, a } = setup();
        createNote(db, a, SET_ID, 'c1', T1, 'n1');
        const before = rowOf(db, SET_ID);
        expect(() =>
            editNote(db, a, {
                studysetUUID: SET_ID,
                cardUUID: 'c1',
                noteUUID: 'n1',
                text: 'x'.repeat(410 * 1024),
            })
        ).toThrow(StudysetTooLargeError);
        expect(rowOf(db, SET_ID)).toEqual(before);
    });
});
