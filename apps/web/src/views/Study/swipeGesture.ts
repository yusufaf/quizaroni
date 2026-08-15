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
 * Resolves a completed drag gesture into a grade/flip action, or `none` if
 * neither axis cleared its threshold. Each axis is checked independently
 * against both distance and velocity (so a short, fast flick still counts),
 * then - only when both axes clear their threshold on the same drag - the
 * more emphatic one wins, using whichever of distance/velocity, normalized
 * against its threshold, is larger. This keeps a fast horizontal flick with
 * some incidental vertical drift from being misrouted to the vertical (flip)
 * branch and dropped.
 */
export const resolveSwipe = ({
    offset,
    velocity,
    canGrade,
    canFlip,
}: SwipeInput): SwipeAction => {
    const horizontalPassed =
        Math.abs(offset.x) >= SWIPE_DISTANCE_THRESHOLD ||
        Math.abs(velocity.x) >= SWIPE_VELOCITY_THRESHOLD;
    // Vertical: only an upward swipe flips; downward is unassigned.
    const verticalPassed =
        -offset.y >= SWIPE_DISTANCE_THRESHOLD ||
        -velocity.y >= SWIPE_VELOCITY_THRESHOLD;

    if (!horizontalPassed && !verticalPassed) return NONE;

    let useHorizontal = horizontalPassed;
    if (horizontalPassed && verticalPassed) {
        const horizontalMagnitude = Math.max(
            Math.abs(offset.x) / SWIPE_DISTANCE_THRESHOLD,
            Math.abs(velocity.x) / SWIPE_VELOCITY_THRESHOLD
        );
        const verticalMagnitude = Math.max(
            -offset.y / SWIPE_DISTANCE_THRESHOLD,
            -velocity.y / SWIPE_VELOCITY_THRESHOLD
        );
        useHorizontal = horizontalMagnitude >= verticalMagnitude;
    }

    if (useHorizontal) {
        if (!canGrade) return NONE;
        return { type: 'grade', grade: offset.x > 0 ? 'good' : 'again' };
    }

    if (!canFlip) return NONE;
    return { type: 'flip' };
};
