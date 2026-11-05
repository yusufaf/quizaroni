import { DrizzleQueryError } from 'drizzle-orm';

// A DrizzleQueryError's message embeds the query params, which for setup and
// auth include password hashes. Only the driver's own message is safe to log.
export function describeDbError(err: unknown): string {
    if (err instanceof DrizzleQueryError) {
        return (err.cause as Error | undefined)?.message ?? 'database error';
    }
    if (err instanceof Error) return err.message;
    return String(err);
}

export function sanitizeLogArg(arg: unknown): unknown {
    if (arg instanceof DrizzleQueryError) return describeDbError(arg);
    if (arg instanceof Error && arg.cause instanceof DrizzleQueryError) {
        return describeDbError(arg.cause);
    }
    return arg;
}

const MAX_CAUSE_DEPTH = 3;

// The sync bun-sqlite driver throws the SQLiteError itself, with `code` on it;
// other paths wrap it in an error whose `cause` holds the driver error.
export function isUniqueViolation(err: unknown): boolean {
    let current = err;
    for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth++) {
        if (typeof current !== 'object' || current === null) return false;
        const { code, cause } = current as { code?: unknown; cause?: unknown };
        if (code === 'SQLITE_CONSTRAINT_UNIQUE') return true;
        current = cause;
    }
    return false;
}
