import { afterEach, describe, expect, test } from 'bun:test';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count } from 'drizzle-orm';
import { closeDatabase, openDatabase, openExistingDatabase } from '../db';
import { account, studyset, user } from '../db/schema';
import { FileStore } from '../files/store';
import { holdDataDirLock } from '../testing/hold-lock';
import { applyImport } from './apply';
import { runImport } from './cli';
import { readDynamoExports } from './dynamodb';
import { readLogtoUsers } from './logto';
import { type ImportPlan, planImport } from './plan';
import { makeProbe } from './s3';
import {
    PNG_BYTES,
    type LogtoRow,
    writeDynamoExport,
    writeLogtoUsers,
    writeS3,
} from './testing';

const SET = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const FILE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const T = '2026-01-01T00:00:00.000Z';
const ARGON2I = '$argon2i$v=19$m=8192,t=8,p=1$c2FsdA$aGFzaA';

let root: string | undefined;
afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

type Fixture = { argv: string[]; dataDir: string; root: string };

function fixture(
    o: {
        users?: LogtoRow[];
        sets?: Record<string, unknown>[];
        files?: Record<string, Uint8Array>;
    } = {}
): Fixture {
    root = mkdtempSync(join(tmpdir(), 'qz-import-'));
    const users = o.users ?? [
        {
            id: 'ann',
            primary_email: 'ann@x.com',
            username: 'ann',
            password_encrypted: ARGON2I,
            password_encryption_method: 'Argon2i',
        },
        { id: 'bob', primary_email: 'bob@x.com' },
    ];
    writeLogtoUsers(join(root, 'logto.jsonl'), users);
    const dynamo = join(root, 'dynamo');
    writeDynamoExport(
        dynamo,
        'quizaroni-prod-users',
        users.map((u) => ({ PK: `user#${u.id}`, SK: 'userData', labels: ['bio'] }))
    );
    writeDynamoExport(
        dynamo,
        'quizaroni-prod-main',
        o.sets ?? [
            {
                PK: 'userUUID#ann',
                SK: `studyset#${SET}`,
                studysetUUID: SET,
                title: 'Cells',
                createdAt: T,
                updatedAt: T,
                labels: ['bio'],
                cards: [
                    { cardUUID: 'c1', term: 't', definition: 'd', files: [{ key: `${SET}/${FILE}` }] },
                    { cardUUID: 'c2', term: 't', definition: 'd', files: [{ key: `${SET}/${FILE}` }] },
                ],
            },
        ]
    );
    const s3 = join(root, 's3');
    mkdirSync(s3, { recursive: true });
    for (const [key, bytes] of Object.entries(
        o.files ?? { [`${SET}/${FILE}`]: PNG_BYTES }
    )) {
        writeS3(s3, key, bytes);
    }
    const dataDir = join(root, 'data');
    return {
        root,
        dataDir,
        argv: [
            '--logto-users',
            join(root, 'logto.jsonl'),
            '--dynamodb',
            dynamo,
            '--s3',
            s3,
            '--data-dir',
            dataDir,
        ],
    };
}

async function run(argv: string[]) {
    const lines = { out: [] as string[], err: [] as string[] };
    const code = await runImport(argv, {}, tmpdir(), {
        out: {
            log: (l) => lines.out.push(l),
            error: (l) => lines.err.push(l),
        },
    });
    return { code, out: lines.out.join('\n'), err: lines.err.join('\n') };
}

function rows(dataDir: string) {
    const { sqlite, db } = openExistingDatabase(dataDir);
    try {
        return {
            users: db.select().from(user).all(),
            accounts: db.select().from(account).all(),
            sets: db.select().from(studyset).all(),
        };
    } finally {
        closeDatabase(sqlite);
    }
}

