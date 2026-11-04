import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
    ConfigError,
    DEFAULT_HOST,
    DEFAULT_PORT,
    defaultPublicUrl,
    hasAdminEnv,
    loadConfig,
    normalizeEmail,
    normalizePublicUrl,
    parseAdminBootstrap,
    passwordLengthOk,
    resolvePublicUrl,
    urlHost,
    USAGE,
} from './config';

const CWD = resolve('/x');

function configError(fn: () => unknown): ConfigError {
    try {
        fn();
    } catch (err) {
        expect(err).toBeInstanceOf(ConfigError);
        return err as ConfigError;
    }
    throw new Error('expected a ConfigError');
}

describe('loadConfig', () => {
    test('uses defaults with no flags or env', () => {
        const config = loadConfig([], {}, CWD);
        expect(config).toEqual({
            dataDir: resolve(CWD, 'data'),
            port: DEFAULT_PORT,
            host: DEFAULT_HOST,
            publicUrl: undefined,
            webDir: resolve(import.meta.dir, '../../web/dist'),
        });
    });

    test('reads each setting from QZ_* env vars', () => {
        const config = loadConfig(
            [],
            {
                QZ_DATA_DIR: 'env-data',
                QZ_PORT: '9001',
                QZ_HOST: '0.0.0.0',
                QZ_PUBLIC_URL: 'https://env.example.com',
                QZ_WEB_DIR: 'env-web',
            },
            CWD
        );
        expect(config).toEqual({
            dataDir: resolve(CWD, 'env-data'),
            port: 9001,
            host: '0.0.0.0',
            publicUrl: 'https://env.example.com',
            webDir: resolve(CWD, 'env-web'),
        });
    });

    test('flags win over env vars', () => {
        const config = loadConfig(
            [
                '--data-dir',
                'flag-data',
                '--port',
                '9002',
                '--host',
                '10.0.0.1',
                '--public-url',
                'https://flag.example.com',
                '--web-dir',
                'flag-web',
            ],
            {
                QZ_DATA_DIR: 'env-data',
                QZ_PORT: '9001',
                QZ_HOST: '0.0.0.0',
                QZ_PUBLIC_URL: 'https://env.example.com',
                QZ_WEB_DIR: 'env-web',
            },
            CWD
        );
        expect(config).toEqual({
            dataDir: resolve(CWD, 'flag-data'),
            port: 9002,
            host: '10.0.0.1',
            publicUrl: 'https://flag.example.com',
            webDir: resolve(CWD, 'flag-web'),
        });
    });

    test('treats empty env vars as unset', () => {
        const config = loadConfig(
            [],
            {
                QZ_DATA_DIR: '',
                QZ_PORT: '',
                QZ_HOST: '',
                QZ_PUBLIC_URL: '',
                QZ_WEB_DIR: '',
            },
            CWD
        );
        expect(config).toEqual(loadConfig([], {}, CWD));
    });

    test('resolves a relative data dir against cwd and keeps an absolute one', () => {
        expect(loadConfig(['--data-dir', './d'], {}, CWD).dataDir).toBe(
            resolve(CWD, 'd')
        );
        const absolute = resolve('/elsewhere/data');
        expect(loadConfig(['--data-dir', absolute], {}, CWD).dataDir).toBe(
            absolute
        );
    });

    test.each([['abc'], ['70000'], ['0x10'], ['1.5']])(
        'rejects --port %s',
        (port) => {
            configError(() => loadConfig(['--port', port], {}, CWD));
        }
    );

    test('rejects a negative port that reaches validation', () => {
        configError(() => loadConfig(['--port=-1'], {}, CWD));
    });

    test('allows port 0 for an OS-assigned port', () => {
        expect(loadConfig(['--port', '0'], {}, CWD).port).toBe(0);
    });

    test.each([[['--port', '-1']], [['--port']], [['foo']], [['--nope']]])(
        'turns argument parse failure %j into a ConfigError',
        (argv) => {
            configError(() => loadConfig(argv, {}, CWD));
        }
    );

    test.each([
        ['ftp://x'],
        ['not a url'],
        ['https://x/sub'],
        ['https://x/?a=1'],
        ['https://x/#h'],
    ])('rejects --public-url %s', (url) => {
        configError(() => loadConfig(['--public-url', url], {}, CWD));
    });

    test('normalises a public URL to its origin', () => {
        expect(
            loadConfig(['--public-url', 'https://quiz.example.com/'], {}, CWD)
                .publicUrl
        ).toBe('https://quiz.example.com');
    });

    test('names the source of an invalid value in the error message', () => {
        expect(
            configError(() => loadConfig(['--port', 'abc'], {}, CWD)).message
        ).toContain('--port');
        expect(
            configError(() => loadConfig([], { QZ_PORT: 'abc' }, CWD)).message
        ).toContain('QZ_PORT');
        expect(
            configError(() => loadConfig(['--public-url', 'ftp://x'], {}, CWD))
                .message
        ).toContain('--public-url');
        expect(
            configError(() => loadConfig([], { QZ_PUBLIC_URL: 'ftp://x' }, CWD))
                .message
        ).toContain('QZ_PUBLIC_URL');
    });

    test('rejects empty flag values', () => {
        expect(
            configError(() => loadConfig(['--data-dir='], {}, CWD)).message
        ).toContain('--data-dir');
        expect(
            configError(() => loadConfig(['--data-dir', ''], {}, CWD)).message
        ).toContain('--data-dir');
        expect(
            configError(() => loadConfig(['--host='], {}, CWD)).message
        ).toContain('--host');
    });
});

