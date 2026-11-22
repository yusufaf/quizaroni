import { defineConfig } from 'i18next-cli';
import { SUPPORTED_LANGUAGES } from './src/i18n/languages';

export default defineConfig({
    locales: Object.keys(SUPPORTED_LANGUAGES),
    extract: {
        input: ['src/**/*.{ts,tsx}'],
        ignore: ['src/**/*.test.{ts,tsx}'],
        output: 'src/i18n/locales/{{language}}/{{namespace}}.json',
        defaultNS: 'common',
        primaryLanguage: 'en',
    },
    lint: {
        // The recommended list only covers HTML tags, so text inside MUI
        // components (<Typography>, <Button>, ...) would go unchecked.
        acceptedTags: 'all',
        // Key names like Ctrl and Alt.
        ignoredTags: ['kbd'],
    },
});
