import { describe, expect, test } from 'bun:test';
import { ConfigError, USAGE } from '../config';
import { describeSmtp, parseSmtpConfig, SMTP_ENV_VARS } from './config';

const USER = 'smtp-user-xyz';
// Built at runtime so secret scanners don't flag this fake test password.
const PASSWORD = ['s3cret', 'PASS', 'xyz'].join('-');

const base = {
    QZ_SMTP_HOST: 'mail.example.org',
    QZ_SMTP_FROM: 'qz@example.org',
};

function configError(env: Record<string, string | undefined>): ConfigError {
    try {
        parseSmtpConfig(env);
    } catch (err) {
        if (err instanceof ConfigError) return err;
        throw err;
    }
    throw new Error('expected a ConfigError');
}

describe('parseSmtpConfig', () => {
    test('returns undefined when no QZ_SMTP_* var is set', () => {
        expect(parseSmtpConfig({})).toBeUndefined();
    });

    test('treats empty values as unset', () => {
        const env = Object.fromEntries(SMTP_ENV_VARS.map((n) => [n, '']));
        expect(parseSmtpConfig(env)).toBeUndefined();
    });

    test('defaults to STARTTLS on port 587', () => {
        expect(parseSmtpConfig(base)).toEqual({
            host: 'mail.example.org',
            port: 587,
            security: 'starttls',
            from: 'qz@example.org',
        });
    });

    test('port 465 defaults to TLS', () => {
        expect(parseSmtpConfig({ ...base, QZ_SMTP_PORT: '465' })).toMatchObject(
            {
                port: 465,
                security: 'tls',
            }
        );
    });

    test('tls defaults to port 465 and none to port 25', () => {
        expect(
            parseSmtpConfig({ ...base, QZ_SMTP_SECURITY: 'tls' })
        ).toMatchObject({ port: 465, security: 'tls' });
        expect(
            parseSmtpConfig({ ...base, QZ_SMTP_SECURITY: 'none' })
        ).toMatchObject({ port: 25, security: 'none' });
    });

    test('accepts hostnames and IP literals', () => {
        for (const host of ['mail.example.org', '10.0.0.5', '::1']) {
            expect(parseSmtpConfig({ ...base, QZ_SMTP_HOST: host })?.host).toBe(
                host
            );
        }
    });

    test('rejects a host that is a URL or has a port, user or space', () => {
        for (const host of [
            'smtp://mail.example',
            'user@mail.example',
            'mail.example:587',
            'a b',
        ]) {
            expect(configError({ ...base, QZ_SMTP_HOST: host }).message).toBe(
                'QZ_SMTP_HOST must be a hostname or IP address, not a URL'
            );
        }
    });

    test('accepts a from with a display name', () => {
        expect(
            parseSmtpConfig({
                ...base,
                QZ_SMTP_FROM: 'Quizaroni <QZ@Example.org>',
            })?.from
        ).toBe('Quizaroni <qz@example.org>');
    });

    test('rejects a bad from and a missing from', () => {
        expect(
            configError({ ...base, QZ_SMTP_FROM: 'not-an-email' }).message
        ).toContain('QZ_SMTP_FROM');
        expect(
            configError({ QZ_SMTP_HOST: 'mail.example.org' }).message
        ).toContain('QZ_SMTP_FROM is required');
    });

    test('rejects a bad port and a bad security value', () => {
        for (const port of ['0', '65536', 'abc', '25.5']) {
            expect(
                configError({ ...base, QZ_SMTP_PORT: port }).message
            ).toContain('QZ_SMTP_PORT');
        }
        expect(
            configError({ ...base, QZ_SMTP_SECURITY: 'ssl' }).message
        ).toContain('QZ_SMTP_SECURITY');
    });

    test('requires a host when any other var is set', () => {
        expect(configError({ QZ_SMTP_FROM: 'qz@example.org' }).message).toBe(
            'QZ_SMTP_HOST is required when any QZ_SMTP_* setting is set'
        );
    });

    test('requires user and password together', () => {
        expect(configError({ ...base, QZ_SMTP_USER: USER }).message).toBe(
            'QZ_SMTP_USER and QZ_SMTP_PASSWORD must be set together'
        );
        expect(
            parseSmtpConfig({
                ...base,
                QZ_SMTP_USER: USER,
                QZ_SMTP_PASSWORD: PASSWORD,
            })?.auth
        ).toEqual({ user: USER, pass: PASSWORD });
    });

    test('no error message contains the user, password or host credentials', () => {
        const secrets = { QZ_SMTP_USER: USER, QZ_SMTP_PASSWORD: PASSWORD };
        const cases: Record<string, string | undefined>[] = [
            { ...secrets },
            { ...secrets, QZ_SMTP_FROM: 'qz@example.org' },
            { ...base, QZ_SMTP_USER: USER },
            { ...base, QZ_SMTP_PASSWORD: PASSWORD },
            { ...base, ...secrets, QZ_SMTP_PORT: 'x' },
            { ...base, ...secrets, QZ_SMTP_SECURITY: 'x' },
            { ...base, ...secrets, QZ_SMTP_FROM: 'bad' },
            {
                ...base,
                ...secrets,
                QZ_SMTP_HOST: `smtp://${USER}:${PASSWORD}@mail.example`,
            },
        ];
        for (const env of cases) {
            const message = configError(env).message;
            expect(message).not.toContain(USER);
            expect(message).not.toContain(PASSWORD);
        }
    });
});

describe('describeSmtp', () => {
    test('says when SMTP is off', () => {
        expect(describeSmtp(undefined)).toBe(
            'Email: SMTP is not configured; password reset and invite messages go to the admin outbox.'
        );
    });

    test('names the server but never the credentials', () => {
        const line = describeSmtp(
            parseSmtpConfig({
                ...base,
                QZ_SMTP_USER: USER,
                QZ_SMTP_PASSWORD: PASSWORD,
            })
        );
        expect(line).toBe(
            'Email: sending through SMTP at mail.example.org:587 (starttls).'
        );
        expect(line).not.toContain(USER);
        expect(line).not.toContain(PASSWORD);
    });

    test('brackets an IPv6 host', () => {
        expect(
            describeSmtp(parseSmtpConfig({ ...base, QZ_SMTP_HOST: '::1' }))
        ).toBe('Email: sending through SMTP at [::1]:587 (starttls).');
    });
});

test('USAGE lists the SMTP settings', () => {
    for (const name of SMTP_ENV_VARS) expect(USAGE).toContain(name);
});
