import { posix, win32 } from 'node:path';

type Env = Record<string, string | undefined>;

export const PORTABLE_DATA_DIRNAME = 'quizaroni-data';

/** Per-user data folder; LOCALAPPDATA rather than roaming APPDATA so the DB isn't synced. */
export function appDataDir(
    platform: NodeJS.Platform,
    env: Env,
    home: string
): string {
    if (platform === 'win32') {
        return win32.join(
            env.LOCALAPPDATA || win32.join(home, 'AppData', 'Local'),
            'Quizaroni'
        );
    }
    if (platform === 'darwin') {
        return posix.join(home, 'Library', 'Application Support', 'Quizaroni');
    }
    const xdg = env.XDG_DATA_HOME;
    return posix.join(
        xdg && posix.isAbsolute(xdg)
            ? xdg
            : posix.join(home, '.local', 'share'),
        'quizaroni'
    );
}

/** A quizaroni-data folder next to the binary makes it portable; otherwise use app data. */
export function binaryDataDir(o: {
    execPath: string;
    platform: NodeJS.Platform;
    env: Env;
    home: string;
    exists: (path: string) => boolean;
}): string {
    const path = o.platform === 'win32' ? win32 : posix;
    const portable = path.join(path.dirname(o.execPath), PORTABLE_DATA_DIRNAME);
    return o.exists(portable)
        ? portable
        : appDataDir(o.platform, o.env, o.home);
}

export function browserCommand(
    platform: NodeJS.Platform,
    env: Env,
    url: string
): string[] | undefined {
    // rundll32 takes the URL as one argument, so no shell quoting is involved.
    if (platform === 'win32')
        return ['rundll32', 'url.dll,FileProtocolHandler', url];
    if (env.SSH_CONNECTION || env.SSH_TTY) return undefined;
    if (platform === 'darwin') return ['open', url];
    return env.DISPLAY || env.WAYLAND_DISPLAY ? ['xdg-open', url] : undefined;
}

type Spawn = (
    cmd: string[],
    opts: { stdin: 'ignore'; stdout: 'ignore'; stderr: 'ignore' }
) => { unref(): void };

export function openBrowser(
    url: string,
    deps: {
        platform: NodeJS.Platform;
        env: Env;
        spawn: Spawn;
        log: (line: string) => void;
    } = {
        platform: process.platform,
        env: process.env,
        spawn: Bun.spawn,
        log: console.log,
    }
): void {
    const cmd = browserCommand(deps.platform, deps.env, url);
    if (!cmd) return;
    try {
        deps.spawn(cmd, {
            stdin: 'ignore',
            stdout: 'ignore',
            stderr: 'ignore',
        }).unref();
        deps.log(`Opening ${url} in your browser.`);
    } catch {
        deps.log(`Could not open a browser; open ${url} yourself.`);
    }
}
