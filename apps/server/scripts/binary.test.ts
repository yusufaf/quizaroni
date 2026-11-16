// End-to-end test of a built standalone binary, run alone in a fresh folder:
//   QZ_BINARY=dist/quizaroni-windows-x64.exe bun test scripts/binary.test.ts
// Imports nothing from node_modules, so the same file can run against any target.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    realpathSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import {
    readJournal,
    readMigrationsFolder,
    toMigrationMeta,
} from '../src/db/migrations';
import { appDataDir, PORTABLE_DATA_DIRNAME } from '../src/launcher';

const BINARY = process.env.QZ_BINARY
    ? resolve(process.cwd(), process.env.QZ_BINARY)
    : '';
const MIGRATIONS = resolve(import.meta.dir, '../drizzle');
const LISTENING = /listening on (http:\/\/\S+) \(public URL (\S+)\)/;
const QZ_VARS = [
    'QZ_PORT',
    'QZ_DATA_DIR',
    'QZ_HOST',
    'QZ_PUBLIC_URL',
    'QZ_WEB_DIR',
    'QZ_ADMIN_EMAIL',
    'QZ_ADMIN_PASSWORD',
    'QZ_REGISTRATION_MODE',
    'QZ_TEACHER_POLICY',
    'QZ_TRUST_PROXY',
    'QZ_INSECURE_COOKIES',
    'QZ_AI_CHAT',
    'QZ_OPEN_BROWSER',
    'QZ_SMTP_HOST',
    'QZ_SMTP_PORT',
    'QZ_SMTP_SECURITY',
    'QZ_SMTP_USER',
    'QZ_SMTP_PASSWORD',
    'QZ_SMTP_FROM',
];

let tmp: string;
let binDir: string;
let binary: string;
let cwd: string;
let home: string;
let env: Record<string, string | undefined>;

function migrationRows(dbFile: string): number {
    const db = new Database(dbFile, { readonly: true });
    try {
        return (
            db
                .query('SELECT count(*) AS n FROM __drizzle_migrations')
                .get() as {
                n: number;
            }
        ).n;
    } finally {
        db.close();
    }
}

function hasTable(dbFile: string, name: string): boolean {
    const db = new Database(dbFile, { readonly: true });
    try {
        return (
            db
                .query(
                    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
                )
                .get(name) !== null
        );
    } finally {
        db.close();
    }
}

// What drizzle's migrator writes, so the binary sees a DB an older release made.
function seedOldDb(dbFile: string, count: number): void {
    const db = new Database(dbFile, { create: true });
    try {
        db.run(
            'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)'
        );
        const migrations = readMigrationsFolder(MIGRATIONS).slice(0, count);
        for (const meta of toMigrationMeta(migrations)) {
            for (const statement of meta.sql) {
                if (statement.trim()) db.run(statement);
            }
            db.run(
                'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)',
                [meta.hash, meta.folderMillis]
            );
        }
    } finally {
        db.close();
    }
}

function run(args: string[], extraEnv: Record<string, string> = {}) {
    const proc = Bun.spawn([binary, '--port', '0', ...args], {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...env, ...extraEnv },
    });
    const decoder = new TextDecoder();
    let output = '';
    const read = async (stream: ReadableStream<Uint8Array>) => {
        for await (const chunk of stream) {
            output += decoder.decode(chunk, { stream: true });
        }
    };
    const done = Promise.all([read(proc.stdout), read(proc.stderr)]);
    return {
        output: () => output,
        async waitFor(pattern: RegExp, ms = 20_000) {
            const deadline = Date.now() + ms;
            for (;;) {
                const match = output.match(pattern);
                if (match) return match;
                if (Date.now() > deadline || proc.exitCode !== null) {
                    throw new Error(
                        `no output matching ${pattern} within ${ms} ms:\n${output}`
                    );
                }
                await Bun.sleep(25);
            }
        },
        async stop() {
            proc.kill();
            await proc.exited;
            await done;
            return output;
        },
    };
}

