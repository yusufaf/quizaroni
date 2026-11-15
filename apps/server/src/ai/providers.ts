export const AI_PROVIDERS = ['openai', 'anthropic', 'google'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

// Letters, digits, dot, underscore and dash only, so a model name can never
// add a path segment, query, fragment, host or Google ":method" suffix.
export const MODEL_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

const ORIGINS: Record<AiProvider, string> = {
    openai: 'https://api.openai.com',
    anthropic: 'https://api.anthropic.com',
    google: 'https://generativelanguage.googleapis.com',
};

const MODELS_LIST_MAX = 200;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type ChatInput = {
    model: string;
    apiKey: string;
    system: string;
    messages: ChatMessage[];
};

export type UpstreamRequest = { url: URL; init: RequestInit };

export type ModelInfo = { id: string; name: string };

function authHeaders(
    provider: AiProvider,
    apiKey: string
): Record<string, string> {
    switch (provider) {
        case 'openai':
            return { Authorization: `Bearer ${apiKey}` };
        case 'anthropic':
            return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
        case 'google':
            return { 'x-goog-api-key': apiKey };
    }
}

function upstreamUrl(
    provider: AiProvider,
    path: string,
    search = ''
): URL {
    const url = new URL(path + search, ORIGINS[provider]);
    if (
        url.origin !== ORIGINS[provider] ||
        url.pathname !== path ||
        url.search !== search ||
        url.hash !== ''
    ) {
        throw new Error('invalid upstream URL');
    }
    return url;
}

function chatBody(provider: AiProvider, input: ChatInput): unknown {
    switch (provider) {
        case 'openai':
            return {
                model: input.model,
                messages: [
                    { role: 'system', content: input.system },
                    ...input.messages,
                ],
            };
        case 'anthropic':
            return {
                model: input.model,
                max_tokens: 4096,
                system: input.system,
                messages: input.messages,
            };
        case 'google':
            return {
                systemInstruction: { parts: [{ text: input.system }] },
                contents: input.messages.map((m) => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }],
                })),
            };
    }
}

const CHAT_PATHS: Record<AiProvider, (model: string) => string> = {
    openai: () => '/v1/chat/completions',
    anthropic: () => '/v1/messages',
    google: (model) =>
        `/v1beta/models/${encodeURIComponent(model)}:generateContent`,
};

export function chatRequest(
    provider: AiProvider,
    input: ChatInput
): UpstreamRequest {
    if (!MODEL_NAME.test(input.model)) throw new Error('invalid model');
    return {
        url: upstreamUrl(provider, CHAT_PATHS[provider](input.model)),
        init: {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders(provider, input.apiKey),
            },
            body: JSON.stringify(chatBody(provider, input)),
            redirect: 'error',
        },
    };
}

const MODELS_URLS: Record<AiProvider, { path: string; search: string }> = {
    openai: { path: '/v1/models', search: '' },
    anthropic: { path: '/v1/models', search: '?limit=1000' },
    google: { path: '/v1beta/models', search: '?pageSize=1000' },
};

export function modelsRequest(
    provider: AiProvider,
    apiKey: string
): UpstreamRequest {
    const { path, search } = MODELS_URLS[provider];
    return {
        url: upstreamUrl(provider, path, search),
        init: {
            method: 'GET',
            headers: authHeaders(provider, apiKey),
            redirect: 'error',
        },
    };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null;

const first = (v: unknown): unknown => (Array.isArray(v) ? v[0] : undefined);

const field = (v: unknown, key: string): unknown =>
    isRecord(v) ? v[key] : undefined;

export function readChatReply(
    provider: AiProvider,
    json: unknown
): string | undefined {
    let text: unknown;
    switch (provider) {
        case 'openai':
            text = field(field(first(field(json, 'choices')), 'message'), 'content');
            break;
        case 'anthropic':
            text = field(first(field(json, 'content')), 'text');
            break;
        case 'google':
            text = field(
                first(
                    field(field(first(field(json, 'candidates')), 'content'), 'parts')
                ),
                'text'
            );
            break;
    }
    return typeof text === 'string' ? text : undefined;
}

const OPENAI_CHAT_MODEL = /gpt|o1|o3|o4/;

function toModel(provider: AiProvider, entry: unknown): ModelInfo | undefined {
    if (provider === 'google') {
        const name = field(entry, 'name');
        if (typeof name !== 'string' || !name.startsWith('models/')) return;
        const id = name.slice('models/'.length);
        if (!id.includes('gemini')) return;
        const displayName = field(entry, 'displayName');
        return { id, name: typeof displayName === 'string' ? displayName : id };
    }
    const id = field(entry, 'id');
    if (typeof id !== 'string') return;
    if (provider === 'openai') {
        return OPENAI_CHAT_MODEL.test(id) ? { id, name: id } : undefined;
    }
    const displayName = field(entry, 'display_name');
    return { id, name: typeof displayName === 'string' ? displayName : id };
}

export function readModels(provider: AiProvider, json: unknown): ModelInfo[] {
    const list = field(json, provider === 'google' ? 'models' : 'data');
    if (!Array.isArray(list)) return [];
    const models: ModelInfo[] = [];
    for (const entry of list) {
        const model = toModel(provider, entry);
        if (model && MODEL_NAME.test(model.id)) models.push(model);
        if (models.length === MODELS_LIST_MAX) break;
    }
    return models;
}
