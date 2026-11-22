import { describe, expect, test } from 'bun:test';
import { ConfigError, USAGE } from '../config';
import {
    describeSocial,
    parseSocialConfig,
    SOCIAL_ENV_VARS,
    socialProviderIds,
    socialUrlWarning,
} from './social-config';

const ID = 'client-id-abc';
// Built at runtime so secret scanners don't flag this fake secret.
const SECRET = ['s3cret', 'VALUE', 'xyz'].join('-');

const google = { QZ_GOOGLE_CLIENT_ID: ID, QZ_GOOGLE_CLIENT_SECRET: SECRET };
const github = { QZ_GITHUB_CLIENT_ID: ID, QZ_GITHUB_CLIENT_SECRET: SECRET };

function configError(env: Record<string, string | undefined>): ConfigError {
    try {
        parseSocialConfig(env);
    } catch (err) {
        if (err instanceof ConfigError) return err;
        throw err;
    }
    throw new Error('expected a ConfigError');
}

describe('parseSocialConfig', () => {
    test('returns no providers when nothing is set', () => {
        expect(parseSocialConfig({})).toEqual({});
    });

    test('treats empty and blank values as unset', () => {
        const env = Object.fromEntries(
            SOCIAL_ENV_VARS.map((n, i) => [n, i % 2 ? '' : '   '])
        );
        expect(parseSocialConfig(env)).toEqual({});
    });

    test('reads each provider on its own', () => {
        expect(parseSocialConfig(google)).toEqual({
            google: { clientId: ID, clientSecret: SECRET },
        });
        expect(parseSocialConfig(github)).toEqual({
            github: { clientId: ID, clientSecret: SECRET },
        });
        expect(
            socialProviderIds(parseSocialConfig({ ...google, ...github }))
        ).toEqual(['google', 'github']);
    });

    test('trims values', () => {
        expect(
            parseSocialConfig({
                QZ_GOOGLE_CLIENT_ID: `  ${ID}\n`,
                QZ_GOOGLE_CLIENT_SECRET: ` ${SECRET} `,
            })
        ).toEqual({ google: { clientId: ID, clientSecret: SECRET } });
    });

    test('requires the id and secret together', () => {
        expect(configError({ QZ_GOOGLE_CLIENT_ID: ID }).message).toBe(
            'QZ_GOOGLE_CLIENT_ID and QZ_GOOGLE_CLIENT_SECRET must be set together'
        );
        expect(configError({ QZ_GITHUB_CLIENT_SECRET: SECRET }).message).toBe(
            'QZ_GITHUB_CLIENT_ID and QZ_GITHUB_CLIENT_SECRET must be set together'
        );
    });

    test('a half-set provider fails even when the other is complete', () => {
        expect(
            configError({ ...github, QZ_GOOGLE_CLIENT_ID: ID }).message
        ).toContain('QZ_GOOGLE_CLIENT_ID');
    });

    test('no error message contains the id or the secret', () => {
        const cases: Record<string, string | undefined>[] = [
            { QZ_GOOGLE_CLIENT_ID: ID },
            { QZ_GOOGLE_CLIENT_SECRET: SECRET },
            { QZ_GITHUB_CLIENT_ID: ID },
            { QZ_GITHUB_CLIENT_SECRET: SECRET },
        ];
        for (const env of cases) {
            const { message } = configError(env);
            expect(message).not.toContain(ID);
            expect(message).not.toContain(SECRET);
        }
    });
});

describe('describeSocial', () => {
    test('says when no provider is set', () => {
        expect(describeSocial({}, undefined)).toContain('not configured');
    });

    test('lists full redirect URIs when the public URL is configured', () => {
        const text = describeSocial(
            parseSocialConfig({ ...google, ...github }),
            'https://quiz.example.org'
        );
        expect(text).toContain('Google, GitHub');
        expect(text).toContain(
            'https://quiz.example.org/api/auth/callback/google'
        );
        expect(text).toContain(
            'https://quiz.example.org/api/auth/callback/github'
        );
    });

    test('prints relative paths when the public URL is not configured', () => {
        const text = describeSocial(parseSocialConfig(google), undefined);
        expect(text).toContain('/api/auth/callback/google');
        expect(text).not.toContain('http');
    });

    test('never prints the id or the secret', () => {
        const text = describeSocial(parseSocialConfig(google), undefined);
        expect(text).not.toContain(ID);
        expect(text).not.toContain(SECRET);
    });
});

describe('socialUrlWarning', () => {
    const cfg = parseSocialConfig(google);

    test('warns about a plain-HTTP public URL that is not localhost', () => {
        expect(socialUrlWarning(cfg, 'http://quiz.example.org')).toContain(
            'HTTPS'
        );
    });

    test('stays quiet for HTTPS, localhost, or no providers', () => {
        expect(
            socialUrlWarning(cfg, 'https://quiz.example.org')
        ).toBeUndefined();
        expect(socialUrlWarning(cfg, 'http://localhost:8080')).toBeUndefined();
        expect(socialUrlWarning(cfg, 'http://127.0.0.1:8080')).toBeUndefined();
        expect(socialUrlWarning(cfg, 'http://[::1]:8080')).toBeUndefined();
        expect(
            socialUrlWarning({}, 'http://quiz.example.org')
        ).toBeUndefined();
    });
});

test('USAGE lists the sign-in settings', () => {
    for (const name of SOCIAL_ENV_VARS) expect(USAGE).toContain(name);
});
