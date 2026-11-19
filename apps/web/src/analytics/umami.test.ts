import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite-plus';
import { describe, expect, test } from 'vite-plus/test';
import { umamiScriptTag } from './umami';

const HOSTED_ID = '883ce165-bace-46c2-93df-994219b0f916';

const hostedTag = {
    tag: 'script',
    injectTo: 'head',
    attrs: {
        defer: true,
        src: '/s.js',
        'data-host-url': '/',
        'data-website-id': HOSTED_ID,
    },
};

describe('umamiScriptTag', () => {
    test('returns null when no Umami env is set', () => {
        expect(umamiScriptTag({})).toBeNull();
        expect(umamiScriptTag({ VITE_BACKEND: 'selfhost' })).toBeNull();
    });

    test('treats empty values as unset', () => {
        expect(
            umamiScriptTag({ VITE_UMAMI_WEBSITE_ID: '', VITE_UMAMI_SRC: '' })
        ).toBeNull();
    });

    test('builds the hosted tag', () => {
        expect(
            umamiScriptTag({
                VITE_UMAMI_WEBSITE_ID: HOSTED_ID,
                VITE_UMAMI_SRC: '/s.js',
                VITE_UMAMI_HOST_URL: '/',
            })
        ).toEqual(hostedTag);
    });

    test('omits data-host-url when VITE_UMAMI_HOST_URL is unset', () => {
        const tag = umamiScriptTag({
            VITE_UMAMI_WEBSITE_ID: HOSTED_ID,
            VITE_UMAMI_SRC: 'https://analytics.example.com/script.js',
        });
        expect(tag?.attrs).toEqual({
            defer: true,
            src: 'https://analytics.example.com/script.js',
            'data-website-id': HOSTED_ID,
        });
        expect(tag?.attrs && 'data-host-url' in tag.attrs).toBe(false);
    });

    test('throws when only the website id is set', () => {
        expect(() =>
            umamiScriptTag({ VITE_UMAMI_WEBSITE_ID: HOSTED_ID })
        ).toThrow(/VITE_UMAMI_SRC/);
    });

    test('throws when only the src is set', () => {
        expect(() => umamiScriptTag({ VITE_UMAMI_SRC: '/s.js' })).toThrow(
            /VITE_UMAMI_WEBSITE_ID/
        );
    });
});

describe('build env files', () => {
    const webRoot = fileURLToPath(new URL('../../', import.meta.url));

    test('hosted build emits the hosted tag', () => {
        expect(umamiScriptTag(loadEnv('production', webRoot))).toEqual(
            hostedTag
        );
    });

    test('self-host build emits no tag', () => {
        expect(umamiScriptTag(loadEnv('selfhost', webRoot))).toBeNull();
    });
});
