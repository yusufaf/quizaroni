import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { healthcheckUrl, runHealthcheck } from './healthcheck';

const tmp = mkdtempSync(join(tmpdir(), 'qz-healthcheck-'));

async function withServer(
    fetch: () => Response | Promise<Response>,
    fn: (port: number) => Promise<void>
): Promise<void> {
    const srv = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch });
    try {
        await fn(srv.port as number);
    } finally {
        void srv.stop(true);
    }
}

describe('healthcheckUrl', () => {
    test.each([
        ['0.0.0.0', 8080, 'http://127.0.0.1:8080/api/health'],
        ['127.0.0.1', 8080, 'http://127.0.0.1:8080/api/health'],
        ['localhost', 1, 'http://127.0.0.1:1/api/health'],
        ['::', 80, 'http://127.0.0.1:80/api/health'],
        ['::1', 80, 'http://[::1]:80/api/health'],
        ['192.168.1.5', 8080, 'http://192.168.1.5:8080/api/health'],
        ['fe80::1', 8080, 'http://[fe80::1]:8080/api/health'],
    ])('%s:%d', (host, port, expected) => {
        expect(healthcheckUrl(host, port)).toBe(expected);
    });
});

describe('runHealthcheck', () => {
    test('healthy server exits 0', async () => {
        await withServer(
            () => Response.json({ status: 'ok' }),
            async (port) => {
                expect(
                    await runHealthcheck(['--port', String(port)], {}, tmp)
                ).toBe(0);
            }
        );
    });

    test('503 exits 1', async () => {
        await withServer(
            () => Response.json({ status: 'error' }, { status: 503 }),
            async (port) => {
                expect(
                    await runHealthcheck(['--port', String(port)], {}, tmp)
                ).toBe(1);
            }
        );
    });

    test('non-JSON body exits 1', async () => {
        await withServer(
            () => new Response('not json'),
            async (port) => {
                expect(
                    await runHealthcheck(['--port', String(port)], {}, tmp)
                ).toBe(1);
            }
        );
    });

    test('200 with a status other than ok exits 1', async () => {
        await withServer(
            () => Response.json({ status: 'starting' }),
            async (port) => {
                expect(
                    await runHealthcheck(['--port', String(port)], {}, tmp)
                ).toBe(1);
            }
        );
    });

    test('closed port exits 1', async () => {
        const srv = Bun.serve({
            port: 0,
            hostname: '127.0.0.1',
            fetch: () => new Response(),
        });
        const port = srv.port as number;
        await srv.stop(true);
        expect(await runHealthcheck(['--port', String(port)], {}, tmp)).toBe(1);
    });

    test('port 0 exits 1', async () => {
        expect(await runHealthcheck(['--port', '0'], {}, tmp)).toBe(1);
    });

    test('invalid port exits 1', async () => {
        expect(await runHealthcheck(['--port', 'x'], {}, tmp)).toBe(1);
    });

    test('a server that never answers times out and exits 1', async () => {
        await withServer(
            () => new Promise<Response>(() => {}),
            async (port) => {
                expect(
                    await runHealthcheck(['--port', String(port)], {}, tmp, 50)
                ).toBe(1);
            }
        );
    });

    test('connects directly even when a proxy is configured', async () => {
        const saved = { ...process.env };
        // A proxy nobody listens on: going through it would fail the probe.
        process.env.HTTP_PROXY = 'http://127.0.0.1:1';
        process.env.ALL_PROXY = 'http://127.0.0.1:1';
        try {
            await withServer(
                () => Response.json({ status: 'ok' }),
                async (port) => {
                    expect(
                        await runHealthcheck(['--port', String(port)], {}, tmp)
                    ).toBe(0);
                }
            );
        } finally {
            delete process.env.HTTP_PROXY;
            delete process.env.ALL_PROXY;
            Object.assign(process.env, saved);
        }
    });

    test('reads the port from QZ_PORT', async () => {
        await withServer(
            () => Response.json({ status: 'ok' }),
            async (port) => {
                expect(
                    await runHealthcheck([], { QZ_PORT: String(port) }, tmp)
                ).toBe(0);
            }
        );
    });
});
