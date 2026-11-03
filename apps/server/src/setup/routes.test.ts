import { afterEach, describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { count, eq } from 'drizzle-orm';
import { createApp } from '../app';
import { closeDatabase, type Db, openDatabase } from '../db';
import { user } from '../db/schema';
import { getSetting, SETTING } from '../settings';
import { en, es } from './messages';
import { SetupGate } from './setup';

const SHELL = '<!doctype html><title>shell</title>';
const TOKEN = 'test-setup-token';

type Harness = {
    app: ReturnType<typeof createApp>;
    db: Db;
    completions: () => number;
};

let root: string | undefined;
let sqlite: Database | undefined;

function harness(configuredPublicUrl?: string): Harness {
    root = mkdtempSync(join(tmpdir(), 'qz-setup-routes-'));
    const webDir = join(root, 'web');
    mkdirSync(join(webDir, 'assets'), { recursive: true });
    writeFileSync(join(webDir, 'index.html'), SHELL);
    writeFileSync(join(webDir, 'assets', 'app-abc123.js'), 'console.log(1);');
    const opened = openDatabase(join(root, 'data'));
    sqlite = opened.sqlite;
    let completions = 0;
    const setup = new SetupGate(opened.db, TOKEN, () => completions++);
    const app = createApp({
        sqlite: opened.sqlite,
        db: opened.db,
        webDir,
        version: '0.0.0-test',
        setup,
        configuredPublicUrl,
    });
    return { app, db: opened.db, completions: () => completions };
}

afterEach(() => {
    if (sqlite) closeDatabase(sqlite);
    sqlite = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

const FULL = {
    token: TOKEN,
    publicUrl: 'https://quiz.example.org/',
    registrationMode: 'open',
    teacherPolicy: 'self_declared',
    name: 'Ada Admin',
    email: 'Ada@Example.com',
    password: 'correct-horse-1',
    confirmPassword: 'correct-horse-1',
    step: 'admin',
    action: 'next',
};

function post(
    app: Harness['app'],
    fields: Record<string, string>,
    headers: Record<string, string> = {}
): Promise<Response> {
    return Promise.resolve(
        app.request('/setup', {
            method: 'POST',
            body: new URLSearchParams(fields),
            headers,
        })
    );
}

function admins(db: Db): number {
    return db
        .select({ n: count() })
        .from(user)
        .where(eq(user.role, 'admin'))
        .get()!.n;
}

type Input = {
    type: string;
    id: string | null;
    name: string | null;
    value: string | null;
    checked: boolean;
    ariaInvalid: string | null;
    describedBy: string | null;
    inFieldsetWithLegend: boolean;
};

type Collected = {
    inputs: Input[];
    labelFors: string[];
    ariaCurrent: number;
    alerts: number;
    errorIds: string[];
};

async function collect(html: string): Promise<Collected> {
    const out: Collected = {
        inputs: [],
        labelFors: [],
        ariaCurrent: 0,
        alerts: 0,
        errorIds: [],
    };
    const fieldsets: { legend: boolean; inputs: Input[] }[] = [];
    await new HTMLRewriter()
        .on('fieldset', {
            element(el) {
                const frame = { legend: false, inputs: [] as Input[] };
                fieldsets.push(frame);
                el.onEndTag(() => {
                    fieldsets.pop();
                    for (const input of frame.inputs) {
                        input.inFieldsetWithLegend = frame.legend;
                    }
                });
            },
        })
        .on('legend', {
            element() {
                const frame = fieldsets.at(-1);
                if (frame) frame.legend = true;
            },
        })
        .on('input', {
            element(el) {
                const input: Input = {
                    type: el.getAttribute('type') ?? 'text',
                    id: el.getAttribute('id'),
                    name: el.getAttribute('name'),
                    value: el.getAttribute('value'),
                    checked: el.hasAttribute('checked'),
                    ariaInvalid: el.getAttribute('aria-invalid'),
                    describedBy: el.getAttribute('aria-describedby'),
                    inFieldsetWithLegend: false,
                };
                out.inputs.push(input);
                fieldsets.at(-1)?.inputs.push(input);
            },
        })
        .on('label', {
            element(el) {
                const f = el.getAttribute('for');
                if (f) out.labelFors.push(f);
            },
        })
        .on('[aria-current="step"]', {
            element() {
                out.ariaCurrent++;
            },
        })
        .on('[role="alert"]', {
            element() {
                out.alerts++;
            },
        })
        .on('[id$="-error"]', {
            element(el) {
                out.errorIds.push(el.getAttribute('id')!);
            },
        })
        .transform(new Response(html))
        .text();
    return out;
}

function expectAccessible(c: Collected): void {
    for (const input of c.inputs.filter((i) => i.type !== 'hidden')) {
        expect(input.id).not.toBeNull();
        expect(c.labelFors).toContain(input.id!);
        if (input.type === 'radio') expect(input.inFieldsetWithLegend).toBe(true);
        if (input.type === 'password') expect(input.value).toBeNull();
    }
    expect(c.ariaCurrent).toBe(1);
}

function hidden(c: Collected, name: string): string | null | undefined {
    return c.inputs.find((i) => i.type === 'hidden' && i.name === name)?.value;
}

function visible(c: Collected, name: string): Input | undefined {
    return c.inputs.find((i) => i.type !== 'hidden' && i.name === name);
}

function checkedValues(c: Collected): (string | null)[] {
    return c.inputs.filter((i) => i.type === 'radio' && i.checked).map((i) => i.value);
}

describe('setup guard on a fresh instance', () => {
    test.each([['/'], ['/explore'], ['/assets/app-abc123.js'], ['/setup/']])(
        'GET %s redirects to /setup',
        async (path) => {
            const { app } = harness();
            const res = await app.request(path);
            expect(res.status).toBe(302);
            expect(res.headers.get('location')).toBe('/setup');
            expect(res.headers.get('cache-control')).toBe('no-store');
        }
    );

    test('POST to an app route redirects to /setup', async () => {
        const { app } = harness();
        const res = await app.request('/explore', { method: 'POST' });
        expect(res.status).toBe(302);
        expect(res.headers.get('location')).toBe('/setup');
    });

    test('GET /api/health still answers', async () => {
        const { app } = harness();
        expect((await app.request('/api/health')).status).toBe(200);
    });

    test.each([['GET'], ['POST']])(
        '%s on another API route returns 503 JSON',
        async (method) => {
            const { app } = harness();
            const res = await app.request('/api/nope', { method });
            expect(res.status).toBe(503);
            expect(await res.json()).toEqual({
                message: 'Setup required',
                setupUrl: '/setup',
            });
        }
    );
});

describe('GET /setup', () => {
    test('renders the token step with security headers', async () => {
        const { app } = harness();
        const res = await app.request('/setup');
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(res.headers.get('referrer-policy')).toBe('no-referrer');
        expect(res.headers.get('x-frame-options')).toBe('DENY');
        expect(res.headers.get('content-security-policy')).toContain(
            "default-src 'none'"
        );
        const body = await res.text();
        expect(body.startsWith('<!doctype html>')).toBe(true);
        expect(body).toContain('name="viewport"');
        expect(body).toContain('<html lang="en">');
        expect(body).toContain(en.pageTitle);
        expectAccessible(await collect(body));
    });

    test('follows Accept-Language and lets ?lang override it', async () => {
        const { app } = harness();
        const spanish = await app.request('/setup', {
            headers: { 'accept-language': 'es-MX,es;q=0.9' },
        });
        const body = await spanish.text();
        expect(body).toContain('<html lang="es">');
        expect(body).toContain(es.pageTitle);
        const forced = await app.request('/setup?lang=es', {
            headers: { 'accept-language': 'en' },
        });
        expect(forced.status).toBe(200);
        expect(await forced.text()).toContain('<html lang="es">');
    });
});

describe('POST /setup without the token', () => {
    test('refuses a full valid submission with no token', async () => {
        const { app, db } = harness();
        const { token: _omit, ...noToken } = FULL;
        const res = await post(app, noToken);
        expect(res.status).toBe(403);
        expect(admins(db)).toBe(0);
        expect((await app.request('/explore')).status).toBe(302);
    });

    test('refuses a wrong token and clears it from the form', async () => {
        const { app, db } = harness();
        const res = await post(app, { ...FULL, token: 'wrong' });
        expect(res.status).toBe(403);
        expect(admins(db)).toBe(0);
        const c = await collect(await res.text());
        expect(c.alerts).toBe(1);
        expect(visible(c, 'token')?.value ?? '').toBe('');
    });
});

describe('step navigation', () => {
    test('a valid token moves on with the instance defaults prefilled', async () => {
        const { app } = harness();
        const res = await post(app, { token: TOKEN, step: 'token', action: 'next' });
        expect(res.status).toBe(200);
        const c = await collect(await res.text());
        expectAccessible(c);
        expect(hidden(c, 'token')).toBe(TOKEN);
        expect(visible(c, 'publicUrl')?.value).toBe('http://localhost');
        expect(checkedValues(c).sort()).toEqual(['admin_approved', 'invite_only']);
    });

    test('prefills the configured public URL instead', async () => {
        const { app } = harness('https://quiz.example.org');
        const res = await post(app, { token: TOKEN, step: 'token', action: 'next' });
        const c = await collect(await res.text());
        expect(visible(c, 'publicUrl')?.value).toBe('https://quiz.example.org');
    });

    test('the instance step moves on to the admin step', async () => {
        const { app } = harness();
        const res = await post(app, {
            token: TOKEN,
            publicUrl: 'https://quiz.example.org',
            registrationMode: 'open',
            teacherPolicy: 'self_declared',
            step: 'instance',
            action: 'next',
        });
        expect(res.status).toBe(200);
        const c = await collect(await res.text());
        expectAccessible(c);
        expect(visible(c, 'email')).toBeDefined();
        expect(hidden(c, 'registrationMode')).toBe('open');
    });

    test('back from the admin step keeps every value but the passwords', async () => {
        const { app } = harness();
        const res = await post(app, { ...FULL, action: 'back' });
        expect(res.status).toBe(200);
        const c = await collect(await res.text());
        expect(visible(c, 'publicUrl')?.value).toBe(FULL.publicUrl);
        expect(checkedValues(c).sort()).toEqual(['open', 'self_declared']);
        expect(hidden(c, 'name')).toBe(FULL.name);
        expect(hidden(c, 'email')).toBe(FULL.email);
        expect(hidden(c, 'password')).toBeUndefined();
        expect(hidden(c, 'confirmPassword')).toBeUndefined();
    });

    test('edits survive going back to the token step and forward again', async () => {
        const { app } = harness();
        const back = await post(app, {
            token: TOKEN,
            publicUrl: 'https://edited.example',
            registrationMode: 'open',
            teacherPolicy: 'admin_approved',
            step: 'instance',
            action: 'back',
        });
        const tokenStep = await collect(await back.text());
        expect(hidden(tokenStep, 'publicUrl')).toBe('https://edited.example');
        const fields: Record<string, string> = { action: 'next' };
        for (const input of tokenStep.inputs) {
            if (!input.name || (input.type === 'radio' && !input.checked)) {
                continue;
            }
            fields[input.name] = input.value ?? '';
        }
        const forward = await post(app, fields);
        const c = await collect(await forward.text());
        expect(visible(c, 'publicUrl')?.value).toBe('https://edited.example');
        expect(checkedValues(c).sort()).toEqual(['admin_approved', 'open']);
    });
});

describe('validation', () => {
    test('a bad public URL stays on the instance step', async () => {
        const { app } = harness();
        const res = await post(app, {
            token: TOKEN,
            publicUrl: 'https://quiz.example.org/sub',
            registrationMode: 'open',
            teacherPolicy: 'self_declared',
            step: 'instance',
            action: 'next',
        });
        expect(res.status).toBe(400);
        const c = await collect(await res.text());
        expect(visible(c, 'publicUrl')?.ariaInvalid).toBe('true');
    });

    test('a password mismatch is reported accessibly on the admin step', async () => {
        const { app, db } = harness();
        const res = await post(app, { ...FULL, confirmPassword: 'something-else' });
        expect(res.status).toBe(400);
        expect(admins(db)).toBe(0);
        const c = await collect(await res.text());
        expectAccessible(c);
        expect(c.alerts).toBe(1);
        const confirm = visible(c, 'confirmPassword')!;
        expect(confirm.ariaInvalid).toBe('true');
        expect(confirm.describedBy?.split(' ')).toContain(`${confirm.id}-error`);
        expect(c.errorIds).toContain(`${confirm.id}-error`);
    });

    test('a tampered hidden registration mode creates no admin', async () => {
        const { app, db } = harness();
        const res = await post(app, { ...FULL, registrationMode: 'everyone' });
        expect(res.status).toBe(400);
        expect(admins(db)).toBe(0);
    });
});

describe('finishing setup', () => {
    test('creates the admin, stores the settings and opens the app', async () => {
        const { app, db, completions } = harness();
        const res = await post(app, FULL);
        expect(res.status).toBe(200);
        expect(await res.text()).toContain(en.doneTitle);
        expect(admins(db)).toBe(1);
        expect(db.select().from(user).get()?.email).toBe('ada@example.com');
        expect(getSetting(db, SETTING.registrationMode)).toBe('open');
        expect(getSetting(db, SETTING.teacherPolicy)).toBe('self_declared');
        expect(getSetting(db, SETTING.publicUrl)).toBe('https://quiz.example.org');
        expect(completions()).toBe(1);

        const shell = await app.request('/explore');
        expect(shell.status).toBe(200);
        expect(await shell.text()).toBe(SHELL);
        const again = await app.request('/setup');
        expect(again.status).toBe(302);
        expect(again.headers.get('location')).toBe('/');
        expect((await post(app, FULL)).status).toBe(409);
        expect(admins(db)).toBe(1);
    });

    test('two concurrent submissions create exactly one admin', async () => {
        const { app, db } = harness();
        const results = await Promise.all([
            post(app, FULL),
            post(app, { ...FULL, email: 'other@example.com' }),
        ]);
        expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
        expect(admins(db)).toBe(1);
    });
});

describe('request limits', () => {
    test('rejects a body over 16 KB', async () => {
        const { app } = harness();
        const res = await post(app, { ...FULL, name: 'x'.repeat(17 * 1024) });
        expect(res.status).toBe(413);
    });

    test('rejects a JSON body', async () => {
        const { app } = harness();
        const res = await app.request('/setup', {
            method: 'POST',
            body: JSON.stringify(FULL),
            headers: { 'content-type': 'application/json' },
        });
        expect(res.status).toBe(415);
    });

    test('accepts form content types with parameters', async () => {
        const { app } = harness();
        const fields = { token: TOKEN, step: 'token', action: 'next' };
        const urlencoded = await post(app, fields, {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        });
        expect(urlencoded.status).toBe(200);
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) form.set(k, v);
        const multipart = await app.request('/setup', {
            method: 'POST',
            body: form,
        });
        expect(multipart.status).toBe(200);
    });
});
