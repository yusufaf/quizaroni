import {
    appendFileSync,
    readFileSync,
    rmSync,
    statSync,
} from 'node:fs';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AuthHandle } from '../auth/auth';
import type { Db } from '../db';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import { requireSession, type SessionEnv } from '../http/session';
import { message } from '../studysets/respond';
import {
    attachCardFile,
    ownedRow,
    StudysetTooLargeError,
} from '../studysets/store';
import { isStudysetUUID } from '../studysets/updates';
import { isPlainObject } from '../users/metadata';
import {
    fileURL,
    isAvatarKey,
    isCardFileKey,
    MAX_CARD_FILE_BYTES,
    MAX_PART_BYTES,
    MAX_UPLOAD_PARTS,
} from './keys';
import {
    AVATAR_TYPES,
    CARD_FILE_TYPES,
    DECLARED_CARD_TYPES,
    SNIFF_BYTES,
    sniffContentType,
} from './sniff';
import type { FileStore } from './store';
import type { UploadRegistry, UploadSession } from './uploads';

const JSON_BODY_LIMIT = 16 * 1024;
const PART_NUMBER = /^\d{1,2}$/;

// The one read check for card files. Today only the set's owner may read;
// #261 adds published sets here.
export function canReadCardFile(db: Db, userId: string, key: string): boolean {
    const setId = key.split('/')[0]!;
    return ownedRow(db, userId, setId) !== undefined;
}

export function canReadAvatar(userId: string, key: string): boolean {
    return key.split('/')[1] === userId;
}

