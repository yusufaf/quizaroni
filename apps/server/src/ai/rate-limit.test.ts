import { describe, expect, test } from 'bun:test';
import { FixedWindowLimiter } from './rate-limit';

function clock(start = 1_000_000) {
    let now = start;
    return {
        now: () => now,
        advance: (ms: number) => {
            now += ms;
        },
    };
}

describe('FixedWindowLimiter', () => {
    test('allows max requests per window, then reports when to retry', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({
            windowMs: 60_000,
            max: 2,
            now: time.now,
        });
        expect(limiter.take('ada')).toEqual({ ok: true });
        time.advance(10_000);
        expect(limiter.take('ada')).toEqual({ ok: true });
        time.advance(500);
        expect(limiter.take('ada')).toEqual({
            ok: false,
            retryAfterSeconds: 50,
        });
    });

    test('never reports less than one second to wait', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({
            windowMs: 1_000,
            max: 1,
            now: time.now,
        });
        limiter.take('ada');
        time.advance(999);
        expect(limiter.take('ada')).toEqual({
            ok: false,
            retryAfterSeconds: 1,
        });
    });

    test('counts each key on its own', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({
            windowMs: 60_000,
            max: 1,
            now: time.now,
        });
        expect(limiter.take('ada').ok).toBe(true);
        expect(limiter.take('ada').ok).toBe(false);
        expect(limiter.take('bob').ok).toBe(true);
    });

    test('starts a new window once the old one has passed', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({
            windowMs: 60_000,
            max: 1,
            now: time.now,
        });
        limiter.take('ada');
        expect(limiter.take('ada').ok).toBe(false);
        time.advance(60_000);
        expect(limiter.take('ada').ok).toBe(true);
        expect(limiter.take('ada').ok).toBe(false);
    });

    test('drops expired keys once it holds maxKeys', () => {
        const time = clock();
        const limiter = new FixedWindowLimiter({
            windowMs: 60_000,
            max: 1,
            now: time.now,
            maxKeys: 2,
        });
        limiter.take('ada');
        limiter.take('bob');
        expect(limiter.size).toBe(2);
        time.advance(60_000);
        limiter.take('cy');
        expect(limiter.size).toBe(1);
    });
});