describe('defaultPublicUrl', () => {
    test('uses localhost for loopback and wildcard hosts', () => {
        expect(defaultPublicUrl('127.0.0.1', 8080)).toBe(
            'http://localhost:8080'
        );
        expect(defaultPublicUrl('0.0.0.0', 8080)).toBe('http://localhost:8080');
        expect(defaultPublicUrl('::1', 9000)).toBe('http://localhost:9000');
    });

    test('uses a non-local host as is, bracketing IPv6', () => {
        expect(defaultPublicUrl('192.168.1.5', 9000)).toBe(
            'http://192.168.1.5:9000'
        );
        expect(defaultPublicUrl('fe80::1', 9000)).toBe('http://[fe80::1]:9000');
    });
});

describe('urlHost', () => {
    test('brackets IPv6 hosts once and leaves others alone', () => {
        expect(urlHost('::1')).toBe('[::1]');
        expect(urlHost('[::1]')).toBe('[::1]');
        expect(urlHost('0.0.0.0')).toBe('0.0.0.0');
        expect(urlHost('localhost')).toBe('localhost');
    });
});

describe('parseAdminBootstrap', () => {
    const PASSWORD = 'correct-horse-1';

    test('returns undefined when no admin var is set', () => {
        expect(parseAdminBootstrap({})).toBeUndefined();
        expect(
            parseAdminBootstrap({
                QZ_ADMIN_EMAIL: '',
                QZ_ADMIN_PASSWORD: '',
                QZ_REGISTRATION_MODE: '',
                QZ_TEACHER_POLICY: '',
            })
        ).toBeUndefined();
    });

    test('lowercases the email and applies the secure defaults', () => {
        expect(
            parseAdminBootstrap({
                QZ_ADMIN_EMAIL: ' Admin@Example.COM ',
                QZ_ADMIN_PASSWORD: PASSWORD,
            })
        ).toEqual({
            email: 'admin@example.com',
            password: PASSWORD,
            registrationMode: 'invite_only',
            teacherPolicy: 'admin_approved',
        });
    });

    test('honours an explicit registration mode and teacher policy', () => {
        expect(
            parseAdminBootstrap({
                QZ_ADMIN_EMAIL: 'admin@example.com',
                QZ_ADMIN_PASSWORD: PASSWORD,
                QZ_REGISTRATION_MODE: 'open',
                QZ_TEACHER_POLICY: 'self_declared',
            })
        ).toMatchObject({
            registrationMode: 'open',
            teacherPolicy: 'self_declared',
        });
    });

    test.each([
        [{ QZ_ADMIN_EMAIL: 'admin@example.com' }, 'must be set together'],
        [{ QZ_ADMIN_PASSWORD: PASSWORD }, 'must be set together'],
    ])('rejects a half-set admin %j', (env, text) => {
        expect(configError(() => parseAdminBootstrap(env)).message).toContain(
            text
        );
    });

    test('rejects an invalid email, naming the var', () => {
        const message = configError(() =>
            parseAdminBootstrap({
                QZ_ADMIN_EMAIL: 'josé@example.com',
                QZ_ADMIN_PASSWORD: PASSWORD,
            })
        ).message;
        expect(message).toContain('QZ_ADMIN_EMAIL');
    });

    test.each([['short'], ['x'.repeat(129)]])(
        'rejects a password of the wrong length without echoing it',
        (password) => {
            const message = configError(() =>
                parseAdminBootstrap({
                    QZ_ADMIN_EMAIL: 'admin@example.com',
                    QZ_ADMIN_PASSWORD: password,
                })
            ).message;
            expect(message).toContain('QZ_ADMIN_PASSWORD');
            expect(message).not.toContain(password);
        }
    );

    test.each([
        ['QZ_REGISTRATION_MODE', 'everyone'],
        ['QZ_TEACHER_POLICY', 'anyone'],
    ])('rejects an unknown %s', (name, value) => {
        const message = configError(() =>
            parseAdminBootstrap({
                QZ_ADMIN_EMAIL: 'admin@example.com',
                QZ_ADMIN_PASSWORD: PASSWORD,
                [name]: value,
            })
        ).message;
        expect(message).toContain(name);
        expect(message).toContain(value);
    });

    test.each([['QZ_REGISTRATION_MODE', 'open'], ['QZ_TEACHER_POLICY', 'self_declared']])(
        'rejects %s without the admin vars',
        (name, value) => {
            expect(
                configError(() => parseAdminBootstrap({ [name]: value }))
                    .message
            ).toContain('only used with QZ_ADMIN_EMAIL/QZ_ADMIN_PASSWORD');
        }
    );
});

