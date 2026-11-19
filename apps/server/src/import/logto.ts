import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { ImportInputError } from './errors';

// One row of Logto's users table, as `to_jsonb(u)` prints it. Non-strict, so
// columns this import doesn't use are ignored.
export const LogtoUserSchema = z.object({
    tenant_id: z.string(),
    id: z.string(),
    username: z.string().nullable().optional(),
    primary_email: z.string().nullable().optional(),
    password_encrypted: z.string().nullable().optional(),
    password_encryption_method: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    identities: z
        .record(
            z.string(),
            z.object({ userId: z.string(), details: z.unknown().optional() })
        )
        .nullable()
        .optional(),
    mfa_verifications: z.array(z.unknown()).nullable().optional(),
    is_suspended: z.boolean().nullable().optional(),
    is_password_expired: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
});

export type LogtoUser = z.infer<typeof LogtoUserSchema>;

export function readLogtoUsers(file: string): {
    users: LogtoUser[];
    otherTenants: number;
} {
    let text: string;
    try {
        text = readFileSync(file, 'utf8');
    } catch (err) {
        throw new ImportInputError(`${file}: ${(err as Error).message}`);
    }
    const users: LogtoUser[] = [];
    let otherTenants = 0;
    text.split('\n').forEach((line, index) => {
        if (line.trim() === '') return;
        let parsed: unknown;
        try {
            parsed = JSON.parse(line);
        } catch (err) {
            throw new ImportInputError(
                `${file} line ${index + 1}: ${(err as Error).message}`
            );
        }
        const result = LogtoUserSchema.safeParse(parsed);
        if (!result.success) {
            throw new ImportInputError(
                `${file} line ${index + 1}: not a Logto user row (${result.error.issues[0]?.message ?? 'invalid'})`
            );
        }
        if (result.data.tenant_id === 'default') users.push(result.data);
        else otherTenants++;
    });
    return { users, otherTenants };
}

const ARGON2_PREFIX: Record<string, string> = {
    Argon2i: '$argon2i$',
    Argon2id: '$argon2id$',
    Argon2d: '$argon2d$',
};

/**
 * The Logto hash a self-host account can use as-is. Logto upgrades every other
 * scheme to Argon2i on sign-in, so the rest are users who never signed in since;
 * they get a reset link (claim-links) instead.
 */
export function credentialOf(
    u: LogtoUser
):
    | { hash: string }
    | { reason: 'no_password' | 'unsupported_method' | 'password_expired' } {
    const hash = u.password_encrypted;
    if (!hash) return { reason: 'no_password' };
    const prefix = ARGON2_PREFIX[u.password_encryption_method ?? ''];
    if (!prefix || !hash.startsWith(prefix)) {
        return { reason: 'unsupported_method' };
    }
    if (u.is_password_expired === true) return { reason: 'password_expired' };
    return { hash };
}

export function socialAccountsOf(
    u: LogtoUser
): { providerId: string; accountId: string }[] {
    return Object.entries(u.identities ?? {}).map(([target, identity]) => ({
        providerId: target,
        accountId: identity.userId,
    }));
}
