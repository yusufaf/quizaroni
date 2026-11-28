import type {} from '@mui/x-data-grid/themeAugmentation';
import {
    alpha,
    createTheme,
    darken,
    emphasize,
    lighten,
    type Theme,
    type ThemeOptions,
} from '@mui/material/styles';
import { devWarn, ensureContrast, pickOnColor } from './contrast';
import { QUIZARONI_DARK, QUIZARONI_LIGHT } from './registry';
import type { PaletteOther, ThemeDefinition, ThemeMode } from './tokens';

const GOLD = '#FFDF00';

// MUI Typography base configuration with scale multiplier
const getBaseTypography = (scale: number = 1) => ({
    fontSize: 14 * scale,
    h1: { fontSize: `${2.5 * scale}rem`, fontWeight: 600 },
    h2: { fontSize: `${2 * scale}rem`, fontWeight: 600 },
    h3: { fontSize: `${1.75 * scale}rem`, fontWeight: 600 },
    h4: { fontSize: `${1.5 * scale}rem`, fontWeight: 600 },
    h5: { fontSize: `${1.25 * scale}rem`, fontWeight: 600 },
    h6: { fontSize: `${1.125 * scale}rem`, fontWeight: 600 },
    body1: { fontSize: `${1 * scale}rem` },
    body2: { fontSize: `${0.875 * scale}rem` },
    subtitle1: { fontSize: `${1 * scale}rem`, fontWeight: 500 },
    subtitle2: { fontSize: `${0.875 * scale}rem`, fontWeight: 500 },
    button: { fontSize: `${0.875 * scale}rem`, fontWeight: 600 },
    caption: { fontSize: `${0.75 * scale}rem` },
    overline: {
        fontSize: `${0.75 * scale}rem`,
        textTransform: 'uppercase' as const,
    },
});

// Per-mode shadow recipes; every theme of a mode shares them.
const MODE_SHADOWS: Record<
    ThemeMode,
    {
        elevation1: string;
        elevation2: string;
        elevation3: string;
        elevation6: string;
        card: string;
        cardHoverTail: string;
        containedAlpha: number;
    }
> = {
    light: {
        elevation1:
            '0 0.125rem 0.5rem rgba(0, 0, 0, 0.08), 0 0.0625rem 0.25rem rgba(0, 0, 0, 0.04)',
        elevation2:
            '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1), 0 0.125rem 0.375rem rgba(0, 0, 0, 0.06)',
        elevation3:
            '0 0.375rem 1rem rgba(0, 0, 0, 0.12), 0 0.1875rem 0.5rem rgba(0, 0, 0, 0.08)',
        elevation6:
            '0 0.5rem 1.5rem rgba(0, 0, 0, 0.12), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
        card: '0 0.25rem 1rem rgba(0, 0, 0, 0.08), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.04)',
        cardHoverTail: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.08)',
        containedAlpha: 0.3,
    },
    dark: {
        elevation1:
            '0 0.125rem 0.5rem rgba(0, 0, 0, 0.25), 0 0.0625rem 0.25rem rgba(0, 0, 0, 0.15)',
        elevation2:
            '0 0.25rem 0.75rem rgba(0, 0, 0, 0.3), 0 0.125rem 0.375rem rgba(0, 0, 0, 0.2)',
        elevation3:
            '0 0.375rem 1rem rgba(0, 0, 0, 0.35), 0 0.1875rem 0.5rem rgba(0, 0, 0, 0.25)',
        elevation6:
            '0 0.5rem 1.5rem rgba(0, 0, 0, 0.4), 0 0.25rem 0.75rem rgba(0, 0, 0, 0.25)',
        card: '0 0.25rem 1rem rgba(0, 0, 0, 0.25), 0 0.125rem 0.5rem rgba(0, 0, 0, 0.15)',
        cardHoverTail: '0 0.25rem 0.75rem rgba(0, 0, 0, 0.25)',
        containedAlpha: 0.25,
    },
};

interface ResolvedAccent {
    main: string;
    light: string;
    dark: string;
    hover: string;
    ink: string;
    contrastText: string;
    text: string;
    buttonText: string;
}

// Explicit ink, contrastText and buttonText are trusted as given; derived ones
// are picked for contrast. Explicit text still goes through ensureContrast.
const resolveAccent = (
    def: ThemeDefinition,
    accentId?: string
): ResolvedAccent => {
    const find = (id?: string) => def.accents.find((a) => a.id === id);
    const accent = find(accentId) ?? find(def.defaultAccent) ?? def.accents[0];
    if (!accent) throw new Error('theme has no accents');

    const { main } = accent;
    const { bg, paper } = def.tokens;
    const min = def.highContrast ? 7 : 4.5;
    const text = ensureContrast(
        accent.text ?? main,
        [bg, paper, alpha(main, 0.08)],
        min,
        paper
    );
    const ink = accent.ink ?? pickOnColor(main, [paper, bg], min);
    return {
        main,
        light: accent.light ?? lighten(main, 0.2),
        dark: accent.dark ?? darken(main, 0.3),
        hover: accent.hover ?? emphasize(main, 0.1),
        ink,
        contrastText: accent.contrastText ?? ink,
        text,
        buttonText: accent.buttonText ?? text,
    };
};

