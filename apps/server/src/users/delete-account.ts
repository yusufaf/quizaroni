import { and, count, eq, ne } from 'drizzle-orm';
import type { Db } from '../db';
import {
    account,
    mailOutbox,
    resetEmailLog,
    studyset,
    user,
    verification,
} from '../db/schema';
import { LISTED } from '../studysets/gate';

export type DeleteAccountResult =
    | { status: 'deleted'; studysetIds: string[] }
    | { status: 'last_admin' }
    | { status: 'not_found' };

export type DeletionProvider = 'google' | 'github';

export type DeletionSummary = {
    hasPassword: boolean;
    providers: DeletionProvider[];
    lastAdmin: boolean;
    studysets: number;
    publishedStudysets: number;
};

type Reader = Pick<Db, 'select'>;

const DELETION_PROVIDERS: readonly string[] = ['google', 'github'];

export function hasPassword(db: Reader, userId: string): boolean {
    const row = db
        .select({ password: account.password })
        .from(account)
        .where(
            and(
                eq(account.userId, userId),
                eq(account.providerId, 'credential')
            )
        )
        .get();
    return row?.password != null && row.password !== '';
}

export function isLastAdmin(db: Reader, userId: string): boolean {
    const self = db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, userId))
        .get();
    if (self?.role !== 'admin') return false;
    const other = db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.role, 'admin'), ne(user.id, userId)))
        .get();
    return other === undefined;
}

export function accountDeletionSummary(
    db: Reader,
    userId: string
): DeletionSummary {
    const providers = db
        .select({ providerId: account.providerId })
        .from(account)
        .where(eq(account.userId, userId))
        .all()
        .map((row) => row.providerId)
        .filter((id): id is DeletionProvider =>
            DELETION_PROVIDERS.includes(id)
        );
    const total = db
        .select({ n: count() })
        .from(studyset)
        .where(eq(studyset.ownerId, userId))
        .get();
    const listed = db
        .select({ n: count() })
        .from(studyset)
        .where(and(eq(studyset.ownerId, userId), LISTED))
        .get();
    return {
        hasPassword: hasPassword(db, userId),
        providers: [...new Set(providers)],
        lastAdmin: isLastAdmin(db, userId),
        studysets: total?.n ?? 0,
        publishedStudysets: listed?.n ?? 0,
    };
}

// BEGIN IMMEDIATE takes the write lock before the last-admin check, so two
// admins deleting themselves at once can't both pass it.
export function deleteAccountData(db: Db, userId: string): DeleteAccountResult {
    return db.transaction(
        (tx): DeleteAccountResult => {
            const target = tx
                .select({ email: user.email })
                .from(user)
                .where(eq(user.id, userId))
                .get();
            if (!target) return { status: 'not_found' };
            if (isLastAdmin(tx, userId)) return { status: 'last_admin' };
            const studysetIds = tx
                .select({ id: studyset.studysetUUID })
                .from(studyset)
                .where(eq(studyset.ownerId, userId))
                .all()
                .map((row) => row.id);
            tx.delete(mailOutbox)
                .where(eq(mailOutbox.recipient, target.email))
                .run();
            tx.delete(resetEmailLog)
                .where(eq(resetEmailLog.recipient, target.email))
                .run();
            tx.delete(verification).where(eq(verification.value, userId)).run();
            tx.delete(user).where(eq(user.id, userId)).run();
            return { status: 'deleted', studysetIds };
        },
        { behavior: 'immediate' }
    );
}
