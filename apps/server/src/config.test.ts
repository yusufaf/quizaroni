import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import {
    ConfigError,
    DEFAULT_HOST,
    DEFAULT_PORT,
    loadConfig,
    urlHost,
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
            publicUrl: 'http://localhost:8080',
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

    test('derives the default public URL from a non-local host', () => {
        expect(
            loadConfig(['--host', '192.168.1.5', '--port', '9000'], {}, CWD)
                .publicUrl
        ).toBe('http://192.168.1.5:9000');
    });

    test('derives the default public URL for IPv6 hosts', () => {
        expect(
            loadConfig(['--host', '::1', '--port', '9000'], {}, CWD).publicUrl
        ).toBe('http://localhost:9000');
        expect(
            loadConfig(['--host', 'fe80::1', '--port', '9000'], {}, CWD)
                .publicUrl
        ).toBe('http://[fe80::1]:9000');
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

describe('urlHost', () => {
    test('brackets IPv6 hosts once and leaves others alone', () => {
        expect(urlHost('::1')).toBe('[::1]');
        expect(urlHost('[::1]')).toBe('[::1]');
        expect(urlHost('0.0.0.0')).toBe('0.0.0.0');
        expect(urlHost('localhost')).toBe('localhost');
    });
});
