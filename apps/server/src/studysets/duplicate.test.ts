import { afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import {
    addUser,
    fileCard,
    openTestDb,
    rowOf,
    T0,
    T1,
} from '../testing/studysets';
import { buildDuplicate, duplicateStudysets } from './duplicate';
import { createStudyset, type Row, StudysetTooLargeError, toView, viewBytes } from './store';
import { DEFAULT_STUDYSET_METADATA, MAX_STUDYSET_BYTES } from './updates';

let current: ReturnType<typeof openTestDb> | undefined;

function freshDb(): Db {
    current = openTestDb();
    return current.db;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const SOURCE: Row = {
    studysetUUID: 'c0000000-0000-4000-8000-000000000001',
    ownerId: 'u1',
    username: 'ada',
    title: 'Cell biology',
    description: 'desc',
    favorited: true,
    cards: [
        {
            cardUUID: 'card-1',
            term: 'cell',
            definition: 'unit',
            notes: [
                { noteUUID: 'note-1', text: 'a' },
                { noteUUID: 'note-2', text: 'b' },
            ],
        },
        { cardUUID: 'card-2', term: 'atp', definition: 'energy' },
    ],
    categories: ['A'],
    labels: ['bio'],
    metadata: { ...DEFAULT_STUDYSET_METADATA, publiclyViewable: true },
    lastViewed: T0,
    createdAt: T0,
    updatedAt: T0,
};

describe('buildDuplicate', () => {
    const NEW_ID = 'd0000000-0000-4000-8000-000000000001';

    test('makes a private copy with fresh card and note ids', () => {
        const before = structuredClone(SOURCE);
        const copy = buildDuplicate(SOURCE, NEW_ID, T1);
        expect(copy.metadata.publiclyViewable).toBe(false);
        expect(copy).toMatchObject({
            studysetUUID: NEW_ID,
            ownerId: 'u1',
            username: 'ada',
            title: 'Cell biology Copy',
            description: 'desc',
            categories: ['A'],
            labels: ['bio'],
            favorited: false,
            lastViewed: T1,
            createdAt: T1,
            updatedAt: T1,
        });
        const ids = copy.cards.flatMap((card) => [
            card.cardUUID,
            ...(card.notes as { noteUUID: string }[]).map((n) => n.noteUUID),
        ]);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ['card-1', 'card-2', 'note-1', 'note-2']) {
            expect(ids).not.toContain(id);
        }
        expect(copy.cards.map((c) => [c.term, c.definition])).toEqual([
            ['cell', 'unit'],
            ['atp', 'energy'],
        ]);
        expect(
            (copy.cards[0]?.notes as { text: string }[]).map((n) => n.text)
        ).toEqual(['a', 'b']);
        expect(copy.cards[1]?.notes).toEqual([]);
        expect(SOURCE).toEqual(before);
    });

    test('carries over only the set columns', () => {
        const withExtra = { ...SOURCE, PK2: 'leak' } as unknown as Row;
        expect(buildDuplicate(withExtra, NEW_ID, T1)).not.toHaveProperty('PK2');
    });

    test('copes with a set that has no cards', () => {
        expect(buildDuplicate({ ...SOURCE, cards: [] }, NEW_ID, T1).cards).toEqual(
            []
        );
    });
});

describe('duplicateStudysets', () => {
    function own(db: Db, ownerId: string, id: string, cards = [] as Row['cards']) {
        const result = createStudyset(db, ownerId, { studysetUUID: id }, T0);
        if (result.status !== 'ok') throw new Error(result.status);
        db.update(studyset)
            .set({ cards })
            .where(eq(studyset.studysetUUID, id))
            .run();
        return id;
    }

    const S1 = 'e0000000-0000-4000-8000-000000000001';
    const S2 = 'e0000000-0000-4000-8000-000000000002';
    const B1 = 'f0000000-0000-4000-8000-000000000001';

    test("copies each set's files under the copy's own id", () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        own(db, a, S1, [fileCard(`${S1}/f1`)]);
        own(db, a, S2, [fileCard(`${S2}/f2`), fileCard(`${S2}/f2`)]);
        const sources = [rowOf(db, S1), rowOf(db, S2)];

        const result = duplicateStudysets(db, a, [S1, S2], T1);
        if (result.status !== 'ok') throw new Error(result.status);

        expect([rowOf(db, S1), rowOf(db, S2)]).toEqual(sources);
        const [c1, c2] = result.studysets;
        const keysOf = (id: string) =>
            (rowOf(db, id)?.cards ?? []).flatMap((c) =>
                (c.files as { key: string }[]).map((f) => f.key)
            );
        const k1 = keysOf(c1!.studysetUUID);
        const k2 = keysOf(c2!.studysetUUID);
        expect(k1[0]).toStartWith(`${c1!.studysetUUID}/`);
        expect(k2[0]).toStartWith(`${c2!.studysetUUID}/`);
        expect(k2[0]).toBe(k2[1]!);
        expect(result.fileCopies).toEqual([
            { from: `${S1}/f1`, to: k1[0]! },
            { from: `${S2}/f2`, to: k2[0]! },
        ]);
    });

    test('a set without files lists no copies', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        own(db, a, S1);
        const result = duplicateStudysets(db, a, [S1]);
        expect(result).toMatchObject({ status: 'ok', fileCopies: [] });
    });

    test('keeps an unsafe stored key as it is and never copies it', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        own(db, a, S1, [fileCard(`${S1}/../x`)]);
        const result = duplicateStudysets(db, a, [S1]);
        if (result.status !== 'ok') throw new Error(result.status);
        expect(result.studysets[0]?.cards[0]?.files).toEqual([
            { key: `${S1}/../x` },
        ]);
        expect(result.fileCopies).toEqual([]);
    });

    test('refuses a copy over the size cap and inserts nothing', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        own(db, a, S1);
        const row = rowOf(db, S1)!;
        const pad = MAX_STUDYSET_BYTES - 2 - viewBytes(row);
        db.update(studyset)
            .set({ description: 'x'.repeat(pad) })
            .where(eq(studyset.studysetUUID, S1))
            .run();
        expect(viewBytes(rowOf(db, S1)!)).toBe(MAX_STUDYSET_BYTES - 2);
        expect(() => duplicateStudysets(db, a, [S1])).toThrow(
            StudysetTooLargeError
        );
        expect(db.select().from(studyset).all()).toHaveLength(1);
    });

    test("one set of another user's fails the whole batch", () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        const b = addUser(db, 'b');
        own(db, a, S1);
        own(db, b, B1);
        expect(duplicateStudysets(db, a, [S1, B1])).toEqual({
            status: 'not_found',
        });
        expect(db.select().from(studyset).all()).toHaveLength(2);
    });

    test('an empty list does nothing', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        expect(duplicateStudysets(db, a, [])).toEqual({
            status: 'ok',
            studysets: [],
            fileCopies: [],
        });
    });

    test('the stored copy matches the returned view', () => {
        const db = freshDb();
        const a = addUser(db, 'a');
        own(db, a, S1, [fileCard(`${S1}/f`)]);
        const result = duplicateStudysets(db, a, [S1]);
        if (result.status !== 'ok') throw new Error(result.status);
        const copy = result.studysets[0]!;
        expect(toView(rowOf(db, copy.studysetUUID)!)).toEqual(copy);
    });
});
