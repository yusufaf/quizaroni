import { and, asc, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset, userProfile } from '../db/schema';
import type { JsonObject } from '../users/metadata';
import {
    DEFAULT_STUDYSET_METADATA,
    disallowedCardFileKeys,
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

type Conn = Pick<Db, 'select' | 'insert' | 'update' | 'delete'>;
type Row = typeof studyset.$inferSelect;

function toView(row: Row): StudysetView {
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

// The id is a global key; ownership is checked on every read and write.
function ownedRow(
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

const viewBytes = (row: Row) => Buffer.byteLength(JSON.stringify(toView(row)));

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

type WriteResult =
    | { status: 'ok'; studyset: StudysetView }
    | { status: 'forbidden' };

// Shared by update and a repeated create of the caller's own set.
function writeOwned(
    tx: Conn,
    row: Row,
    write: StudysetWrite,
    now: Date
): WriteResult {
    if (
        disallowedCardFileKeys(
            write.fields.cards ?? [],
            row.studysetUUID,
            row.cards
        ).length > 0
    ) {
        return { status: 'forbidden' };
    }
    const next = applyWrite(row, write, now);
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
    return { status: 'ok', studyset: toView(next) };
}

export function listStudysets(db: Db, ownerId: string): StudysetView[] {
    return db
        .select()
        .from(studyset)
        .where(eq(studyset.ownerId, ownerId))
        .orderBy(asc(studyset.createdAt), asc(studyset.studysetUUID))
        .all()
        .map(toView);
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
            };
            if (
                disallowedCardFileKeys(write.fields.cards ?? [], id, [])
                    .length > 0
            ) {
                return { status: 'forbidden' };
            }
            const row = applyWrite(base, write, now);
            tx.insert(studyset).values(row).run();
            return { status: 'ok', studyset: toView(row) };
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
