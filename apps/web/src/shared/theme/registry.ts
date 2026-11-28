import { isThemeId, type ThemeId } from './themeIds';
import type { ThemeDefinition } from './tokens';

export const THEME_FAMILIES = ['quizaroni'] as const;
export type ThemeFamily = (typeof THEME_FAMILIES)[number];

const QUIZARONI_SECONDARY = {
    main: '#455a64',
    light: '#718792',
    dark: '#1c313a',
};

export const QUIZARONI_LIGHT: ThemeDefinition = {
    id: 'quizaroni-light',
    name: 'Quizaroni Light',
    family: 'quizaroni',
    tokens: {
        mode: 'light',
        bg: '#f5f5f7',
        paper: '#ffffff',
        surface: '#f5f5f5',
        text: 'rgba(0, 0, 0, 0.87)',
        subtext: 'rgba(0, 0, 0, 0.6)',
        disabled: 'rgba(0, 0, 0, 0.38)',
        icon: 'rgba(0, 0, 0, 0.7)',
        border: 'rgba(0, 0, 0, 0.12)',
        outline: 'rgba(0, 0, 0, 0.23)',
        cardBorder: 'rgba(0, 0, 0, 0.06)',
        secondary: QUIZARONI_SECONDARY,
        gradientEnd: '#f5f5f5',
        codeBg: '#f5f5f5',
        codeFg: '#1e1e1e',
    },
    accents: [
        {
            id: 'orange',
            main: '#ffa000',
            light: '#ffd149',
            dark: '#c67100',
            hover: '#ff8f00',
            ink: '#000000',
            contrastText: '#000000',
            // #ffa000 is about 2:1 on white, so light mode uses a darker shade for text.
            text: '#9a5500',
            buttonText: '#c67100',
        },
    ],
    defaultAccent: 'orange',
};

export const QUIZARONI_DARK: ThemeDefinition = {
    id: 'quizaroni-dark',
    name: 'Quizaroni Dark',
    family: 'quizaroni',
    tokens: {
        mode: 'dark',
        bg: '#121212',
        paper: '#1e1e1e',
        surface: '#262626',
        text: 'rgba(255, 255, 255, 0.87)',
        subtext: 'rgba(255, 255, 255, 0.6)',
        disabled: 'rgba(255, 255, 255, 0.5)',
        icon: 'rgba(255, 255, 255, 0.7)',
        border: 'rgba(255, 255, 255, 0.12)',
        outline: 'rgba(255, 255, 255, 0.23)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        secondary: QUIZARONI_SECONDARY,
        gradientEnd: '#1a1a1a',
        codeBg: '#1e1e1e',
        codeFg: '#d4d4d4',
    },
    accents: [
        {
            id: 'orange',
            main: '#ffa000',
            light: '#ffd149',
            dark: '#c67100',
            hover: '#ff8f00',
            ink: '#000000',
            contrastText: '#ffffff',
            text: '#ffa000',
            buttonText: '#ffa000',
        },
    ],
    defaultAccent: 'orange',
};

// A Record keyed by ThemeId makes tsc fail if an id has no definition.
export const THEMES: Readonly<Record<ThemeId, ThemeDefinition>> = {
    'quizaroni-light': QUIZARONI_LIGHT,
    'quizaroni-dark': QUIZARONI_DARK,
};

export const getThemeDefinition = (id: string): ThemeDefinition =>
    isThemeId(id) ? THEMES[id] : QUIZARONI_LIGHT;
