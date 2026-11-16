import { ConfigError, loadConfig, urlHost } from './config';

export const HEALTHCHECK_TIMEOUT_MS = 4000;

const IPV4_LOOPBACK_FOR = new Set(['0.0.0.0', '127.0.0.1', 'localhost']);
const IPV6_LOOPBACK_FOR = new Set(['::', '::1']);

export function healthcheckUrl(host: string, port: number): string {
    const h = IPV4_LOOPBACK_FOR.has(host)
        ? '127.0.0.1'
        : IPV6_LOOPBACK_FOR.has(host)
          ? '[::1]'
          : urlHost(host);
    return `http://${h}:${port}/api/health`;
}

/** Probes the server's /api/health on the configured host and port. Returns the process exit code. */
export async function runHealthcheck(
    argv: string[],
    env: Record<string, string | undefined>,
    cwd: string,
    timeoutMs = HEALTHCHECK_TIMEOUT_MS
): Promise<number> {
    let host: string;
    let port: number;
    try {
        ({ host, port } = loadConfig(argv, env, cwd));
    } catch (err) {
        if (!(err instanceof ConfigError)) throw err;
        console.error(err.message);
        return 1;
    }
    if (port === 0) {
        console.error('healthcheck needs a fixed port (--port or QZ_PORT)');
        return 1;
    }

    const url = healthcheckUrl(host, port);
    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.status !== 200) {
            console.error(`unhealthy: ${url} returned ${res.status}`);
            return 1;
        }
        const body = (await res.json()) as { status?: unknown };
        if (body?.status !== 'ok') {
            console.error(`unhealthy: ${url} reported status ${String(body?.status)}`);
            return 1;
        }
        return 0;
    } catch (err) {
        console.error(`unhealthy: ${url}: ${(err as Error).message}`);
        return 1;
    }
}
