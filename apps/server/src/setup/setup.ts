import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DrizzleQueryError, eq } from 'drizzle-orm';
import type {
    AdminBootstrap,
    RegistrationMode,
    TeacherPolicy,
} from '../config';
import type { Db } from '../db';
import { account, user } from '../db/schema';
import { getSetting, insertSettings, SETTING } from '../settings';

export const SETUP_TOKEN_FILENAME = 'setup-token';

export function issueSetupToken(dataDir: string): string {
    const token = randomBytes(32).toString('base64url');
    const path = join(dataDir, SETUP_TOKEN_FILENAME);
    writeFileSync(path, `${token}\n`, { mode: 0o600 });
    // The mode option only applies when the file is created.
    chmodSync(path, 0o600);
    return token;
}

// Runs after setup has committed, or on a boot where it already had, so a
// leftover file is harmless and must not fail the request or the boot.
export function clearSetupToken(dataDir: string): void {
    const path = join(dataDir, SETUP_TOKEN_FILENAME);
    try {
        rmSync(path, { force: true });
    } catch (err) {
        console.warn(
            `Could not remove ${path}: ${(err as Error).message}. Delete it manually.`
        );
    }
}

export function tokensMatch(expected: string, candidate: string): boolean {
    const trimmed = candidate.trim();
    if (trimmed === '') return false;
    // Hashing first gives equal-length buffers, which timingSafeEqual requires.
    const digest = (value: string) =>
        createHash('sha256').update(value).digest();
    return timingSafeEqual(digest(expected), digest(trimmed));
}

export function isSetupComplete(db: Db): boolean {
    return getSetting(db, SETTING.setupCompletedAt) !== undefined;
}

export type SetupInput = {
    name: string;
    email: string;
    passwordHash: string;
    registrationMode: RegistrationMode;
    teacherPolicy: TeacherPolicy;
    publicUrl: string | undefined;
};

export type SetupResult =
    | { status: 'created'; userId: string }
    | { status: 'already_set_up' };

export function completeSetup(
    db: Db,
    input: SetupInput,
    now = new Date()
): SetupResult {
    // BEGIN IMMEDIATE takes the write lock before the recheck, so a concurrent
    // submission (in this or another process) waits and then sees the admin.
    return db.transaction(
        (tx): SetupResult => {
            const existingAdmin = tx
                .select({ id: user.id })
                .from(user)
                .where(eq(user.role, 'admin'))
                .get();
            if (
                existingAdmin ||
                getSetting(tx, SETTING.setupCompletedAt) !== undefined
            ) {
                return { status: 'already_set_up' };
            }
            const userId = crypto.randomUUID();
            tx.insert(user)
                .values({
                    id: userId,
                    name: input.name,
                    email: input.email,
                    emailVerified: true,
                    role: 'admin',
                    createdAt: now,
                    updatedAt: now,
                })
                .run();
            tx.insert(account)
                .values({
                    id: crypto.randomUUID(),
                    accountId: userId,
                    providerId: 'credential',
                    userId,
                    password: input.passwordHash,
                    createdAt: now,
                    updatedAt: now,
                })
                .run();
            insertSettings(
                tx,
                {
                    registrationMode: input.registrationMode,
                    teacherPolicy: input.teacherPolicy,
                    publicUrl: input.publicUrl,
                    setupCompletedAt: String(now.getTime()),
                },
                now
            );
            return { status: 'created', userId };
        },
        { behavior: 'immediate' }
    );
}

export class SetupGate {
    #complete = false;
    #notified = false;

    constructor(
        private readonly db: Db,
        private readonly token: string | undefined,
        private readonly onComplete?: () => void
    ) {}

    isComplete(): boolean {
        if (!this.#complete && isSetupComplete(this.db)) this.#complete = true;
        return this.#complete;
    }

    checkToken(candidate: string): boolean {
        return this.token !== undefined && tokensMatch(this.token, candidate);
    }

    markComplete(): void {
        this.#complete = true;
        if (this.#notified) return;
        this.#notified = true;
        this.onComplete?.();
    }
}

export async function bootstrapAdmin(
    db: Db,
    admin: AdminBootstrap,
    publicUrl: string | undefined
): Promise<SetupResult['status']> {
    const passwordHash = await Bun.password.hash(admin.password, {
        algorithm: 'argon2id',
    });
    return completeSetup(db, {
        name: admin.email.slice(0, admin.email.indexOf('@')),
        email: admin.email,
        passwordHash,
        registrationMode: admin.registrationMode,
        teacherPolicy: admin.teacherPolicy,
        publicUrl,
    }).status;
}

// A DrizzleQueryError's message embeds the query params, which for setup
// include the password hash and email, so only the driver's cause is shown.
export function describeDbError(err: unknown): string {
    if (err instanceof DrizzleQueryError) {
        return (err.cause as Error | undefined)?.message ?? 'database error';
    }
    if (err instanceof Error) return err.message;
    return String(err);
}
