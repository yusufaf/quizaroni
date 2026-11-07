import { describe, expect, it } from 'vite-plus/test';
import type { Card, CardFileMetadata } from 'shared/types';
import { addFileToCard } from './createUtils';

const card = (cardUUID: string): Card =>
    ({ cardUUID, term: 't', definition: 'd', files: [] }) as unknown as Card;

const file = (key: string): CardFileMetadata =>
    ({
        association: 'term',
        key,
        name: key,
        signedURL: `/api/files/${key}`,
        size: 1,
    }) as CardFileMetadata;

describe('addFileToCard', () => {
    it('adds files to the matching card only, without mutating', () => {
        const cards = [card('a'), card('b')];
        const before = structuredClone(cards);
        const once = addFileToCard(cards, 'a', file('k1'));
        const twice = addFileToCard(once, 'a', file('k2'));
        expect(twice[0]?.files.map((f) => f.key)).toEqual(['k1', 'k2']);
        expect(twice[1]).toBe(cards[1]);
        expect(cards).toEqual(before);
    });
});
