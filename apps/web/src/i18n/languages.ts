import i18n from 'i18next';

// Kept free of i18next initialisation so components can import it without
// pulling in react-i18next (which many tests mock).
export const SUPPORTED_LANGUAGES = {
    en: { nativeName: 'English', dir: 'ltr', dateLocale: 'en-US' },
    es: { nativeName: 'Español', dir: 'ltr', dateLocale: 'es-ES' },
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
