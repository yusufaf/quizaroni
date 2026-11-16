import { describe, expect, test } from 'bun:test';
import {
    appDataDir,
    binaryDataDir,
    browserCommand,
    openBrowser,
} from './launcher';

const URL = 'http://localhost:8080';

describe('appDataDir', () => {
    test('uses LOCALAPPDATA on Windows, spaces and all', () => {
        expect(
            appDataDir(
                'win32',
                { LOCALAPPDATA: 'C:\\Users\\Ada Lovelace\\AppData\\Local' },
                'C:\\Users\\Ada Lovelace'
            )
        ).toBe('C:\\Users\\Ada Lovelace\\AppData\\Local\\Quizaroni');
    });

    test('falls back to the home AppData\\Local folder on Windows', () => {
        expect(appDataDir('win32', {}, 'C:\\Users\\Ada')).toBe(
            'C:\\Users\\Ada\\AppData\\Local\\Quizaroni'
        );
    });

    test('uses Application Support on macOS', () => {
        expect(appDataDir('darwin', {}, '/Users/ada')).toBe(
            '/Users/ada/Library/Application Support/Quizaroni'
        );
    });

    test('uses an absolute XDG_DATA_HOME on Linux', () => {
        expect(appDataDir('linux', { XDG_DATA_HOME: '/xdg' }, '/home/ada')).toBe(
            '/xdg/quizaroni'
        );
    });

    test('ignores a relative XDG_DATA_HOME', () => {
        expect(appDataDir('linux', { XDG_DATA_HOME: 'rel' }, '/home/ada')).toBe(
            '/home/ada/.local/share/quizaroni'
        );
    });
});

describe('binaryDataDir', () => {
    const execPath =
        'C:\\Program Files Portable\\Quizaroni\\quizaroni-windows-x64.exe';
    const portable = 'C:\\Program Files Portable\\Quizaroni\\quizaroni-data';
    const base = {
        execPath,
        platform: 'win32' as const,
        env: { LOCALAPPDATA: 'C:\\Users\\Ada\\AppData\\Local' },
        home: 'C:\\Users\\Ada',
    };

    test('prefers a quizaroni-data folder next to the binary', () => {
        expect(
            binaryDataDir({ ...base, exists: (p) => p === portable })
        ).toBe(portable);
    });

    test('otherwise uses the app-data folder', () => {
        expect(binaryDataDir({ ...base, exists: () => false })).toBe(
            'C:\\Users\\Ada\\AppData\\Local\\Quizaroni'
        );
    });
});

describe('browserCommand', () => {
    test.each([
        ['win32', {}, ['rundll32', 'url.dll,FileProtocolHandler', URL]],
        ['darwin', {}, ['open', URL]],
        ['linux', { DISPLAY: ':0' }, ['xdg-open', URL]],
        ['linux', { WAYLAND_DISPLAY: 'wayland-0' }, ['xdg-open', URL]],
        ['linux', {}, undefined],
        ['darwin', { SSH_CONNECTION: '1.2.3.4 22 5.6.7.8 22' }, undefined],
        ['linux', { DISPLAY: ':0', SSH_TTY: '/dev/pts/0' }, undefined],
    ] as const)('%s %o', (platform, env, expected) => {
        expect(browserCommand(platform, env, URL)).toEqual(
            expected === undefined ? undefined : [...expected]
        );
    });
});

describe('openBrowser', () => {
    const run = (
        env: Record<string, string>,
        spawn: (cmd: string[]) => { unref(): void }
    ) => {
        const logs: string[] = [];
        const calls: string[][] = [];
        openBrowser(URL, {
            platform: 'linux',
            env,
            spawn: (cmd) => {
                calls.push(cmd);
                return spawn(cmd);
            },
            log: (line) => logs.push(line),
        });
        return { logs, calls };
    };

    test('spawns the browser command without waiting for it', () => {
        let unrefs = 0;
        const { logs, calls } = run({ DISPLAY: ':0' }, () => ({
            unref: () => {
                unrefs++;
            },
        }));
        expect(calls).toEqual([['xdg-open', URL]]);
        expect(unrefs).toBe(1);
        expect(logs.join('\n')).toContain('Opening');
    });

    test('only logs when the browser command fails', () => {
        const { logs } = run({ DISPLAY: ':0' }, () => {
            throw new Error('Executable not found in $PATH');
        });
        expect(logs.join('\n')).toContain('Could not open a browser');
    });

    test('does nothing without a desktop', () => {
        const { logs, calls } = run({}, () => ({ unref() {} }));
        expect(calls).toEqual([]);
        expect(logs).toEqual([]);
    });
});
