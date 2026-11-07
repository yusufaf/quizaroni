import type { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from '../package.json';
import { createApp } from './app';
import { createAuth, lazyAuth, scrubAuthEnv } from './auth/auth';
import {
    ConfigError,
    cookieWarning,
    hasAdminEnv,
    loadConfig,
    parseAdminBootstrap,
    resolvePublicUrl,
    type ServerConfig,
    urlHost,
    USAGE,
} from './config';
import { closeDatabase, type Db, openDatabase } from './db';
import { FileStore } from './files/store';
import { ensureAuthSecret, getSetting, SETTING } from './settings';
import {
    bootstrapAdmin,
    clearSetupToken,
    describeDbError,
    isSetupComplete,
    issueSetupToken,
    SETUP_TOKEN_FILENAME,
    SetupGate,
} from './setup/setup';

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
let db: Db;
try {
    ({ sqlite, db } = openDatabase(config.dataDir));
} catch (err) {
    console.error(
        `Could not open the database in ${config.dataDir}: ${(err as Error).message}`
    );
    process.exit(1);
}

// The admin env is read only while setup is incomplete, so a stale or
// half-removed QZ_ADMIN_* on a set-up server never stops it from starting.
if (isSetupComplete(db)) {
    if (hasAdminEnv(process.env)) {
        console.log('Setup is already complete; ignoring QZ_ADMIN_* settings.');
    }
} else {
    let admin: ReturnType<typeof parseAdminBootstrap>;
    try {
        admin = parseAdminBootstrap(process.env);
    } catch (err) {
        if (!(err instanceof ConfigError)) throw err;
        console.error(err.message);
        console.error(USAGE);
        closeDatabase(sqlite);
        process.exit(1);
    }
    if (admin) {
        try {
            const status = await bootstrapAdmin(db, admin, config.publicUrl);
            const messages = {
                created: `Created instance admin ${admin.email} from QZ_ADMIN_EMAIL.`,
                marked_complete:
                    'An instance admin already exists, so setup is now marked complete. QZ_ADMIN_EMAIL and QZ_ADMIN_PASSWORD were not used; missing instance settings were taken from QZ_* settings.',
                already_set_up:
                    'Setup was completed elsewhere; ignoring QZ_ADMIN_* settings.',
            };
            console.log(messages[status]);
        } catch (err) {
            console.error(
                `Could not create the instance admin: ${describeDbError(err)}`
            );
            closeDatabase(sqlite);
            process.exit(1);
        }
    }
}

let setupToken: string | undefined;
if (isSetupComplete(db)) {
    clearSetupToken(config.dataDir);
} else {
    setupToken = issueSetupToken(config.dataDir);
}
const setup = new SetupGate(db, setupToken, () =>
    clearSetupToken(config.dataDir)
);

const authSecret = ensureAuthSecret(db);
for (const name of scrubAuthEnv(process.env)) {
    console.warn(
        `Ignoring ${name}: Quizaroni trusts only its public URL (QZ_PUBLIC_URL).`
    );
}

let server: ReturnType<typeof Bun.serve>;

// Built on the first /api request that needs it: by then the port is bound and
// setup (which may set the public URL) is complete.
const auth = lazyAuth(() => {
    const authPublicUrl = resolvePublicUrl({
        configured: config.publicUrl,
        stored: getSetting(db, SETTING.publicUrl),
        host: config.host,
        port: server.port ?? config.port,
    });
    return {
        publicUrl: authPublicUrl,
        auth: createAuth({
            db,
            publicUrl: authPublicUrl,
            secret: authSecret,
            insecureCookies: config.insecureCookies,
        }),
    };
});

const files = new FileStore(config.dataDir);
files.resetStaging();

const app = createApp({
    sqlite,
    db,
    files,
    webDir: config.webDir,
    version: pkg.version,
    setup,
    configuredPublicUrl: config.publicUrl,
    auth,
    trustProxy: config.trustProxy,
});

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

const publicUrl = resolvePublicUrl({
    configured: config.publicUrl,
    stored: getSetting(db, SETTING.publicUrl),
    host: config.host,
    port: server.port ?? config.port,
});

console.log(
    `Quizaroni server v${pkg.version} listening on http://${urlHost(config.host)}:${server.port} (public URL ${publicUrl})`
);
console.log(`Data directory: ${config.dataDir}`);
const warning = cookieWarning(publicUrl, config.insecureCookies);
if (warning) console.warn(warning);
if (config.trustProxy) {
    console.log('Trusting X-Forwarded-For from one reverse proxy.');
}
if (!existsSync(join(config.webDir, 'index.html'))) {
    console.warn(
        `No web app found in ${config.webDir}; pages will return 503 until it is built (pnpm build:web) or --web-dir points at it.`
    );
}
if (setupToken) {
    console.log(
        `Setup required: open ${publicUrl}/setup and enter setup token: ${setupToken}`
    );
    console.log(
        `The token is also in ${join(config.dataDir, SETUP_TOKEN_FILENAME)} and changes on every restart until setup is done.`
    );
}

let stopping = false;

async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    let exitCode = 0;
    try {
        await Promise.race([server.stop(), Bun.sleep(SHUTDOWN_GRACE_MS)]);
        void server.stop(true);
        closeDatabase(sqlite);
    } catch (err) {
        console.error('Shutdown failed:', err);
        exitCode = 1;
    }
    process.exit(exitCode);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
