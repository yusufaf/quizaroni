import { afterEach, describe, expect, test } from 'bun:test';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { ConfigDefaults } from '../config';
import { closeDatabase, DB_FILENAME, openDatabase } from '../db';
import { studyset } from '../db/schema';
import {
    apiGet,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
    okJson,
    studysetPost as post,
} from '../testing/studysets';
import {
    MODERATION_USAGE,
    type ModerationCommand,
    type Output,
    parseSetRef,
    printable,
    runModeration,
} from './cli';

const ID = '0b9f4c1e-8f3a-4d2b-9c7e-1a2b3c4d5e6f';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const CARDS = Array.from({ length: 4 }, (_, i) => ({
    cardUUID: `c${i}`,
    term: `term ${i}`,
    definition: `definition ${i}`,
}));

let root: string | undefined;
let harness: RouteHarness | undefined;

afterEach(() => {
    harness?.close();
    harness = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
});

function tempRoot(): string {
    root = mkdtempSync(join(tmpdir(), 'qz-moderation-'));
    return root;
}

function collect(): Output & { out: string[]; err: string[] } {
    const out: string[] = [];
    const err: string[] = [];
    return {
        out,
        err,
        log: (line) => out.push(line),
        error: (line) => err.push(line),
    };
}

function run(
    command: ModerationCommand,
    argv: string[],
    o: {
        env?: Record<string, string | undefined>;
        cwd?: string;
        defaults?: ConfigDefaults;
    } = {}
) {
    const out = collect();
    const code = runModeration(
        command,
        argv,
        o.env ?? {},
        o.cwd ?? tmpdir(),
        { out, defaults: o.defaults }
    );
    return { code, out: out.out.join('\n'), err: out.err.join('\n') };
}

describe('arguments', () => {
    test.each<[string, ModerationCommand, string[]]>([
        ['no id', 'feature', []],
        ['two ids', 'hide', [ID, ID]],
        ['a bad id', 'feature', ['not-an-id']],
        ['an unknown flag', 'feature', [ID, '--force']],
        ['unpublish --clear', 'unpublish', [ID, '--clear']],
        ['an empty --data-dir', 'feature', [ID, '--data-dir', '']],
    ])('%s is a usage error', (_name, command, argv) => {
        const r = run(command, argv);
        expect(r.code).toBe(1);
        expect(r.err).toContain(MODERATION_USAGE);
    });

    test('--help prints usage for all three commands', () => {
        const r = run('hide', ['--help']);
        expect(r.code).toBe(0);
        for (const word of ['feature', 'hide', 'unpublish', '--clear']) {
            expect(r.out).toContain(word);
        }
    });
});

test('parseSetRef', () => {
    expect(parseSetRef(ID)).toBe(ID);
    expect(parseSetRef(` ${ID} `)).toBe(ID);
    expect(parseSetRef(`https://q.example/view/${ID}`)).toBe(ID);
    expect(parseSetRef(`https://q.example/view/${ID}/`)).toBe(ID);
    expect(parseSetRef(ID.toUpperCase())).toBeUndefined();
    expect(parseSetRef('https://q.example/explore')).toBeUndefined();
    expect(parseSetRef('https://q.example/view/%E0')).toBeUndefined();
    expect(parseSetRef('garbage')).toBeUndefined();
});

test('printable strips terminal control sequences', () => {
    expect(printable('a\u001b[31mred\u001b[0m b')).toBe('ared b');
    expect(printable('x\u009b2Jy')).toBe('xy');
    expect(printable('\u001b]0;pwn\u0007ok')).toBe('ok');
    expect(printable('a‮b')).toBe('a b');
    expect(printable('a\n\nb')).toBe('a b');
    expect(printable('a\u001bb')).toBe('a b');
    expect(Array.from(printable('x'.repeat(100)))).toHaveLength(60);
});

