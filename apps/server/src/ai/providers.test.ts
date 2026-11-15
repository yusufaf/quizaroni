import { describe, expect, test } from 'bun:test';
import {
    AI_PROVIDERS,
    chatRequest,
    MODEL_NAME,
    modelsRequest,
    readChatReply,
    readModels,
} from './providers';
import { CRAFTED_MODELS } from './testing';

const KEY = 'test-key-1';
const input = (model: string) => ({
    model,
    apiKey: KEY,
    system: 'Be brief.',
    messages: [{ role: 'user' as const, content: 'hi' }],
});
const header = (init: RequestInit, name: string) =>
    new Headers(init.headers).get(name);

describe('MODEL_NAME', () => {
    test.each(['gpt-5', 'claude-sonnet-4-5', 'gemini-3.5-flash', 'o3', 'a'])(
        'accepts %p',
        (name) => {
            expect(MODEL_NAME.test(name)).toBe(true);
        }
    );

    test.each(CRAFTED_MODELS)('rejects %p', (name) => {
        expect(MODEL_NAME.test(name)).toBe(false);
    });
});

describe('chatRequest', () => {
    test('builds the OpenAI request', () => {
        const { url, init } = chatRequest('openai', input('gpt-5'));
        expect(url.href).toBe('https://api.openai.com/v1/chat/completions');
        expect(init.method).toBe('POST');
        expect(init.redirect).toBe('error');
        expect(header(init, 'authorization')).toBe(`Bearer ${KEY}`);
        expect(header(init, 'content-type')).toBe('application/json');
        expect(JSON.parse(init.body as string)).toEqual({
            model: 'gpt-5',
            messages: [
                { role: 'system', content: 'Be brief.' },
                { role: 'user', content: 'hi' },
            ],
        });
    });

    test('builds the Anthropic request', () => {
        const { url, init } = chatRequest('anthropic', input('claude-x'));
        expect(url.href).toBe('https://api.anthropic.com/v1/messages');
        expect(init.redirect).toBe('error');
        expect(header(init, 'x-api-key')).toBe(KEY);
        expect(header(init, 'anthropic-version')).toBe('2023-06-01');
        expect(header(init, 'authorization')).toBeNull();
        expect(JSON.parse(init.body as string)).toEqual({
            model: 'claude-x',
            max_tokens: 4096,
            system: 'Be brief.',
            messages: [{ role: 'user', content: 'hi' }],
        });
    });

    test('builds the Google request with the key in a header, not the URL', () => {
        const { url, init } = chatRequest('google', {
            ...input('gemini-3.5-flash'),
            messages: [
                { role: 'user', content: 'hi' },
                { role: 'assistant', content: 'hello' },
            ],
        });
        expect(url.href).toBe(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
        );
        expect(url.href).not.toContain(KEY);
        expect(header(init, 'x-goog-api-key')).toBe(KEY);
        expect(init.redirect).toBe('error');
        expect(JSON.parse(init.body as string)).toEqual({
            systemInstruction: { parts: [{ text: 'Be brief.' }] },
            contents: [
                { role: 'user', parts: [{ text: 'hi' }] },
                { role: 'model', parts: [{ text: 'hello' }] },
            ],
        });
    });

    test.each(
        AI_PROVIDERS.flatMap((p) => CRAFTED_MODELS.map((m) => [p, m] as const))
    )('%s refuses the model name %p', (provider, model) => {
        expect(() => chatRequest(provider, input(model))).toThrow(
            'invalid model'
        );
    });
});

describe('modelsRequest', () => {
    test.each([
        ['openai', 'https://api.openai.com/v1/models'],
        ['anthropic', 'https://api.anthropic.com/v1/models?limit=1000'],
        [
            'google',
            'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
        ],
    ] as const)('%s lists one full page from a fixed URL', (provider, href) => {
        const { url, init } = modelsRequest(provider, KEY);
        expect(url.href).toBe(href);
        expect(url.href).not.toContain(KEY);
        expect(init.method).toBe('GET');
        expect(init.redirect).toBe('error');
    });

    test('sends each provider its own auth header', () => {
        expect(header(modelsRequest('openai', KEY).init, 'authorization')).toBe(
            `Bearer ${KEY}`
        );
        expect(header(modelsRequest('anthropic', KEY).init, 'x-api-key')).toBe(
            KEY
        );
        expect(
            header(modelsRequest('google', KEY).init, 'x-goog-api-key')
        ).toBe(KEY);
    });
});

