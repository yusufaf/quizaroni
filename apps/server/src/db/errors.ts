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
