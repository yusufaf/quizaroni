import { describe, it, expect } from 'vitest';
import {
    computeSm2,
    projectInterval,
    newProgress,
    isDue,
    sortByNextReview,
    GRADE_QUALITY,
} from './srs';
import type { CardProgress } from 'shared/types';

const base = (over: Partial<CardProgress> = {}): CardProgress => ({
    cardUUID: 'c1',
    lastStudied: '2026-01-01T00:00:00.000Z',
    nextReview: '2026-01-01T00:00:00.000Z',
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    masteryLevel: 'new',
    ...over,
});

describe('GRADE_QUALITY', () => {
    it('maps grades to SM-2 quality', () => {
        expect(GRADE_QUALITY).toEqual({ again: 1, hard: 3, good: 4, easy: 5 });
    });
});

describe('newProgress', () => {
    it('creates a new card at interval 0, ease 2.5', () => {
        const p = newProgress('abc');
        expect(p.cardUUID).toBe('abc');
        expect(p.interval).toBe(0);
        expect(p.repetitions).toBe(0);
        expect(p.easeFactor).toBe(2.5);
        expect(p.masteryLevel).toBe('new');
    });
});

describe('computeSm2', () => {
    it('first successful review sets interval to 1 day', () => {
        const r = computeSm2(base(), 4);
        expect(r.repetitions).toBe(1);
        expect(r.interval).toBe(1);
        expect(r.masteryLevel).toBe('learning');
    });

    it('second successful review sets interval to 6 days', () => {
        const r = computeSm2(base({ repetitions: 1, interval: 1 }), 4);
        expect(r.repetitions).toBe(2);
        expect(r.interval).toBe(6);
        expect(r.masteryLevel).toBe('review');
    });

    it('third+ review multiplies interval by ease factor', () => {
        const r = computeSm2(
            base({ repetitions: 2, interval: 6, easeFactor: 2.5 }),
            4
        );
        expect(r.repetitions).toBe(3);
        expect(r.interval).toBe(15);
    });

    it('failing quality (<3) resets repetitions and interval', () => {
        const r = computeSm2(
            base({ repetitions: 5, interval: 40, easeFactor: 2.2 }),
            1
        );
        expect(r.repetitions).toBe(0);
        expect(r.interval).toBe(1);
    });

    it('clamps ease factor to a 1.3 floor', () => {
        const r = computeSm2(base({ easeFactor: 1.3 }), 1);
        expect(r.easeFactor).toBe(1.3);
    });

    it('marks mastered at 5+ repetitions', () => {
        const r = computeSm2(
            base({ repetitions: 4, interval: 100, easeFactor: 2.5 }),
            5
        );
        expect(r.repetitions).toBe(5);
        expect(r.masteryLevel).toBe('mastered');
    });

    it('sets nextReview interval days in the future', () => {
        const r = computeSm2(base(), 4);
        const next = new Date(r.nextReview).getTime();
        const studied = new Date(r.lastStudied).getTime();
        const days = Math.round((next - studied) / (1000 * 60 * 60 * 24));
        expect(days).toBe(1);
    });
});

describe('projectInterval', () => {
    it('returns the interval computeSm2 would produce without mutating input', () => {
        const prev = base({ repetitions: 1, interval: 1 });
        const days = projectInterval(prev, 'good');
        expect(days).toBe(computeSm2(prev, GRADE_QUALITY.good).interval);
        expect(prev.interval).toBe(1);
    });
});

describe('isDue / sortByNextReview', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');

    it('isDue is true when nextReview <= now', () => {
        expect(
            isDue(base({ nextReview: '2026-05-31T00:00:00.000Z' }), now)
        ).toBe(true);
        expect(
            isDue(base({ nextReview: '2026-06-02T00:00:00.000Z' }), now)
        ).toBe(false);
    });

    it('sorts ascending by nextReview', () => {
        const a = base({
            cardUUID: 'a',
            nextReview: '2026-06-03T00:00:00.000Z',
        });
        const b = base({
            cardUUID: 'b',
            nextReview: '2026-06-01T00:00:00.000Z',
        });
        expect(sortByNextReview([a, b]).map((p) => p.cardUUID)).toEqual([
            'b',
            'a',
        ]);
    });
});
