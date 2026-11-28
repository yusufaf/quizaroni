import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { getContrastRatio, getLuminance } from '@mui/material/styles';
import { ensureContrast, over, pickOnColor, ratio } from './contrast';

const silenceWarn = () =>
    vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('over', () => {
    it('composites a translucent colour onto an opaque one', () => {
        expect(over('rgba(255, 160, 0, 0.08)', '#ffffff')).toBe('#fff7eb');
    });
});

describe('ratio', () => {
    it('measures translucent rgba(0,0,0,.6) on #fff composited, not 21:1', () => {
        expect(getContrastRatio('rgba(0, 0, 0, 0.6)', '#ffffff')).toBe(21);
        expect(ratio('rgba(0, 0, 0, 0.6)', '#ffffff')).toBeCloseTo(5.74, 1);
    });

    it('measures a translucent hover tint over paper', () => {
        const tint = 'rgba(255, 160, 0, 0.08)';
        const onDark = ratio('#ffa000', tint, '#1e1e1e');
        expect(onDark).toBe(getContrastRatio('#ffa000', over(tint, '#1e1e1e')));
        expect(onDark).not.toBe(ratio('#ffa000', tint, '#ffffff'));

        const warn = silenceWarn();
        expect(ratio('#ffa000', tint)).toBe(ratio('#ffa000', tint, '#ffffff'));
        expect(warn).toHaveBeenCalled();
    });
});

describe('ensureContrast', () => {
    it('passes unchanged', () => {
        expect(
            ensureContrast('#9a5500', ['#ffffff', '#f5f5f7'], 4.5, '#ffffff')
        ).toBe('#9a5500');
    });

    it('darkens on a light background', () => {
        const r = ensureContrast('#ffa000', ['#ffffff'], 4.5);
        expect(ratio(r, '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(getLuminance(r)).toBeLessThan(getLuminance('#ffa000'));
    });

    it('lightens on a dark background', () => {
        const r = ensureContrast('#1c313a', ['#121212'], 4.5);
        expect(ratio(r, '#121212')).toBeGreaterThanOrEqual(4.5);
        expect(getLuminance(r)).toBeGreaterThan(getLuminance('#1c313a'));
    });

    it('a light accent background in a dark theme still gets darkened text', () => {
        const r = ensureContrast('#cdd6f4', ['#cba6f7'], 4.5);
        expect(ratio(r, '#cba6f7')).toBeGreaterThanOrEqual(4.5);
        expect(getLuminance(r)).toBeLessThan(getLuminance('#cdd6f4'));
    });

    it('unreachable falls back to black or white without throwing', () => {
        const warn = silenceWarn();
        const r = ensureContrast('#777777', ['#000000', '#ffffff'], 21);
        expect(['#000000', '#ffffff']).toContain(r);
        expect(warn).toHaveBeenCalled();
    });

    it('never throws on an unparsable colour', () => {
        silenceWarn();
        expect(ensureContrast('nope', ['#ffffff'], 4.5)).toBe('nope');
        expect(typeof pickOnColor('nope', ['#000000'])).toBe('string');
    });
});

describe('pickOnColor', () => {
    it('prefers theme colours', () => {
        expect(pickOnColor('#ffa000', ['#121212', '#ffffff'])).toBe('#121212');
        expect(pickOnColor('#777777', ['#808080'])).toBe('#000000');
    });
});
