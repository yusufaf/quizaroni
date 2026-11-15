import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
    apiGet,
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import { FixedWindowLimiter } from './rate-limit';
import type { AiDeps } from './routes';
import { CRAFTED_MODELS } from './testing';

const PROVIDER_FIXTURE = 'test-key-1';

let h: RouteHarness | undefined;
const spies: { mockRestore(): void }[] = [];
afterEach(() => {
    for (const spy of spies.splice(0)) spy.mockRestore();
    h?.close();
    h = undefined;
});

type Call = { url: string; init: RequestInit };

function fakeFetch(reply: () => Response | Promise<Response>) {
    const calls: Call[] = [];
    const fetch = async (url: URL, init: RequestInit) => {
        calls.push({ url: url.href, init });
        return reply();
    };
    return { calls, fetch };
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const googleReply = (text: string) =>
    json({ candidates: [{ content: { parts: [{ text }] } }] });

async function setup(ai?: AiDeps) {
    h = await createRouteHarness(ai ? { ai } : {});
    const { cookie } = await signUp(h);
    return { h, cookie };
}

const chatBody = (over: Record<string, unknown> = {}) => ({
    provider: 'google',
    model: 'gemini-3.5-flash',
    apiKey: PROVIDER_FIXTURE,
    messages: [{ role: 'user', content: 'What is a cell?' }],
    studysetContext: {
        title: 'Cell biology',
        description: 'Organelles',
        cards: [{ term: 'Nucleus', definition: 'Holds DNA' }],
    },
    ...over,
});

function captureConsole() {
    const lines: string[] = [];
    for (const method of ['log', 'warn', 'error'] as const) {
        spies.push(
            spyOn(console, method).mockImplementation((...args: unknown[]) => {
                lines.push(args.map(String).join(' '));
            })
        );
    }
    return lines;
}

describe('GET /api/ai/status', () => {
    test('reports whether AI chat is on, uncached and without a session', async () => {
        h = await createRouteHarness();
        const on = await apiGet(h, '/api/ai/status');
        expect(on.status).toBe(200);
        expect(on.headers.get('Cache-Control')).toBe('no-store');
        expect(await on.json()).toEqual({ enabled: true });
        h.close();

        h = await createRouteHarness({ ai: { enabled: false } });
        expect(await (await apiGet(h, '/api/ai/status')).json()).toEqual({
            enabled: false,
        });
    });
});

describe('access', () => {
    test('rejects chat and models without a session', async () => {
        const upstream = fakeFetch(() => googleReply('hi'));
        h = await createRouteHarness({
            ai: { enabled: true, fetch: upstream.fetch },
        });
        const chat = await apiRequest(h, '/api/ai/chat', { body: chatBody() });
        expect(chat.status).toBe(401);
        const models = await apiRequest(h, '/api/ai/models', {
            body: { provider: 'google', apiKey: PROVIDER_FIXTURE },
        });
        expect(models.status).toBe(401);
        expect(upstream.calls).toHaveLength(0);
    });

    test('answers 404 when AI chat is turned off, signed in or not', async () => {
        const upstream = fakeFetch(() => googleReply('hi'));
        const { h, cookie } = await setup({
            enabled: false,
            fetch: upstream.fetch,
        });
        for (const path of ['/api/ai/chat', '/api/ai/models']) {
            const body =
                path === '/api/ai/chat'
                    ? chatBody()
                    : { provider: 'google', apiKey: PROVIDER_FIXTURE };
            expect(
                (await apiRequest(h, path, { cookie, body })).status
            ).toBe(404);
            expect((await apiRequest(h, path, { body })).status).toBe(404);
        }
        expect(upstream.calls).toHaveLength(0);
    });

    test('refuses a cross-origin POST', async () => {
        const upstream = fakeFetch(() => googleReply('hi'));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody(),
            headers: { Origin: 'https://evil.example' },
        });
        expect(res.status).toBe(403);
        expect(upstream.calls).toHaveLength(0);
    });
});

describe('model names', () => {
    test.each(CRAFTED_MODELS)(
        'rejects %p before any upstream call',
        async (model) => {
            const upstream = fakeFetch(() => googleReply('hi'));
            const { h, cookie } = await setup({
                enabled: true,
                fetch: upstream.fetch,
            });
            const res = await apiRequest(h, '/api/ai/chat', {
                cookie,
                body: chatBody({ model }),
            });
            expect(res.status).toBe(400);
            expect(upstream.calls).toHaveLength(0);
        }
    );
});