describe('data dir', () => {
    function dbIn(dataDir: string): void {
        closeDatabase(openDatabase(dataDir).sqlite);
    }

    test('QZ_DATA_DIR is used without a flag', () => {
        const dataDir = join(tempRoot(), 'env');
        dbIn(dataDir);
        const r = run('feature', [UNKNOWN_ID], { env: { QZ_DATA_DIR: dataDir } });
        expect(r.err).toContain(`No study set ${UNKNOWN_ID} in ${dataDir}`);
    });

    test('a relative --data-dir resolves against cwd', () => {
        const cwd = tempRoot();
        dbIn(join(cwd, 'rel'));
        const r = run('feature', [UNKNOWN_ID, '--data-dir', 'rel'], { cwd });
        expect(r.err).toContain(`in ${join(cwd, 'rel')}`);
    });

    test('the default data dir is used without flag or env', () => {
        const dataDir = join(tempRoot(), 'default');
        dbIn(dataDir);
        const r = run('feature', [UNKNOWN_ID], {
            defaults: { dataDir, webDir: undefined, openBrowser: false },
        });
        expect(r.err).toContain(`in ${dataDir}`);
    });

    test('a missing DB is refused and its dir is not created', () => {
        const dataDir = join(tempRoot(), 'nothing');
        const r = run('hide', [ID, '--data-dir', dataDir]);
        expect(r.code).toBe(1);
        expect(r.err).toContain('No Quizaroni database');
        expect(existsSync(dataDir)).toBe(false);
    });

    test('a file that is not a database is reported, not thrown', () => {
        const dataDir = join(tempRoot(), 'junk');
        mkdirSync(dataDir);
        writeFileSync(join(dataDir, DB_FILENAME), 'not a database');
        const r = run('hide', [ID, '--data-dir', dataDir]);
        expect(r.code).toBe(1);
        expect(r.err).toContain(`Could not open the database in ${dataDir}`);
    });
});

type Feed = { items: { studysetUUID: string }[] };

describe('alongside a running app', () => {
    async function publishListed(h: RouteHarness, cookie: string) {
        const id = (await createSet(h, cookie)).studysetUUID;
        await okJson(
            post(h, '/update-studyset', {
                cookie,
                body: {
                    studysetUUID: id,
                    updates: { title: 'Cells', cards: CARDS },
                },
            })
        );
        await okJson(
            post(h, '/publish-studyset', {
                cookie,
                body: { studysetUUID: id, subject: 'science' },
            })
        );
        return id;
    }

    const ids = async (h: RouteHarness, query = '') =>
        (
            await okJson<Feed>(apiGet(h, `/api/public/explore${query}`))
        ).items.map((i) => i.studysetUUID);

    test('Explore reflects each command', async () => {
        const h = (harness = await createRouteHarness());
        const { cookie } = await signUp(h);
        const id = await publishListed(h, cookie);
        const cli = (command: ModerationCommand, ...rest: string[]) =>
            run(command, [id, ...rest, '--data-dir', h.dataDir]);
        const ownerPublish = () =>
            post(h, '/publish-studyset', {
                cookie,
                body: { studysetUUID: id, subject: 'science' },
            });

        expect(cli('feature').code).toBe(0);
        expect(await ids(h, '?featured=1')).toContain(id);

        expect(cli('feature', '--clear').code).toBe(0);
        expect(await ids(h, '?featured=1')).not.toContain(id);
        expect(await ids(h)).toContain(id);

        expect(cli('unpublish').code).toBe(0);
        expect(await ids(h)).not.toContain(id);
        expect((await apiGet(h, `/api/public/studyset/${id}`)).status).toBe(
            404
        );
        expect((await ownerPublish()).status).toBe(200);
        expect(await ids(h)).toContain(id);

        expect(cli('hide').code).toBe(0);
        expect(await ids(h)).not.toContain(id);
        expect((await apiGet(h, `/api/public/studyset/${id}`)).status).toBe(
            404
        );
        const refused = await ownerPublish();
        expect(refused.status).toBe(400);
        expect(await refused.text()).toContain('hidden');

        expect(cli('hide', '--clear').code).toBe(0);
        expect((await ownerPublish()).status).toBe(200);
        expect(await ids(h)).toContain(id);
    });

    test('feature refuses a private set and an unknown id', async () => {
        const h = (harness = await createRouteHarness());
        const { cookie } = await signUp(h);
        const id = (await createSet(h, cookie)).studysetUUID;
        const priv = run('feature', [id, '--data-dir', h.dataDir]);
        expect(priv.code).toBe(1);
        expect(priv.err).toContain('not on Explore');
        const unknown = run('feature', [UNKNOWN_ID, '--data-dir', h.dataDir]);
        expect(unknown.code).toBe(1);
        expect(unknown.err).toContain('No study set');
    });

    test('a hostile title cannot reach the terminal', async () => {
        const h = (harness = await createRouteHarness());
        const { cookie } = await signUp(h);
        const id = await publishListed(h, cookie);
        h.db.update(studyset)
            .set({ title: 'evil\u001b]0;pwn\u0007\u001b[2J' })
            .where(eq(studyset.studysetUUID, id))
            .run();
        const r = run('feature', [id, '--data-dir', h.dataDir]);
        expect(r.code).toBe(0);
        expect(r.out).not.toContain('\u001b');
        expect(r.out).toContain('"evil"');
    });
});
