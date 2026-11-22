import i18n from 'i18next';

// Kept free of i18next initialisation so components can import it without
// pulling in react-i18next (which many tests mock).
// `complete` languages must translate every key. `beta` languages were
// machine-drafted and may lag behind en; missing keys fall back to English, so
// a PR that adds a string only has to translate it for complete languages.
export const SUPPORTED_LANGUAGES = {
    en: {
        nativeName: 'English',
        dir: 'ltr',
        dateLocale: 'en-US',
        status: 'complete',
    },
    es: {
        nativeName: 'Español',
        dir: 'ltr',
        dateLocale: 'es-ES',
        status: 'complete',
    },
    de: {
        nativeName: 'Deutsch',
        dir: 'ltr',
        dateLocale: 'de-DE',
        status: 'beta',
    },
    fr: {
        nativeName: 'Français',
        dir: 'ltr',
        dateLocale: 'fr-FR',
        status: 'beta',
    },
    'pt-BR': {
        nativeName: 'Português (Brasil)',
        dir: 'ltr',
        dateLocale: 'pt-BR',
        status: 'beta',
    },
    ja: {
        nativeName: '日本語',
        dir: 'ltr',
        dateLocale: 'ja-JP',
        status: 'beta',
    },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export const LANGUAGE_OPTIONS = (
    Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[]
).map((code) => ({ code, ...SUPPORTED_LANGUAGES[code] }));

export const NAMESPACES = [
    'common',
    'auth',
    'study',
    'profile',
    'ai',
    'explore',
    'admin',
] as const;

export const isSupportedLanguage = (
    lng: string | undefined
): lng is SupportedLanguage =>
    lng !== undefined && Object.hasOwn(SUPPORTED_LANGUAGES, lng);

export const currentLanguage = (
    lng: string | undefined = i18n.resolvedLanguage
): SupportedLanguage => (isSupportedLanguage(lng) ? lng : 'en');

export const dateLocale = (lng?: string): string =>
    SUPPORTED_LANGUAGES[currentLanguage(lng)].dateLocale;
