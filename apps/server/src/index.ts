import pkg from '../package.json';
import { createApp } from './app';
import {
    ConfigError,
    loadConfig,
    type ServerConfig,
    urlHost,
    USAGE,
} from './config';
import { closeDatabase, openDatabase } from './db';

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

const { sqlite } = openDatabase(config.dataDir);
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

console.log(
    `Quizaroni server v${pkg.version} listening on http://${urlHost(config.host)}:${server.port} (public URL ${config.publicUrl})`
);
console.log(`Data directory: ${config.dataDir}`);

function shutdown(): void {
    server.stop();
    try {
        closeDatabase(sqlite);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
