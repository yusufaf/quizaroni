import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { Card, UUID } from 'models/studysets';

export type FileCopy = { from: string; to: string };

const fileNameOf = (key: string) => key.slice(key.lastIndexOf('/') + 1);

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

// CopySource must be URL-encoded; keep the `/` separators literal.
export const encodeCopySourceKey = (key: string) =>
    key.split('/').map(encodeURIComponent).join('/');

/**
 * Re-keys every card file under `${studysetUUID}/${ownerUUID}/`, the prefix
 * uploads use, and lists the S3 copies that makes necessary. A key shared by
 * several cards maps to one new key; different keys that would land on the
 * same new key get a numeric prefix so the copy never shares an object.
 */
export const planCardFileCopies = (
    cards: Card[],
    studysetUUID: UUID,
    ownerUUID: UUID
): { cards: Card[]; copies: FileCopy[] } => {
    const newKeys = new Map<string, string>();
    const taken = new Set<string>();
    const prefix = `${studysetUUID}/${ownerUUID}`;

    const rekey = (oldKey: string) => {
        const existing = newKeys.get(oldKey);
        if (existing) return existing;

        const fileName = fileNameOf(oldKey);
        let newKey = `${prefix}/${fileName}`;
        for (let n = 1; taken.has(newKey); n++) {
            newKey = `${prefix}/${n}-${fileName}`;
        }
        newKeys.set(oldKey, newKey);
        taken.add(newKey);
        return newKey;
    };

    const rekeyed = cards.map((card) => ({
        ...card,
        files: (card.files ?? []).map((file) =>
            file.key ? { ...file, key: rekey(file.key) } : file
        ),
    }));

    return {
        cards: rekeyed,
        copies: [...newKeys].map(([from, to]) => ({ from, to })),
    };
};

/**
 * Copies each card file to its own object under the new set's prefix and
 * returns the cards pointing at the copies. Files whose source object is gone
 * (NoSuchKey) are dropped; any other S3 error rejects, so the caller never
 * stores a set that points at another set's objects.
 */
export const copyCardFiles = async ({
    s3Client,
    bucket,
    cards,
    studysetUUID,
    ownerUUID,
}: {
    s3Client: S3Client;
    bucket: string;
    cards: Card[];
    studysetUUID: UUID;
    ownerUUID: UUID;
}): Promise<Card[]> => {
    const { cards: rekeyed, copies } = planCardFileCopies(
        cards,
        studysetUUID,
        ownerUUID
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
