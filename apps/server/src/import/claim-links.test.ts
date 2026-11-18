import { afterEach, describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { account } from '../db/schema';
import {
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signIn,
} from '../testing/route-harness';
import { addUser } from '../testing/studysets';
import { csvCell, runClaimLinks } from './claim-links';

let h: RouteHarness | undefined;
afterEach(() => {
    h?.close();
    h = undefined;
});

function run(argv: string[], env: Record<string, string> = {}) {
    const out: string[] = [];
    const err: string[] = [];
    const code = runClaimLinks(argv, env, process.cwd(), {
        out: { log: (l) => out.push(l), error: (l) => err.push(l) },
    });
    return { code, out, err: err.join('\n') };
}

describe('csvCell', () => {
    test.each([
        ['plain', 'plain'],
        ['a,b', '"a,b"'],
        ['say "hi"', '"say ""hi"""'],
        ['line\nbreak', '"line\nbreak"'],
        ['=SUM(A1)', "'=SUM(A1)"],
        ['+1', "'+1"],
        ['-1', "'-1"],
        ['@cmd', "'@cmd"],
        ['\tx', "'\tx"],
    ])('%j', (value, expected) => {
        expect(csvCell(value)).toBe(expected);
    });
});

test('a claim link sets a password and signs the user in', async () => {
    h = await createRouteHarness();
    addUser(h.db, 'imported');
    const r = run([
        '--csv',
        '--data-dir',
        h.dataDir,
        '--public-url',
        'http://localhost',
    ]);
    expect(r.code).toBe(0);
    expect(r.out[0]).toBe('email,name,username,link,expires_at');
    // The harness admin has a password; only the imported user gets a link.
    expect(r.out).toHaveLength(2);
    const row = r.out[1] ?? '';
    expect(row.startsWith('imported@example.com,')).toBe(true);
    const token = new URL(row.split(',')[3] ?? '').searchParams.get('token');
    expect(r.err).toContain('secrets');

    const reset = await apiRequest(h, '/api/auth/reset-password', {
        body: { token, newPassword: 'claimed-password-1' },
    });
    expect(reset.status).toBe(200);
    await signIn(h, 'imported@example.com', 'claimed-password-1');
    expect(
        h.db
            .select()
            .from(account)
            .where(
                and(
                    eq(account.userId, 'imported'),
                    eq(account.providerId, 'credential')
                )
            )
            .all()
    ).toHaveLength(1);

    const reuse = await apiRequest(h, '/api/auth/reset-password', {
        body: { token, newPassword: 'again-password-2' },
    });
    expect(reuse.status).toBe(400);
});

test('plain output is email<TAB>link and uses the stored public URL', async () => {
    h = await createRouteHarness();
    addUser(h.db, 'imported');
    const r = run(['--data-dir', h.dataDir], {
        QZ_PUBLIC_URL: 'https://quiz.example.org',
    });
    expect(r.code).toBe(0);
    expect(r.out).toEqual([
        expect.stringMatching(
            /^imported@example\.com\thttps:\/\/quiz\.example\.org\/reset-password\?token=/
        ),
    ]);
});

test.each([['0'], ['31'], ['x']])('--days %s is refused', async (days) => {
    h = await createRouteHarness();
    expect(
        run([
            '--days',
            days,
            '--data-dir',
            h.dataDir,
            '--public-url',
            'http://localhost',
        ]).code
    ).toBe(1);
});

test('no public URL is refused', async () => {
    h = await createRouteHarness();
    const r = run(['--data-dir', h.dataDir]);
    expect(r.code).toBe(1);
    expect(r.err).toContain('No public URL');
});
