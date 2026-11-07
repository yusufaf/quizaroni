import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db';
import { withFileURLs } from '../files/keys';
import { studyset, userProfile } from '../db/schema';
import type { JsonObject } from '../users/metadata';
import {
    collectCardFileKeys,
    DEFAULT_STUDYSET_METADATA,
    disallowedCardFileKeys,
    type FileCopy,
    planCardFileCopies,
    studysetUUIDOfKey,
    EMPTY_WRITE,
    MAX_STUDYSET_BYTES,
    type StudysetWrite,
} from './updates';

// The Lambda's item shape, so the web's StudysetSchema accepts it unchanged.
export type StudysetView = {
    studysetUUID: string;
    userUUID: string;
    username: string | null;
    title: string;
    description: string;
    favorited: boolean;
    cards: JsonObject[];
    categories: string[];
    labels: string[];
    metadata: JsonObject;
    lastViewed: string;
    createdAt: string;
    updatedAt: string;
};

export class StudysetTooLargeError extends Error {
    constructor() {
        super('Study set too large');
        this.name = 'StudysetTooLargeError';
    }
}

export type Conn = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>;
export type Row = typeof studyset.$inferSelect;

// The row as stored, with each card file's URL exactly as the client sent it.
function storedView(row: Row): StudysetView {
    return {
        studysetUUID: row.studysetUUID,
        userUUID: row.ownerId,
        username: row.username,
        title: row.title,
        description: row.description,
        favorited: row.favorited,
        cards: row.cards,
        categories: row.categories,
        labels: row.labels,
        metadata: row.metadata,
        lastViewed: row.lastViewed.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

// Card files are always served from the stable, session-checked path.
export function toView(row: Row): StudysetView {
    return { ...storedView(row), cards: withFileURLs(row.cards) };
}

// The id is a global key; ownership is checked on every read and write.
export function ownedRow(
    conn: Conn,
    ownerId: string,
    studysetUUID: string
): Row | undefined {
    return conn
        .select()
        .from(studyset)
        .where(
            and(
                eq(studyset.studysetUUID, studysetUUID),
                eq(studyset.ownerId, ownerId)
            )
        )
        .get();
}

// Measures what's stored, so the cap counts each stored URL as sent.
export const viewBytes = (row: Row) =>
    Buffer.byteLength(JSON.stringify(storedView(row)));

const VIEW_STATE_FIELDS = new Set(['favorited', 'lastViewed']);

// Toggling a favorite or recording a view changes a set by a byte at most.
function isViewStateOnly(write: StudysetWrite): boolean {
    return (
        Object.keys(write.metadata).length === 0 &&
        Object.keys(write.fields).every((key) => VIEW_STATE_FIELDS.has(key))
    );
}

// Only a write that grows a set past the cap is refused, so a set already
// over it (say, from an import) can still be viewed, edited and shrunk.
function applyWrite(row: Row, write: StudysetWrite, now: Date): Row {
    const next: Row = {
        ...row,
        ...write.fields,
        metadata: { ...row.metadata, ...write.metadata },
        updatedAt: now,
    };
    const nextBytes = viewBytes(next);
    if (
        nextBytes > MAX_STUDYSET_BYTES &&
        !isViewStateOnly(write) &&
        nextBytes > viewBytes(row)
    ) {
        throw new StudysetTooLargeError();
    }
    return next;
}

export type WriteResult =
    | { status: 'ok'; studyset: StudysetView; fileCopies: FileCopy[] }
    | { status: 'forbidden' };

export function ownedRows(conn: Conn, ownerId: string): Row[] {
    return conn
        .select()
        .from(studyset)
        .where(eq(studyset.ownerId, ownerId))
        .orderBy(asc(studyset.createdAt), asc(studyset.studysetUUID))
        .all();
}

type ResolvedCards =
    | { status: 'ok'; cards?: JsonObject[]; copies: FileCopy[] }
    | { status: 'forbidden' };

// Card file keys the set can't hold as they are must come from the caller's
// own sets (Combine): those are re-keyed under this set, and the copies are
// handed back for the file store (#259) to perform.
function resolveCardFiles(
    tx: Conn,
    ownerId: string,
    studysetUUID: string,
    storedCards: JsonObject[],
    cards: JsonObject[] | undefined
): ResolvedCards {
    if (cards === undefined) return { status: 'ok', copies: [] };
    const foreign = disallowedCardFileKeys(cards, studysetUUID, storedCards);
    if (foreign.length === 0) return { status: 'ok', cards, copies: [] };

    const sourceSets = new Set<string>();
    for (const key of foreign) {
        const source = studysetUUIDOfKey(key);
        if (source === undefined) return { status: 'forbidden' };
        sourceSets.add(source);
    }
    const owned = new Set(
        tx
            .select({ id: studyset.studysetUUID })
            .from(studyset)
            .where(
                and(
                    eq(studyset.ownerId, ownerId),
                    inArray(studyset.studysetUUID, [...sourceSets])
                )
            )
            .all()
            .map((r) => r.id)
    );
    const unowned = foreign.filter((key) => !owned.has(studysetUUIDOfKey(key)!));
    if (unowned.length > 0) {
        // A key under a set the caller doesn't own is fine only if one of
        // their other sets already holds it (an earlier copy).
        const held = collectCardFileKeys(
            ownedRows(tx, ownerId)
                .filter((r) => r.studysetUUID !== studysetUUID)
                .flatMap((r) => r.cards)
        ).keys;
        if (unowned.some((key) => !held.has(key))) {
            return { status: 'forbidden' };
        }
    }
    const foreignSet = new Set(foreign);
    const planned = planCardFileCopies(cards, studysetUUID, (key) =>
        foreignSet.has(key)
    );
    return { status: 'ok', cards: planned.cards, copies: planned.copies };
}

// Only a write that carries cards gets its cards replaced.
function withCards(
    write: StudysetWrite,
    resolved: { cards?: JsonObject[] }
): StudysetWrite {
    if (write.fields.cards === undefined || resolved.cards === undefined) {
        return write;
    }
    return { ...write, fields: { ...write.fields, cards: resolved.cards } };
}

// Shared by update and a repeated create of the caller's own set.
export function writeOwned(
    tx: Conn,
    row: Row,
    write: StudysetWrite,
    now: Date
): WriteResult {
    const resolved = resolveCardFiles(
        tx,
        row.ownerId,
        row.studysetUUID,
        row.cards,
        write.fields.cards
    );
    if (resolved.status === 'forbidden') return { status: 'forbidden' };
    const next = applyWrite(row, withCards(write, resolved), now);
    tx.update(studyset)
        .set({
            title: next.title,
            description: next.description,
            favorited: next.favorited,
            cards: next.cards,
            categories: next.categories,
            labels: next.labels,
            metadata: next.metadata,
            lastViewed: next.lastViewed,
            updatedAt: next.updatedAt,
        })
        .where(
            and(
                eq(studyset.studysetUUID, row.studysetUUID),
                eq(studyset.ownerId, row.ownerId)
            )
        )
        .run();
    return {
        status: 'ok',
        studyset: toView(next),
        fileCopies: resolved.copies,
    };
}

export function listStudysets(db: Db, ownerId: string): StudysetView[] {
    return ownedRows(db, ownerId).map(toView);
}

export function getStudyset(
    db: Db,
    ownerId: string,
    studysetUUID: string
): StudysetView | null {
    const row = ownedRow(db, ownerId, studysetUUID);
    return row ? toView(row) : null;
}

// With a client id (the SyncEngine's offline create), a repeat of the
// caller's own id applies the write as an update, so a retried create is
// idempotent. Another owner's id is refused.
export function createStudyset(
    db: Db,
    ownerId: string,
    input: { studysetUUID?: string; write?: StudysetWrite } = {},
    now = new Date()
): WriteResult {
    const write = input.write ?? EMPTY_WRITE;
    const id = input.studysetUUID ?? crypto.randomUUID();
    return db.transaction(
        (tx): WriteResult => {
            const existing = tx
                .select()
                .from(studyset)
                .where(eq(studyset.studysetUUID, id))
                .get();
            if (existing) {
                if (existing.ownerId !== ownerId) return { status: 'forbidden' };
                return writeOwned(tx, existing, write, now);
            }
            const username =
                tx
                    .select({ username: userProfile.username })
                    .from(userProfile)
                    .where(eq(userProfile.userId, ownerId))
                    .get()?.username ?? null;
            const base: Row = {
                studysetUUID: id,
                ownerId,
                username,
                title: 'Untitled Studyset',
                description: '',
                favorited: false,
                cards: [],
                categories: [],
                labels: [],
                metadata: structuredClone(DEFAULT_STUDYSET_METADATA),
                lastViewed: now,
                createdAt: now,
                updatedAt: now,
                subject: null,
                isPublic: false,
                publishedAt: null,
                featuredAt: null,
                hiddenAt: null,
                saveCount: 0,
                copiedFrom: null,
            };
            const resolved = resolveCardFiles(
                tx,
                ownerId,
                id,
                [],
                write.fields.cards
            );
            if (resolved.status === 'forbidden') return { status: 'forbidden' };
            const row = applyWrite(base, withCards(write, resolved), now);
            tx.insert(studyset).values(row).run();
            return {
                status: 'ok',
                studyset: toView(row),
                fileCopies: resolved.copies,
            };
        },
        { behavior: 'immediate' }
    );
}

export function updateStudyset(
    db: Db,
    ownerId: string,
    studysetUUID: string,
    write: StudysetWrite,
    now = new Date()
): WriteResult | { status: 'not_found' } {
    return db.transaction(
        (tx): WriteResult | { status: 'not_found' } => {
            const row = ownedRow(tx, ownerId, studysetUUID);
            if (!row) return { status: 'not_found' };
            return writeOwned(tx, row, write, now);
        },
        { behavior: 'immediate' }
    );
}

// An unknown id counts as deleted, so a SyncEngine retry after a lost
// response doesn't wedge its queue.
export function deleteStudyset(
    db: Db,
    ownerId: string,
    studysetUUID: string
): 'deleted' | 'absent' | 'not_owner' {
    return db.transaction(
        (tx) => {
            const found = tx
                .select({ ownerId: studyset.ownerId })
                .from(studyset)
                .where(eq(studyset.studysetUUID, studysetUUID))
                .get();
            if (!found) return 'absent';
            if (found.ownerId !== ownerId) return 'not_owner';
            tx.delete(studyset)
                .where(
                    and(
                        eq(studyset.studysetUUID, studysetUUID),
                        eq(studyset.ownerId, ownerId)
                    )
                )
                .run();
            return 'deleted';
        },
        { behavior: 'immediate' }
    );
}

// Ids the caller doesn't own are skipped, not refused.
export function deleteStudysets(
    db: Db,
    ownerId: string,
    studysetUUIDs: string[]
): string[] {
    if (studysetUUIDs.length === 0) return [];
    return db.transaction(
        (tx) =>
            tx
                .delete(studyset)
                .where(
                    and(
                        eq(studyset.ownerId, ownerId),
                        inArray(studyset.studysetUUID, studysetUUIDs)
                    )
                )
                .returning({ id: studyset.studysetUUID })
                .all()
                .map((r) => r.id),
        { behavior: 'immediate' }
    );
}

// Adds an uploaded file to the card it was uploaded for (Lambda parity), so
// the file is kept even if the editor never saves.
export function attachCardFile(
    db: Db,
    ownerId: string,
    studysetUUID: string,
    cardUUID: string,
    file: JsonObject,
    now = new Date()
): 'attached' | 'no_card' | 'not_found' {
    return db.transaction(
        (tx) => {
            const row = ownedRow(tx, ownerId, studysetUUID);
            if (!row) return 'not_found' as const;
            if (!row.cards.some((card) => card.cardUUID === cardUUID)) {
                return 'no_card' as const;
            }
            const cards = row.cards.map((card) =>
                card.cardUUID === cardUUID
                    ? {
                          ...card,
                          files: [
                              ...(Array.isArray(card.files) ? card.files : []),
                              file,
                          ],
                      }
                    : card
            );
            const result = writeOwned(
                tx,
                row,
                { fields: { cards }, metadata: {} },
                now
            );
            return result.status === 'ok'
                ? ('attached' as const)
                : ('not_found' as const);
        },
        { behavior: 'immediate' }
    );
}

// Renames the author on every set the user owns; updatedAt stays as it was.
export function restampAuthor(
    tx: Pick<Db, 'update'>,
    ownerId: string,
    username: string
): number {
    return tx
        .update(studyset)
        .set({ username })
        .where(eq(studyset.ownerId, ownerId))
        .returning({ id: studyset.studysetUUID })
        .all().length;
}
