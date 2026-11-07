import { afterEach, expect, test } from 'bun:test';
import type { Db } from '../db';
import { addUser, openTestDb, rowOf, SET_ID } from '../testing/studysets';
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

test('a new set starts unpublished with no publication state', () => {
    const db = freshDb();
    const a = addUser(db, 'a');
    createStudyset(db, a, { studysetUUID: SET_ID });
    expect(rowOf(db, SET_ID)).toMatchObject({
        subject: null,
        isPublic: false,
        publishedAt: null,
        featuredAt: null,
        hiddenAt: null,
        saveCount: 0,
        copiedFrom: null,
    });
});
