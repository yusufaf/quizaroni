import { describe, it, expect } from 'vitest';
import {
    resolveSwipe,
    SWIPE_DISTANCE_THRESHOLD,
    SWIPE_VELOCITY_THRESHOLD,
} from './swipeGesture';

const base = {
    offset: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    canGrade: true,
    canFlip: true,
};

describe('resolveSwipe', () => {
    it('grades good on a rightward swipe past the distance threshold', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: SWIPE_DISTANCE_THRESHOLD + 1, y: 0 },
        });
        expect(result).toEqual({ type: 'grade', grade: 'good' });
    });

    it('grades again on a leftward swipe past the distance threshold', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: -(SWIPE_DISTANCE_THRESHOLD + 1), y: 0 },
        });
        expect(result).toEqual({ type: 'grade', grade: 'again' });
    });

    it('does not grade when canGrade is false, even past threshold', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: SWIPE_DISTANCE_THRESHOLD + 1, y: 0 },
            canGrade: false,
        });
        expect(result).toEqual({ type: 'none' });
    });

    it('springs back when under both thresholds', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: 30, y: 0 },
            velocity: { x: 10, y: 0 },
        });
        expect(result).toEqual({ type: 'none' });
    });

    it('grades on a short but fast flick past the velocity threshold', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: 40, y: 0 },
            velocity: { x: SWIPE_VELOCITY_THRESHOLD + 1, y: 0 },
        });
        expect(result).toEqual({ type: 'grade', grade: 'good' });
    });

    it('flips on an upward swipe past the distance threshold', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: 0, y: -(SWIPE_DISTANCE_THRESHOLD + 1) },
        });
        expect(result).toEqual({ type: 'flip' });
    });

    it('does not flip when canFlip is false', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: 0, y: -(SWIPE_DISTANCE_THRESHOLD + 1) },
            canFlip: false,
        });
        expect(result).toEqual({ type: 'none' });
    });

    it('does not flip on a downward swipe', () => {
        const result = resolveSwipe({
            ...base,
            offset: { x: 0, y: SWIPE_DISTANCE_THRESHOLD + 1 },
        });
        expect(result).toEqual({ type: 'none' });
    });

    it('resolves a diagonal drag to the dominant axis', () => {
        // Horizontal dominant: grades despite some vertical movement.
        const result = resolveSwipe({
            ...base,
            offset: { x: SWIPE_DISTANCE_THRESHOLD + 10, y: 50 },
        });
        expect(result).toEqual({ type: 'grade', grade: 'good' });
    });
});
