import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { alpha, createTheme, getContrastRatio } from '@mui/material/styles';
import { createAppTheme } from './createAppTheme';
import { ratio } from './contrast';
import { assertContrast } from './contrastTestUtils';
import { QUIZARONI_LIGHT } from './registry';
import type { ThemeDefinition } from './tokens';

const plain = (overrides: Partial<ThemeDefinition> = {}): ThemeDefinition => ({
    ...QUIZARONI_LIGHT,
    accents: [{ id: 'a', main: '#ffa000' }],
    defaultAccent: 'a',
    ...overrides,
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createAppTheme', () => {
    it('derives accent text that meets 4.5:1 on bg, paper and the hover tint', () => {
        const t = createAppTheme(plain());
        const { primaryText } = t.palette.other;
        for (const b of ['#f5f5f7', '#ffffff', alpha('#ffa000', 0.08)]) {
            assertContrast(primaryText, b, 4.5, '#ffffff');
        }
        expect(primaryText).not.toBe('#ffa000');
    });

    it('high-contrast themes get 7:1 text and a focus outline', () => {
        const t = createAppTheme(plain({ highContrast: true }));
        expect(
            ratio(t.palette.other.primaryText, '#ffffff')
        ).toBeGreaterThanOrEqual(7);
        const root = t.components?.MuiButtonBase?.styleOverrides?.root as
            | Record<string, Record<string, unknown>>
            | undefined;
        expect(String(root?.['&.Mui-focusVisible']?.outline)).toMatch(
            /^2px solid /
        );
    });

    it('non-high-contrast themes get no MuiButtonBase override', () => {
        expect(
            createAppTheme(QUIZARONI_LIGHT).components?.MuiButtonBase
        ).toBeUndefined();
    });

    it('unknown accentId falls back to defaultAccent', () => {
        const def = plain({
            accents: [
                { id: 'a', main: '#ffa000' },
                { id: 'b', main: '#1976d2' },
            ],
            defaultAccent: 'b',
        });
        expect(createAppTheme(def, 'zzz').palette.primary.main).toBe('#1976d2');
    });

    it('leaves MUI status colours alone without tokens.status', () => {
        expect(createAppTheme(plain()).palette.warning.main).toBe(
            createTheme().palette.warning.main
        );
    });

    it('corrects supplied status colours', () => {
        const t = createAppTheme(
            plain({
                tokens: {
                    ...QUIZARONI_LIGHT.tokens,
                    status: { warning: '#ffeb3b' },
                },
            })
        );
        expect(t.palette.warning.main).not.toBe('#ffeb3b');
        expect(ratio(t.palette.warning.main, '#ffffff')).toBeGreaterThanOrEqual(
            4.5
        );
    });

    it('derives ink and buttonText when the accent omits them', () => {
        const t = createAppTheme(plain());
        expect(
            getContrastRatio(t.palette.primary.contrastText, '#ffa000')
        ).toBeGreaterThanOrEqual(4.5);
        const text = t.components?.MuiButton?.styleOverrides?.text as
            | Record<string, unknown>
            | undefined;
        expect(text?.color).toBe(t.palette.other.primaryText);
    });

    it('never throws on a broken definition and falls back to Quizaroni', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const t = createAppTheme(
            plain({ accents: [{ id: 'a', main: 'not-a-colour' }] })
        );
        expect(t.palette.primary.main).toBe('#ffa000');
        expect(warn).toHaveBeenCalled();
    });
});
