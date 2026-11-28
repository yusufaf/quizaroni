export const LIGHT_THEME_IDS = ['quizaroni-light'] as const;
export const DARK_THEME_IDS = ['quizaroni-dark'] as const;

export type LightThemeId = (typeof LIGHT_THEME_IDS)[number];
export type DarkThemeId = (typeof DARK_THEME_IDS)[number];
export type ThemeId = LightThemeId | DarkThemeId;

export const THEME_MODE_PREFS = ['system', 'light', 'dark'] as const;
export type ThemeModePref = (typeof THEME_MODE_PREFS)[number];

export const isThemeId = (value: unknown): value is ThemeId =>
    (LIGHT_THEME_IDS as readonly unknown[]).includes(value) ||
    (DARK_THEME_IDS as readonly unknown[]).includes(value);