describe('readChatReply', () => {
    test('reads each provider shape', () => {
        expect(
            readChatReply('openai', { choices: [{ message: { content: 'a' } }] })
        ).toBe('a');
        expect(readChatReply('anthropic', { content: [{ text: 'b' }] })).toBe(
            'b'
        );
        expect(
            readChatReply('google', {
                candidates: [{ content: { parts: [{ text: 'c' }] } }],
            })
        ).toBe('c');
    });

    test.each([
        {},
        { choices: [] },
        { choices: [{ message: { content: 5 } }] },
        null,
        'text',
    ])('returns undefined for %p', (json) => {
        expect(readChatReply('openai', json)).toBeUndefined();
        expect(readChatReply('anthropic', json)).toBeUndefined();
        expect(readChatReply('google', json)).toBeUndefined();
    });
});

describe('readModels', () => {
    test('keeps OpenAI chat models and names them by id', () => {
        expect(
            readModels('openai', {
                data: [
                    { id: 'gpt-5' },
                    { id: 'o3-mini' },
                    { id: 'text-embedding-3-small' },
                    { id: 42 },
                    { id: 'gpt-x/../y' },
                    { id: 'gpt-image-1' },
                    { id: 'gpt-4o-transcribe' },
                    { id: 'gpt-4o-mini-tts' },
                    { id: 'gpt-realtime' },
                    { id: 'gpt-audio' },
                ],
            })
        ).toEqual([
            { id: 'gpt-5', name: 'gpt-5' },
            { id: 'o3-mini', name: 'o3-mini' },
        ]);
    });

    test('uses the Anthropic display name, falling back to the id', () => {
        expect(
            readModels('anthropic', {
                data: [
                    { id: 'claude-a', display_name: 'Claude A' },
                    { id: 'claude-b' },
                ],
            })
        ).toEqual([
            { id: 'claude-a', name: 'Claude A' },
            { id: 'claude-b', name: 'claude-b' },
        ]);
    });

    test('keeps Gemini models and drops names that fail the pattern', () => {
        expect(
            readModels('google', {
                models: [
                    { name: 'models/gemini-3.5-flash', displayName: 'G' },
                    { name: 'models/../x' },
                    { name: 'models/gemini-a/../../b' },
                    { name: 'models/embedding-001' },
                    { name: 'gemini-no-prefix' },
                    { name: 'models/gemini-pro' },
                    {
                        name: 'models/gemini-embedding-001',
                        supportedGenerationMethods: ['embedContent'],
                    },
                    {
                        name: 'models/gemini-live-x',
                        supportedGenerationMethods: ['bidiGenerateContent'],
                    },
                    {
                        name: 'models/gemini-2.5-flash-preview-tts',
                        supportedGenerationMethods: ['generateContent'],
                    },
                    {
                        name: 'models/gemini-2.5-flash',
                        supportedGenerationMethods: ['generateContent'],
                    },
                ],
            })
        ).toEqual([
            { id: 'gemini-3.5-flash', name: 'G' },
            { id: 'gemini-pro', name: 'gemini-pro' },
            { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
        ]);
    });

    test('caps the list at 200 and tolerates unexpected shapes', () => {
        const data = Array.from({ length: 250 }, (_, i) => ({ id: `gpt-${i}` }));
        expect(readModels('openai', { data })).toHaveLength(200);
        expect(readModels('openai', {})).toEqual([]);
        expect(readModels('google', { models: 'x' })).toEqual([]);
        expect(readModels('anthropic', null)).toEqual([]);
    });
});
