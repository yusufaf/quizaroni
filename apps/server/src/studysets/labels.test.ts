import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset, userProfile } from '../db/schema';
import { addUser, openTestDb, rowOf, T0, T1, T2 } from '../testing/studysets';
import {
    createLabel,
    deleteLabels,
    isLabel,
    MAX_PROFILE_LABELS,
    parseLabelAssignments,
    renameLabel,
    setStudysetLabels,
} from './labels';
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

const A1 = 'a0000000-0000-4000-8000-000000000001';
const A2 = 'a0000000-0000-4000-8000-000000000002';
const A3 = 'a0000000-0000-4000-8000-000000000003';
const B1 = 'b0000000-0000-4000-8000-000000000001';

function setLabelsDirectly(db: Db, id: string, labels: string[]) {
    db.update(studyset)
        .set({ labels })
        .where(eq(studyset.studysetUUID, id))
        .run();
}

function setProfileLabels(db: Db, userId: string, labels: string[]) {
    db.insert(userProfile)
        .values({ userId, username: null, metadata: {}, labels, updatedAt: T0 })
        .onConflictDoUpdate({ target: userProfile.userId, set: { labels } })
        .run();
}

const profileOf = (db: Db, userId: string) =>
    db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .get()?.labels;

function setup() {
    const db = freshDb();
    const a = addUser(db, 'a');
    const b = addUser(db, 'b');
    for (const [owner, id] of [
        [a, A1],
        [a, A2],
        [a, A3],
        [b, B1],
    ] as const) {
        const r = createStudyset(db, owner, { studysetUUID: id }, T0);
        if (r.status !== 'ok') throw new Error(r.status);
    }
    return { db, a, b };
}

describe('createLabel', () => {
    test('adds to the profile once, and to the target set', () => {
        const { db, a } = setup();
        expect(createLabel(db, a, 'bio', undefined, T1)).toEqual({
            status: 'ok',
        });
        expect(createLabel(db, a, 'bio')).toEqual({ status: 'ok' });
        expect(profileOf(db, a)).toEqual(['bio']);
        expect(rowOf(db, A1)?.updatedAt).toEqual(T0);

        createLabel(db, a, 'chem', A1, T2);
        expect(profileOf(db, a)).toEqual(['bio', 'chem']);
        expect(rowOf(db, A1)).toMatchObject({ labels: ['chem'], updatedAt: T2 });
    });

    test("another user's target writes nothing", () => {
        const { db, a, b } = setup();
        const before = rowOf(db, B1);
        expect(createLabel(db, a, 'bio', B1)).toEqual({ status: 'not_found' });
        expect(profileOf(db, a) ?? []).toEqual([]);
        expect(rowOf(db, B1)).toEqual(before);
        expect(profileOf(db, b) ?? []).toEqual([]);
    });

    test('stops at the label limit', () => {
        const { db, a } = setup();
        setProfileLabels(
            db,
            a,
            Array.from({ length: MAX_PROFILE_LABELS }, (_, i) => `l${i}`)
        );
        expect(createLabel(db, a, 'one more')).toEqual({ status: 'too_many' });
    });
});