describe.skipIf(!BINARY)('standalone binary', () => {
    beforeAll(() => {
        // The binary reports its real path, so expand 8.3 short names and symlinks.
        tmp = realpathSync.native(mkdtempSync(join(tmpdir(), 'qz-binary-')));
        binDir = join(tmp, 'bin dir with spaces');
        cwd = join(tmp, 'cwd');
        home = join(tmp, 'app data');
        mkdirSync(binDir);
        mkdirSync(cwd);
        mkdirSync(home);
        binary = join(binDir, basename(BINARY));
        copyFileSync(BINARY, binary);
        env = { ...process.env };
        delete env.BUN_BE_BUN;
        for (const name of QZ_VARS) env[name] = '';
        Object.assign(env, {
            HOME: home,
            USERPROFILE: home,
            LOCALAPPDATA: join(home, 'AppData', 'Local'),
            XDG_DATA_HOME: join(home, '.local', 'share'),
            SSH_CONNECTION: '',
            SSH_TTY: '',
        });
    });

    afterAll(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    test('starts alone, uses the app-data dir and serves the app', async () => {
        const dataDir = appDataDir(process.platform, env, home);
        const server = run(['--open-browser', 'false'], {
            QZ_ADMIN_EMAIL: 'admin@example.com',
            QZ_ADMIN_PASSWORD: 'correct-horse-1',
        });
        try {
            const [, url] = await server.waitFor(LISTENING);
            expect(server.output()).toContain(`Data directory: ${dataDir}`);

            const health = await fetch(`${url}/api/health`);
            expect(health.status).toBe(200);
            expect(((await health.json()) as { status: string }).status).toBe(
                'ok'
            );

            const page = await fetch(`${url}/`);
            expect(page.status).toBe(200);
            expect(page.headers.get('content-type')).toContain('text/html');
            const script = (await page.text()).match(
                /src="(\/assets\/[^"]+\.js)"/
            )?.[1];
            expect(script).toBeDefined();
            const asset = await fetch(`${url}${script}`);
            expect(asset.status).toBe(200);
            expect(asset.headers.get('content-type')).toContain('javascript');
            expect(asset.headers.get('cache-control')).toContain('immutable');

            expect((await fetch(`${url}/manifest.json`)).status).toBe(200);
        } finally {
            await server.stop();
        }
        expect(migrationRows(join(dataDir, 'quizaroni.db'))).toBe(
            readJournal(MIGRATIONS).length
        );
        expect(readdirSync(binDir)).toEqual([basename(binary)]);
        expect(readdirSync(cwd)).toEqual([]);
    }, 60_000);

    test('upgrades an existing DB', async () => {
        const dataDir = join(tmp, 'old db dir');
        mkdirSync(dataDir);
        const dbFile = join(dataDir, 'quizaroni.db');
        seedOldDb(dbFile, 3);
        expect(migrationRows(dbFile)).toBe(3);
        const server = run(['--open-browser', 'false', '--data-dir', dataDir]);
        try {
            await server.waitFor(LISTENING);
        } finally {
            await server.stop();
        }
        expect(migrationRows(dbFile)).toBe(readJournal(MIGRATIONS).length);
        expect(hasTable(dbFile, 'registration_invite')).toBe(true);
    }, 60_000);

    test('prefers a quizaroni-data folder next to the binary', async () => {
        const portable = join(binDir, PORTABLE_DATA_DIRNAME);
        mkdirSync(portable);
        try {
            const server = run(['--open-browser', 'false']);
            try {
                await server.waitFor(LISTENING);
                expect(server.output()).toContain(
                    `Data directory: ${portable}`
                );
            } finally {
                await server.stop();
            }
        } finally {
            rmSync(portable, { recursive: true, force: true });
        }
    }, 60_000);

    test.skipIf(process.platform === 'win32')(
        'tries to open a browser by default',
        async () => {
            const emptyPath = join(tmp, 'empty path dir');
            mkdirSync(emptyPath, { recursive: true });
            // No xdg-open or open on PATH, so the launch fails without opening anything.
            const server = run([], { DISPLAY: ':0', PATH: emptyPath });
            try {
                await server.waitFor(/Could not open a browser/);
            } finally {
                await server.stop();
            }
        },
        60_000
    );
});
