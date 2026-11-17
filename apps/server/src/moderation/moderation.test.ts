import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { featuredSummaries, loadIndex } from '../public/explore';
import { publishStudyset } from '../studysets/publishing';
import { createStudyset } from '../studysets/store';
import { addUser, openTestDb, rowOf, T1, T2 } from '../testing/studysets';
import {
    featureSet,
    featuredCount,
    hideSet,
    unfeatureSet,
    unhideSet,
    unpublishSet,
} from './moderation';

const T3 = new Date('2026-11-04T10:00:00.000Z');
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const CARDS = Array.from({ length: 4 }, (_, i) => ({
    cardUUID: `c${i}`,
    term: `term ${i}`,
    definition: `definition ${i}`,
}));

let current: ReturnType<typeof openTestDb> | undefined;
afterEach(() => {
    current?.close();
    current = undefined;
});

function db(): Db {
    current = openTestDb();
    return current.db;
}

// Publishable (4 complete cards), so tests can republish through publishStudyset.
function listed(d: Db, owner: string, change: Record<string, unknown> = {}) {
    const r = createStudyset(d, owner, {});
    if (r.status !== 'ok') throw new Error(r.status);
    const id = r.studyset.studysetUUID;
    d.update(studyset)
        .set({
            isPublic: true,
            publishedAt: T1,
            subject: 'science',
            cards: CARDS,
            ...change,
        })
        .where(eq(studyset.studysetUUID, id))
        .run();
    return id;
}

const indexIds = (d: Db) => loadIndex(d).entries.map((e) => e.studysetUUID);
const featuredIds = (d: Db) =>
    featuredSummaries(d, 6).map((s) => s.studysetUUID);

describe('featureSet', () => {
    test('features a listed set', () => {
        const d = db();
        const id = listed(d, addUser(d, 'a'));
        const r = featureSet(d, id, T2);
        expect(r.status).toBe('changed');
        expect(rowOf(d, id)?.featuredAt).toEqual(T2);
        expect(featuredIds(d)).toEqual([id]);
    });

    test.each([
        ['private', { isPublic: false }],
        ['never published', { publishedAt: null }],
        ['hidden', { hiddenAt: T1 }],
    ])('refuses a %s set', (_name, change) => {
        const d = db();
        const id = listed(d, addUser(d, 'a'), change);
        expect(featureSet(d, id, T2).status).toBe('not_listed');
        expect(rowOf(d, id)?.featuredAt).toBeNull();
    });

    test('re-featuring moves a set to the front', () => {
        const d = db();
        const a = addUser(d, 'a');
        const older = listed(d, a);
        const newer = listed(d, a);
        featureSet(d, older, T1);
        featureSet(d, newer, T2);
        expect(featuredIds(d)).toEqual([newer, older]);
        featureSet(d, older, T3);
        expect(featuredIds(d)).toEqual([older, newer]);
    });
});

test.each([
    ['featureSet', (d: Db) => featureSet(d, UNKNOWN_ID)],
    ['unfeatureSet', (d: Db) => unfeatureSet(d, UNKNOWN_ID)],
    ['hideSet', (d: Db) => hideSet(d, UNKNOWN_ID)],
    ['unhideSet', (d: Db) => unhideSet(d, UNKNOWN_ID)],
    ['unpublishSet', (d: Db) => unpublishSet(d, UNKNOWN_ID)],
])('%s on an unknown id is not_found', (_name, op) => {
    expect(op(db())).toEqual({ status: 'not_found' });
});

test('unfeatureSet clears featuredAt once', () => {
    const d = db();
    const id = listed(d, addUser(d, 'a'), { featuredAt: T1 });
    expect(unfeatureSet(d, id).status).toBe('changed');
    expect(rowOf(d, id)?.featuredAt).toBeNull();
    expect(unfeatureSet(d, id).status).toBe('unchanged');
});

describe('hideSet', () => {
    test('takes a set down so its owner cannot republish it', () => {
        const d = db();
        const owner = addUser(d, 'a');
        const id = listed(d, owner, { featuredAt: T1 });
        expect(hideSet(d, id, T2).status).toBe('changed');
        const row = rowOf(d, id);
        expect(row?.hiddenAt).toEqual(T2);
        expect(row?.isPublic).toBe(false);
        expect(row?.featuredAt).toBeNull();
        expect(row?.updatedAt).toEqual(T2);
        expect(row?.publishedAt).toEqual(T1);
        expect(indexIds(d)).not.toContain(id);
        expect(publishStudyset(d, owner, id, 'science')).toEqual({
            status: 'refused',
            errors: [{ code: 'hidden' }],
        });
    });

    test('hiding twice keeps the first time', () => {
        const d = db();
        const id = listed(d, addUser(d, 'a'));
        hideSet(d, id, T2);
        expect(hideSet(d, id, T3).status).toBe('unchanged');
        expect(rowOf(d, id)?.hiddenAt).toEqual(T2);
    });
});

test('unhideSet lets the owner publish again', () => {
    const d = db();
    const owner = addUser(d, 'a');
    const id = listed(d, owner);
    hideSet(d, id, T2);
    expect(unhideSet(d, id, T3).status).toBe('changed');
    const row = rowOf(d, id);
    expect(row?.hiddenAt).toBeNull();
    expect(row?.isPublic).toBe(false);
    expect(publishStudyset(d, owner, id, 'science').status).toBe('ok');
    expect(indexIds(d)).toContain(id);

    const never = listed(d, owner);
    expect(unhideSet(d, never).status).toBe('unchanged');
});

test('unpublishSet takes a set off Explore but the owner can republish', () => {
    const d = db();
    const owner = addUser(d, 'a');
    const id = listed(d, owner, { featuredAt: T1 });
    expect(unpublishSet(d, id, T2).status).toBe('changed');
    const row = rowOf(d, id);
    expect(row?.isPublic).toBe(false);
    expect(row?.featuredAt).toBeNull();
    expect(row?.publishedAt).toEqual(T1);
    expect(row?.hiddenAt).toBeNull();
    expect(indexIds(d)).not.toContain(id);
    expect(unpublishSet(d, id, T3).status).toBe('unchanged');
    expect(publishStudyset(d, owner, id, 'science').status).toBe('ok');
    expect(indexIds(d)).toContain(id);
});

test('featuredCount counts only listed featured sets', () => {
    const d = db();
    const a = addUser(d, 'a');
    listed(d, a, { featuredAt: T1 });
    listed(d, a, { featuredAt: T1 });
    listed(d, a, { featuredAt: T1, hiddenAt: T1 });
    listed(d, a, { featuredAt: T1, isPublic: false });
    listed(d, a);
    expect(featuredCount(d)).toBe(2);
});
