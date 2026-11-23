import { describe, expect, test } from 'bun:test';
import { displayName, NAME_MAX } from './display-name';

describe('displayName', () => {
    test('keeps an ordinary name', () => {
        expect(displayName('Ada Lovelace', 'ada@example.com')).toBe(
            'Ada Lovelace'
        );
    });

    test('trims and strips control characters', () => {
        expect(
            displayName('  Ada\u0007 Love\nlace\u0000 ', 'a@example.com')
        ).toBe('Ada Lovelace');
    });

    test('truncates to the name limit without splitting a surrogate pair', () => {
        const name = displayName(
            'a'.repeat(NAME_MAX - 1) + '\u{1F600}',
            'a@x.io'
        );
        expect(name.length).toBeLessThanOrEqual(NAME_MAX);
        expect(name).toBe('a'.repeat(NAME_MAX - 1));
        expect(displayName('x'.repeat(500), 'a@x.io')).toHaveLength(NAME_MAX);
    });

    test('falls back to the email local part for an empty name', () => {
        expect(displayName('', 'grace.hopper@example.com')).toBe(
            'grace.hopper'
        );
        expect(displayName(' \u0007 ', 'grace@example.com')).toBe('grace');
    });

    test('falls back to a fixed name when nothing usable is left', () => {
        expect(displayName('', '@example.com')).toBe('Quizaroni user');
        expect(displayName('', '')).toBe('Quizaroni user');
    });
});
