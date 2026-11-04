import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

export type ServerConfig = {
    dataDir: string;
    port: number;
    host: string;
    /** Set only when given explicitly; otherwise derive it from the bound port with `defaultPublicUrl`. */
    publicUrl: string | undefined;
    webDir: string;
    trustProxy: boolean;
    insecureCookies: boolean;
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
  --trust-proxy <bool>  Trust X-Forwarded-For from one reverse proxy in front of the server (QZ_TRUST_PROXY, default false)
  --insecure-cookies <bool>  Allow session cookies over plain HTTP, for a trusted LAN without HTTPS (QZ_INSECURE_COOKIES, default false)
  --help               Show this help

Headless setup (env only, used only while setup is incomplete):
  QZ_ADMIN_EMAIL        Email of the instance admin to create instead of running the setup wizard
  QZ_ADMIN_PASSWORD     Password for that admin, 8-128 characters
  QZ_REGISTRATION_MODE  open or invite_only (default invite_only)
  QZ_TEACHER_POLICY     admin_approved or self_declared (default admin_approved)`;

const ENV_NAMES = {
    'data-dir': 'QZ_DATA_DIR',
    port: 'QZ_PORT',
    host: 'QZ_HOST',
    'public-url': 'QZ_PUBLIC_URL',
    'web-dir': 'QZ_WEB_DIR',
    'trust-proxy': 'QZ_TRUST_PROXY',
    'insecure-cookies': 'QZ_INSECURE_COOKIES',
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
                'trust-proxy': { type: 'string' },
                'insecure-cookies': { type: 'string' },
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

const TRUE_VALUES = new Set(['true', '1', 'yes']);
const FALSE_VALUES = new Set(['false', '0', 'no']);

function parseBoolean({ value, source }: Setting): boolean {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    throw new ConfigError(`${source} must be true or false (got "${value}")`);
}

export function cookieWarning(
    publicUrl: string,
    insecureCookies: boolean
): string | undefined {
    const https = publicUrl.startsWith('https:');
    if (!https && !insecureCookies) {
        return `Public URL ${publicUrl} is plain HTTP, but session cookies are Secure: browsers keep them only over HTTPS (and on localhost in Chrome and Firefox). Serve Quizaroni over HTTPS, or set QZ_INSECURE_COOKIES=true on a trusted LAN.`;
    }
    if (https && insecureCookies) {
        return 'QZ_INSECURE_COOKIES is set but the public URL is HTTPS; session cookies will not be marked Secure.';
    }
    return undefined;
}

export function normalizePublicUrl(value: string): string | undefined {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return undefined;
    }
    if (
        (url.protocol !== 'http:' && url.protocol !== 'https:') ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
    ) {
        return undefined;
    }
    return url.origin;
}

function parsePublicUrl({ value, source }: Setting): string {
    const origin = normalizePublicUrl(value);
    if (origin === undefined) {
        throw new ConfigError(
            `${source} must be an http(s) origin with no path (got "${value}")`
        );
    }
    return origin;
}

export function resolvePublicUrl(o: {
    configured?: string;
    stored?: string;
    host: string;
    port: number;
}): string {
    return o.configured ?? o.stored ?? defaultPublicUrl(o.host, o.port);
}

export const REGISTRATION_MODES = ['open', 'invite_only'] as const;
export const TEACHER_POLICIES = ['admin_approved', 'self_declared'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];
export type TeacherPolicy = (typeof TEACHER_POLICIES)[number];

export function isRegistrationMode(value: string): value is RegistrationMode {
    return (REGISTRATION_MODES as readonly string[]).includes(value);
}

export function isTeacherPolicy(value: string): value is TeacherPolicy {
    return (TEACHER_POLICIES as readonly string[]).includes(value);
}

// zod 4's email regex (zod/v4/core/regexes.js), which Better Auth's sign-in checks
// emails against: an address it rejects could never log in.
const EMAIL_PATTERN =
    /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const EMAIL_MAX = 254;

export function normalizeEmail(value: string): string | undefined {
    const email = value.trim().toLowerCase();
    return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email)
        ? email
        : undefined;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// UTF-16 code units, not code points: Better Auth rejects sign-in when
// password.length exceeds 128.
export function passwordLengthOk(password: string): boolean {
    return (
        password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX
    );
}

export type AdminBootstrap = {
    email: string;
    password: string;
    registrationMode: RegistrationMode;
    teacherPolicy: TeacherPolicy;
};

export const ADMIN_ENV_VARS = [
    'QZ_ADMIN_EMAIL',
    'QZ_ADMIN_PASSWORD',
    'QZ_REGISTRATION_MODE',
    'QZ_TEACHER_POLICY',
] as const;

export function hasAdminEnv(env: Record<string, string | undefined>): boolean {
    return ADMIN_ENV_VARS.some((name) => Boolean(env[name]));
}

export function parseAdminBootstrap(
    env: Record<string, string | undefined>
): AdminBootstrap | undefined {
    const rawEmail = env.QZ_ADMIN_EMAIL || undefined;
    const password = env.QZ_ADMIN_PASSWORD || undefined;
    const mode = env.QZ_REGISTRATION_MODE || undefined;
    const policy = env.QZ_TEACHER_POLICY || undefined;

    if (rawEmail === undefined && password === undefined) {
        if (mode !== undefined || policy !== undefined) {
            throw new ConfigError(
                'QZ_REGISTRATION_MODE and QZ_TEACHER_POLICY are only used with QZ_ADMIN_EMAIL/QZ_ADMIN_PASSWORD'
            );
        }
        return undefined;
    }
    if (rawEmail === undefined || password === undefined) {
        throw new ConfigError(
            'QZ_ADMIN_EMAIL and QZ_ADMIN_PASSWORD must be set together'
        );
    }
    const email = normalizeEmail(rawEmail);
    if (email === undefined) {
        throw new ConfigError(
            `QZ_ADMIN_EMAIL must be a valid email address (got "${rawEmail}")`
        );
    }
    if (!passwordLengthOk(password)) {
        throw new ConfigError(
            `QZ_ADMIN_PASSWORD must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters`
        );
    }
    if (mode !== undefined && !isRegistrationMode(mode)) {
        throw new ConfigError(
            `QZ_REGISTRATION_MODE must be one of ${REGISTRATION_MODES.join(', ')} (got "${mode}")`
        );
    }
    if (policy !== undefined && !isTeacherPolicy(policy)) {
        throw new ConfigError(
            `QZ_TEACHER_POLICY must be one of ${TEACHER_POLICIES.join(', ')} (got "${policy}")`
        );
    }
    return {
        email,
        password,
        registrationMode: mode ?? 'invite_only',
        teacherPolicy: policy ?? 'admin_approved',
    };
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
    const trustProxy = setting('trust-proxy');
    const insecureCookies = setting('insecure-cookies');

    return {
        dataDir: resolve(cwd, setting('data-dir')?.value ?? DEFAULT_DATA_DIR),
        port,
        host,
        publicUrl,
        webDir: webDir
            ? resolve(cwd, webDir.value)
            : resolve(import.meta.dir, '../../web/dist'),
        trustProxy: trustProxy ? parseBoolean(trustProxy) : false,
        insecureCookies: insecureCookies
            ? parseBoolean(insecureCookies)
            : false,
    };
}
