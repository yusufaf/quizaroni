import type { Grade } from 'shared/utilities/srs';

/** Minimum drag distance (px) to count as a swipe, per issue AC. */
export const SWIPE_DISTANCE_THRESHOLD = 120;
/** Minimum release velocity (px/s) that counts as a swipe even under the distance threshold. */
export const SWIPE_VELOCITY_THRESHOLD = 500;

export type SwipeAction =
    | { type: 'grade'; grade: Extract<Grade, 'again' | 'good'> }
    | { type: 'flip' }
    | { type: 'none' };

export type SwipeInput = {
    /** Framer Motion PanInfo.offset - total drag displacement in px. */
    offset: { x: number; y: number };
    /** Framer Motion PanInfo.velocity - release velocity in px/s. */
    velocity: { x: number; y: number };
    /** Whether a grading swipe is currently allowed (card flipped, not yet rated). */
    canGrade: boolean;
    /** Whether a flip swipe is currently allowed (not rated, no lightbox open). */
    canFlip: boolean;
};

const NONE: SwipeAction = { type: 'none' };

/**
 * Resolves a completed drag gesture into a grade/flip action, or `none` if the
 * drag didn't clear either threshold. The dominant axis (larger absolute
 * offset) decides between horizontal grading and vertical flipping so a
 * diagonal drag doesn't fire both.
 */
export const resolveSwipe = ({
    offset,
    velocity,
    canGrade,
    canFlip,
}: SwipeInput): SwipeAction => {
    const horizontal = Math.abs(offset.x) >= Math.abs(offset.y);

    if (horizontal) {
        const passedDistance = Math.abs(offset.x) >= SWIPE_DISTANCE_THRESHOLD;
        const passedVelocity = Math.abs(velocity.x) >= SWIPE_VELOCITY_THRESHOLD;
        if (!canGrade || (!passedDistance && !passedVelocity)) return NONE;
        return {
            type: 'grade',
            grade: offset.x > 0 ? 'good' : 'again',
        };
    }

    // Vertical: only an upward swipe flips; downward is unassigned.
    const passedDistance = -offset.y >= SWIPE_DISTANCE_THRESHOLD;
    const passedVelocity = -velocity.y >= SWIPE_VELOCITY_THRESHOLD;
    if (!canFlip || (!passedDistance && !passedVelocity)) return NONE;
    return { type: 'flip' };
};
