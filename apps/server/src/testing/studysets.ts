import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { closeDatabase, type Db, openDatabase } from '../db';
import { studyset, user, userProfile } from '../db/schema';
import type { StudysetWrite } from '../studysets/updates';
import type { JsonObject } from '../users/metadata';
import { apiRequest, type CallOptions, type RouteHarness } from './route-harness';

// Test helpers only, shared by the study set store and route tests.

export const T0 = new Date('2026-11-01T10:00:00.000Z');
export const T1 = new Date('2026-11-02T10:00:00.000Z');
export const T2 = new Date('2026-11-03T10:00:00.000Z');
export const SET_ID = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
export const OTHER_ID = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';

export function openTestDb(): { db: Db; close(): void } {
    const root = mkdtempSync(join(tmpdir(), 'qz-studysets-'));
    const opened = openDatabase(root);
    return {
        db: opened.db,
        close() {
            closeDatabase(opened.sqlite);
            rmSync(root, { recursive: true, force: true });
        },
    };
}

export function addUser(db: Db, id: string, username?: string): string {
    db.insert(user)
        .values({
            id,
            name: id,
            email: `${id}@example.com`,
            createdAt: T0,
            updatedAt: T0,
        })
        .run();
    if (username !== undefined) {
        db.insert(userProfile)
            .values({
                userId: id,
                username,
                metadata: {},
                labels: [],
                updatedAt: T0,
            })
            .run();
    }
    return id;
}

export const write = (
    fields: StudysetWrite['fields'] = {},
    metadata: StudysetWrite['metadata'] = {}
): StudysetWrite => ({ fields, metadata });

export const fileCard = (key: string, extra: JsonObject = {}): JsonObject => ({
    term: 't',
    files: [{ key }],
    ...extra,
});

export function rowOf(db: Db, id: string) {
    return db
        .select()
        .from(studyset)
        .where(eq(studyset.studysetUUID, id))
        .get();
}

export type StudysetJson = {
    studysetUUID: string;
    userUUID: string;
    username: string | null;
    title: string;
    description: string;
    favorited: boolean;
    cards: Record<string, unknown>[];
    categories: string[];
    labels: string[];
    metadata: Record<string, unknown>;
    lastViewed: string;
    createdAt: string;
    updatedAt: string;
    subject?: string;
    publishedAt?: string;
    copiedFrom?: { studysetUUID: string };
};

export const studysetPost = (
    h: RouteHarness,
    path: string,
    o: CallOptions = {}
) => apiRequest(h, `/api/studysets${path}`, o);

export async function okJson<T>(res: Promise<Response>): Promise<T> {
    const r = await res;
    if (r.status !== 200) {
        throw new Error(`expected 200, got ${r.status}: ${await r.text()}`);
    }
    return (await r.json()) as T;
}

export async function createSet(
    h: RouteHarness,
    cookie: string,
    body: unknown = {}
): Promise<StudysetJson> {
    return (
        await okJson<{ studyset: StudysetJson }>(
            studysetPost(h, '/create-studyset', { cookie, body })
        )
    ).studyset;
}

export async function getSet(
    h: RouteHarness,
    cookie: string,
    studysetUUID: string
): Promise<StudysetJson> {
    return (
        await okJson<{ studyset: StudysetJson }>(
            studysetPost(h, '/get-studyset', {
                cookie,
                body: { studysetUUID },
            })
        )
    ).studyset;
}

export async function listSets(
    h: RouteHarness,
    cookie: string
): Promise<StudysetJson[]> {
    return (
        await okJson<{ studysets: StudysetJson[] }>(
            studysetPost(h, '/get-all-studysets', { cookie })
        )
    ).studysets;
}
