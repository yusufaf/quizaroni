import { afterEach, expect, test } from 'bun:test';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import pkg from '../package.json';
import { LOCK_FILENAME } from './data-dir-lock';
import { closeDatabase, DB_FILENAME, openDatabase } from './db';
import { studyset } from './db/schema';
import { createStudyset } from './studysets/store';
import { addUser } from './testing/studysets';
import { SETUP_TOKEN_FILENAME } from './setup/setup';

const ENTRY = resolve(import.meta.dir, 'index.ts');
const SHELL = '<!doctype html><title>shell</title>';
const DB_FILES = [DB_FILENAME, `${DB_FILENAME}-wal`, `${DB_FILENAME}-shm`];
// files/ holds uploads; tmp/ holds parts being uploaded.
const DATA_FILES = [
    ...DB_FILES,
    SETUP_TOKEN_FILENAME,
    LOCK_FILENAME,
    'files',
    'tmp',
];
const CLEAN_ENV = {
    ...process.env,
    QZ_PORT: '',
    QZ_DATA_DIR: '',
    QZ_HOST: '',
    QZ_PUBLIC_URL: '',
    QZ_WEB_DIR: '',
    QZ_ADMIN_EMAIL: '',
    QZ_ADMIN_PASSWORD: '',
    QZ_REGISTRATION_MODE: '',
    QZ_TEACHER_POLICY: '',
    QZ_TRUST_PROXY: '',
    QZ_INSECURE_COOKIES: '',
    QZ_AI_CHAT: '',
    QZ_OPEN_BROWSER: '',
    QZ_SMTP_HOST: '',
    QZ_SMTP_PORT: '',
    QZ_SMTP_SECURITY: '',
    QZ_SMTP_USER: '',
    QZ_SMTP_PASSWORD: '',
    QZ_SMTP_FROM: '',
};
const LISTENING = /listening on (http:\/\/\S+) \(public URL (\S+)\)/;

let root: string | undefined;

afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

type Captured = {
    text(): string;
    waitFor(pattern: RegExp, ms?: number): Promise<RegExpMatchArray>;
    done: Promise<string>;
};

// Reads the whole stream in the background. Breaking out of a for-await loop
// would cancel the stream and lose everything printed afterwards.
function capture(stream: ReadableStream<Uint8Array>): Captured {
    const decoder = new TextDecoder();
    let output = '';
    const done = (async () => {
        for await (const chunk of stream) {
            output += decoder.decode(chunk, { stream: true });
        }
        return output;
    })();
    return {
        text: () => output,
        done,
        async waitFor(pattern, ms = 10_000) {
            const deadline = Date.now() + ms;
            for (;;) {
                const match = output.match(pattern);
                if (match) return match;
                if (Date.now() > deadline) {
                    throw new Error(
                        `no output matching ${pattern} within ${ms} ms:\n${output}`
                    );
                }
                await Bun.sleep(25);
            }
        },
    };
}

type Layout = { cwd: string; dataDir: string; webDir: string };

function layout(): Layout {
    root = mkdtempSync(join(tmpdir(), 'qz-e2e-'));
    const dirs = {
        cwd: join(root, 'cwd'),
        dataDir: join(root, 'data'),
        webDir: join(root, 'web'),
    };
    mkdirSync(dirs.cwd);
    mkdirSync(dirs.webDir);
    writeFileSync(join(dirs.webDir, 'index.html'), SHELL);
    return dirs;
}

function start(dirs: Layout, env: Record<string, string> = {}) {
    // process.execPath, not 'bun': on Windows 'bun' can resolve to a .cmd shim, and
    // kill() would then stop the shim and orphan the real server.
    const proc = Bun.spawn(
        [
            process.execPath,
            ENTRY,
            '--port',
            '0',
            '--data-dir',
            dirs.dataDir,
            '--web-dir',
            dirs.webDir,
        ],
        {
            cwd: dirs.cwd,
            stdout: 'pipe',
            stderr: 'pipe',
            env: { ...CLEAN_ENV, ...env },
        }
    );
    const out = capture(proc.stdout);
    const err = capture(proc.stderr);
    const stop = async () => {
        proc.kill();
        await proc.exited;
        return { stdout: await out.done, stderr: await err.done };
    };
    return { proc, out, err, stop };
}

function expectDataDirClean(dirs: Layout): void {
    expect(readdirSync(dirs.cwd)).toEqual([]);
    for (const file of readdirSync(dirs.dataDir)) {
        expect(DATA_FILES).toContain(file);
    }
}

