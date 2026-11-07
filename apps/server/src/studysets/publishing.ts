import type { PublishError } from '@quizaroni/shared-types';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { validatePublish } from './gate';
import { ownedRow, type StudysetView, toView } from './store';

export type PublishResult =
    | { status: 'ok'; studyset: StudysetView }
    | { status: 'not_found' }
    | { status: 'refused'; errors: PublishError[] };

const owned = (ownerId: string, studysetUUID: string) =>
    and(eq(studyset.studysetUUID, studysetUUID), eq(studyset.ownerId, ownerId));

// publishedAt keeps the first publish time, as the Lambda did.
export function publishStudyset(
    db: Db,
    ownerId: string,
    studysetUUID: string,
    subject: unknown,
    now = new Date()
): PublishResult {
    return db.transaction(
        (tx): PublishResult => {
            const row = ownedRow(tx, ownerId, studysetUUID);
            if (!row) return { status: 'not_found' };
            const checked = validatePublish(subject, row);
            if (!checked.ok) return { status: 'refused', errors: checked.errors };
            const next = {
                ...row,
                subject: checked.subject,
                isPublic: true,
                publishedAt: row.publishedAt ?? now,
                updatedAt: now,
            };
            tx.update(studyset)
                .set({
                    subject: next.subject,
                    isPublic: true,
                    publishedAt: next.publishedAt,
                    updatedAt: now,
                })
                .where(owned(ownerId, studysetUUID))
                .run();
            return { status: 'ok', studyset: toView(next) };
        },
        { behavior: 'immediate' }
    );
}

// Allowed while hidden, so an owner can always take a set down.
export function unpublishStudyset(
    db: Db,
    ownerId: string,
    studysetUUID: string,
    now = new Date()
): { status: 'ok'; studyset: StudysetView } | { status: 'not_found' } {
    return db.transaction(
        (tx) => {
            const row = ownedRow(tx, ownerId, studysetUUID);
            if (!row) return { status: 'not_found' as const };
            const next = { ...row, isPublic: false, featuredAt: null, updatedAt: now };
            tx.update(studyset)
                .set({ isPublic: false, featuredAt: null, updatedAt: now })
                .where(owned(ownerId, studysetUUID))
                .run();
            return { status: 'ok' as const, studyset: toView(next) };
        },
        { behavior: 'immediate' }
    );
}