function etagMatches(header: string | undefined, etag: string): boolean {
    if (!header) return false;
    return header
        .split(',')
        .map((tag) => tag.trim().replace(/^W\//, ''))
        .some((tag) => tag === '*' || tag === etag);
}

type Deps = {
    db: Db;
    auth: AuthHandle;
    files: FileStore;
    uploads: UploadRegistry;
};

export function fileRoutes(deps: Deps): Hono<SessionEnv> {
    const { db, files, uploads } = deps;
    const routes = new Hono<SessionEnv>();

    routes.use('*', requireSession(deps.auth));
    routes.use('*', async (c, next) => {
        if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
            c.header('Cache-Control', 'no-store');
        }
        await next();
    });
    routes.post(
        '*',
        bodyLimit({
            maxSize: JSON_BODY_LIMIT,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        })
    );

    routes.post('/initiate-multipart-upload', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        const userId = c.get('userId');
        if (!isStudysetUUID(body.studysetUUID)) {
            return message(c, 'Invalid studysetUUID', 400);
        }
        if (!ownedRow(db, userId, body.studysetUUID)) {
            return message(c, 'Forbidden', 403);
        }
        const declared = body.contentType;
        if (
            typeof declared === 'string' &&
            declared !== '' &&
            !DECLARED_CARD_TYPES.has(declared.toLowerCase())
        ) {
            return message(c, 'Unsupported file type', 415);
        }
        const session = uploads.start(userId, body.studysetUUID);
        if (session === 'too_many') {
            return c.json({ message: 'Too many uploads in progress' }, 429);
        }
        return c.json({ key: session.key, uploadId: session.uploadId });
    });

    routes.post('/get-multipart-signed-upload-urls', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        const session = uploads.get(body.uploadId, c.get('userId'));
        if (!session || session.key !== body.key) {
            return message(c, 'Upload not found', 404);
        }
        const numParts = body.numParts;
        if (
            typeof numParts !== 'number' ||
            !Number.isInteger(numParts) ||
            numParts < 1 ||
            numParts > MAX_UPLOAD_PARTS
        ) {
            // The client can't recover from this, so the slot is freed.
            uploads.fail(session);
            return message(c, 'Invalid numParts', 400);
        }
        session.numParts = numParts;
        const signedURLs: Record<string, string> = {};
        for (let i = 0; i < numParts; i++) {
            signedURLs[String(i)] =
                `/api/files/upload-part/${session.uploadId}/${i + 1}`;
        }
        return c.json({ signedURLs });
    });

    // Parts are streamed to disk and counted chunk by chunk. Each chunk is
    // added to the session before the next await, so parts sent in parallel
    // can't pass the per-file cap together.
    routes.put('/upload-part/:uploadId/:partNumber', async (c) => {
        const session = uploads.get(c.req.param('uploadId'), c.get('userId'));
        if (!session) return message(c, 'Upload not found', 404);
        if (session.completing) {
            return message(c, 'Upload is completing', 409);
        }
        const raw = c.req.param('partNumber');
        const n = PART_NUMBER.test(raw) ? Number(raw) : NaN;
        if (!session.numParts || !(n >= 1 && n <= session.numParts)) {
            return message(c, 'Invalid part number', 400);
        }
        if (session.inflight.has(n)) {
            return message(c, 'Part upload in progress', 409);
        }
        const declaredLength = c.req.header('content-length');
        if (
            declaredLength !== undefined &&
            Number(declaredLength) > MAX_PART_BYTES
        ) {
            uploads.fail(session);
            return message(c, 'Part too large', 413);
        }
        const body = c.req.raw.body;
        if (!body) return message(c, 'Missing body', 400);

        // A FileSink doesn't truncate an existing file, so a repeat PUT
        // removes the old part first.
        const partPath = files.stagingPath(session.uploadId, String(n));
        session.parts.delete(n);
        session.inflight.set(n, 0);
        rmSync(partPath, { force: true });

        const sink = Bun.file(partPath).writer();
        const hasher = new Bun.CryptoHasher('sha256');
        let size = 0;
        let refused: 'Part too large' | 'File too large' | undefined;
        try {
            for await (const chunk of body) {
                size += chunk.byteLength;
                session.inflight.set(n, size);
                if (size > MAX_PART_BYTES) {
                    refused = 'Part too large';
                    break;
                }
                if (
                    size + uploads.reservedBytes(session, n) >
                    MAX_CARD_FILE_BYTES
                ) {
                    refused = 'File too large';
                    break;
                }
                hasher.update(chunk);
                await sink.write(chunk);
            }
            await sink.end();
            if (refused) {
                rmSync(partPath, { force: true });
                uploads.fail(session);
                return message(c, refused, 413);
            }
            const etag = `"${hasher.digest('hex')}"`;
            session.parts.set(n, { etag, size });
            c.header('ETag', etag);
            return c.body(null, 200);
        } catch (err) {
            try {
                await sink.end();
            } catch {
                // keep the original error
            }
            rmSync(partPath, { force: true });
            throw err;
        } finally {
            session.inflight.delete(n);
            if (session.failed) uploads.sweep();
        }
    });

    routes.post('/complete-multipart-upload', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        const userId = c.get('userId');
        const { key } = body;
        if (
            !isCardFileKey(key) ||
            (body.studysetUUID !== undefined &&
                body.studysetUUID !== key.split('/')[0])
        ) {
            return message(c, 'Invalid file key', 400);
        }
        const session = uploads.get(body.uploadId, userId);
        if (!session || session.key !== key) {
            return message(c, 'Upload not found', 404);
        }
        if (session.completing) {
            return message(c, 'Upload is completing', 409);
        }
        if (session.inflight.size > 0) {
            return message(c, 'Part upload in progress', 409);
        }
        if (!partsMatch(session, body.parts)) {
            return message(c, 'Invalid parts', 400);
        }
        let recorded = 0;
        for (const part of session.parts.values()) recorded += part.size;
        if (recorded > MAX_CARD_FILE_BYTES) {
            return message(c, 'File too large', 413);
        }

        session.completing = true;
        try {
            return await assembleAndAttach(c, deps, session, key, body);
        } finally {
            uploads.finish(session.uploadId);
        }
    });

    const serve = async (c: Context<SessionEnv>, key: string) => {
        const userId = c.get('userId');
        const allowed: readonly string[] | undefined = isCardFileKey(key)
            ? canReadCardFile(db, userId, key)
                ? CARD_FILE_TYPES
                : undefined
            : isAvatarKey(key) && canReadAvatar(userId, key)
              ? AVATAR_TYPES
              : undefined;
        if (!allowed) return message(c, 'Not found', 404);
        const head = await files.head(key);
        if (!head) return message(c, 'Not found', 404);

        // Keys never get new bytes, so the file id is a strong validator.
        // The read check above runs on every revalidation too.
        const etag = `"${key.split('/').pop()}"`;
        const cacheControl = 'private, no-cache';
        if (etagMatches(c.req.header('if-none-match'), etag)) {
            return new Response(null, {
                status: 304,
                headers: { ETag: etag, 'Cache-Control': cacheControl },
            });
        }
        const inline = head.type !== undefined && allowed.includes(head.type);
        return new Response(Bun.file(head.path), {
            headers: {
                'Content-Type': inline ? head.type! : 'application/octet-stream',
                'Content-Disposition': inline ? 'inline' : 'attachment',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; sandbox",
                'Cross-Origin-Resource-Policy': 'same-origin',
                'Cache-Control': cacheControl,
                ETag: etag,
            },
        });
    };

    routes.get('/avatars/:userId/:fileUUID', (c) =>
        serve(c, `avatars/${c.req.param('userId')}/${c.req.param('fileUUID')}`)
    );
    routes.get('/:studysetUUID/:fileUUID', (c) =>
        serve(c, `${c.req.param('studysetUUID')}/${c.req.param('fileUUID')}`)
    );

    return routes;
}

