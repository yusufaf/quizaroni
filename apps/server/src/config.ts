import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

export type ServerConfig = {
    dataDir: string;
    port: number;
    host: string;
    /** Set only when given explicitly; otherwise derive it from the bound port with `defaultPublicUrl`. */
    publicUrl: string | undefined;
    webDir: string;
};

export class ConfigError extends Error {}

export const DEFAULT_PORT = 8080;
export const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_DATA_DIR = 'data';
const LOCAL_HOSTS = new Set(['127.0.0.1', '0.0.0.0', '::', '::1', 'localhost']);

export const USAGE = `Usage: quizaroni-server [options]

Options (each can also be set with the QZ_* environment variable shown):
  --data-dir <path>    Directory for the database and all stored files (QZ_DATA_DIR, default ./data)
  --port <number>      Port to listen on, 0 for any free port (QZ_PORT, default ${DEFAULT_PORT})
  --host <address>     Address to bind to (QZ_HOST, default ${DEFAULT_HOST})
  --public-url <url>   Public origin users reach the server at (QZ_PUBLIC_URL)
  --web-dir <path>     Directory holding the built web app (QZ_WEB_DIR, default ../web/dist)
  --help               Show this help`;

const ENV_NAMES = {
    'data-dir': 'QZ_DATA_DIR',
    port: 'QZ_PORT',
    host: 'QZ_HOST',
    'public-url': 'QZ_PUBLIC_URL',
    'web-dir': 'QZ_WEB_DIR',
} as const;

type OptionName = keyof typeof ENV_NAMES;

type Setting = { value: string; source: string };

export function urlHost(host: string): string {
    return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}

export function defaultPublicUrl(host: string, port: number): string {
    return `http://${LOCAL_HOSTS.has(host) ? 'localhost' : urlHost(host)}:${port}`;
}

function parseFlags(argv: string[]): Partial<Record<OptionName, string>> {
    try {
        const { values } = parseArgs({
            args: argv,
            strict: true,
            allowPositionals: false,
            options: {
                'data-dir': { type: 'string' },
                port: { type: 'string' },
                host: { type: 'string' },
                'public-url': { type: 'string' },
                'web-dir': { type: 'string' },
                help: { type: 'boolean' },
            },
        });
        return values;
    } catch (err) {
        const code = (err as { code?: unknown }).code;
        if (typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS_')) {
            throw new ConfigError((err as Error).message);
        }
        throw err;
    }
}

function parsePort({ value, source }: Setting): number {
    const port = Number(value);
    if (!/^\d+$/.test(value) || port > 65535) {
        throw new ConfigError(
            `${source} must be an integer 0-65535 (got "${value}")`
        );
    }
    return port;
}

function parsePublicUrl({ value, source }: Setting): string {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new ConfigError(
            `${source} must be an http(s) origin with no path (got "${value}")`
        );
    }
    if (
        (url.protocol !== 'http:' && url.protocol !== 'https:') ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
    ) {
        throw new ConfigError(
            `${source} must be an http(s) origin with no path (got "${value}")`
        );
    }
    return url.origin;
}

export function loadConfig(
    argv: string[],
    env: Record<string, string | undefined>,
    cwd: string
): ServerConfig {
    const flags = parseFlags(argv);

    const setting = (name: OptionName): Setting | undefined => {
        const flag = flags[name];
        if (flag !== undefined) {
            if (flag === '')
                throw new ConfigError(`--${name} must not be empty`);
            return { value: flag, source: `--${name}` };
        }
        const envName = ENV_NAMES[name];
        const fromEnv = env[envName];
        return fromEnv ? { value: fromEnv, source: envName } : undefined;
    };

    const portSetting = setting('port');
    const port = portSetting ? parsePort(portSetting) : DEFAULT_PORT;
    const host = setting('host')?.value ?? DEFAULT_HOST;
    const publicUrlSetting = setting('public-url');
    const publicUrl = publicUrlSetting
        ? parsePublicUrl(publicUrlSetting)
        : undefined;
    const webDir = setting('web-dir');

    return {
        dataDir: resolve(cwd, setting('data-dir')?.value ?? DEFAULT_DATA_DIR),
        port,
        host,
        publicUrl,
        webDir: webDir
            ? resolve(cwd, webDir.value)
            : resolve(import.meta.dir, '../../web/dist'),
    };
}
