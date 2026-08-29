import { describe, it, expect } from 'vitest';
import {
    resolveVibration,
    LIGHT_PATTERN,
    SESSION_COMPLETE_PATTERN,
} from './haptics';

describe('resolveVibration', () => {
    it('returns the pattern when the Vibration API is supported and haptics are enabled', () => {
        const result = resolveVibration(LIGHT_PATTERN, {
            supported: true,
            enabled: true,
        });
        expect(result).toBe(LIGHT_PATTERN);
    });

    it('returns null when the Vibration API is unsupported (e.g. iOS Safari)', () => {
        const result = resolveVibration(LIGHT_PATTERN, {
            supported: false,
            enabled: true,
        });
        expect(result).toBeNull();
    });

    it('returns null when the user has disabled haptics', () => {
        const result = resolveVibration(SESSION_COMPLETE_PATTERN, {
            supported: true,
            enabled: false,
        });
        expect(result).toBeNull();
    });
});
