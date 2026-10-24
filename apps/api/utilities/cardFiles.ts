import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { Card, UUID } from 'models/studysets';

export type FileCopy = { from: string; to: string };

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Card files live under `${studysetUUID}/${fileUUID}`. A presigned URL carries
 * its key in the path, so the key must never hold the owner id or the
 * uploaded file name (#152).
 */
export const cardFileKey = (
    studysetUUID: string,
    fileUUID: string = randomUUID()
): string => `${studysetUUID}/${fileUUID}`;

// Stored cards aren't validated on write, so `key` may be anything.
export const isOpaqueCardFileKey = (
    key: unknown,
    studysetUUID: string | undefined
): boolean => {
    if (typeof key !== 'string') return false;
    if (typeof studysetUUID !== 'string' || studysetUUID === '') return false;
    const parts = key.split('/');
    return (
        parts.length === 2 &&
        parts[0] === studysetUUID &&
        UUID_RE.test(parts[1])
    );
};

export const isUUID = (value: unknown): value is string =>
    typeof value === 'string' && UUID_RE.test(value);

/**
 * A card file's set is the first segment of its key, in both the opaque and
 * the legacy layouts. Returns undefined for anything that can't name a set.
 */
export const studysetUUIDOfKey = (key: unknown): string | undefined => {
    if (typeof key !== 'string') return undefined;
    const parts = key.split('/');
    if (parts.length < 2 || parts.some((part) => part === '')) return undefined;
    return isUUID(parts[0]) ? parts[0] : undefined;
};

export const isKeyInStudyset = (key: unknown, studysetUUID: string): boolean =>
    studysetUUIDOfKey(key) === studysetUUID;

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Collects the file keys a client-sent `cards` value names. `malformed` flags
 * any shape a stored card can't have, so the caller can reject it.
 */
export const collectCardFileKeys = (
    cards: unknown
): { keys: Set<string>; malformed: boolean } => {
    const keys = new Set<string>();
    if (!Array.isArray(cards)) return { keys, malformed: true };

    let malformed = false;
    for (const card of cards) {
        if (!isPlainObject(card)) {
            malformed = true;
            continue;
        }
        const { files } = card;
        if (files === undefined || files === null) continue;
        if (!Array.isArray(files)) {
            malformed = true;
            continue;
        }
        for (const file of files) {
            if (!isPlainObject(file)) {
                malformed = true;
                continue;
            }
            const { key } = file;
            if (key === undefined || key === null || key === '') continue;
            if (typeof key !== 'string') {
                malformed = true;
                continue;
            }
            keys.add(key);
        }
    }
    return { keys, malformed };
};

// CopySource must be URL-encoded; keep the `/` separators literal.
export const encodeCopySourceKey = (key: string) =>
    key.split('/').map(encodeURIComponent).join('/');

/**
 * Gives every card file a new opaque key under the new set, the layout uploads
 * use, and lists the S3 copies that makes necessary. A key shared by several
 * cards maps to one new key. `shouldRekey` limits this to some keys.
 */
export const planCardFileCopies = (
    cards: Card[],
    studysetUUID: UUID,
    newFileKey: () => string = () => cardFileKey(studysetUUID),
    shouldRekey: (key: string) => boolean = () => true
): { cards: Card[]; copies: FileCopy[] } => {
    const newKeys = new Map<string, string>();

    const rekey = (oldKey: string) => {
        const existing = newKeys.get(oldKey);
        if (existing) return existing;

        const newKey = newFileKey();
        newKeys.set(oldKey, newKey);
        return newKey;
    };

    const rekeyed = cards.map((card) => ({
        ...card,
        files: (card.files ?? []).map((file) =>
            file.key && shouldRekey(file.key)
                ? { ...file, key: rekey(file.key) }
                : file
        ),
    }));

    return {
        cards: rekeyed,
        copies: [...newKeys].map(([from, to]) => ({ from, to })),
    };
};

/**
 * Copies each card file to its own object under the new set and returns the
 * cards pointing at the copies. Files whose source object is gone (NoSuchKey)
 * are dropped; any other S3 error rejects, so the caller never stores a set
 * that points at another set's objects.
 */
export const copyCardFiles = async ({
    s3Client,
    bucket,
    cards,
    studysetUUID,
    newFileKey,
    shouldCopy,
}: {
    s3Client: S3Client;
    bucket: string;
    cards: Card[];
    studysetUUID: UUID;
    newFileKey?: () => string;
    shouldCopy?: (key: string) => boolean;
}): Promise<Card[]> => {
    const { cards: rekeyed, copies } = planCardFileCopies(
        cards,
        studysetUUID,
        newFileKey,
        shouldCopy
    );
    if (copies.length === 0) return rekeyed;

    const results = await Promise.allSettled(
        copies.map(({ from, to }) =>
            s3Client.send(
                new CopyObjectCommand({
                    Bucket: bucket,
                    Key: to,
                    CopySource: `${bucket}/${encodeCopySourceKey(from)}`,
                })
            )
        )
    );

    const missing = new Set<string>();
    const failed: { from: string; reason: unknown }[] = [];
    results.forEach((result, i) => {
        if (result.status === 'fulfilled') return;
        if ((result.reason as { name?: string })?.name === 'NoSuchKey') {
            missing.add(copies[i].from);
        } else {
            failed.push({ from: copies[i].from, reason: result.reason });
        }
    });

    if (failed.length > 0) {
        console.error(
            'Failed to copy card files',
            failed.map((f) => f.from)
        );
        throw failed[0].reason;
    }
    if (missing.size === 0) return rekeyed;

    console.warn('Dropping card files whose source object is missing', [
        ...missing,
    ]);
    const dropped = new Set(
        copies.filter((c) => missing.has(c.from)).map((c) => c.to)
    );
    return rekeyed.map((card) => ({
        ...card,
        files: card.files.filter((file) => !dropped.has(file.key)),
    }));
};
