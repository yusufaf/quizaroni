import type { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from '../package.json';
import { createApp } from './app';
import {
    ConfigError,
    defaultPublicUrl,
    loadConfig,
    type ServerConfig,
    urlHost,
    USAGE,
} from './config';
import { closeDatabase, openDatabase } from './db';

const SHUTDOWN_GRACE_MS = 5000;

const argv = Bun.argv.slice(2);

if (argv.includes('--help')) {
    console.log(USAGE);
    process.exit(0);
}

let config: ServerConfig;
try {
    config = loadConfig(argv, process.env, process.cwd());
} catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    console.error(err.message);
    console.error(USAGE);
    process.exit(1);
}

let sqlite: Database;
try {
    ({ sqlite } = openDatabase(config.dataDir));
} catch (err) {
    console.error(
        `Could not open the database in ${config.dataDir}: ${(err as Error).message}`
    );
    process.exit(1);
}

const app = createApp({ sqlite, webDir: config.webDir, version: pkg.version });

let server: ReturnType<typeof Bun.serve>;
try {
    server = Bun.serve({
        hostname: config.host,
        port: config.port,
        fetch: app.fetch,
    });
} catch (err) {
    console.error(
        `Could not listen on ${urlHost(config.host)}:${config.port}: ${(err as Error).message}`
    );
    closeDatabase(sqlite);
    process.exit(1);
}

const publicUrl =
    config.publicUrl ??
    defaultPublicUrl(config.host, server.port ?? config.port);

console.log(
    `Quizaroni server v${pkg.version} listening on http://${urlHost(config.host)}:${server.port} (public URL ${publicUrl})`
);
console.log(`Data directory: ${config.dataDir}`);
if (!existsSync(join(config.webDir, 'index.html'))) {
    console.warn(
        `No web app found in ${config.webDir}; pages will return 503 until it is built (pnpm build:web) or --web-dir points at it.`
    );
}

let stopping = false;

async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    try {
        await Promise.race([server.stop(), Bun.sleep(SHUTDOWN_GRACE_MS)]);
        closeDatabase(sqlite);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