describe('real run', () => {
    test('imports rows and files into a fresh data dir', async () => {
        const f = fixture();
        const r = await run([...f.argv, '--admin', 'ann@x.com']);
        expect(r.err).toBe('');
        expect(r.code).toBe(0);
        const db = rows(f.dataDir);
        expect(db.users.map((u) => [u.id, u.role]).sort()).toEqual([
            ['ann', 'admin'],
            ['bob', 'user'],
        ]);
        expect(db.accounts.map((a) => [a.userId, a.password])).toEqual([
            ['ann', ARGON2I],
        ]);
        expect(db.sets.map((s) => s.studysetUUID)).toEqual([SET]);
        // Two cards share one file: one copy on disk.
        expect(readdirSync(join(f.dataDir, 'files', SET))).toEqual([FILE]);
        expect(r.out).toContain('Imported 2 users and 1 sets');
        expect(r.out).toContain('1 accounts have no password');
        expect(r.out).not.toContain('No admin was imported');
    });

    test('says how to finish setup when no admin is imported', async () => {
        const f = fixture();
        const r = await run(f.argv);
        expect(r.code).toBe(0);
        expect(r.out).toContain('No admin was imported');
    });

    test('refuses a data dir that already has users', async () => {
        const f = fixture();
        const { sqlite } = openDatabase(f.dataDir);
        sqlite.run(
            "INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at) VALUES ('x', 'X', 'x@x.com', 1, 'admin', 0, 0)"
        );
        closeDatabase(sqlite);
        const r = await run(f.argv);
        expect(r.code).toBe(1);
        expect(r.err).toContain('already has users');
    });

    test('refuses a data dir with files', async () => {
        const f = fixture();
        mkdirSync(join(f.dataDir, 'files'), { recursive: true });
        writeFileSync(join(f.dataDir, 'files', 'x'), 'x');
        const r = await run(f.argv);
        expect(r.code).toBe(1);
        expect(r.err).toContain('delete');
    });

    test('refuses while another process holds the data dir', async () => {
        const f = fixture();
        const holder = await holdDataDirLock(f.dataDir);
        try {
            const r = await run(f.argv);
            expect(r.code).toBe(1);
            expect(r.err).toContain('is running on');
        } finally {
            await holder.stop();
        }
    }, 20_000);

    test('applyImport removes the files it copied when the insert fails', async () => {
        const f = fixture();
        const plan = planFor(f);
        const dataDir = join(f.root, 'data2');
        const { sqlite, db } = openDatabase(dataDir);
        try {
            const files = new FileStore(dataDir);
            const broken: ImportPlan = {
                ...plan,
                studysets: [...plan.studysets, ...plan.studysets],
            };
            expect(() => applyImport(db, files, broken)).toThrow();
            expect(existsSync(join(dataDir, 'files', SET, FILE))).toBe(false);
            expect(db.select({ n: count() }).from(user).get()?.n).toBe(0);
        } finally {
            closeDatabase(sqlite);
        }
    });

    test('a failed real run removes files/ so the rerun succeeds', async () => {
        const f = fixture({
            sets: [
                {
                    PK: 'userUUID#ann',
                    SK: `studyset#${SET}`,
                    studysetUUID: SET,
                    title: 'Cells',
                    createdAt: T,
                    cards: [{ files: [{ key: `${SET}/${FILE}` }] }],
                },
            ],
        });
        // Inject a failure inside the insert transaction, after the copies.
        const { sqlite } = openDatabase(f.dataDir);
        sqlite.run(
            "CREATE TRIGGER fail_import BEFORE INSERT ON studyset BEGIN SELECT RAISE(ABORT, 'injected failure'); END"
        );
        closeDatabase(sqlite);
        const first = await run(f.argv);
        expect(first.code).toBe(1);
        expect(first.err).toContain('injected failure');
        expect(existsSync(join(f.dataDir, 'files'))).toBe(false);
        const { sqlite: s, db } = openDatabase(f.dataDir);
        expect(db.select({ n: count() }).from(user).get()?.n).toBe(0);
        s.run('DROP TRIGGER fail_import');
        closeDatabase(s);

        const second = await run(f.argv);
        expect(second.code).toBe(0);
        expect(rows(f.dataDir).sets).toHaveLength(1);
    });
});

function planFor(f: Fixture): ImportPlan {
    return planImport(
        {
            logto: readLogtoUsers(join(f.root, 'logto.jsonl')).users,
            dynamo: readDynamoExports(join(f.root, 'dynamo')),
        },
        { probe: makeProbe(join(f.root, 's3')) }
    );
}

describe('dry run', () => {
    test('reports counts and leaves the data dir alone', async () => {
        const f = fixture();
        const r = await run([...f.argv, '--dry-run']);
        expect(r.code).toBe(0);
        expect(r.out).toContain('imported_users: 2');
        expect(r.out).toContain('Dry run: nothing was imported');
        expect(existsSync(f.dataDir)).toBe(false);
    });

    test('a count mismatch in the export fails', async () => {
        const f = fixture();
        const summary = readdirSync(join(f.root, 'dynamo', 'AWSDynamoDB'));
        const dir = join(f.root, 'dynamo', 'AWSDynamoDB', summary[0] ?? '');
        writeFileSync(
            join(dir, 'manifest-summary.json'),
            JSON.stringify({
                tableArn: `arn:aws:dynamodb:us-west-2:0:table/${summary[0]?.replace(/-export$/, '')}`,
                itemCount: 99,
                outputFormat: 'DYNAMODB_JSON',
            })
        );
        const r = await run([...f.argv, '--dry-run']);
        expect(r.code).toBe(1);
        expect(r.err).toContain('item count');
    });

    test('a plan with a duplicate copy target fails the dry run', () => {
        const plan: ImportPlan = {
            users: [],
            studysets: [],
            copies: [
                { from: '/a', to: `${SET}/${FILE}` },
                { from: '/b', to: `${SET}/${FILE}` },
            ],
            report: { counts: {}, anomalies: [] },
        };
        const { sqlite, db } = openDatabase(mkdtempSync(join(tmpdir(), 'qz-dup-')));
        try {
            expect(() => applyImport(db, undefined, plan)).toThrow(/Two files/);
        } finally {
            closeDatabase(sqlite);
        }
    });
});

test('an unwritable --report fails before the data dir is touched', async () => {
    const f = fixture();
    const r = await run([...f.argv, '--report', join(f.root, 'no', 'such', 'dir', 'r.json')]);
    expect(r.code).toBe(1);
    expect(r.err).toContain('Could not write the report');
    expect(existsSync(f.dataDir)).toBe(false);
});

test('a refused run does not overwrite an earlier report', async () => {
    const f = fixture();
    const report = join(f.root, 'report.json');
    expect((await run([...f.argv, '--report', report])).code).toBe(0);
    writeFileSync(report, 'earlier');
    const again = await run([...f.argv, '--report', report]);
    expect(again.code).toBe(1);
    expect(readFileSync(report, 'utf8')).toBe('earlier');
});

test('missing inputs are a usage error', async () => {
    const r = await run(['--dry-run']);
    expect(r.code).toBe(1);
    expect(r.err).toContain('are all required');
});