describe('hasAdminEnv', () => {
    test('is false when every admin var is empty or missing', () => {
        expect(hasAdminEnv({})).toBe(false);
        expect(hasAdminEnv({ QZ_ADMIN_EMAIL: '', QZ_PORT: '1' })).toBe(false);
    });

    test('is true when any admin var is set', () => {
        expect(hasAdminEnv({ QZ_TEACHER_POLICY: 'self_declared' })).toBe(true);
    });
});

describe('passwordLengthOk', () => {
    test('allows 8 to 128 UTF-16 code units', () => {
        expect(passwordLengthOk('x'.repeat(7))).toBe(false);
        expect(passwordLengthOk('x'.repeat(8))).toBe(true);
        expect(passwordLengthOk('x'.repeat(128))).toBe(true);
        expect(passwordLengthOk('x'.repeat(129))).toBe(false);
    });

    test('counts an emoji as two units, like Better Auth', () => {
        expect(passwordLengthOk('😀'.repeat(64))).toBe(true);
        expect(passwordLengthOk('😀'.repeat(65))).toBe(false);
    });
});

describe('normalizeEmail', () => {
    test('trims and lowercases a valid address', () => {
        expect(normalizeEmail('  First.Last+tag@Example.COM ')).toBe(
            'first.last+tag@example.com'
        );
    });

    test.each([
        ['josé@example.com'],
        ['admin.@example.com'],
        ['a!b@example.com'],
        ['admin@my_host.example.com'],
        ['admin@example.c0m'],
        ['no-at-sign'],
        [`${'a'.repeat(243)}@example.com`],
    ])('rejects %s', (value) => {
        expect(normalizeEmail(value)).toBeUndefined();
    });
});

describe('normalizePublicUrl', () => {
    test('returns the origin, dropping a trailing slash', () => {
        expect(normalizePublicUrl('https://quiz.example.com/')).toBe(
            'https://quiz.example.com'
        );
    });

    test.each([['https://x/sub'], ['ftp://x'], ['garbage'], ['']])(
        'rejects %s',
        (value) => {
            expect(normalizePublicUrl(value)).toBeUndefined();
        }
    );
});

describe('resolvePublicUrl', () => {
    test('prefers the configured URL, then the stored one, then the default', () => {
        const base = { host: '127.0.0.1', port: 8080 };
        expect(
            resolvePublicUrl({
                ...base,
                configured: 'https://a.example',
                stored: 'https://b.example',
            })
        ).toBe('https://a.example');
        expect(resolvePublicUrl({ ...base, stored: 'https://b.example' })).toBe(
            'https://b.example'
        );
        expect(resolvePublicUrl(base)).toBe('http://localhost:8080');
    });
});

describe('USAGE', () => {
    test('documents the headless setup vars', () => {
        expect(USAGE).toContain('QZ_ADMIN_EMAIL');
        expect(USAGE).toContain('QZ_REGISTRATION_MODE');
    });
});
