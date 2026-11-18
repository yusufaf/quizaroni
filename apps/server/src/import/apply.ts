import { constants, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Db } from '../db';
import { account, studyset, user, userProfile } from '../db/schema';
import type { FileStore } from '../files/store';
import type { ImportPlan } from './plan';

/**
 * Copies the planned files (when `files` is given) and inserts every row in one
 * transaction. A dry run passes no FileStore and an in-memory DB.
 */
export function applyImport(
    db: Db,
    files: FileStore | undefined,
    plan: ImportPlan
): void {
    const targets = new Set<string>();
    for (const copy of plan.copies) {
        if (targets.has(copy.to)) {
            throw new Error(`Two files would be copied to ${copy.to}`);
        }
        targets.add(copy.to);
    }

    const placed: string[] = [];
    try {
        if (files) {
            for (const copy of plan.copies) {
                const to = files.pathOf(copy.to);
                if (!to) throw new Error(`Unsafe file key ${copy.to}`);
                mkdirSync(dirname(to), { recursive: true });
                copyFileSync(copy.from, to, constants.COPYFILE_EXCL);
                placed.push(to);
            }
        }
        db.transaction(
            (tx) => {
                for (const u of plan.users) {
                    tx.insert(user).values(u.user).run();
                    tx.insert(userProfile).values(u.profile).run();
                    for (const a of u.accounts)
                        tx.insert(account).values(a).run();
                }
                for (const s of plan.studysets)
                    tx.insert(studyset).values(s).run();
            },
            { behavior: 'immediate' }
        );
    } catch (err) {
        for (const path of placed) rmSync(path, { force: true });
        throw err;
    }
}
