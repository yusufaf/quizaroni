import { describe, expect, it } from 'vite-plus/test';
import type { Theme } from '@mui/material/styles';
import { createDarkTheme, createLightTheme } from './themes';

// palette.other fields added by createAppTheme; asserted on their own below.
const NEW_FIELDS = [
    'surface',
    'themeId',
    'highContrast',
    'gradientEnd',
    'codeBg',
    'codeFg',
] as const;

// Sorted keys make the output independent of object insertion order, and
// function markers keep a dropped function key visible in the diff.
const normalize = (_key: string, value: unknown): unknown => {
    if (typeof value === 'function') return '[Function]';
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        return Object.fromEntries(
            Object.keys(record)
                .sort()
                .map((k) => [k, record[k]])
        );
    }
    return value;
};

const serializeTheme = (theme: Theme): string => {
    const other = { ...theme.palette.other } as Record<string, unknown>;
    for (const field of NEW_FIELDS) delete other[field];
    const subset = {
        palette: { ...theme.palette, other },
        components: theme.components,
        typography: theme.typography,
        shadows: theme.shadows,
        shape: theme.shape,
        breakpoints: theme.breakpoints,
        mixins: theme.mixins,
        transitions: theme.transitions,
        zIndex: theme.zIndex,
        direction: theme.direction,
        spacing: [theme.spacing(1), theme.spacing(2)],
    };
    return `${JSON.stringify(subset, normalize, 2)}\n`;
};

const CASES: [string, () => Theme][] = [
    ['quizaroni-light', () => createLightTheme()],
    ['quizaroni-dark', () => createDarkTheme()],
    ['quizaroni-light.font-1.25', () => createLightTheme(1.25)],
    ['quizaroni-dark.font-1.25', () => createDarkTheme(1.25)],
];

describe('Quizaroni theme snapshots', () => {
    it.each(CASES)('%s matches its snapshot', async (name, make) => {
        await expect(serializeTheme(make())).toMatchFileSnapshot(
            `./__snapshots__/${name}.json.snap`
        );
    });
});

describe('palette.other theme fields', () => {
    it.each([
        [
            'quizaroni-light',
            createLightTheme(),
            {
                surface: '#f5f5f5',
                themeId: 'quizaroni-light',
                highContrast: false,
                gradientEnd: '#f5f5f5',
                codeBg: '#f5f5f5',
                codeFg: '#1e1e1e',
            },
        ],
        [
            'quizaroni-dark',
            createDarkTheme(),
            {
                surface: '#262626',
                themeId: 'quizaroni-dark',
                highContrast: false,
                gradientEnd: '#1a1a1a',
                codeBg: '#1e1e1e',
                codeFg: '#d4d4d4',
            },
        ],
    ] as const)('%s', (_id, theme, expected) => {
        const other = { ...theme.palette.other } as Record<string, unknown>;
        expect(
            Object.fromEntries(NEW_FIELDS.map((f) => [f, other[f]]))
        ).toEqual(expected);
    });

    it('NEW_FIELDS lists every field beyond gold and primaryText', () => {
        expect(Object.keys(createLightTheme().palette.other).sort()).toEqual(
            ['gold', 'primaryText', ...NEW_FIELDS].sort()
        );
    });
});
