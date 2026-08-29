/** Light tap (ms) for card flip and grade events. */
export const LIGHT_PATTERN = 12;
/** Double pulse (ms on/off/on) for study session completion. */
export const SESSION_COMPLETE_PATTERN = [15, 60, 15];

export type VibrationAvailability = {
    /** Whether `navigator.vibrate` exists (false on iOS Safari - permanent platform gap, see #27). */
    supported: boolean;
    /** Whether the user has haptics enabled in their preferences. */
    enabled: boolean;
};

/**
 * Resolves whether a vibration pattern should actually fire. Kept pure and
 * separate from `useHaptics` so the support/enabled branching is testable
 * without a real `navigator`.
 */
export const resolveVibration = (
    pattern: number | number[],
    { supported, enabled }: VibrationAvailability
): number | number[] | null => (supported && enabled ? pattern : null);
