import type { ThemeId } from './themeIds';
import type { ThemeFamily } from './registry';

export type ThemeMode = 'light' | 'dark';

export interface PaletteColorTokens {
    main: string;
    light?: string;
    dark?: string;
    contrastText?: string;
}

export interface StatusTokens {
    error?: string;
    warning?: string;
    info?: string;
    success?: string;
}

export interface ThemeTokens {
    mode: ThemeMode;
    /** background.default and the CssBaseline body */
    bg: string;
    /** background.paper */
    paper: string;
    /** a raised tone above paper (palette.other.surface) */
    surface: string;
    text: string;
    subtext: string;
    disabled: string;
    /** action.active and the default IconButton colour */
    icon: string;
    /** divider */
    border: string;
    /** outlined Chip and Select borders */
    outline: string;
    cardBorder: string;
    secondary: PaletteColorTokens;
    /** when absent, MUI's default status colours are used unchanged */
    status?: StatusTokens;
    /** defaults to surface */
    gradientEnd?: string;
    /** defaults to surface */
    codeBg?: string;
    /** defaults to text */
    codeFg?: string;
}

export interface AccentOption {
    id: string;
    label?: string;
    labelKey?: string;
    main: string;
    light?: string;
    dark?: string;
    /** contained button hover background */
    hover?: string;
    /** text on a main or hover fill */
    ink?: string;
    /** accent-coloured text on bg/paper (palette.other.primaryText) */
    text?: string;
    /** palette.primary.contrastText */
    contrastText?: string;
    /** text and outlined buttons, selected Tab, IconButton hover */
    buttonText?: string;
}

export interface ThemeDefinition {
    id: ThemeId;
    name?: string;
    nameKey?: string;
    family: ThemeFamily;
    tokens: ThemeTokens;
    accents: readonly AccentOption[];
    defaultAccent: string;
    highContrast?: boolean;
}

export interface PaletteOther {
    gold: { main: string };
    primaryText: string;
    surface: string;
    themeId: ThemeId;
    highContrast: boolean;
    gradientEnd: string;
    codeBg: string;
    codeFg: string;
}
