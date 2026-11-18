import { describe, expect, test } from 'bun:test';
import type { DynamoItem } from './dynamodb';
import { ImportInputError } from './errors';
import { type LogtoUser, LogtoUserSchema } from './logto';
import { mapPublishState, planImport, type Probe } from './plan';
import { logtoRow, type LogtoRow, PNG_BYTES } from './testing';

const SET = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const OTHER = '7d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const FILE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const T = '2026-01-01T00:00:00.000Z';
const ARGON2I = '$argon2i$v=19$m=8192,t=8,p=1$c2FsdA$aGFzaA';

const logto = (row: LogtoRow): LogtoUser =>
    LogtoUserSchema.parse(
        logtoRow({ primary_email: `${row.id}@x.com`, ...row })
    );
const dynamoUser = (id: string, extra: DynamoItem = {}): DynamoItem => ({
    PK: `user#${id}`,
    SK: 'userData',
    ...extra,
});
const set = (owner: string, id = SET, extra: DynamoItem = {}): DynamoItem => ({
    PK: `userUUID#${owner}`,
    SK: `studyset#${id}`,
    studysetUUID: id,
    title: 'Cells',
    createdAt: T,
    updatedAt: T,
    ...extra,
});

function probeOf(files: Record<string, Uint8Array>): Probe {
    return (key) => {
        const bytes = files[key];
        return bytes
            ? { path: `/s3/${key}`, size: bytes.length, head: bytes.slice(0, 16) }
            : undefined;
    };
}

let counter = 0;
function plan(
    users: LogtoUser[],
    o: {
        dynamoUsers?: DynamoItem[];
        main?: DynamoItem[];
        files?: Record<string, Uint8Array>;
        admin?: string;
    } = {}
) {
    counter = 0;
    return planImport(
        {
            logto: users,
            dynamo: {
                users: o.dynamoUsers ?? users.map((u) => dynamoUser(u.id)),
                main: o.main ?? [],
            },
        },
        {
            probe: probeOf(o.files ?? {}),
            admin: o.admin,
            newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
        }
    );
}

const kinds = (p: ReturnType<typeof plan>) =>
    p.report.anomalies.map((a) => a.kind);

