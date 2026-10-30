import { describe, it, expect } from 'vite-plus/test';
import en from 'i18n/locales/en/common.json';
import es from 'i18n/locales/es/common.json';

const flatKeys = (obj: object, prefix = ''): string[] =>
    Object.entries(obj).flatMap(([key, value]) =>
        typeof value === 'object' && value !== null
            ? flatKeys(value, `${prefix}${key}.`)
            : [`${prefix}${key}`]
    );

describe('share strings', () => {
    it('has the same dialogs.share keys in en and es', () => {
        expect(flatKeys(es.dialogs.share).sort()).toEqual(
            flatKeys(en.dialogs.share).sort()
        );
    });

    it.each(['linkLabel', 'copy', 'copied', 'copyFailed', 'notPublished'] as const)(
        'translates dialogs.share.%s in en and es',
        (key) => {
            expect(en.dialogs.share[key]).toBeTruthy();
            expect(es.dialogs.share[key]).toBeTruthy();
        }
    );
});
