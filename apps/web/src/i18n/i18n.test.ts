// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vite-plus/test';
import i18n from './index';

afterEach(async () => {
    await i18n.changeLanguage('en');
});

describe('i18n runtime', () => {
    it.each([
        [1, '1 card due'],
        [5, '5 cards due'],
    ])('pluralizes study:review.dueCount for %i', (count, expected) => {
        expect(i18n.t('study:review.dueCount', { count })).toBe(expected);
    });

    it('loads Spanish on demand and renders it', async () => {
        await i18n.changeLanguage('es');
        expect(i18n.t('study:review.dueCount', { count: 5 })).toBe(
            '5 tarjetas pendientes'
        );
        expect(document.documentElement.lang).toBe('es');
        expect(document.documentElement.dir).toBe('ltr');
    });

    it('resolves a regional code to its supported language', async () => {
        await i18n.changeLanguage('es-MX');
        expect(i18n.resolvedLanguage).toBe('es');
        expect(i18n.t('study:review.dueCount', { count: 1 })).toBe(
            '1 tarjeta pendiente'
        );
    });

    it('falls back to English for an unsupported language', async () => {
        await i18n.changeLanguage('xx');
        expect(i18n.resolvedLanguage).toBe('en');
        expect(document.documentElement.lang).toBe('en');
    });
});
