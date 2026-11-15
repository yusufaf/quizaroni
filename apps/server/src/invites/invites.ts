import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { registrationInvite } from '../db/schema';

export const INVITE_DAYS_DEFAULT = 7;
export const INVITE_DAYS_MAX = 30;
export const INVITE_USES_MAX = 100;
const LIST_MAX = 200;
const DAY_MS = 86_400_000;

export type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';

export type InviteView = {
    id: string;
    email: string | null;
    maxUses: number;
    uses: number;
    status: InviteStatus;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
};

type InviteRow = typeof registrationInvite.$inferSelect;

export function hashInviteToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function inviteLink(publicUrl: string, token: string): string {
    return `${publicUrl}/signUp?invite=${encodeURIComponent(token)}`;
}

function statusOf(row: InviteRow, now: Date): InviteStatus {
    if (row.revokedAt) return 'revoked';
    if (row.uses >= row.maxUses) return 'used';
    if (row.expiresAt <= now) return 'expired';
    return 'active';
}

function toView(row: InviteRow, now: Date): InviteView {
    return {
        id: row.id,
        email: row.email,
        maxUses: row.maxUses,
        uses: row.uses,
        status: statusOf(row, now),
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
    };
}

// The token is returned once; only its hash is stored. An email-locked invite
// is always single-use.
export function createInvite(
    db: Db,
    o: { createdBy: string; email?: string; days?: number; maxUses?: number },
    now = new Date()
): { invite: InviteView; token: string } {
    const token = randomBytes(32).toString('base64url');
    const row = db
        .insert(registrationInvite)
        .values({
            id: crypto.randomUUID(),
            tokenHash: hashInviteToken(token),
            email: o.email ?? null,
            maxUses: o.email ? 1 : (o.maxUses ?? 1),
            uses: 0,
            createdBy: o.createdBy,
            createdAt: now,
            expiresAt: new Date(
                now.getTime() + (o.days ?? INVITE_DAYS_DEFAULT) * DAY_MS
            ),
        })
        .returning()
        .get();
    return { invite: toView(row, now), token };
}

export function listInvites(db: Db, now = new Date()): InviteView[] {
    return db
        .select()
        .from(registrationInvite)
        .orderBy(
            desc(registrationInvite.createdAt),
            desc(registrationInvite.id)
        )
        .limit(LIST_MAX)
        .all()
        .map((row) => toView(row, now));
}

export function revokeInvite(
    db: Db,
    id: string,
    now = new Date()
): InviteView | undefined {
    db.update(registrationInvite)
        .set({ revokedAt: now })
        .where(
            and(
                eq(registrationInvite.id, id),
                isNull(registrationInvite.revokedAt)
            )
        )
        .run();
    const row = db
        .select()
        .from(registrationInvite)
        .where(eq(registrationInvite.id, id))
        .get();
    return row ? toView(row, now) : undefined;
}

function usable(token: string, now: Date) {
    return and(
        eq(registrationInvite.tokenHash, hashInviteToken(token)),
        isNull(registrationInvite.revokedAt),
        gt(registrationInvite.expiresAt, now),
        lt(registrationInvite.uses, registrationInvite.maxUses)
    );
}

export function findUsableInvite(
    db: Pick<Db, 'select'>,
    token: string,
    now = new Date()
): { id: string; email: string | null } | undefined {
    if (!token) return undefined;
    return db
        .select({ id: registrationInvite.id, email: registrationInvite.email })
        .from(registrationInvite)
        .where(usable(token, now))
        .get();
}

// One UPDATE, so two sign-ups can't both take the last use.
export function claimInvite(db: Db, token: string, now = new Date()): boolean {
    if (!token) return false;
    const claimed = db
        .update(registrationInvite)
        .set({ uses: sql`${registrationInvite.uses} + 1` })
        .where(usable(token, now))
        .returning({ id: registrationInvite.id })
        .all();
    return claimed.length === 1;
}
