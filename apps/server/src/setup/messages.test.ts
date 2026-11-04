import { describe, expect, test } from 'bun:test';
import { en, es, pickLocale } from './messages';

describe('pickLocale', () => {
    test.each([
        [undefined, 'es-MX,es;q=0.9', 'es'],
        [undefined, 'fr, es;q=0.5', 'es'],
        [undefined, 'en;q=0.4, es;q=0.8', 'es'],
        [undefined, 'fr', 'en'],
        ['en', 'es', 'en'],
        ['es', 'en', 'es'],
        ['xx', 'es', 'es'],
        [undefined, undefined, 'en'],
        [undefined, 'es;q=0', 'en'],
    ] as const)('pickLocale(%j, %j) is %s', (explicit, header, locale) => {
        expect(pickLocale(explicit, header)).toBe(locale);
    });
});

describe('messages', () => {
    test('es has exactly the en keys, all non-empty', () => {
        expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
        for (const value of Object.values(es)) {
            expect(typeof value).toBe('string');
            expect(value.trim()).not.toBe('');
        }
    });
});
