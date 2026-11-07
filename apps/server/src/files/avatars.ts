import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../db';
import { isPlainObject } from '../users/metadata';
import { getUserView } from '../users/profile';
import {
    FILE_URL_PREFIX,
    fileURL,
    MAX_AVATAR_BYTES,
    newAvatarKey,
} from './keys';
import { AVATAR_TYPES, SNIFF_BYTES, sniffContentType } from './sniff';
import type { FileStore } from './store';

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type AvatarResult =
    | { ok: true; url: string }
    | { ok: false; message: string };

// The key behind the avatar the profile currently points at, if it's one of
// ours, so pruning never deletes the picture in use.
function currentAvatarKey(db: Db, userId: string): string | undefined {
    const avatar = getUserView(db, userId).metadata.avatar;
    if (!isPlainObject(avatar) || typeof avatar.value !== 'string') {
        return undefined;
    }
    const prefix = FILE_URL_PREFIX + 'avatars/';
    if (!avatar.value.startsWith(prefix)) return undefined;
    return avatar.value
        .slice(FILE_URL_PREFIX.length)
        .split('/')
        .map(decodeURIComponent)
        .join('/');
}

export function uploadAvatar(
    db: Db,
    files: FileStore,
    userId: string,
    imageData: unknown
): AvatarResult {
    if (typeof imageData !== 'string' || !BASE64.test(imageData)) {
        return { ok: false, message: 'Invalid image' };
    }
    const bytes = Buffer.from(imageData, 'base64');
    if (bytes.length > MAX_AVATAR_BYTES) {
        return { ok: false, message: 'Image size exceeds 2MB limit' };
    }
    // The bytes decide; the declared content type is ignored.
    const type = sniffContentType(bytes.subarray(0, SNIFF_BYTES));
    if (!type || !(AVATAR_TYPES as readonly string[]).includes(type)) {
        return {
            ok: false,
            message:
                'Invalid content type. Only PNG, JPEG, and WebP are allowed.',
        };
    }
    const key = newAvatarKey(userId);
    const temp = join(files.stagingDir, `avatar-${crypto.randomUUID()}`);
    writeFileSync(temp, bytes);
    files.place(temp, key);

    const keep = new Set([key, currentAvatarKey(db, userId)]);
    for (const old of files.listAvatarKeys(userId)) {
        if (!keep.has(old)) files.remove(old);
    }
    return { ok: true, url: fileURL(key) };
}