describe('POST /api/ai/chat', () => {
    test('calls Google at its fixed URL with the key in a header', async () => {
        const upstream = fakeFetch(() => googleReply('A cell is...'));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody(),
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
        expect(await res.json()).toEqual({ content: 'A cell is...' });
        expect(upstream.calls).toHaveLength(1);
        const [call] = upstream.calls;
        expect(call!.url).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
        );
        expect(call!.url).not.toContain(PROVIDER_FIXTURE);
        expect(new Headers(call!.init.headers).get('x-goog-api-key')).toBe(
            PROVIDER_FIXTURE
        );
        expect(call!.init.redirect).toBe('error');
        expect(call!.init.signal).toBeInstanceOf(AbortSignal);
    });

    test('calls OpenAI and Anthropic with the study set in the system prompt', async () => {
        const upstream = fakeFetch(() =>
            json({
                choices: [{ message: { content: 'openai says' } }],
                content: [{ text: 'anthropic says' }],
            })
        );
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const openai = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody({ provider: 'openai', model: 'gpt-5' }),
        });
        expect(await openai.json()).toEqual({ content: 'openai says' });
        const anthropic = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody({ provider: 'anthropic', model: 'claude-x' }),
        });
        expect(await anthropic.json()).toEqual({ content: 'anthropic says' });

        const [o, a] = upstream.calls;
        expect(o!.url).toBe('https://api.openai.com/v1/chat/completions');
        expect(new Headers(o!.init.headers).get('authorization')).toBe(
            `Bearer ${PROVIDER_FIXTURE}`
        );
        const oBody = JSON.parse(o!.init.body as string);
        expect(oBody.model).toBe('gpt-5');
        expect(oBody.messages[0].role).toBe('system');
        expect(oBody.messages[0].content).toContain('Cell biology');

        expect(a!.url).toBe('https://api.anthropic.com/v1/messages');
        expect(new Headers(a!.init.headers).get('x-api-key')).toBe(
            PROVIDER_FIXTURE
        );
        const aBody = JSON.parse(a!.init.body as string);
        expect(aBody.model).toBe('claude-x');
        expect(aBody.system).toContain('Nucleus');
    });

    test('a key check sends only the fixed test prompt', async () => {
        const upstream = fakeFetch(() => googleReply('Connection successful'));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody({ isTest: true }),
        });
        expect(await res.json()).toEqual({ content: 'Connection successful' });
        const sent = upstream.calls[0]!.init.body as string;
        expect(sent).toContain('testing bot');
        expect(sent).not.toContain('Cell biology');
        expect(sent).not.toContain('What is a cell?');
    });

    test.each([
        ['an unknown provider', chatBody({ provider: 'azure' })],
        [
            'a system message',
            chatBody({ messages: [{ role: 'system', content: 'x' }] }),
        ],
        [
            '51 messages',
            chatBody({
                messages: Array.from({ length: 51 }, () => ({
                    role: 'user',
                    content: 'x',
                })),
            }),
        ],
        ['a key with a newline', chatBody({ apiKey: 'test\nkey' })],
        ['an unknown field', chatBody({ extra: true })],
        [
            'a card over 2,000 characters',
            chatBody({
                studysetContext: {
                    title: 'T',
                    cards: [{ term: 't', definition: 'd'.repeat(2_001) }],
                },
            }),
        ],
    ])('rejects %s', async (_label, body) => {
        const upstream = fakeFetch(() => googleReply('hi'));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/chat', { cookie, body });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ message: 'Invalid request' });
        expect(upstream.calls).toHaveLength(0);
    });

    test('rejects a body that is not JSON', async () => {
        const upstream = fakeFetch(() => googleReply('hi'));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            rawBody: '{not json',
        });
        expect(res.status).toBe(400);
        expect(upstream.calls).toHaveLength(0);
    });

    test('an unreadable reply is a 502', async () => {
        const upstream = fakeFetch(() => json({}));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody(),
        });
        expect(res.status).toBe(502);
        expect(await res.json()).toEqual({
            message: 'Unexpected response from the AI provider',
        });
    });
});

