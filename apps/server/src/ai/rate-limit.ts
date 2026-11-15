export type TakeResult = { ok: true } | { ok: false; retryAfterSeconds: number };

type Window = { start: number; count: number };

export const AI_RATE_LIMIT = { windowMs: 60_000, max: 15 } as const;

// In memory and per process, like Better Auth's own limiter: a self-host
// instance is one process, and a restart only resets the counts.
export class FixedWindowLimiter {
    private readonly windows = new Map<string, Window>();
    private readonly windowMs: number;
    private readonly max: number;
    private readonly now: () => number;
    private readonly maxKeys: number;

    constructor(o: {
        windowMs: number;
        max: number;
        now?: () => number;
        maxKeys?: number;
    }) {
        this.windowMs = o.windowMs;
        this.max = o.max;
        this.now = o.now ?? Date.now;
        this.maxKeys = o.maxKeys ?? 10_000;
    }

    get size(): number {
        return this.windows.size;
    }

    take(key: string): TakeResult {
        const now = this.now();
        const current = this.windows.get(key);
        if (current && now - current.start < this.windowMs) {
            if (current.count >= this.max) {
                return {
                    ok: false,
                    retryAfterSeconds: Math.max(
                        1,
                        Math.ceil((current.start + this.windowMs - now) / 1000)
                    ),
                };
            }
            current.count += 1;
            return { ok: true };
        }
        if (!current && this.windows.size >= this.maxKeys) this.sweep(now);
        this.windows.set(key, { start: now, count: 1 });
        return { ok: true };
    }

    private sweep(now: number): void {
        for (const [key, window] of this.windows) {
            if (now - window.start >= this.windowMs) this.windows.delete(key);
        }
    }
}