test('a fresh instance requires the setup token, then serves the app', async () => {
    const dirs = layout();
    const server = start(dirs);
    try {
        const [, url, publicUrl] = await server.out.waitFor(LISTENING);
        const boundPort = new URL(url!).port;
        expect(boundPort).not.toBe('0');
        expect(publicUrl).toBe(`http://localhost:${boundPort}`);

        const [, token] = await server.out.waitFor(/setup token: (\S+)/);
        const tokenFile = join(dirs.dataDir, SETUP_TOKEN_FILENAME);
        expect(readFileSync(tokenFile, 'utf8').trim()).toBe(token!);

        const health = await fetch(`${url}/api/health`);
        expect(health.status).toBe(200);
        expect(await health.json()).toEqual({
            status: 'ok',
            version: pkg.version,
        });

        const before = await fetch(`${url}/explore`, { redirect: 'manual' });
        expect(before.status).toBe(302);
        expect(before.headers.get('location')).toBe('/setup');

        const done = await fetch(`${url}/setup`, {
            method: 'POST',
            body: new URLSearchParams({
                token: token!,
                publicUrl: 'https://quiz.example.org',
                registrationMode: 'invite_only',
                teacherPolicy: 'admin_approved',
                name: 'Ada Admin',
                email: 'ada@example.com',
                password: 'correct-horse-1',
                confirmPassword: 'correct-horse-1',
                step: 'admin',
                action: 'next',
            }),
        });
        expect(done.status).toBe(200);

        const page = await fetch(`${url}/explore`);
        expect(page.status).toBe(200);
        expect(await page.text()).toBe(SHELL);
        expect(existsSync(tokenFile)).toBe(false);
    } finally {
        await server.stop();
    }
    expectDataDirClean(dirs);
}, 30_000);

test('accepts a data dir with spaces and does not open a browser', async () => {
    const dirs = layout();
    dirs.dataDir = join(root!, 'data dir with spaces');
    const server = start(dirs);
    let output: { stdout: string; stderr: string };
    try {
        const [, url] = await server.out.waitFor(LISTENING);
        await server.out.waitFor(/setup token: /);
        expect(server.out.text()).toContain(`Data directory: ${dirs.dataDir}`);
        expect(existsSync(join(dirs.dataDir, DB_FILENAME))).toBe(true);
        expect((await fetch(`${url}/api/health`)).status).toBe(200);
    } finally {
        output = await server.stop();
    }
    expect(output.stdout).not.toContain('Opening');
    expectDataDirClean(dirs);
}, 30_000);

test('headless setup from QZ_ADMIN_* never shows the wizard', async () => {
    const dirs = layout();
    const password = 'correct-horse-1';
    const first = start(dirs, {
        QZ_ADMIN_EMAIL: 'admin@example.com',
        QZ_ADMIN_PASSWORD: password,
    });
    let firstOutput: { stdout: string; stderr: string };
    try {
        const [, url] = await first.out.waitFor(LISTENING);
        expect(first.out.text()).toContain('Created instance admin');
        const page = await fetch(`${url}/explore`);
        expect(page.status).toBe(200);
        expect(await page.text()).toBe(SHELL);
        const setup = await fetch(`${url}/setup`, { redirect: 'manual' });
        expect(setup.status).toBe(302);
        expect(setup.headers.get('location')).toBe('/');
        expect(existsSync(join(dirs.dataDir, SETUP_TOKEN_FILENAME))).toBe(
            false
        );
    } finally {
        firstOutput = await first.stop();
    }
    expect(firstOutput.stdout).not.toContain('setup token');

    // Operators often drop the password from the env after the first boot.
    const second = start(dirs, { QZ_ADMIN_EMAIL: 'admin@example.com' });
    let secondOutput: { stdout: string; stderr: string };
    try {
        const [, url] = await second.out.waitFor(LISTENING);
        expect(second.out.text()).toContain('already complete');
        expect((await fetch(`${url}/explore`)).status).toBe(200);
    } finally {
        secondOutput = await second.stop();
    }

    for (const output of [firstOutput, secondOutput]) {
        expect(output.stdout).not.toContain(password);
        expect(output.stderr).not.toContain(password);
    }
    expectDataDirClean(dirs);
}, 30_000);

