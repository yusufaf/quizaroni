import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';

// English is bundled so the fallback never waits on a network request; every
// other language is code-split and fetched on demand.
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enStudy from './locales/en/study.json';
import enProfile from './locales/en/profile.json';
import enAi from './locales/en/ai.json';
import enExplore from './locales/en/explore.json';
import enAdmin from './locales/en/admin.json';
import {
    currentLanguage,
    LANGUAGE_OPTIONS,
    NAMESPACES,
    SUPPORTED_LANGUAGES,
} from './languages';

const syncDocumentLanguage = () => {
    if (typeof document === 'undefined') return;
    const lng = currentLanguage();
    document.documentElement.lang = lng;
    document.documentElement.dir = SUPPORTED_LANGUAGES[lng].dir;
};

i18n.on('initialized', syncDocumentLanguage);
i18n.on('languageChanged', syncDocumentLanguage);

const lazyLocales = import.meta.glob<Record<string, unknown>>(
    ['./locales/*/*.json', '!./locales/en/*.json'],
    { import: 'default' }
);

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .use(
        resourcesToBackend((lng: string, ns: string) => {
            const load = lazyLocales[`./locales/${lng}/${ns}.json`];
            return load
                ? load()
                : Promise.reject(new Error(`No ${lng}/${ns} locale file`));
        })
    )
    .init({
        resources: {
            en: {
                common: enCommon,
                auth: enAuth,
                study: enStudy,
                profile: enProfile,
                ai: enAi,
                explore: enExplore,
                admin: enAdmin,
            },
        },
        // Without this, passing `resources` disables the backend entirely and
        // every non-English language silently renders the English fallback.
        partialBundledLanguages: true,
        // Regional codes like es-MX resolve to the closest supported language
        // instead of requesting locale files that don't exist.
        supportedLngs: LANGUAGE_OPTIONS.map(({ code }) => code),
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: [...NAMESPACES],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

export default i18n;
