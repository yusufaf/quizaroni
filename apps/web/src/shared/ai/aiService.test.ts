import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('shared/auth/backend', () => ({ isSelfHost: () => true }));

import {
    AI_LIMITS,
    buildChatBody,
    fetchModels,
    streamAIChat,
    testAPIKey,
} from './aiService';
import type { AIMessage } from './providers';

const msg = (role: AIMessage['role'], content: string, i = 0): AIMessage => ({
    id: `m${i}`,
    role,
    content,
    timestamp: '2026-11-15T00:00:00.000Z',
});

const ctx = { title: 'Cells', description: 'Organelles', cards: [] };

const stubFetch = (status = 200, body: unknown = { content: 'hi' }) => {
    const fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    );
    vi.stubGlobal('fetch', fetch);
    return fetch;
};

const sentBody = (fetch: ReturnType<typeof vi.fn>) =>
    JSON.parse(fetch.mock.calls[0]![1].body as string);

const chat = (over: Partial<Parameters<typeof streamAIChat>[0]> = {}) => {
    const onChunk = vi.fn();
    const onError = vi.fn();
    const done = streamAIChat({
        provider: 'google',
        model: 'gemini-3.5-flash',
        apiKey: 'test-key-1',
        messages: [msg('user', 'hi')],
        studysetContext: ctx,
        mode: 'chat',
        onChunk,
        onDone: vi.fn(),
        onError,
        signal: new AbortController().signal,
        ...over,
    });
    return { done, onChunk, onError };
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('streamAIChat', () => {
    it('posts to the server with the session cookie', async () => {
        const fetch = stubFetch();
        const { done, onChunk } = chat();
        await done;
        expect(fetch.mock.calls[0]![0]).toBe('/api/ai/chat');
        expect(fetch.mock.calls[0]![1].credentials).toBe('same-origin');
        expect(fetch.mock.calls[0]![1].method).toBe('POST');
        expect(onChunk).toHaveBeenCalledWith('hi');
    });

    it('passes the server message on to onError', async () => {
        stubFetch(429, { message: 'Too many AI requests. Try again shortly.' });
        const { done, onError } = chat();
        await done;
        expect(onError.mock.calls[0]![0].message).toBe(
            'Too many AI requests. Try again shortly.'
        );
    });

    it('falls back to the status when the error has no message', async () => {
        stubFetch(500, {});
        const { done, onError } = chat();
        await done;
        expect(onError.mock.calls[0]![0].message).toBe(
            'AI request failed (500)'
        );
    });
});

describe('buildChatBody', () => {
    const build = (over: Partial<Parameters<typeof buildChatBody>[0]> = {}) =>
        JSON.parse(
            buildChatBody({
                provider: 'google',
                model: 'gemini-3.5-flash',
                apiKey: 'test-key-1',
                messages: [msg('user', 'hi')],
                studysetContext: ctx,
                mode: 'chat',
                ...over,
            })
        );

    it('keeps the last 40 turns, starting with a user message', () => {
        const messages = Array.from({ length: 45 }, (_, i) =>
            msg(i % 2 === 0 ? 'user' : 'assistant', `turn ${i}`, i)
        );
        const sent = build({ messages }).messages;
        expect(sent.length).toBeLessThanOrEqual(40);
        expect(sent[0].role).toBe('user');
        expect(sent.at(-1).content).toBe('turn 44');
    });

    it('drops system and empty messages', () => {
        const sent = build({
            messages: [
                msg('system', 'x'),
                msg('user', ''),
                msg('user', 'real'),
            ],
        }).messages;
        expect(sent).toEqual([{ role: 'user', content: 'real' }]);
    });

    it('clamps the study set and long messages to the server limits', () => {
        const cards = Array.from({ length: 60 }, (_, i) => ({
            term: `t${i}`,
            definition: 'd'.repeat(3_000),
        }));
        const sent = build({
            studysetContext: {
                title: 't'.repeat(600),
                description: 'd'.repeat(6_000),
                cards,
            },
            messages: [
                msg('user', 'q', 0),
                msg('assistant', 'a'.repeat(40_000), 1),
                msg('user', 'next', 2),
            ],
        });
        expect(sent.studysetContext.title).toHaveLength(AI_LIMITS.title);
        expect(sent.studysetContext.description).toHaveLength(5_000);
        expect(sent.studysetContext.cards).toHaveLength(50);
        expect(sent.studysetContext.cards[0].definition).toHaveLength(2_000);
        expect(sent.messages[1].content).toHaveLength(32_000);
    });

    it('trims the oldest turns until the body fits', () => {
        const messages = Array.from({ length: 40 }, (_, i) =>
            msg(i % 2 === 0 ? 'user' : 'assistant', 'x'.repeat(30_000), i)
        );
        messages.push(msg('user', 'newest', 40));
        const body = buildChatBody({
            provider: 'google',
            model: 'gemini-3.5-flash',
            apiKey: 'test-key-1',
            messages,
            studysetContext: ctx,
            mode: 'chat',
        });
        expect(new TextEncoder().encode(body).length).toBeLessThanOrEqual(
            AI_LIMITS.bodyBytes
        );
        const sent = JSON.parse(body).messages;
        expect(sent[0].role).toBe('user');
        expect(sent.at(-1).content).toBe('newest');
    });
});

describe('testAPIKey', () => {
    it('sends a key check to the chat route', async () => {
        const fetch = stubFetch();
        expect(await testAPIKey('openai', 'gpt-5', 'test-key-1')).toBe(true);
        expect(fetch.mock.calls[0]![0]).toBe('/api/ai/chat');
        expect(sentBody(fetch).isTest).toBe(true);
    });
});

describe('fetchModels', () => {
    it('posts the provider and key to the models route', async () => {
        const fetch = stubFetch(200, { models: [{ id: 'g', name: 'G' }] });
        expect(await fetchModels('google', 'test-key-1')).toEqual([
            { id: 'g', name: 'G' },
        ]);
        expect(fetch.mock.calls[0]![0]).toBe('/api/ai/models');
        expect(sentBody(fetch)).toEqual({
            provider: 'google',
            apiKey: 'test-key-1',
        });
    });
});