describe('users', () => {
    test('imports only users with a Quizaroni row and keeps their id', () => {
        const p = plan([logto({ id: 'a' }), logto({ id: 'nba' })], {
            dynamoUsers: [dynamoUser('a', { labels: ['x', 'x', 'y'] })],
        });
        expect(p.users.map((u) => u.user.id)).toEqual(['a']);
        expect(p.users[0]?.profile.labels).toEqual(['x', 'y']);
        expect(p.report.counts.logto_only_users).toBe(1);
    });

    test.each<[string, LogtoRow]>([
        ['suspended_user', { id: 'a', is_suspended: true }],
        ['no_email', { id: 'a', primary_email: null }],
        ['invalid_email', { id: 'a', primary_email: 'not-an-email' }],
        ['invalid_user_id', { id: 'a/b' }],
    ])('skips %s and reports its sets', (kind, row) => {
        const p = plan([logto(row)], { main: [set(row.id)] });
        expect(p.users).toEqual([]);
        expect(p.report.anomalies).toContainEqual({
            kind,
            id: row.id,
            detail: '1 sets',
        });
        expect(p.report.counts.skipped_user_set).toBe(1);
        expect(p.studysets).toEqual([]);
    });

    test('a duplicate email skips every user in the group', () => {
        const p = plan(
            [
                logto({ id: 'a', primary_email: 'A@x.com' }),
                logto({ id: 'b', primary_email: 'a@x.com' }),
            ],
            { main: [set('a'), set('b', OTHER)] }
        );
        expect(p.users).toEqual([]);
        const dup = p.report.anomalies.filter((a) => a.kind === 'duplicate_email');
        expect(dup.map((a) => a.id).sort()).toEqual(['a', 'b']);
        expect(dup.find((a) => a.id === 'a')?.detail).toContain('same email as b');
        expect(p.report.counts.skipped_user_set).toBe(2);
    });

    test('a NOCASE duplicate username is dropped from the later user', () => {
        const p = plan([
            logto({ id: 'a', username: 'Ann', created_at: '2026-01-01T00:00:00Z' }),
            logto({ id: 'b', username: 'ann', created_at: '2026-01-02T00:00:00Z' }),
        ]);
        expect(p.users.map((u) => u.profile.username)).toEqual(['Ann', null]);
        expect(kinds(p)).toContain('duplicate_username');
    });

    test('credentials, social accounts and MFA', () => {
        const p = plan([
            logto({
                id: 'a',
                password_encrypted: ARGON2I,
                password_encryption_method: 'Argon2i',
                identities: { google: { userId: 'g1' } },
                mfa_verifications: [{}],
            }),
            logto({ id: 'b' }),
        ]);
        const a = p.users.find((u) => u.user.id === 'a');
        expect(a?.accounts.map((x) => [x.providerId, x.accountId, x.password ?? null])).toEqual([
            ['credential', 'a', ARGON2I],
            ['google', 'g1', null],
        ]);
        expect(p.report.counts['credentials.argon2i']).toBe(1);
        expect(p.report.counts['no_credential.no_password']).toBe(1);
        expect(p.report.counts.mfa_dropped).toBe(1);
    });

    test('--admin promotes one user; an unknown admin is an input error', () => {
        const p = plan([logto({ id: 'a' }), logto({ id: 'b' })], { admin: 'B@x.com' });
        expect(p.users.map((u) => [u.user.id, u.user.role])).toEqual([
            ['a', 'user'],
            ['b', 'admin'],
        ]);
        expect(() => plan([logto({ id: 'a' })], { admin: 'z@x.com' })).toThrow(
            ImportInputError
        );
    });

    test('metadata deeper than the limit falls back to the defaults', () => {
        let deep: DynamoItem = {};
        for (let i = 0; i < 20; i++) deep = { d: deep };
        const p = plan([logto({ id: 'a' })], {
            dynamoUsers: [dynamoUser('a', { metadata: deep })],
        });
        expect(p.users[0]?.profile.metadata).toMatchObject({ defaultTheme: 'dark' });
        expect(kinds(p)).toContain('bad_user_metadata');
    });

    describe('avatars', () => {
        const url = (key: string) =>
            `https://bucket.s3.amazonaws.com/${key}?X-Amz-Signature=x`;
        const withAvatar = (value: unknown, files: Record<string, Uint8Array>) =>
            plan([logto({ id: 'a' })], {
                dynamoUsers: [dynamoUser('a', { metadata: { avatar: value } })],
                files,
            });

        test('an uploaded avatar is copied under the user', () => {
            const p = withAvatar(
                { type: 'upload', value: url('profile-pictures/a/1.png') },
                { 'profile-pictures/a/1.png': PNG_BYTES }
            );
            const avatar = p.users[0]?.profile.metadata as { avatar: { value: string } };
            expect(avatar.avatar.value).toMatch(/^\/api\/files\/avatars\/a\//);
            expect(p.copies).toEqual([
                { from: '/s3/profile-pictures/a/1.png', to: expect.stringMatching(/^avatars\/a\//) },
            ]);
        });

        test.each([
            ['a file that is not an image', 'profile-pictures/a/1.png', new Uint8Array([1, 2, 3])],
            ["another user's key", 'profile-pictures/b/1.png', PNG_BYTES],
        ])('drops %s', (_name, key, bytes) => {
            const p = withAvatar({ type: 'upload', value: url(key) }, { [key]: bytes });
            expect((p.users[0]?.profile.metadata as JsonLike).avatar).toBeUndefined();
            expect(kinds(p)).toContain('avatar_dropped');
            expect(p.copies).toEqual([]);
        });

        test('a preset avatar is kept', () => {
            const value = { type: 'dicebear', value: 'data:image/svg+xml;base64,PHN2Zy8+' };
            const p = withAvatar(value, {});
            expect((p.users[0]?.profile.metadata as JsonLike).avatar).toEqual(value);
        });
    });
});

type JsonLike = Record<string, unknown>;

describe('mapPublishState', () => {
    const at = new Date(T);
    test.each([
        ['listed', { SK2: 'studyset#x', metadata: { publiclyViewable: true }, publishedAt: T }, { isPublic: true, hiddenAt: null }],
        ['unpublished', { metadata: { publiclyViewable: true }, publishedAt: T }, { isPublic: false }],
        ['hidden', { SK2: 'studyset#x', metadata: { publiclyViewable: true }, publishedAt: T, moderation: { hiddenAt: T } }, { isPublic: false, hiddenAt: at }],
    ])('%s', (_name, extra, expected) => {
        expect(mapPublishState({ SK: 'studyset#x', ...extra }, at)).toMatchObject(expected);
    });

    test('featured but not listed drops featuredAt', () => {
        const s = mapPublishState({ SK: 'studyset#x', featuredAt: T }, at);
        expect(s.featuredAt).toBeNull();
        expect(s.anomalies).toContain('featured_not_listed');
    });

    test('a listed set with no publishedAt uses updatedAt', () => {
        const s = mapPublishState(
            { SK: 'studyset#x', SK2: 'studyset#x', metadata: { publiclyViewable: true } },
            at
        );
        expect(s.publishedAt).toEqual(at);
        expect(s.anomalies).toContain('missing_published_at');
    });

    test('a featured listed set keeps featuredAt', () => {
        const s = mapPublishState(
            { SK: 'studyset#x', SK2: 'studyset#x', metadata: { publiclyViewable: true }, publishedAt: T, featuredAt: T },
            at
        );
        expect(s.featuredAt).toEqual(at);
    });
});

describe('sets', () => {
    test('orphan, invalid, duplicate and stub sets are skipped', () => {
        const p = plan([logto({ id: 'a' })], {
            main: [
                set('a'),
                set('a'),
                set('ghost', OTHER),
                set('a', 'not-a-uuid'),
                { PK: 'userUUID#a', SK: `studyset#${OTHER}` },
                { PK: 'userUUID#a', SK: `studyset#${OTHER}`, labels: ['x'] },
                { PK: 'userUUID#a', SK: 'userData' },
            ],
        });
        expect(p.studysets.map((s) => s.studysetUUID)).toEqual([SET]);
        expect(kinds(p).sort()).toEqual(
            [
                'duplicate_set',
                'invalid_set_id',
                'orphan_set',
                'stub_set',
                'stub_set_labeled',
                'unknown_item',
            ].sort()
        );
    });

    test.each([
        ['a null card', [null]],
        ['a string card', ['x']],
        ['a non-array files', [{ files: 'x' }]],
        ['a numeric key', [{ files: [{ key: 1 }] }]],
    ])('%s gives no cards', (_name, cards) => {
        const p = plan([logto({ id: 'a' })], { main: [set('a', SET, { cards })] });
        expect(p.studysets[0]?.cards).toEqual([]);
        expect(kinds(p)).toContain('bad_cards');
    });

    test('fields and listed state carry over', () => {
        const p = plan([logto({ id: 'a', username: 'ann' })], {
            main: [
                set('a', SET, {
                    SK2: `studyset#${SET}`,
                    metadata: { publiclyViewable: true, color: 'red' },
                    publishedAt: T,
                    featuredAt: T,
                    subject: 'science',
                    labels: ['bio'],
                    favorited: true,
                    saveCount: 3,
                    copiedFrom: { studysetUUID: OTHER },
                }),
            ],
        });
        expect(p.studysets[0]).toMatchObject({
            ownerId: 'a',
            username: 'ann',
            title: 'Cells',
            labels: ['bio'],
            favorited: true,
            isPublic: true,
            subject: 'science',
            saveCount: 3,
            copiedFrom: OTHER,
            metadata: { publiclyViewable: true, color: 'red' },
        });
        expect(p.studysets[0]?.featuredAt).toEqual(new Date(T));
        expect(p.report.counts.sets_listed).toBe(1);
        expect(p.report.counts.sets_featured).toBe(1);
    });

    describe('card files', () => {
        const withFiles = (cards: unknown[], files: Record<string, Uint8Array>) =>
            plan([logto({ id: 'a' })], { main: [set('a', SET, { cards })], files });
        const keys = (p: ReturnType<typeof plan>) =>
            (p.studysets[0]?.cards as { files: { key: string; signedURL: string }[] }[]).map(
                (c) => c.files[0]
            );

        test('an own key is kept and copied', () => {
            const own = `${SET}/${FILE}`;
            const p = withFiles([{ files: [{ key: own }] }], { [own]: PNG_BYTES });
            expect(keys(p)).toEqual([{ key: own, signedURL: `/api/files/${SET}/${FILE}` }]);
            expect(p.copies).toEqual([{ from: `/s3/${own}`, to: own }]);
        });

        test.each([
            ['legacy', `${SET}/user/photo.png`],
            ['foreign', `${OTHER}/${FILE}`],
        ])('a %s key is rekeyed under the set', (_name, oldKey) => {
            const p = withFiles([{ files: [{ key: oldKey }] }], { [oldKey]: PNG_BYTES });
            const [file] = keys(p);
            expect(file?.key.startsWith(`${SET}/`)).toBe(true);
            expect(file?.key).not.toBe(oldKey);
            expect(p.copies).toEqual([{ from: `/s3/${oldKey}`, to: file?.key ?? "" }]);
            expect(p.report.counts.files_rekeyed).toBe(1);
        });

        test('a missing file keeps its key with no URL', () => {
            const legacy = `${SET}/user/gone.png`;
            const p = withFiles([{ files: [{ key: legacy }] }], {});
            expect(keys(p)).toEqual([{ key: legacy, signedURL: '' }]);
            expect(p.copies).toEqual([]);
            expect(kinds(p)).toEqual(['missing_file']);
        });

        test('an unsafe key is never probed', () => {
            let probed = false;
            const p = planImport(
                {
                    logto: [logto({ id: 'a' })],
                    dynamo: {
                        users: [dynamoUser('a')],
                        main: [set('a', SET, { cards: [{ files: [{ key: `${SET}/../x` }] }] })],
                    },
                },
                {
                    probe: () => {
                        probed = true;
                        return undefined;
                    },
                }
            );
            expect(probed).toBe(false);
            expect(p.report.anomalies.map((a) => a.kind)).toEqual(['unsafe_file_key']);
        });

        test.each([
            ['own', `${SET}/${FILE}`],
            ['legacy', `${SET}/user/photo.png`],
        ])('two cards sharing one %s key give one copy', (_name, key) => {
            const p = withFiles(
                [{ files: [{ key }] }, { files: [{ key }] }],
                { [key]: PNG_BYTES }
            );
            const [a, b] = keys(p);
            expect(a).toEqual(b);
            expect(p.copies).toHaveLength(1);
        });

        test('two cards sharing a missing key give one anomaly', () => {
            const key = `${SET}/user/gone.png`;
            const p = withFiles([{ files: [{ key }] }, { files: [{ key }] }], {});
            expect(kinds(p)).toEqual(['missing_file']);
        });
    });
});
