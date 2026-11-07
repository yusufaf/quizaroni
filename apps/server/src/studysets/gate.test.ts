import { describe, expect, test } from 'bun:test';
import {
    cardsGateError,
    countCompleteCards,
    isListed,
    validatePublish,
} from './gate';

const card = (term: unknown = 't', definition: unknown = 'd') => ({
    term,
    definition,
});
const cards = (n: number) => Array.from({ length: n }, () => card());

describe('countCompleteCards', () => {
    test('counts cards with both sides filled', () => {
        expect(countCompleteCards([card(' ', 'd')])).toBe(0);
        expect(countCompleteCards([{ term: 't' }])).toBe(0);
        expect(countCompleteCards([card(1, 'd')])).toBe(0);
        expect(countCompleteCards([null, 'x', [card()]])).toBe(0);
        expect(countCompleteCards(cards(4))).toBe(4);
    });
});

test('cardsGateError', () => {
    expect(cardsGateError(cards(3))).toEqual({
        code: 'notEnoughCards',
        required: 4,
        actual: 3,
    });
    expect(cardsGateError(cards(4))).toBeUndefined();
});

describe('validatePublish', () => {
    test('a hidden set is refused for that alone', () => {
        expect(
            validatePublish('astrology', { cards: [], hiddenAt: new Date() })
        ).toEqual({ ok: false, errors: [{ code: 'hidden' }] });
    });

    test('reports every other problem in order', () => {
        expect(
            validatePublish('astrology', { cards: cards(2), hiddenAt: null })
        ).toEqual({
            ok: false,
            errors: [
                { code: 'invalidSubject' },
                { code: 'notEnoughCards', required: 4, actual: 2 },
            ],
        });
    });

    test('accepts a known subject with enough cards', () => {
        expect(
            validatePublish('science', { cards: cards(4), hiddenAt: null })
        ).toEqual({ ok: true, subject: 'science' });
    });
});

test('isListed needs public, published and not hidden', () => {
    const listed = { isPublic: true, hiddenAt: null, publishedAt: new Date() };
    expect(isListed(listed)).toBe(true);
    expect(isListed({ ...listed, isPublic: false })).toBe(false);
    expect(isListed({ ...listed, hiddenAt: new Date() })).toBe(false);
    expect(isListed({ ...listed, publishedAt: null })).toBe(false);
});
