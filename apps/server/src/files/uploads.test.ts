import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SET_ID } from '../testing/studysets';
import { MAX_OPEN_UPLOADS_PER_USER, UPLOAD_TTL_MS } from './keys';
import { FileStore } from './store';
import { type UploadSession, UploadRegistry } from './uploads';

let root: string;
let files: FileStore;
let clock: number;
let uploads: UploadRegistry;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'qz-uploads-'));
    files = new FileStore(root);
    clock = 1_000;
    uploads = new UploadRegistry(files, () => clock);
});

afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});

const dirOf = (s: UploadSession) => join(files.stagingDir, s.uploadId);

function start(owner = 'a'): UploadSession {
    const s = uploads.start(owner, SET_ID);
    if (s === 'too_many') throw new Error('too many');
    return s;
}

describe('UploadRegistry', () => {
    test('start opens a staging dir and a key under the set', () => {
        const s = start();
        expect(existsSync(dirOf(s))).toBe(true);
        expect(s.key).toStartWith(`${SET_ID}/`);
    });

    test('get is scoped to the owner', () => {
        const s = start('a');
        expect(uploads.get(s.uploadId, 'a')).toBe(s);
        expect(uploads.get(s.uploadId, 'b')).toBeUndefined();
        expect(uploads.get(42, 'a')).toBeUndefined();
    });

    test('a session expires after the TTL', () => {
        const s = start();
        clock += UPLOAD_TTL_MS + 1;
        expect(uploads.get(s.uploadId, 'a')).toBeUndefined();
        uploads.sweep();
        expect(existsSync(dirOf(s))).toBe(false);
    });

    test('caps open uploads per user', () => {
        for (let i = 0; i < MAX_OPEN_UPLOADS_PER_USER; i++) start('a');
        expect(uploads.start('a', SET_ID)).toBe('too_many');
        expect(uploads.start('b', SET_ID)).not.toBe('too_many');
    });

    test('reservedBytes counts other parts, recorded and in flight', () => {
        const s = start();
        s.parts.set(1, { etag: '"x"', size: 5 });
        s.inflight.set(2, 7);
        s.inflight.set(3, 11);
        expect(uploads.reservedBytes(s, 3)).toBe(12);
        expect(uploads.reservedBytes(s, 1)).toBe(18);
    });

    test('fail frees the slot and the staging dir', () => {
        const s = start();
        uploads.fail(s);
        expect(uploads.get(s.uploadId, 'a')).toBeUndefined();
        expect(existsSync(dirOf(s))).toBe(false);
    });

    test('a failed session keeps its dir while a part is streaming', () => {
        const s = start();
        s.inflight.set(1, 3);
        uploads.fail(s);
        expect(existsSync(dirOf(s))).toBe(true);
        s.inflight.delete(1);
        uploads.sweep();
        expect(existsSync(dirOf(s))).toBe(false);
    });

    test('failed uploads stop counting toward the cap', () => {
        for (let i = 0; i < MAX_OPEN_UPLOADS_PER_USER; i++) {
            uploads.fail(start('a'));
        }
        expect(uploads.start('a', SET_ID)).not.toBe('too_many');
    });
});
