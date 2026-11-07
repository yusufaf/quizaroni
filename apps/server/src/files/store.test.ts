import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OTHER_ID, SET_ID } from '../testing/studysets';
import { FileStore } from './store';

const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8, 9,
]);
const FILE_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const KEY = `${SET_ID}/${FILE_ID}`;

let root: string;
let store: FileStore;
let warn: ReturnType<typeof spyOn>;

beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'qz-files-'));
    store = new FileStore(root);
    warn = spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    warn.mockRestore();
    rmSync(root, { recursive: true, force: true });
});

function put(key: string, data: Uint8Array = PNG) {
    const temp = join(root, `tmp-${crypto.randomUUID()}`);
    writeFileSync(temp, data);
    store.place(temp, key);
}

describe('pathOf', () => {
    test('resolves card and avatar keys under the files dir', () => {
        expect(store.pathOf(KEY)).toBe(join(store.filesDir, SET_ID, FILE_ID));
        expect(store.pathOf(`avatars/u1/${FILE_ID}`)).toBe(
            join(store.filesDir, 'avatars', 'u1', FILE_ID)
        );
    });

    test('refuses traversal and malformed keys', () => {
        for (const key of [
            `${SET_ID}/..`,
            `../${SET_ID}/${FILE_ID}`,
            `${SET_ID}/../${OTHER_ID}`,
            `avatars/../${FILE_ID}`,
            'quizaroni.db',
            '',
        ]) {
            expect(store.pathOf(key)).toBeUndefined();
        }
    });
});

test('place then head gives the size and sniffed type', async () => {
    put(KEY);
    expect(await store.head(KEY)).toEqual({
        path: join(store.filesDir, SET_ID, FILE_ID),
        size: PNG.length,
        type: 'image/png',
    });
    expect(await store.head(`${SET_ID}/${OTHER_ID}`)).toBeUndefined();
    expect(await store.head('../x')).toBeUndefined();
});

describe('copyAll', () => {
    const TARGET = `${OTHER_ID}/${FILE_ID}`;

    test('copies so each key outlives the other', () => {
        put(KEY);
        store.copyAll([{ from: KEY, to: TARGET }]);
        store.remove(KEY);
        expect(readFileSync(store.pathOf(TARGET)!)).toEqual(Buffer.from(PNG));
    });

    test('skips a missing source or an invalid key without throwing', () => {
        expect(() =>
            store.copyAll([
                { from: KEY, to: TARGET },
                { from: 'avatars/u/' + FILE_ID, to: TARGET },
            ])
        ).not.toThrow();
        expect(existsSync(store.pathOf(TARGET)!)).toBe(false);
    });
});

test('deleteStudysetFiles removes only the named sets', () => {
    put(KEY);
    put(`${OTHER_ID}/${FILE_ID}`);
    store.deleteStudysetFiles([SET_ID, '..', 'not-a-uuid']);
    expect(existsSync(join(store.filesDir, SET_ID))).toBe(false);
    expect(existsSync(store.pathOf(`${OTHER_ID}/${FILE_ID}`)!)).toBe(true);
});

test('listAvatarKeys lists only well-formed avatar files', () => {
    expect(store.listAvatarKeys('u1')).toEqual([]);
    put(`avatars/u1/${FILE_ID}`);
    writeFileSync(join(store.filesDir, 'avatars', 'u1', 'junk'), 'x');
    expect(store.listAvatarKeys('u1')).toEqual([`avatars/u1/${FILE_ID}`]);
});

test('staging paths are checked and resetStaging empties the dir', () => {
    const upload = crypto.randomUUID();
    store.openStaging(upload);
    writeFileSync(store.stagingPath(upload, '1'), 'x');
    expect(() => store.stagingPath(upload, '../x')).toThrow();
    expect(() => store.stagingPath('../x', '1')).toThrow();
    store.resetStaging();
    expect(existsSync(store.stagingPath(upload, '1'))).toBe(false);
    expect(existsSync(store.stagingDir)).toBe(true);
});