describe('provider failures', () => {
    test('a provider error reaches the user as its status only, with nothing secret logged', async () => {
        const upstream = fakeFetch(() =>
            json(
                {
                    error: `invalid key ${PROVIDER_FIXTURE} for prompt SECRET-PROMPT`,
                },
                401
            )
        );
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const lines = captureConsole();
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody({
                messages: [{ role: 'user', content: 'SECRET-PROMPT' }],
            }),
        });
        const text = await res.text();
        expect(res.status).toBe(502);
        expect(JSON.parse(text)).toEqual({
            message: 'The AI provider returned an error',
            providerStatus: 401,
        });
        expect(lines).toEqual(['AI provider request failed: google 401']);
        for (const output of [text, ...lines]) {
            expect(output).not.toContain(PROVIDER_FIXTURE);
            expect(output).not.toContain('SECRET-PROMPT');
        }
    });

    test('a network error is a 502 that leaks nothing', async () => {
        const upstream = fakeFetch(() => {
            throw new Error(`connect failed ${PROVIDER_FIXTURE}`);
        });
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const lines = captureConsole();
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody(),
        });
        const text = await res.text();
        expect(res.status).toBe(502);
        expect(JSON.parse(text)).toEqual({
            message: 'Could not reach the AI provider',
        });
        for (const output of [text, ...lines]) {
            expect(output).not.toContain(PROVIDER_FIXTURE);
        }
    });

    test('a timeout is a 504', async () => {
        const upstream = fakeFetch(() => {
            throw new DOMException('timed out', 'TimeoutError');
        });
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        captureConsole();
        const res = await apiRequest(h, '/api/ai/chat', {
            cookie,
            body: chatBody(),
        });
        expect(res.status).toBe(504);
        expect(await res.json()).toEqual({
            message: 'The AI provider timed out',
        });
    });
});

describe('rate limit', () => {
    test('limits each user and says when to retry', async () => {
        const upstream = fakeFetch(() => googleReply('hi'));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
            limiter: new FixedWindowLimiter({ windowMs: 60_000, max: 2 }),
        });
        const send = (c: string) =>
            apiRequest(h, '/api/ai/chat', { cookie: c, body: chatBody() });
        expect((await send(cookie)).status).toBe(200);
        expect((await send(cookie)).status).toBe(200);
        const limited = await send(cookie);
        expect(limited.status).toBe(429);
        expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
        expect(upstream.calls).toHaveLength(2);

        const other = await signUp(h);
        expect((await send(other.cookie)).status).toBe(200);
    });

    test('has a default limit of 15 requests a minute', async () => {
        const upstream = fakeFetch(() => json({ models: [] }));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const send = () =>
            apiRequest(h, '/api/ai/models', {
                cookie,
                body: { provider: 'google', apiKey: PROVIDER_FIXTURE },
            });
        for (let i = 0; i < 15; i++) expect((await send()).status).toBe(200);
        expect((await send()).status).toBe(429);
    });
});

describe('POST /api/ai/models', () => {
    test('lists Google models from a fixed URL, dropping unsafe names', async () => {
        const upstream = fakeFetch(() =>
            json({
                models: [
                    { name: 'models/gemini-3.5-flash', displayName: 'G' },
                    { name: 'models/../x' },
                ],
            })
        );
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        const res = await apiRequest(h, '/api/ai/models', {
            cookie,
            body: { provider: 'google', apiKey: PROVIDER_FIXTURE },
        });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            models: [{ id: 'gemini-3.5-flash', name: 'G' }],
        });
        const [call] = upstream.calls;
        expect(call!.url).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'
        );
        expect(call!.init.method).toBe('GET');
        expect(new Headers(call!.init.headers).get('x-goog-api-key')).toBe(
            PROVIDER_FIXTURE
        );
    });

    test('rejects an unknown field or provider', async () => {
        const upstream = fakeFetch(() => json({ models: [] }));
        const { h, cookie } = await setup({
            enabled: true,
            fetch: upstream.fetch,
        });
        for (const body of [
            { provider: 'google', apiKey: PROVIDER_FIXTURE, action: 'x' },
            { provider: 'azure', apiKey: PROVIDER_FIXTURE },
            { provider: 'google' },
        ]) {
            expect(
                (await apiRequest(h, '/api/ai/models', { cookie, body })).status
            ).toBe(400);
        }
        expect(upstream.calls).toHaveLength(0);
    });
});
