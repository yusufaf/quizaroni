import 'i18next';
import type admin from './locales/en/admin.json';
import type ai from './locales/en/ai.json';
import type auth from './locales/en/auth.json';
import type common from './locales/en/common.json';
import type explore from './locales/en/explore.json';
import type profile from './locales/en/profile.json';
import type study from './locales/en/study.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        resources: {
            admin: typeof admin;
            ai: typeof ai;
            auth: typeof auth;
            common: typeof common;
            explore: typeof explore;
            profile: typeof profile;
            study: typeof study;
        };
    }
}
