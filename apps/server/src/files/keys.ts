import { isPlainObject, type JsonObject } from '../users/metadata';

// Only these two exact key layouts ever name a file on disk:
//   <studysetUUID>/<fileUUID>          card files
//   avatars/<userId>/<fileUUID>        profile pictures
export const LOWER_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const USER_SEGMENT = /^[A-Za-z0-9-]{1,64}$/;

export const MAX_PART_BYTES = 10_000_000;
export const MAX_CARD_FILE_BYTES = 25_000_000;
export const MAX_UPLOAD_PARTS = Math.ceil(MAX_CARD_FILE_BYTES / MAX_PART_BYTES);
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_OPEN_UPLOADS_PER_USER = 10;
export const UPLOAD_TTL_MS = 60 * 60 * 1000;

export function isCardFileKey(key: unknown): key is string {
    if (typeof key !== 'string') return false;
    const parts = key.split('/');
    return (
        parts.length === 2 &&
        LOWER_UUID.test(parts[0]!) &&
        LOWER_UUID.test(parts[1]!)
    );
}

export function newCardFileKey(studysetUUID: string): string {
    return `${studysetUUID}/${crypto.randomUUID()}`;
}

export function isAvatarKey(key: unknown): key is string {
    if (typeof key !== 'string') return false;
    const parts = key.split('/');
    return (
        parts.length === 3 &&
        parts[0] === 'avatars' &&
        USER_SEGMENT.test(parts[1]!) &&
        LOWER_UUID.test(parts[2]!)
    );
}

export function newAvatarKey(userId: string): string {
    return `avatars/${userId}/${crypto.randomUUID()}`;
}

export const FILE_URL_PREFIX = '/api/files/';

export function fileURL(key: string): string {
    return FILE_URL_PREFIX + key.split('/').map(encodeURIComponent).join('/');
}

// The URL a client stored is never trusted: card files are always served
// from the stable, session-checked path. Keys that name no file are left
// exactly as stored.
export function withFileURLs(cards: JsonObject[]): JsonObject[] {
    return cards.map((card) => {
        if (!Array.isArray(card.files)) return card;
        return {
            ...card,
            files: card.files.map((file: unknown) =>
                isPlainObject(file) && isCardFileKey(file.key)
                    ? { ...file, signedURL: fileURL(file.key) }
                    : file
            ),
        };
    });
}