function partsMatch(session: UploadSession, parts: unknown): boolean {
    if (!session.numParts || !Array.isArray(parts)) return false;
    if (parts.length !== session.numParts) return false;
    return parts.every((part, i) => {
        if (!isPlainObject(part) || part.PartNumber !== i + 1) return false;
        const recorded = session.parts.get(i + 1);
        return recorded !== undefined && recorded.etag === part.ETag;
    });
}

async function assembleAndAttach(
    c: Context<SessionEnv>,
    deps: Deps,
    session: UploadSession,
    key: string,
    body: Record<string, unknown>
): Promise<Response> {
    const { db, files } = deps;
    const userId = c.get('userId');
    const assembled = files.stagingPath(session.uploadId, 'assembled');
    rmSync(assembled, { force: true });
    for (let n = 1; n <= session.numParts!; n++) {
        appendFileSync(
            assembled,
            readFileSync(files.stagingPath(session.uploadId, String(n)))
        );
    }
    // The bytes on disk decide the size and the type.
    const size = statSync(assembled).size;
    if (size > MAX_CARD_FILE_BYTES) return message(c, 'File too large', 413);
    const head = new Uint8Array(
        await Bun.file(assembled).slice(0, SNIFF_BYTES).arrayBuffer()
    );
    if (!sniffContentType(head)) {
        return message(c, 'Unsupported file type', 415);
    }
    files.place(assembled, key);

    const setId = key.split('/')[0]!;
    const fileName =
        typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const name = fileName ? fileName.slice(0, 255) : key.split('/').pop()!;
    const uploadedAt = new Date().toISOString();
    const file = { name, key, size, signedURL: fileURL(key), uploadedAt };
    const { cardUUID, association } = body;
    try {
        if (
            typeof cardUUID === 'string' &&
            (association === 'term' || association === 'definition')
        ) {
            const result = attachCardFile(db, userId, setId, cardUUID, {
                ...file,
                association,
            });
            if (result === 'not_found') {
                files.remove(key);
                return message(c, 'Study set not found', 404);
            }
        } else if (!ownedRow(db, userId, setId)) {
            files.remove(key);
            return message(c, 'Study set not found', 404);
        }
    } catch (err) {
        files.remove(key);
        if (err instanceof StudysetTooLargeError) {
            return message(c, 'Study set too large', 413);
        }
        throw err;
    }
    return c.json(file);
}
