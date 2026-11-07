import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db';
import { userProfile } from '../db/schema';
import type { ParseResult } from '../users/metadata';
import { ensureProfile } from '../users/profile';
import { type Conn, ownedRow, ownedRows, type Row, writeOwned } from './store';
import { isStudysetUUID, MAX_BATCH_STUDYSETS } from './updates';

export const labelListSchema = z.array(z.string());

export const MAX_LABEL_LENGTH = 100;
export const MAX_PROFILE_LABELS = 500;

export function isLabel(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value === value.trim() &&
        value.length >= 1 &&
        value.length <= MAX_LABEL_LENGTH
    );
}

// The Manage Labels list lives on the profile; each set holds its own copy of
// the names it carries. Every operation keeps both in step in one transaction.
function profileLabels(tx: Conn, userId: string, now: Date): string[] {
    ensureProfile(tx, userId, now);
    return (
        tx
            .select({ labels: userProfile.labels })
            .from(userProfile)
            .where(eq(userProfile.userId, userId))
            .get()?.labels ?? []
    );
}

function writeProfileLabels(
    tx: Conn,
    userId: string,
    labels: string[],
    now: Date
): void {
    tx.update(userProfile)
        .set({ labels, updatedAt: now })
        .where(eq(userProfile.userId, userId))
        .run();
}

const dedupe = (labels: string[]) => [...new Set(labels)];

const sameList = (a: string[], b: string[]) =>
    a.length === b.length && a.every((label, i) => label === b[i]);

// A label-only set write; a set whose labels don't change is left alone.
function relabel(tx: Conn, row: Row, labels: string[], now: Date): void {
    if (sameList(row.labels, labels)) return;
    setLabels(tx, row, labels, now);
}

function setLabels(tx: Conn, row: Row, labels: string[], now: Date): void {
    const result = writeOwned(
        tx,
        row,
        { fields: { labels }, metadata: {} },
        now
    );
    // A write without cards can't be refused for its card files.
    if (result.status !== 'ok') throw new Error('label write refused');
}

const immediate = { behavior: 'immediate' } as const;

export function createLabel(
    db: Db,
    ownerId: string,
    label: string,
    target?: string,
    now = new Date()
): { status: 'ok' } | { status: 'not_found' } | { status: 'too_many' } {
    return db.transaction((tx) => {
        const row = target ? ownedRow(tx, ownerId, target) : undefined;
        if (target && !row) return { status: 'not_found' } as const;
        const labels = profileLabels(tx, ownerId, now);
        if (!labels.includes(label)) {
            if (labels.length >= MAX_PROFILE_LABELS) {
                return { status: 'too_many' } as const;
            }
            writeProfileLabels(tx, ownerId, [...labels, label], now);
        }
        if (row && !row.labels.includes(label)) {
            relabel(tx, row, [...row.labels, label], now);
        }
        return { status: 'ok' } as const;
    }, immediate);
}

// The old name finds the label; the client's list index is ignored, so a
// stale index can't rename the wrong one.
export function renameLabel(
    db: Db,
    ownerId: string,
    oldLabel: string,
    newLabel: string,
    now = new Date()
): { status: 'ok' } | { status: 'not_found' } | { status: 'exists' } {
    return db.transaction((tx) => {
        const labels = profileLabels(tx, ownerId, now);
        if (!labels.includes(oldLabel)) return { status: 'not_found' } as const;
        if (newLabel === oldLabel) return { status: 'ok' } as const;
        if (labels.includes(newLabel)) return { status: 'exists' } as const;
        const rename = (list: string[]) =>
            dedupe(list.map((l) => (l === oldLabel ? newLabel : l)));
        writeProfileLabels(tx, ownerId, rename(labels), now);
        for (const row of ownedRows(tx, ownerId)) {
            if (row.labels.includes(oldLabel)) {
                relabel(tx, row, rename(row.labels), now);
            }
        }
        return { status: 'ok' } as const;
    }, immediate);
}

export function deleteLabels(
    db: Db,
    ownerId: string,
    toDelete: string[],
    now = new Date()
): void {
    const gone = new Set(toDelete);
    const keep = (list: string[]) => list.filter((l) => !gone.has(l));
    db.transaction((tx) => {
        const labels = profileLabels(tx, ownerId, now);
        const kept = keep(labels);
        if (kept.length !== labels.length) {
            writeProfileLabels(tx, ownerId, kept, now);
        }
        for (const row of ownedRows(tx, ownerId)) {
            relabel(tx, row, keep(row.labels), now);
        }
    }, immediate);
}

// Partial, like the Lambda: ids the caller doesn't own are reported and the
// rest still update. Every assign writes, so updatedAt always moves, and each
// label is stored once.
export function setStudysetLabels(
    db: Db,
    ownerId: string,
    updates: [string, string[]][],
    now = new Date()
): { updated: string[]; notFound: string[] } {
    return db.transaction((tx) => {
        const updated: string[] = [];
        const notFound: string[] = [];
        for (const [id, labels] of updates) {
            const row = ownedRow(tx, ownerId, id);
            if (!row) {
                notFound.push(id);
                continue;
            }
            setLabels(tx, row, dedupe(labels), now);
            updated.push(id);
        }
        return { updated, notFound };
    }, immediate);
}

export function parseLabelAssignments(
    value: unknown
): ParseResult<[string, string[]][]> {
    const invalid = {
        ok: false,
        status: 400,
        message: 'Invalid studysetUpdates',
    } as const;
    if (!Array.isArray(value)) return invalid;
    if (value.length > MAX_BATCH_STUDYSETS) {
        return { ok: false, status: 400, message: 'Too many study sets' };
    }
    const seen = new Set<string>();
    for (const item of value) {
        if (
            !Array.isArray(item) ||
            item.length !== 2 ||
            !isStudysetUUID(item[0]) ||
            !labelListSchema.safeParse(item[1]).success ||
            seen.has(item[0])
        ) {
            return invalid;
        }
        seen.add(item[0]);
    }
    return { ok: true, value: value as [string, string[]][] };
}