test('the headless admin signs in and out, and cross-origin sign-in is refused', async () => {
    const dirs = layout();
    const password = 'correct-horse-1';
    const server = start(dirs, {
        QZ_ADMIN_EMAIL: 'admin@example.com',
        QZ_ADMIN_PASSWORD: password,
        BETTER_AUTH_TRUSTED_ORIGINS: 'https://evil.example',
    });
    let output: { stdout: string; stderr: string };
    try {
        const [, url, publicUrl] = await server.out.waitFor(LISTENING);
        const json = (origin: string, cookie?: string) => ({
            Origin: origin,
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
        });
        const credentials = JSON.stringify({
            email: 'admin@example.com',
            password,
        });

        const signIn = await fetch(`${url}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: json(publicUrl!),
            body: credentials,
        });
        expect(signIn.status).toBe(200);
        const cookie = signIn.headers
            .getSetCookie()
            .map((c) => c.split(';')[0])
            .join('; ');
        expect(cookie).toContain('quizaroni.session_token=');

        const getSession = async () => {
            const res = await fetch(`${url}/api/auth/get-session`, {
                headers: { Cookie: cookie },
            });
            expect(res.status).toBe(200);
            return (await res.json()) as { user: { email: string } } | null;
        };
        expect((await getSession())?.user.email).toBe('admin@example.com');

        const getUser = await fetch(`${url}/api/users/get-user`, {
            method: 'POST',
            headers: json(publicUrl!, cookie),
            body: '{}',
        });
        expect(getUser.status).toBe(200);
        expect(
            ((await getUser.json()) as { user: { email: string } }).user
        ).toMatchObject({ email: 'admin@example.com', username: null });

        const created = await fetch(`${url}/api/studysets/create-studyset`, {
            method: 'POST',
            headers: json(publicUrl!, cookie),
            body: '{}',
        });
        expect(created.status).toBe(200);
        const { studyset } = (await created.json()) as {
            studyset: { studysetUUID: string };
        };
        const listed = await fetch(`${url}/api/studysets/get-all-studysets`, {
            method: 'POST',
            headers: json(publicUrl!, cookie),
            body: '{}',
        });
        expect(listed.status).toBe(200);
        expect(
            ((await listed.json()) as { studysets: { studysetUUID: string }[] })
                .studysets.map((s) => s.studysetUUID)
        ).toEqual([studyset.studysetUUID]);

        const signOut = await fetch(`${url}/api/auth/sign-out`, {
            method: 'POST',
            headers: json(publicUrl!, cookie),
            body: '{}',
        });
        expect(signOut.status).toBe(200);
        expect(await getSession()).toBeNull();

        const crossOrigin = await fetch(`${url}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: json('https://evil.example'),
            body: credentials,
        });
        expect(crossOrigin.status).toBe(403);
    } finally {
        output = await server.stop();
    }
    expect(output.stderr).toContain('Ignoring BETTER_AUTH_TRUSTED_ORIGINS');
    expect(output.stderr).toContain('QZ_INSECURE_COOKIES=true');
    expect(output.stdout).not.toContain(password);
    expect(output.stderr).not.toContain(password);
    expectDataDirClean(dirs);
}, 30_000);

test('a second server on the same data dir exits 1', async () => {
    const dirs = layout();
    const first = start(dirs);
    try {
        await first.out.waitFor(LISTENING);
        const second = start(dirs);
        expect(await second.proc.exited).toBe(1);
        expect(await second.err.done).toContain(
            `Another Quizaroni server or import is using ${dirs.dataDir}`
        );
    } finally {
        await first.stop();
    }
}, 30_000);

test('exits with code 1 when only QZ_ADMIN_EMAIL is set on a fresh instance', async () => {
    const dirs = layout();
    const server = start(dirs, { QZ_ADMIN_EMAIL: 'admin@example.com' });
    expect(await server.proc.exited).toBe(1);
    expect(await server.err.done).toContain('must be set together');
}, 20_000);

test('exits with code 1 and names the flag on invalid config', async () => {
    root = mkdtempSync(join(tmpdir(), 'qz-e2e-'));
    const proc = Bun.spawn([process.execPath, ENTRY, '--port', 'abc'], {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
        env: CLEAN_ENV,
    });
    expect(await proc.exited).toBe(1);
    expect(await new Response(proc.stderr).text()).toContain('--port');
    expect(readdirSync(root)).toEqual([]);
}, 20_000);

async function runCli(args: string[], cwd: string) {
    const proc = Bun.spawn([process.execPath, ENTRY, ...args], {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: CLEAN_ENV,
    });
    const [code, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
    ]);
    return { code, stdout, stderr };
}