describe('renameLabel', () => {
    test('renames on the profile and every own set that holds it', () => {
        const { db, a } = setup();
        setProfileLabels(db, a, ['bio', 'chem']);
        setLabelsDirectly(db, A1, ['bio']);
        setLabelsDirectly(db, A2, ['chem', 'bio', 'biology']);
        setLabelsDirectly(db, A3, ['chem']);
        expect(renameLabel(db, a, 'bio', 'biology', T1)).toEqual({
            status: 'ok',
        });
        expect(profileOf(db, a)).toEqual(['biology', 'chem']);
        expect(rowOf(db, A1)?.labels).toEqual(['biology']);
        expect(rowOf(db, A2)?.labels).toEqual(['chem', 'biology']);
        expect(rowOf(db, A3)).toMatchObject({ labels: ['chem'], updatedAt: T0 });
    });

    test("never touches another user's sets with the same name", () => {
        const { db, a, b } = setup();
        setProfileLabels(db, b, ['bio']);
        setLabelsDirectly(db, A1, ['bio']);
        setLabelsDirectly(db, B1, ['bio']);
        const before = rowOf(db, A1);
        expect(renameLabel(db, b, 'bio', 'x')).toEqual({ status: 'ok' });
        expect(rowOf(db, A1)).toEqual(before);
        expect(rowOf(db, B1)?.labels).toEqual(['x']);
    });

    test('refuses an unknown name or one that exists', () => {
        const { db, a } = setup();
        setProfileLabels(db, a, ['bio', 'chem']);
        setLabelsDirectly(db, A1, ['bio']);
        expect(renameLabel(db, a, 'nope', 'x')).toEqual({
            status: 'not_found',
        });
        expect(renameLabel(db, a, 'bio', 'chem')).toEqual({ status: 'exists' });
        expect(profileOf(db, a)).toEqual(['bio', 'chem']);
        expect(rowOf(db, A1)?.labels).toEqual(['bio']);
    });
});

describe('deleteLabels', () => {
    test('removes from the profile and own sets only', () => {
        const { db, a, b } = setup();
        setProfileLabels(db, a, ['bio', 'chem']);
        setLabelsDirectly(db, A1, ['bio', 'chem']);
        setLabelsDirectly(db, B1, ['bio']);
        deleteLabels(db, a, ['bio']);
        expect(profileOf(db, a)).toEqual(['chem']);
        expect(rowOf(db, A1)?.labels).toEqual(['chem']);
        expect(rowOf(db, B1)?.labels).toEqual(['bio']);
        expect(profileOf(db, b) ?? []).toEqual([]);
    });

    test('works for a user with no sets', () => {
        const db = freshDb();
        const c = addUser(db, 'c');
        expect(() => deleteLabels(db, c, ['x'])).not.toThrow();
    });
});

describe('setStudysetLabels', () => {
    test('updates own sets and reports the rest', () => {
        const { db, a } = setup();
        const result = setStudysetLabels(
            db,
            a,
            [
                [A1, ['bio']],
                [B1, ['x']],
                ['c0000000-0000-4000-8000-000000000009', ['y']],
                [A2, []],
            ],
            T1
        );
        expect(result).toEqual({
            updated: [A1, A2],
            notFound: [B1, 'c0000000-0000-4000-8000-000000000009'],
        });
        expect(rowOf(db, A1)?.labels).toEqual(['bio']);
        expect(rowOf(db, B1)?.labels).toEqual([]);
        // Unchanged labels still move updatedAt, as the Lambda did.
        expect(rowOf(db, A2)?.updatedAt).toEqual(T1);
    });
});

describe('setStudysetLabels duplicates', () => {
    test('stores each label once, in first-seen order', () => {
        const { db, a } = setup();
        setStudysetLabels(db, a, [[A1, ['b', 'a', 'b', 'a']]]);
        expect(rowOf(db, A1)?.labels).toEqual(['b', 'a']);
    });
});

describe('parseLabelAssignments', () => {
    test('rejects an oversized batch before checking its items', () => {
        const big = Array.from({ length: 501 }, () => ['abc', 'not a list']);
        expect(parseLabelAssignments(big)).toEqual({
            ok: false,
            status: 400,
            message: 'Too many study sets',
        });
    });

    test.each([
        ['x'],
        [[['abc', []]]],
        [[[A1, [1]]]],
        [[[A1, []], [A1, []]]],
        [[[A1, [], 'extra']]],
    ])('rejects %p', (value) => {
        expect(parseLabelAssignments(value)).toEqual({
            ok: false,
            status: 400,
            message: 'Invalid studysetUpdates',
        });
    });

    test('accepts an empty list', () => {
        expect(parseLabelAssignments([])).toEqual({ ok: true, value: [] });
    });
});

test('isLabel', () => {
    expect(isLabel('bio')).toBe(true);
    for (const value of ['', ' bio', 'bio ', 'x'.repeat(101), 1]) {
        expect(isLabel(value)).toBe(false);
    }
});
