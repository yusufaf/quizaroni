import {
    constants,
    copyFileSync,
    existsSync,
    linkSync,
    mkdirSync,
    readdirSync,
    renameSync,
    rmSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { isStudysetUUID } from '../studysets/updates';
import type { FileCopy } from '../studysets/updates';
import { isAvatarKey, isCardFileKey, LOWER_UUID } from './keys';
import { SNIFF_BYTES, type SniffedType, sniffContentType } from './sniff';

const STAGING_NAME = /^(\d{1,2}|assembled)$/;
const COPY_FALLBACK = new Set(['EXDEV', 'EPERM', 'ENOTSUP']);

const codeOf = (err: unknown) => (err as { code?: string }).code;

// Files live under <dataDir>/files; parts being uploaded under
// <dataDir>/tmp/uploads, outside files/, so nothing staged is ever served.
// A key never gets new bytes, which is what makes caching and hard-link
// copies safe.
export class FileStore {
    readonly filesDir: string;
    readonly stagingDir: string;

    constructor(dataDir: string) {
        this.filesDir = resolve(dataDir, 'files');
        this.stagingDir = resolve(dataDir, 'tmp', 'uploads');
    }

    // Only the two exact key layouts resolve, and the result must still sit
    // under the files dir.
    pathOf(key: string): string | undefined {
        if (!isCardFileKey(key) && !isAvatarKey(key)) return undefined;
        const full = resolve(this.filesDir, ...key.split('/'));
        return full.startsWith(this.filesDir + sep) ? full : undefined;
    }

    async head(
        key: string
    ): Promise<
        { path: string; size: number; type: SniffedType | undefined } | undefined
    > {
        const path = this.pathOf(key);
        if (!path) return undefined;
        const file = Bun.file(path);
        if (!(await file.exists())) return undefined;
        const head = new Uint8Array(
            await file.slice(0, SNIFF_BYTES).arrayBuffer()
        );
        return { path, size: file.size, type: sniffContentType(head) };
    }

    place(tempPath: string, key: string): void {
        const path = this.pathOf(key);
        if (!path) throw new Error('invalid file key');
        mkdirSync(dirname(path), { recursive: true });
        renameSync(tempPath, path);
    }

    remove(key: string): void {
        const path = this.pathOf(key);
        if (path) rmSync(path, { force: true });
    }

    // Runs after the set's commit, so it never throws: a failed copy leaves a
    // card pointing at a missing file, which is logged.
    copyAll(copies: FileCopy[]): void {
        for (const { from, to } of copies) {
            const source = isCardFileKey(from) ? this.pathOf(from) : undefined;
            const target = isCardFileKey(to) ? this.pathOf(to) : undefined;
            if (!source || !target) {
                console.warn(`Skipped a file copy with an invalid key: ${to}`);
                continue;
            }
            try {
                mkdirSync(dirname(target), { recursive: true });
                try {
                    linkSync(source, target);
                } catch (err) {
                    if (!COPY_FALLBACK.has(codeOf(err) ?? '')) throw err;
                    copyFileSync(source, target, constants.COPYFILE_EXCL);
                }
            } catch (err) {
                const code = codeOf(err);
                if (code === 'ENOENT' || code === 'EEXIST') {
                    console.warn(`Skipped a file copy (${code}): ${to}`);
                } else {
                    console.error(`File copy failed: ${to}`, err);
                }
            }
        }
    }

    deleteStudysetFiles(ids: string[]): void {
        for (const id of ids) {
            if (!isStudysetUUID(id)) continue;
            try {
                rmSync(join(this.filesDir, id), {
                    recursive: true,
                    force: true,
                });
            } catch (err) {
                console.error(`Deleting the files of a set failed: ${id}`, err);
            }
        }
    }

    listAvatarKeys(userId: string): string[] {
        const dir = join(this.filesDir, 'avatars', userId);
        if (!existsSync(dir)) return [];
        return readdirSync(dir)
            .map((name) => `avatars/${userId}/${name}`)
            .filter(isAvatarKey);
    }

    resetStaging(): void {
        rmSync(this.stagingDir, { recursive: true, force: true });
        mkdirSync(this.stagingDir, { recursive: true });
    }

    private uploadDir(uploadId: string): string {
        if (!LOWER_UUID.test(uploadId)) throw new Error('invalid upload id');
        return join(this.stagingDir, uploadId);
    }

    stagingPath(uploadId: string, name: string): string {
        if (!STAGING_NAME.test(name)) throw new Error('invalid staging name');
        return join(this.uploadDir(uploadId), name);
    }

    openStaging(uploadId: string): void {
        mkdirSync(this.uploadDir(uploadId), { recursive: true });
    }

    removeStaging(uploadId: string): void {
        rmSync(this.uploadDir(uploadId), { recursive: true, force: true });
    }
}
