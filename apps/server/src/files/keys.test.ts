import { describe, expect, test } from 'bun:test';
import { OTHER_ID, SET_ID } from '../testing/studysets';
import {
    fileURL,
    isAvatarKey,
    isCardFileKey,
    newAvatarKey,
    newCardFileKey,
    withFileURLs,
} from './keys';

const FILE_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const BACKSLASH = String.fromCharCode(92);
const NUL = String.fromCharCode(0);

describe('isCardFileKey', () => {
    test('accepts exactly <set uuid>/<file uuid>', () => {
        expect(isCardFileKey(`${SET_ID}/${FILE_ID}`)).toBe(true);
        expect(isCardFileKey(newCardFileKey(SET_ID))).toBe(true);
    });

    test('rejects everything else', () => {
        for (const key of [
            `${SET_ID.toUpperCase()}/${FILE_ID}`,
            SET_ID,
            `${SET_ID}/${FILE_ID}/x`,
            `${SET_ID}/..`,
            `${SET_ID}/../${OTHER_ID}`,
            `${SET_ID}%2F..%2F${OTHER_ID}`,
            `${SET_ID}/${FILE_ID}${BACKSLASH}x`,
            `${SET_ID}/${FILE_ID}${NUL}`,
            `${SET_ID}/`,
            `${SET_ID}/user/name.png`,
            '',
            42,
            null,
        ]) {
            expect(isCardFileKey(key)).toBe(false);
        }
    });
});

describe('isAvatarKey', () => {
    test('accepts avatars/<user>/<file uuid>', () => {
        expect(isAvatarKey(`avatars/${SET_ID}/${FILE_ID}`)).toBe(true);
        expect(isAvatarKey(newAvatarKey('user-1'))).toBe(true);
    });

    test('rejects other layouts', () => {
        for (const key of [
            `avatars/../x/${FILE_ID}`,
            `avatars/a/b/${FILE_ID}`,
            `avatars/a/${FILE_ID}/x`,
            `avatar/a/${FILE_ID}`,
            `avatars/a b/${FILE_ID}`,
            `${SET_ID}/${FILE_ID}`,
        ]) {
            expect(isAvatarKey(key)).toBe(false);
        }
    });
});

test('fileURL encodes each segment', () => {
    expect(fileURL(`${SET_ID}/${FILE_ID}`)).toBe(
        `/api/files/${SET_ID}/${FILE_ID}`
    );
    expect(fileURL('a b/c?d')).toBe('/api/files/a%20b/c%3Fd');
});

describe('withFileURLs', () => {
    test('serves card files from the stable path only', () => {
        const key = `${SET_ID}/${FILE_ID}`;
        const cards = [
            {
                term: 't',
                files: [
                    { key, signedURL: 'https://evil.example/x' },
                    { key: `${SET_ID}/${OTHER_ID}` },
                    { name: 'no key' },
                    { key: `${SET_ID}/../x`, signedURL: 'kept' },
                    { key: `${SET_ID}/user/name.png`, signedURL: 'legacy' },
                    'not an object',
                ],
            },
            { term: 'no files' },
        ];
        const before = structuredClone(cards);
        expect(withFileURLs(cards)).toEqual([
            {
                term: 't',
                files: [
                    { key, signedURL: `/api/files/${key}` },
                    {
                        key: `${SET_ID}/${OTHER_ID}`,
                        signedURL: `/api/files/${SET_ID}/${OTHER_ID}`,
                    },
                    { name: 'no key' },
                    { key: `${SET_ID}/../x`, signedURL: 'kept' },
                    { key: `${SET_ID}/user/name.png`, signedURL: 'legacy' },
                    'not an object',
                ],
            },
            { term: 'no files' },
        ]);
        expect(cards).toEqual(before);
    });
});
