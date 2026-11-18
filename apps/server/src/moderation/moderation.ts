import { and, count, eq, isNotNull } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { isListed, LISTED } from '../studysets/gate';
import type { Row } from '../studysets/store';

// Instance-level moderation for the CLI: not scoped to an owner, and every write
// is an immediate transaction so it can't interleave with a running server's.
export type ModerationResult =
    | { status: 'not_found' }
    | { status: 'not_listed'; row: Row }
    | { status: 'changed' | 'unchanged'; row: Row };

type Changes = Partial<
    Pick<Row, 'featuredAt' | 'hiddenAt' | 'isPublic' | 'updatedAt'>
>;

function moderate(
    db: Db,
    id: string,
    decide: (row: Row) => Changes | 'unchanged' | 'not_listed'
): ModerationResult {
    return db.transaction(
        (tx): ModerationResult => {
            const where = eq(studyset.studysetUUID, id);
            const row = tx.select().from(studyset).where(where).get();
            if (!row) return { status: 'not_found' };
            const decision = decide(row);
            if (decision === 'unchanged' || decision === 'not_listed') {
                return { status: decision, row };
            }
            tx.update(studyset).set(decision).where(where).run();
            return { status: 'changed', row: { ...row, ...decision } };
        },
        { behavior: 'immediate' }
    );
}

// Re-featuring moves a set to the front, as the old DynamoDB script did.
export function featureSet(
    db: Db,
    id: string,
    now = new Date()
): ModerationResult {
    return moderate(db, id, (row) =>
        isListed(row) ? { featuredAt: now } : 'not_listed'
    );
}

export function unfeatureSet(db: Db, id: string): ModerationResult {
    return moderate(db, id, (row) =>
        row.featuredAt === null ? 'unchanged' : { featuredAt: null }
    );
}

// A takedown: off Explore and its public link, and validatePublish refuses the
// owner while hiddenAt is set.
export function hideSet(
    db: Db,
    id: string,
    now = new Date()
): ModerationResult {
    return moderate(db, id, (row) =>
        row.hiddenAt !== null && !row.isPublic && row.featuredAt === null
            ? 'unchanged'
            : {
                  hiddenAt: row.hiddenAt ?? now,
                  isPublic: false,
                  featuredAt: null,
                  updatedAt: now,
              }
    );
}

// Leaves the set private; its owner decides whether to publish it again.
export function unhideSet(
    db: Db,
    id: string,
    now = new Date()
): ModerationResult {
    return moderate(db, id, (row) =>
        row.hiddenAt === null
            ? 'unchanged'
            : { hiddenAt: null, updatedAt: now }
    );
}

// Same effect as the owner unpublishing it.
export function unpublishSet(
    db: Db,
    id: string,
    now = new Date()
): ModerationResult {
    return moderate(db, id, (row) =>
        !row.isPublic && row.featuredAt === null
            ? 'unchanged'
            : { isPublic: false, featuredAt: null, updatedAt: now }
    );
}

export function featuredCount(db: Db): number {
    return (
        db
            .select({ n: count() })
            .from(studyset)
            .where(and(LISTED, isNotNull(studyset.featuredAt)))
            .get()?.n ?? 0
    );
}
