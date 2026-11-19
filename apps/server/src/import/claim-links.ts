import { createHash, randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { and, asc, eq, notExists } from 'drizzle-orm';
import {
    type ConfigDefaults,
    ConfigError,
    normalizePublicUrl,
    resolveDataDir,
} from '../config';
import {
    closeDatabase,
    DatabaseStateError,
    type Db,
    type Migration,
    openExistingDatabase,
} from '../db';
import { describeDbError } from '../db/errors';
import { account, user, userProfile, verification } from '../db/schema';
import type { Output } from '../moderation/cli';
import { getSetting, SETTING } from '../settings';

export const CLAIM_USAGE = `Usage:
  quizaroni claim-links [--csv] [--days <1-30>] [--public-url <url>] [--data-dir <path>]

Makes a password reset link for every account without a password (imported
accounts whose hosted password couldn't be carried over). Send each user their
link; it lets them set a password. Rerunning makes new links; earlier ones
stay valid until they expire, so keep old output files as safe as new ones.

  --csv                 Print CSV (email,name,username,link,expires_at) instead of
                        "email<TAB>link" lines
  --days <1-30>         How long the links work (default 7)
  --public-url <url>    The URL users open (QZ_PUBLIC_URL, else the one set up)
  --data-dir <path>     The data directory (QZ_DATA_DIR, same default as the server)

Runs safely while the server is running. The links are secrets: anyone holding
one can take over that account.`;

const DAY_MS = 24 * 60 * 60 * 1000;

const CONSOLE: Output = {
    log: (line) => console.log(line),
    error: (line) => console.error(line),
};

export type ClaimLink = {
    email: string;
    name: string;
    username: string;
    link: string;
    expiresAt: Date;
};

/**
 * Stores a Better Auth reset token for each user with no credential account.
 * The identifier is hashed the way `verification.storeIdentifier: 'hashed'`
 * stores it, so /reset-password finds it and creates the credential.
 */
export function claimLinks(
    db: Db,
    publicUrl: string,
    now: Date,
    days: number
): ClaimLink[] {
    const expiresAt = new Date(now.getTime() + days * DAY_MS);
    return db.transaction(
        (tx) => {
            const users = tx
                .select({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    username: userProfile.username,
                })
                .from(user)
                .leftJoin(userProfile, eq(userProfile.userId, user.id))
                .where(
                    notExists(
                        tx
                            .select({ id: account.id })
                            .from(account)
                            .where(
                                and(
                                    eq(account.userId, user.id),
                                    eq(account.providerId, 'credential')
                                )
                            )
                    )
                )
                .orderBy(asc(user.email))
                .all();
            return users.map((u) => {
                const token = randomBytes(24).toString('base64url');
                tx.insert(verification)
                    .values({
                        id: crypto.randomUUID(),
                        identifier: createHash('sha256')
                            .update(`reset-password:${token}`)
                            .digest('base64url'),
                        value: u.id,
                        expiresAt,
                        createdAt: now,
                        updatedAt: now,
                    })
                    .run();
                return {
                    email: u.email,
                    name: u.name,
                    username: u.username ?? '',
                    link: `${publicUrl}/reset-password?token=${encodeURIComponent(token)}`,
                    expiresAt,
                };
            });
        },
        { behavior: 'immediate' }
    );
}

// RFC 4180, plus a leading ' on cells a spreadsheet would run as a formula:
// names and usernames are user content.
export function csvCell(value: string): string {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function runClaimLinks(
    argv: string[],
    env: Record<string, string | undefined>,
    cwd: string,
    o: {
        defaults?: ConfigDefaults;
        migrations?: readonly Migration[];
        out?: Output;
        now?: Date;
    } = {}
): number {
    const out = o.out ?? CONSOLE;
    const usageError = (message: string) => {
        out.error(message);
        out.error(CLAIM_USAGE);
        return 1;
    };
    let values: Record<string, string | boolean | undefined>;
    try {
        ({ values } = parseArgs({
            args: argv,
            strict: true,
            allowPositionals: false,
            options: {
                csv: { type: 'boolean' },
                days: { type: 'string' },
                'public-url': { type: 'string' },
                'data-dir': { type: 'string' },
                help: { type: 'boolean' },
            },
        }));
    } catch (err) {
        return usageError((err as Error).message);
    }
    if (values.help) {
        out.log(CLAIM_USAGE);
        return 0;
    }
    const daysText = typeof values.days === 'string' ? values.days : '7';
    const days = /^\d+$/.test(daysText) ? Number(daysText) : Number.NaN;
    if (!(days >= 1 && days <= 30)) {
        return usageError(
            `--days must be a whole number from 1 to 30 (got "${daysText}")`
        );
    }

    let dataDir: string;
    try {
        const flag = values['data-dir'];
        dataDir = resolveDataDir(
            typeof flag === 'string' ? flag : undefined,
            env,
            cwd,
            o.defaults
        );
    } catch (err) {
        if (!(err instanceof ConfigError)) throw err;
        return usageError(err.message);
    }

    let opened: ReturnType<typeof openExistingDatabase>;
    try {
        opened = openExistingDatabase(dataDir, o.migrations);
    } catch (err) {
        out.error(
            err instanceof DatabaseStateError
                ? err.message
                : `Could not open the database in ${dataDir}: ${describeDbError(err)}`
        );
        return 1;
    }
    try {
        const flagUrl = values['public-url'];
        const rawUrl =
            (typeof flagUrl === 'string' ? flagUrl : undefined) ||
            env.QZ_PUBLIC_URL ||
            getSetting(opened.db, SETTING.publicUrl);
        const publicUrl = rawUrl ? normalizePublicUrl(rawUrl) : undefined;
        if (!publicUrl) {
            out.error(
                rawUrl
                    ? `Not a public URL: ${rawUrl}`
                    : 'No public URL: pass --public-url or set QZ_PUBLIC_URL, or finish setup first.'
            );
            return 1;
        }
        const links = claimLinks(
            opened.db,
            publicUrl,
            o.now ?? new Date(),
            days
        );
        if (values.csv) {
            out.log('email,name,username,link,expires_at');
            for (const l of links) {
                out.log(
                    [
                        l.email,
                        l.name,
                        l.username,
                        l.link,
                        l.expiresAt.toISOString(),
                    ]
                        .map(csvCell)
                        .join(',')
                );
            }
        } else {
            for (const l of links) out.log(`${l.email}\t${l.link}`);
        }
        out.error(
            `${links.length} reset links, valid for ${days} days. They are secrets: send each only to its user.`
        );
        return 0;
    } catch (err) {
        out.error(`Could not make claim links: ${describeDbError(err)}`);
        return 1;
    } finally {
        closeDatabase(opened.sqlite);
    }
}
