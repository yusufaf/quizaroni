import { describe, expect, it } from 'vite-plus/test';
import { requiredCategories, splitPluralKey } from './plurals';

describe('splitPluralKey', () => {
    it.each([
        ['review.dueCount_one', 'review.dueCount', 'one'],
        ['review.dueCount_other', 'review.dueCount', 'other'],
        ['review.title', 'review.title', null],
        ['step_one_title', 'step_one_title', null],
        ['_one', '_one', null],
        ['a_one.b', 'a_one.b', null],
    ])('%s', (key, base, category) => {
        expect(splitPluralKey(key)).toEqual({ base, category });
    });
});

describe('requiredCategories', () => {
    it.each([
        ['en', ['one', 'other']],
        ['es', ['one', 'other']],
        ['ja', ['other']],
        ['pl', ['few', 'many', 'one']],
    ])('%s', (lng, expected) => {
        expect([...requiredCategories(lng)].sort()).toEqual(expected);
    });
});
