// Builds standalone Quizaroni server executables with the web app and the
// migrations embedded: pnpm build:binary [--targets linux-x64,...] [--skip-web]
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { readJournal } from '../src/db/migrations';
import {
    binaryFilename,
    collectWebFiles,
    importSpecifier,
    parseTargets,
    renderEntry,
} from './embed';

const serverRoot = resolve(import.meta.dir, '..');
const repoRoot = resolve(serverRoot, '../..');
const webDist = join(repoRoot, 'apps', 'web', 'dist');
const migrationsDir = join(serverRoot, 'drizzle');
const buildDir = join(serverRoot, 'build');
const outDir = join(serverRoot, 'dist');

const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        targets: { type: 'string' },
        'skip-web': { type: 'boolean' },
    },
});

let targets: ReturnType<typeof parseTargets>;
try {
    targets = parseTargets(values.targets);
} catch (err) {
    console.error((err as Error).message);
    process.exit(1);
}

if (!values['skip-web']) {
    await Bun.$`pnpm --filter @quizaroni/web build:selfhost`.cwd(repoRoot);
}

const webFiles = collectWebFiles(webDist);
mkdirSync(buildDir, { recursive: true });
const entry = join(buildDir, 'entry.ts');
writeFileSync(
    entry,
    renderEntry({
        registry: importSpecifier(buildDir, join(serverRoot, 'src', 'embedded.ts')),
        main: importSpecifier(buildDir, join(serverRoot, 'src', 'index.ts')),
        webFiles: webFiles.map((file) => ({
            url: `/${file}`,
            specifier: importSpecifier(buildDir, join(webDist, file)),
        })),
        migrations: readJournal(migrationsDir).map((m) => ({
            ...m,
            specifier: importSpecifier(buildDir, join(migrationsDir, `${m.tag}.sql`)),
        })),
    })
);
console.log(`Embedding ${webFiles.length} web files from ${webDist}`);

mkdirSync(outDir, { recursive: true });
for (const target of targets) {
    const result = await Bun.build({
        entrypoints: [entry],
        compile: {
            target: `bun-${target}`,
            outfile: join(outDir, binaryFilename(target)),
            // A downloaded binary must not pick up a .env or bunfig.toml (which
            // can preload code) from whatever folder it is started in.
            autoloadDotenv: false,
            autoloadBunfig: false,
        },
        minify: true,
        // The map is embedded for readable stack traces; the copy Bun writes
        // beside the binary is deleted below.
        sourcemap: 'linked',
        throw: false,
    });
    if (!result.success) {
        console.error(`Build for ${target} failed:`);
        for (const log of result.logs) console.error(log);
        process.exit(1);
    }
    // Not `${outfile}.map`: on Windows Bun names it quizaroni-windows-x64.map.
    for (const output of result.outputs) {
        if (output.kind === 'sourcemap' || output.path.endsWith('.map')) {
            rmSync(output.path, { force: true });
        }
    }
}

const built = readdirSync(outDir);
const missing = targets.map(binaryFilename).filter((f) => !built.includes(f));
const maps = built.filter((f) => f.endsWith('.map'));
if (missing.length > 0 || maps.length > 0) {
    console.error(
        `Unexpected build output in ${outDir}: missing ${missing.join(', ') || 'nothing'}, stray ${maps.join(', ') || 'nothing'}`
    );
    console.error(built.join('\n'));
    process.exit(1);
}
for (const target of targets) {
    const file = join(outDir, binaryFilename(target));
    console.log(`${file}  ${(statSync(file).size / 1024 / 1024).toFixed(1)} MB`);
}
