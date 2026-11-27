import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite-plus';
import { describe, expect, test } from 'vite-plus/test';
import { umamiPlugin, umamiScriptTag } from './umami';

const HOSTED_ID = '883ce165-bace-46c2-93df-994219b0f916';

const hostedTag = {
    tag: 'script',
    injectTo: 'head',
    attrs: {
        defer: true,
        src: '/q/s.js',
        'data-host-url': '/q',
        'data-website-id': HOSTED_ID,
    },
};

describe('umamiScriptTag', () => {
    test('returns null when no Umami env is set', () => {
        expect(umamiScriptTag({})).toBeNull();
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
                VITE_UMAMI_SRC: '/q/s.js',
                VITE_UMAMI_HOST_URL: '/q',
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

test('the plugin runs in builds only, so dev and vitest never load the tag', () => {
    expect(umamiPlugin().apply).toBe('build');
});

test('the production build env emits no tag', () => {
    const webRoot = fileURLToPath(new URL('../../', import.meta.url));
    expect(umamiScriptTag(loadEnv('production', webRoot))).toBeNull();
});
