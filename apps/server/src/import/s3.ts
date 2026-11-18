import { closeSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { SNIFF_BYTES } from '../files/sniff';
import { isUnsafeS3Key } from './keys';
import type { Probe } from './plan';

/** The local path of an S3 key inside an `aws s3 sync` folder, if it stays inside. */
export function syncPath(root: string, key: string): string | undefined {
    if (isUnsafeS3Key(key)) return undefined;
    const parts = key.split('/');
    const base = resolve(root);
    const full = resolve(base, ...parts);
    return full.startsWith(base + sep) ? full : undefined;
}

export function makeProbe(root: string): Probe {
    return (key) => {
        const path = syncPath(root, key);
        if (!path) return undefined;
        let size: number;
        try {
            const st = statSync(path);
            if (!st.isFile()) return undefined;
            size = st.size;
        } catch {
            return undefined;
        }
        const head = new Uint8Array(Math.min(SNIFF_BYTES, size));
        const fd = openSync(path, 'r');
        try {
            readSync(fd, head, 0, head.length, 0);
        } finally {
            closeSync(fd);
        }
        return { path, size, head };
    };
}

export function listSyncKeys(root: string): string[] {
    const base = resolve(root);
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile())
                out.push(relative(base, full).split(sep).join('/'));
        }
    };
    walk(base);
    return out;
}
