import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { createStudyset } from '../studysets/store';
import { addUser, openTestDb, T1 } from '../testing/studysets';
import {
    decodeCursor,
    encodeCursor,
    filterKey,
    loadIndex,
    matchesTokens,
    paginate,
    parseExploreQuery,
    selectEntries,
    summariesFor,
} from './explore';

describe('parseExploreQuery', () => {
    test.each([
        [{ sort: 'popular' }, 'Unsupported sort: popular'],
        [{ limit: '0' }, 'limit must be a positive integer'],
        [{ limit: 'x' }, 'limit must be a positive integer'],
        [{ featured: '2' }, 'Unsupported featured'],
        [
            { featured: '1', subject: 'math' },
            'featured does not combine with subject, q or cursor',
        ],
        [{ subject: 'astrology' }, 'Unsupported subject'],
        [{ q: 'x'.repeat(201) }, 'q is too long'],
    ])('%p is refused', (params, message) => {
        expect(parseExploreQuery(params)).toEqual({ ok: false, message });
    });

    test('limits are clamped', () => {
        expect(parseExploreQuery({ limit: '500' })).toMatchObject({
            limit: 48,
        });
        expect(parseExploreQuery({ featured: '1' })).toEqual({
            ok: true,
            featured: true,
            limit: 6,
        });
        expect(parseExploreQuery({ featured: '1', limit: '20' })).toMatchObject(
            { limit: 6 }
        );
    });

    test('a q with no words is no q', () => {
        const none = parseExploreQuery({ q: '?!' });
        const plain = parseExploreQuery({});
        if (!none.ok || !plain.ok || 'featured' in none || 'featured' in plain) {
            throw new Error('unexpected');
        }
        expect(filterKey(none.filters)).toBe(filterKey(plain.filters));
    });
});

describe('cursors', () => {
    const pos = { publishedAt: '2026-01-01T00:00:00.000Z', studysetUUID: 'a' };

    test('round trip, and refuse another filter or junk', () => {
        const key = filterKey({ sort: 'newest' });
        const cursor = encodeCursor(pos, key);
        expect(decodeCursor(cursor, key)).toEqual({ ok: true, position: pos });
        expect(
            decodeCursor(cursor, filterKey({ sort: 'newest', subject: 'math' }))
        ).toEqual({ ok: false, reason: 'filterMismatch' });
        expect(decodeCursor('x', key)).toEqual({
            ok: false,
            reason: 'malformed',
        });
        expect(
            decodeCursor(Buffer.from('[]').toString('base64url'), key)
        ).toEqual({ ok: false, reason: 'malformed' });
    });

    test('paging past the end is empty', () => {
        expect(
            paginate([pos], {
                after: { publishedAt: '2000-01-01T00:00:00.000Z', studysetUUID: 'z' },
                limit: 5,
            })
        ).toEqual({ page: [], next: null });
    });
});

test('search is accent- and case-insensitive and order-free', () => {
    const entries = [
        {
            studysetUUID: 'a',
            publishedAt: 'p',
            subject: 'other' as const,
            searchText: 'cafe au lait',
        },
    ];
    expect(selectEntries(entries, { sort: 'newest', q: 'lait cafe' })).toHaveLength(1);
    expect(matchesTokens('cafe au lait', ['cafe', 'the'])).toBe(false);
});

describe('loadIndex and summariesFor', () => {
    let current: ReturnType<typeof openTestDb> | undefined;
    afterEach(() => {
        current?.close();
        current = undefined;
    });

    function db(): Db {
        current = openTestDb();
        return current.db;
    }

    function listed(d: Db, owner: string, change: Record<string, unknown> = {}) {
        const r = createStudyset(d, owner, {});
        if (r.status !== 'ok') throw new Error(r.status);
        const id = r.studyset.studysetUUID;
        d.update(studyset)
            .set({ isPublic: true, publishedAt: T1, subject: 'science', ...change })
            .where(eq(studyset.studysetUUID, id))
            .run();
        return id;
    }

    test('search normalizes whitespace before cutting to 1000 chars', () => {
        const d = db();
        const a = addUser(d, 'a');
        listed(d, a, { description: ' '.repeat(1500) + 'zebra' });
        listed(d, a, { description: 'word '.repeat(250) + 'gnu' });
        const { entries } = loadIndex(d);
        const find = (q: string) =>
            selectEntries(entries, { sort: 'newest', q }).length;
        expect(find('zebra')).toBe(1);
        expect(find('gnu')).toBe(0);
    });

    test('summariesFor skips sets that are no longer listed', () => {
        const d = db();
        const a = addUser(d, 'a');
        const shown = listed(d, a);
        const hidden = listed(d, a, { hiddenAt: T1 });
        const items = summariesFor(d, [shown, hidden, crypto.randomUUID()]);
        expect(items.map((i) => i.studysetUUID)).toEqual([shown]);
        expect(summariesFor(d, [])).toEqual([]);
    });
});
