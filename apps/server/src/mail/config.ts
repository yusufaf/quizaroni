import { isIP } from 'node:net';
import { ConfigError, normalizeEmail, urlHost } from '../config';

export const SMTP_ENV_VARS = [
    'QZ_SMTP_HOST',
    'QZ_SMTP_PORT',
    'QZ_SMTP_SECURITY',
    'QZ_SMTP_USER',
    'QZ_SMTP_PASSWORD',
    'QZ_SMTP_FROM',
] as const;

export const SMTP_SECURITY = ['tls', 'starttls', 'none'] as const;
export type SmtpSecurity = (typeof SMTP_SECURITY)[number];

export type SmtpConfig = {
    host: string;
    port: number;
    security: SmtpSecurity;
    from: string;
    auth?: { user: string; pass: string };
};

const DEFAULT_PORTS: Record<SmtpSecurity, number> = {
    tls: 465,
    starttls: 587,
    none: 25,
};

const FROM_WITH_NAME = /^(.*?)\s*<([^<>]+)>$/;

function isSecurity(value: string): value is SmtpSecurity {
    return (SMTP_SECURITY as readonly string[]).includes(value);
}

// A pasted smtp://user:pass@host URL must not get through, because the host
// is printed at startup.
function isBareHost(host: string): boolean {
    if (/[/@\s]/.test(host)) return false;
    return !host.includes(':') || isIP(host) === 6;
}

function parseFrom(value: string): string | undefined {
    const named = FROM_WITH_NAME.exec(value.trim());
    if (!named) return normalizeEmail(value);
    const address = normalizeEmail(named[2] ?? '');
    if (address === undefined) return undefined;
    return named[1] ? `${named[1]} <${address}>` : address;
}

// Errors never echo QZ_SMTP_USER, QZ_SMTP_PASSWORD or QZ_SMTP_HOST.
export function parseSmtpConfig(
    env: Record<string, string | undefined>
): SmtpConfig | undefined {
    const host = env.QZ_SMTP_HOST || undefined;
    const rawPort = env.QZ_SMTP_PORT || undefined;
    const rawSecurity = env.QZ_SMTP_SECURITY || undefined;
    const user = env.QZ_SMTP_USER || undefined;
    const pass = env.QZ_SMTP_PASSWORD || undefined;
    const rawFrom = env.QZ_SMTP_FROM || undefined;

    if (SMTP_ENV_VARS.every((name) => !env[name])) return undefined;
    if (host === undefined) {
        throw new ConfigError(
            'QZ_SMTP_HOST is required when any QZ_SMTP_* setting is set'
        );
    }
    if (!isBareHost(host)) {
        throw new ConfigError(
            'QZ_SMTP_HOST must be a hostname or IP address, not a URL'
        );
    }
    if (rawSecurity !== undefined && !isSecurity(rawSecurity)) {
        throw new ConfigError(
            `QZ_SMTP_SECURITY must be one of ${SMTP_SECURITY.join(', ')} (got "${rawSecurity}")`
        );
    }
    let port: number | undefined;
    if (rawPort !== undefined) {
        port = Number(rawPort);
        if (!/^\d+$/.test(rawPort) || port < 1 || port > 65535) {
            throw new ConfigError(
                `QZ_SMTP_PORT must be an integer 1-65535 (got "${rawPort}")`
            );
        }
    }
    const security: SmtpSecurity =
        rawSecurity ?? (port === 465 ? 'tls' : 'starttls');
    if (rawFrom === undefined) {
        throw new ConfigError('QZ_SMTP_FROM is required when SMTP is set');
    }
    const from = parseFrom(rawFrom);
    if (from === undefined) {
        throw new ConfigError(
            `QZ_SMTP_FROM must be an email address or "Name <address>" (got "${rawFrom}")`
        );
    }
    if ((user === undefined) !== (pass === undefined)) {
        throw new ConfigError(
            'QZ_SMTP_USER and QZ_SMTP_PASSWORD must be set together'
        );
    }
    return {
        host,
        port: port ?? DEFAULT_PORTS[security],
        security,
        from,
        ...(user !== undefined && pass !== undefined
            ? { auth: { user, pass } }
            : {}),
    };
}

// The address is not a secret, so errors may echo it.
export function parseSignupNotifyEmail(
    env: Record<string, string | undefined>,
    smtp: SmtpConfig | undefined
): string | undefined {
    const raw = env.QZ_SIGNUP_NOTIFY_EMAIL?.trim() || undefined;
    if (raw === undefined) return undefined;
    const address = normalizeEmail(raw);
    if (address === undefined) {
        throw new ConfigError(
            `QZ_SIGNUP_NOTIFY_EMAIL must be a valid email address (got "${raw}")`
        );
    }
    if (smtp === undefined) {
        throw new ConfigError(
            'QZ_SIGNUP_NOTIFY_EMAIL needs SMTP; set the QZ_SMTP_* settings'
        );
    }
    return address;
}

export function describeSmtp(cfg: SmtpConfig | undefined): string {
    if (!cfg) {
        return 'Email: SMTP is not configured; password reset and invite messages go to the admin outbox.';
    }
    return `Email: sending through SMTP at ${urlHost(cfg.host)}:${cfg.port} (${cfg.security}).`;
}