const buildThemeOptions = (
    def: ThemeDefinition,
    accentId?: string,
    fontScale = 1
): ThemeOptions => {
    const t = def.tokens;
    const a = resolveAccent(def, accentId);
    const isDark = t.mode === 'dark';
    const s = MODE_SHADOWS[t.mode];

    const statusPalette = t.status
        ? Object.fromEntries(
              Object.entries(t.status)
                  .filter((entry): entry is [string, string] =>
                      Boolean(entry[1])
                  )
                  .map(([key, value]) => [
                      key,
                      {
                          main: ensureContrast(
                              value,
                              [t.bg, t.paper],
                              4.5,
                              t.paper
                          ),
                      },
                  ])
          )
        : {};

    const other: PaletteOther = {
        gold: { main: GOLD },
        primaryText: a.text,
        surface: t.surface,
        themeId: def.id,
        highContrast: def.highContrast ?? false,
        gradientEnd: t.gradientEnd ?? t.surface,
        codeBg: t.codeBg ?? t.surface,
        codeFg: t.codeFg ?? t.text,
    };

    return {
        palette: {
            mode: t.mode,
            primary: {
                main: a.main,
                light: a.light,
                dark: a.dark,
                contrastText: a.contrastText,
            },
            secondary: { ...t.secondary },
            background: { default: t.bg, paper: t.paper },
            other,
            text: {
                primary: t.text,
                secondary: t.subtext,
                disabled: t.disabled,
            },
            divider: t.border,
            action: {
                active: t.icon,
                hover: alpha(a.main, 0.08),
                selected: alpha(a.main, 0.16),
            },
            ...statusPalette,
        },
        typography: getBaseTypography(fontScale),
        components: {
            MuiCssBaseline: {
                styleOverrides: { body: { backgroundColor: t.bg } },
            },
            MuiPaper: {
                styleOverrides: {
                    root: { backgroundImage: 'none' },
                    elevation1: { boxShadow: s.elevation1 },
                    elevation2: { boxShadow: s.elevation2 },
                    elevation3: { boxShadow: s.elevation3 },
                    elevation6: { boxShadow: s.elevation6 },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        boxShadow: s.card,
                        border: `1px solid ${t.cardBorder}`,
                        '&:hover': {
                            boxShadow: `0 0.5rem 1.5rem ${alpha(a.main, 0.15)}, ${s.cardHoverTail}`,
                        },
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        transition: 'all 0.2s ease',
                        borderRadius: '0.5rem',
                        textTransform: 'none' as const,
                    },
                    text: {
                        color: a.buttonText,
                        '&:hover': {
                            ...(isDark ? { color: a.light } : {}),
                            backgroundColor: alpha(a.main, 0.1),
                        },
                        fontWeight: 600,
                    },
                    contained: {
                        color: a.ink,
                        backgroundColor: a.main,
                        boxShadow: `0 0.125rem 0.5rem ${alpha(a.main, s.containedAlpha)}`,
                        '&:hover': {
                            color: a.ink,
                            backgroundColor: a.hover,
                            boxShadow: `0 0.375rem 1rem ${alpha(a.main, 0.35)}`,
                            transform: 'translateY(-1px)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: `0 0.125rem 0.25rem ${alpha(a.main, 0.2)}`,
                        },
                        fontWeight: 600,
                    },
                    outlined: {
                        fontWeight: 600,
                        borderColor: isDark ? alpha(a.main, 0.5) : a.buttonText,
                        color: a.buttonText,
                        '&:hover': {
                            color: a.ink,
                            backgroundColor: a.main,
                            borderColor: a.main,
                            boxShadow: `0 0.125rem 0.5rem ${alpha(a.main, 0.2)}`,
                        },
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: t.icon,
                        '&.MuiIconButton-colorPrimary': { color: a.main },
                        '&:hover': {
                            backgroundColor: alpha(a.main, 0.08),
                            color: a.buttonText,
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: { outlined: { borderColor: t.outline } },
            },
            MuiTab: {
                styleOverrides: {
                    root: { '&.Mui-selected': { color: a.buttonText } },
                },
            },
            MuiSelect: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: t.outline,
                        },
                    },
                },
            },
            // Only needed when button text differs from main; the Button
            // override already gives main otherwise.
            ...(a.buttonText !== a.main
                ? {
                      MuiDataGrid: {
                          styleOverrides: {
                              toolbarContainer: {
                                  '& .MuiButton-text': { color: a.buttonText },
                              },
                          },
                      },
                  }
                : {}),
            ...(def.highContrast
                ? {
                      MuiButtonBase: {
                          styleOverrides: {
                              root: {
                                  '&.Mui-focusVisible': {
                                      outline: `2px solid ${a.text}`,
                                      outlineOffset: '2px',
                                  },
                              },
                          },
                      },
                  }
                : {}),
        },
    };
};

export const createAppTheme = (
    def: ThemeDefinition,
    accentId?: string,
    fontScale = 1
): Theme => {
    try {
        return createTheme(buildThemeOptions(def, accentId, fontScale));
    } catch (error) {
        devWarn(`createAppTheme(${def?.id}) failed; using Quizaroni`, error);
        const fallback =
            def?.tokens?.mode === 'dark' ? QUIZARONI_DARK : QUIZARONI_LIGHT;
        return createTheme(buildThemeOptions(fallback, undefined, fontScale));
    }
};
