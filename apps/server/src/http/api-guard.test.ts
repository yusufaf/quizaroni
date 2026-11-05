import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Hono } from 'hono';
import { apiRequestGuard } from './api-guard';

const TRUSTED = 'https://quiz.example.org';
const EVIL = 'https://evil.example';
const JSON_TYPE = { 'Content-Type': 'application/json' };

function makeApp(): Hono {
    const app = new Hono();
    app.use('/api/*', apiRequestGuard(() => TRUSTED));
    app.all('/api/echo', (c) => c.json({ ok: true }));
    return app;
}

let warn: ReturnType<typeof spyOn>;
beforeEach(() => {
    warn = spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
    warn.mockRestore();
});

function send(
    headers: Record<string, string>,
    method = 'POST',
    app = makeApp()
): Promise<Response> {
    return Promise.resolve(
        app.request('/api/echo', {
            method,
            headers,
            body: method === 'GET' ? undefined : '{}',
        })
    );
}

describe('apiRequestGuard', () => {
    test('lets a GET through whatever its origin', async () => {
        expect((await send({ Origin: EVIL }, 'GET')).status).toBe(200);
    });

    test('allows a JSON POST from the public URL', async () => {
        expect((await send({ Origin: TRUSTED, ...JSON_TYPE })).status).toBe(
            200
        );
        expect(
            (
                await send({
                    Origin: TRUSTED,
                    'Content-Type': 'application/json; charset=utf-8',
                })
            ).status
        ).toBe(200);
    });

    test('blocks another origin with 403 JSON', async () => {
        const res = await send({ Origin: EVIL, ...JSON_TYPE });
        expect(res.status).toBe(403);
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(await res.json()).toEqual({
            message: 'Cross-origin request blocked',
        });
    });

    test('blocks Origin: null unless Sec-Fetch-Site says same-origin', async () => {
        expect((await send({ Origin: 'null', ...JSON_TYPE })).status).toBe(403);
        expect(
            (
                await send({
                    Origin: 'null',
                    'Sec-Fetch-Site': 'same-site',
                    ...JSON_TYPE,
                })
            ).status
        ).toBe(403);
        expect(
            (
                await send({
                    Origin: 'null',
                    'Sec-Fetch-Site': 'same-origin',
                    ...JSON_TYPE,
                })
            ).status
        ).toBe(200);
    });

    test('uses Sec-Fetch-Site when there is no Origin', async () => {
        expect(
            (await send({ 'Sec-Fetch-Site': 'cross-site', ...JSON_TYPE }))
                .status
        ).toBe(403);
        expect(
            (await send({ 'Sec-Fetch-Site': 'same-site', ...JSON_TYPE })).status
        ).toBe(403);
        expect(
            (await send({ 'Sec-Fetch-Site': 'same-origin', ...JSON_TYPE }))
                .status
        ).toBe(200);
    });

    test('lets a non-browser client without Origin or Sec-Fetch-Site through', async () => {
        expect((await send(JSON_TYPE)).status).toBe(200);
    });

    test('requires a JSON content type', async () => {
        for (const type of [
            'text/plain',
            'application/x-www-form-urlencoded',
        ]) {
            const res = await send({ Origin: TRUSTED, 'Content-Type': type });
            expect(res.status).toBe(415);
            expect(await res.json()).toEqual({
                message: 'Content-Type must be application/json',
            });
        }
        expect((await send({ Origin: TRUSTED })).status).toBe(415);
    });

    test('checks the origin before the content type', async () => {
        expect(
            (await send({ Origin: EVIL, 'Content-Type': 'text/plain' })).status
        ).toBe(403);
    });

    test('covers PUT, PATCH and DELETE', async () => {
        for (const method of ['PUT', 'PATCH', 'DELETE']) {
            expect(
                (await send({ Origin: EVIL, ...JSON_TYPE }, method)).status
            ).toBe(403);
        }
    });

    test('warns once per origin for each guard instance', async () => {
        const app = makeApp();
        await send({ Origin: EVIL, ...JSON_TYPE }, 'POST', app);
        await send({ Origin: EVIL, ...JSON_TYPE }, 'POST', app);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0]?.[0])).toContain('QZ_PUBLIC_URL');

        await send({ Origin: EVIL, ...JSON_TYPE }, 'POST', makeApp());
        expect(warn).toHaveBeenCalledTimes(2);
    });
});