test('moderation commands change Explore on a running server', async () => {
    const dirs = layout();
    const server = start(dirs, {
        QZ_ADMIN_EMAIL: 'admin@example.com',
        QZ_ADMIN_PASSWORD: 'correct-horse-1',
    });
    try {
        const [, url] = await server.out.waitFor(LISTENING);
        const opened = openDatabase(dirs.dataDir);
        let id: string;
        try {
            const owner = addUser(opened.db, 'owner');
            const created = createStudyset(opened.db, owner, {});
            if (created.status !== 'ok') throw new Error(created.status);
            id = created.studyset.studysetUUID;
            opened.db
                .update(studyset)
                .set({
                    title: 'Cells',
                    isPublic: true,
                    publishedAt: new Date(),
                    subject: 'science',
                })
                .where(eq(studyset.studysetUUID, id))
                .run();
        } finally {
            closeDatabase(opened.sqlite);
        }
        const ids = async (query = '') =>
            (
                (await (
                    await fetch(`${url}/api/public/explore${query}`)
                ).json()) as { items: { studysetUUID: string }[] }
            ).items.map((i) => i.studysetUUID);

        const feature = await runCli(
            ['feature', id, '--data-dir', dirs.dataDir],
            dirs.cwd
        );
        expect(feature.code).toBe(0);
        expect(feature.stdout).toContain('Featured');
        expect(await ids('?featured=1')).toContain(id);

        const hide = await runCli(
            ['hide', id, '--data-dir', dirs.dataDir],
            dirs.cwd
        );
        expect(hide.code).toBe(0);
        expect(await ids()).not.toContain(id);
    } finally {
        await server.stop();
    }
}, 30_000);

test('help lists the moderation commands', async () => {
    root = mkdtempSync(join(tmpdir(), 'qz-e2e-'));
    const sub = await runCli(['hide', '--help'], root);
    expect(sub.code).toBe(0);
    expect(sub.stdout).toContain('Usage');
    expect(sub.stdout).toContain('--clear');
    const main = await runCli(['--help'], root);
    expect(main.code).toBe(0);
    expect(main.stdout).toContain('unpublish');
    expect(readdirSync(root)).toEqual([]);
}, 20_000);

const SMTP_USER = 'smtp-user-xyz';
// Built at runtime so secret scanners don't flag this fake test password.
const SMTP_PASSWORD = ['s3cret', 'PASS', 'xyz'].join('-');

async function closedPort(): Promise<number> {
    const server = createServer();
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const address = server.address();
    if (address === null || typeof address === 'string')
        throw new Error('no port');
    await new Promise<void>((done) => server.close(() => done()));
    return address.port;
}

function expectNoSmtpCredentials(output: { stdout: string; stderr: string }) {
    for (const text of [output.stdout, output.stderr]) {
        expect(text).not.toContain(SMTP_USER);
        expect(text).not.toContain(SMTP_PASSWORD);
    }
}

test('says email goes to the outbox when SMTP is not set', async () => {
    const dirs = layout();
    const server = start(dirs);
    try {
        await server.out.waitFor(/Email: SMTP is not configured/);
    } finally {
        await server.stop();
    }
}, 20_000);

test('with SMTP set, names the server and logs a failed check without credentials', async () => {
    const dirs = layout();
    const port = await closedPort();
    const server = start(dirs, {
        QZ_ADMIN_EMAIL: 'admin@example.com',
        QZ_ADMIN_PASSWORD: 'correct-horse-1',
        QZ_SMTP_HOST: '127.0.0.1',
        QZ_SMTP_PORT: String(port),
        QZ_SMTP_SECURITY: 'none',
        QZ_SMTP_USER: SMTP_USER,
        QZ_SMTP_PASSWORD: SMTP_PASSWORD,
        QZ_SMTP_FROM: 'qz@example.org',
    });
    let output: { stdout: string; stderr: string };
    try {
        await server.out.waitFor(
            new RegExp(
                `Email: sending through SMTP at 127\\.0\\.0\\.1:${port} \\(none\\)`
            )
        );
        await server.err.waitFor(/SMTP check failed \(\w+\)/, 15_000);
    } finally {
        output = await server.stop();
    }
    expectNoSmtpCredentials(output);
}, 30_000);

test('exits with code 1 when QZ_SMTP_USER has no password, without echoing it', async () => {
    const dirs = layout();
    const server = start(dirs, {
        QZ_SMTP_HOST: '127.0.0.1',
        QZ_SMTP_FROM: 'qz@example.org',
        QZ_SMTP_USER: SMTP_USER,
    });
    expect(await server.proc.exited).toBe(1);
    const stderr = await server.err.done;
    expect(stderr).toContain(
        'QZ_SMTP_USER and QZ_SMTP_PASSWORD must be set together'
    );
    expectNoSmtpCredentials({ stdout: await server.out.done, stderr });
}, 20_000);

test('exits with code 1 on a URL-style QZ_SMTP_HOST, without echoing it', async () => {
    const dirs = layout();
    const server = start(dirs, {
        QZ_SMTP_HOST: `smtp://${SMTP_USER}:${SMTP_PASSWORD}@mail.example`,
        QZ_SMTP_FROM: 'qz@example.org',
    });
    expect(await server.proc.exited).toBe(1);
    const stderr = await server.err.done;
    expect(stderr).toContain('QZ_SMTP_HOST must be a hostname or IP address');
    expectNoSmtpCredentials({ stdout: await server.out.done, stderr });
}, 20_000);
