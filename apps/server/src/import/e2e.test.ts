import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    apiGet,
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signIn,
} from '../testing/route-harness';
import { okJson, studysetPost } from '../testing/studysets';
import { applyImport } from './apply';
import { readDynamoExports } from './dynamodb';
import { readLogtoUsers } from './logto';
import { planImport } from './plan';
import { makeProbe } from './s3';
import {
    logtoArgon2i,
    PNG_BYTES,
    writeDynamoExport,
    writeLogtoUsers,
    writeS3,
} from './testing';

// Acceptance (#268): a migrated user signs in with the old password, and sets,
// labels, files and public/featured/hidden state match the source.

const LISTED = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const HIDDEN = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const FILE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const T = '2026-01-01T00:00:00.000Z';
const CARDS = Array.from({ length: 4 }, (_, i) => ({
    cardUUID: `c${i}`,
    term: `term ${i}`,
    definition: `definition ${i}`,
    files:
        i === 0
            ? [
                  {
                      key: `${LISTED}/user/photo.png`,
                      signedURL: 'https://s3/x?X-Amz-Credential=AKIA',
                  },
              ]
            : [],
}));

let h: RouteHarness | undefined;
let root: string | undefined;
afterEach(() => {
    h?.close();
    h = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

test('an imported instance behaves like the hosted one', async () => {
    root = mkdtempSync(join(tmpdir(), 'qz-import-e2e-'));
    writeLogtoUsers(join(root, 'logto.jsonl'), [
        {
            id: 'ann',
            primary_email: 'ann@x.com',
            username: 'ann',
            password_encrypted: await logtoArgon2i('old-password-1'),
            password_encryption_method: 'Argon2i',
        },
    ]);
    const dynamo = join(root, 'dynamo');
    writeDynamoExport(dynamo, 'quizaroni-prod-users', [
        {
            PK: 'user#ann',
            SK: 'userData',
            labels: ['bio', 'chem'],
            metadata: {
                defaultTheme: 'light',
                avatar: {
                    type: 'upload',
                    value: 'https://b.s3.amazonaws.com/profile-pictures/ann/1.png?X-Amz-Signature=x',
                },
            },
        },
    ]);
    const base = {
        PK: 'userUUID#ann',
        title: 'Cells',
        createdAt: T,
        updatedAt: T,
        cards: CARDS,
    };
    writeDynamoExport(dynamo, 'quizaroni-prod-main', [
        {
            ...base,
            SK: `studyset#${LISTED}`,
            SK2: `studyset#${LISTED}`,
            studysetUUID: LISTED,
            labels: ['bio'],
            metadata: { publiclyViewable: true },
            subject: 'science',
            publishedAt: T,
            featuredAt: T,
        },
        {
            ...base,
            SK: `studyset#${HIDDEN}`,
            SK2: `studyset#${HIDDEN}`,
            studysetUUID: HIDDEN,
            title: 'Taken down',
            cards: [],
            metadata: { publiclyViewable: true },
            publishedAt: T,
            moderation: { hiddenAt: T, reason: 'spam' },
        },
    ]);
    const s3 = join(root, 's3');
    writeS3(s3, `${LISTED}/user/photo.png`, PNG_BYTES);
    writeS3(s3, 'profile-pictures/ann/1.png', PNG_BYTES);
    writeS3(s3, `${LISTED}/${FILE}`, PNG_BYTES);

    h = await createRouteHarness();
    const plan = planImport(
        {
            logto: readLogtoUsers(join(root, 'logto.jsonl')).users,
            dynamo: readDynamoExports(dynamo),
        },
        { probe: makeProbe(s3) }
    );
    applyImport(h.db, h.files, plan);

    const cookie = await signIn(h, 'ann@x.com', 'old-password-1');

    const { studysets } = await okJson<{
        studysets: {
            studysetUUID: string;
            labels: string[];
            cards: { files: { key: string; signedURL: string }[] }[];
        }[];
    }>(studysetPost(h, '/get-all-studysets', { cookie }));
    const listed = studysets.find((s) => s.studysetUUID === LISTED);
    expect(studysets).toHaveLength(2);
    expect(listed?.labels).toEqual(['bio']);
    expect(listed?.cards).toHaveLength(4);
    const file = listed?.cards[0]?.files[0];
    expect(file?.signedURL).toMatch(new RegExp(`^/api/files/${LISTED}/`));
    expect(file?.signedURL).not.toContain('AKIA');

    const bytes = await apiGet(h, file?.signedURL ?? '', { cookie });
    expect(bytes.status).toBe(200);
    expect(new Uint8Array(await bytes.arrayBuffer())).toEqual(PNG_BYTES);

    const feed = async (query = '') =>
        (
            await okJson<{ items: { studysetUUID: string }[] }>(
                apiGet(h as RouteHarness, `/api/public/explore${query}`)
            )
        ).items.map((i) => i.studysetUUID);
    expect(await feed()).toEqual([LISTED]);
    expect(await feed('?featured=1')).toEqual([LISTED]);
    expect((await apiGet(h, `/api/public/studyset/${HIDDEN}`)).status).toBe(
        404
    );

    const me = await okJson<{
        user: {
            labels: string[];
            metadata: { avatar?: { value: string }; defaultTheme: string };
        };
    }>(apiRequest(h, '/api/users/get-user', { cookie }));
    expect(me.user.labels).toEqual(['bio', 'chem']);
    expect(me.user.metadata.defaultTheme).toBe('light');
    const avatar = me.user.metadata.avatar?.value ?? '';
    expect(avatar).toMatch(/^\/api\/files\/avatars\/ann\//);
    expect((await apiGet(h, avatar, { cookie })).status).toBe(200);
});
