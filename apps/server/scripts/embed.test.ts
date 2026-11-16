import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readJournal } from '../src/db/migrations';
import {
    binaryFilename,
    collectWebFiles,
    importSpecifier,
    parseTargets,
    renderEntry,
    TARGETS,
} from './embed';

const SERVER_ROOT = resolve(import.meta.dir, '..');
const MIGRATIONS = join(SERVER_ROOT, 'drizzle');

const temps: string[] = [];
const temp = (parent = tmpdir()) => {
    mkdirSync(parent, { recursive: true });
    const dir = mkdtempSync(join(parent, 'embed-test-'));
    temps.push(dir);
    return dir;
};

afterAll(() => {
    for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe('binaryFilename', () => {
    test('adds .exe only for Windows', () => {
        expect(binaryFilename('windows-x64')).toBe('quizaroni-windows-x64.exe');
        expect(binaryFilename('darwin-arm64')).toBe('quizaroni-darwin-arm64');
    });
});

describe('parseTargets', () => {
    test('defaults to every target', () => {
        expect(parseTargets(undefined)).toEqual([...TARGETS]);
    });

    test('takes a comma-separated list', () => {
        expect(parseTargets('linux-x64,windows-x64')).toEqual([
            'linux-x64',
            'windows-x64',
        ]);
    });

    test('rejects an unknown target by name', () => {
        expect(() => parseTargets('linux-x86')).toThrow(/linux-x86/);
    });
});

describe('collectWebFiles', () => {
    test('lists every file as a sorted posix path', () => {
        const dist = temp();
        mkdirSync(join(dist, 'assets'));
        mkdirSync(join(dist, 'splash'));
        mkdirSync(join(dist, 'empty'));
        writeFileSync(join(dist, 'index.html'), '');
        writeFileSync(join(dist, 'assets', 'a.js'), '');
        writeFileSync(join(dist, 'splash', 'x.png'), '');
        expect(collectWebFiles(dist)).toEqual([
            'assets/a.js',
            'index.html',
            'splash/x.png',
        ]);
    });

    test('fails when the web app was not built', () => {
        const dist = temp();
        writeFileSync(join(dist, 'a.js'), '');
        expect(() => collectWebFiles(dist)).toThrow(/build:web:selfhost/);
    });
});

describe('importSpecifier', () => {
    test('is relative with forward slashes', () => {
        expect(
            importSpecifier(
                resolve('/r/apps/server/build'),
                resolve('/r/apps/web/dist/index.html')
            )
        ).toBe('../../web/dist/index.html');
        expect(importSpecifier(resolve('/r'), resolve('/r/x.ts'))).toBe(
            './x.ts'
        );
        expect(
            importSpecifier(resolve('/r'), resolve('/r/.well-known/a'))
        ).toBe('./.well-known/a');
    });

    test.if(process.platform === 'win32')(
        'refuses a file on another drive',
        () => {
            expect(() =>
                importSpecifier('C:\\r\\build', 'D:\\r\\x.ts')
            ).toThrow(/different drive/);
        }
    );
});

describe('renderEntry', () => {
    const journal = readJournal(MIGRATIONS);
    const source = renderEntry({
        registry: '../src/embedded',
        main: '../src/index',
        webFiles: [
            { url: '/index.html', specifier: '../../web/dist/index.html' },
            { url: '/assets/a.js', specifier: '../../web/dist/assets/a.js' },
        ],
        migrations: journal.map((m) => ({
            ...m,
            specifier: `../drizzle/${m.tag}.sql`,
        })),
    });

    test('imports each web file and migration in order', () => {
        expect(source.match(/with \{ type: "file" \}/g)).toHaveLength(2);
        expect(source.match(/with \{ type: "text" \}/g)).toHaveLength(
            journal.length
        );
        expect(source).toContain('["/assets/a.js", web1]');
        const first = journal[0]!;
        expect(source).toContain(
            `{ tag: "${first.tag}", when: ${first.when}, breakpoints: ${first.breakpoints}, sql: sql0 }`
        );
        expect(source.indexOf(journal[0]!.tag)).toBeLessThan(
            source.indexOf(journal.at(-1)!.tag)
        );
        expect(source.trimEnd().endsWith('await import("../src/index");')).toBe(
            true
        );
    });

    test('registers the bundle before the main module runs', async () => {
        // Under apps/server/build so it is on the same drive as src/.
        const dir = temp(join(SERVER_ROOT, 'build'));
        const web = join(dir, 'web');
        mkdirSync(join(web, 'assets'), { recursive: true });
        writeFileSync(join(web, 'index.html'), '<!doctype html>');
        writeFileSync(join(web, 'assets', 'a.js'), '');
        const registry = importSpecifier(
            dir,
            join(SERVER_ROOT, 'src', 'embedded.ts')
        );
        writeFileSync(
            join(dir, 'main.ts'),
            `import { embeddedBundle } from ${JSON.stringify(registry)};
const b = embeddedBundle()!;
console.log(JSON.stringify({
    urls: [...b.webFiles.keys()],
    tags: b.migrations.map((m) => m.tag),
    first: b.migrations[0]!.sql.slice(0, 12),
}));
`
        );
        const entry = join(dir, 'entry.ts');
        writeFileSync(
            entry,
            renderEntry({
                registry,
                main: './main.ts',
                webFiles: collectWebFiles(web).map((file) => ({
                    url: `/${file}`,
                    specifier: importSpecifier(dir, join(web, file)),
                })),
                migrations: journal.map((m) => ({
                    ...m,
                    specifier: importSpecifier(
                        dir,
                        join(MIGRATIONS, `${m.tag}.sql`)
                    ),
                })),
            })
        );
        const proc = Bun.spawn([process.execPath, entry], {
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const [stdout, stderr, code] = await Promise.all([
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
            proc.exited,
        ]);
        expect(stderr).toBe('');
        expect(code).toBe(0);
        const out = JSON.parse(stdout) as {
            urls: string[];
            tags: string[];
            first: string;
        };
        expect(out.urls).toEqual(['/assets/a.js', '/index.html']);
        expect(out.tags).toEqual(journal.map((m) => m.tag));
        const firstSql = await Bun.file(
            join(MIGRATIONS, `${journal[0]!.tag}.sql`)
        ).text();
        expect(out.first).toBe(firstSql.slice(0, 12));
    });
});
