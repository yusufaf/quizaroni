import { useCallback } from 'react';
import { useGetUser } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import {
    resolveVibration,
    LIGHT_PATTERN,
    SESSION_COMPLETE_PATTERN,
} from './haptics';

/**
 * Tactile micro-feedback for study interactions (issue #27). Android/Chromium
 * mobile only - iOS Safari has no Vibration API and is a permanent no-op
 * until the app ships a Capacitor native shell (#30, @capacitor/haptics).
 */
const useHaptics = () => {
    const { data: userData = DEFAULT_USER_RESPONSE } = useGetUser();
    const enabled = userData.user?.metadata?.hapticsEnabled ?? true;
    const supported =
        typeof navigator !== 'undefined' && 'vibrate' in navigator;

    const vibrate = useCallback(
        (pattern: number | number[]) => {
            const resolved = resolveVibration(pattern, {
                supported,
                enabled,
            });
            if (resolved === null) return;
            try {
                navigator.vibrate(resolved);
            } catch {
                // Vibration is best-effort; never let it break the study flow.
            }
        },
        [supported, enabled]
    );

    const light = useCallback(() => vibrate(LIGHT_PATTERN), [vibrate]);
    const sessionComplete = useCallback(
        () => vibrate(SESSION_COMPLETE_PATTERN),
        [vibrate]
    );

    return { light, sessionComplete };
};

export default useHaptics;
