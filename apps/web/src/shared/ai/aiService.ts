import { BASE_API_URL, getCommonPostRequestProps } from 'state/api/awsAPI';
import { AIChatMode, AIMessage, AIProvider } from './providers';

// A little over the server's own upstream timeouts (60 s chat, 15 s models),
// so the server's 504 arrives before the browser gives up.
const KEY_CHECK_TIMEOUT_MS = 65_000;
const MODELS_TIMEOUT_MS = 20_000;

// Mirrors the server's limits, so normal use never gets a 400 or 413.
export const AI_LIMITS = {
    title: 500,
    description: 5_000,
    message: 32_000,
    cardField: 2_000,
    cards: 50,
    history: 40,
    bodyBytes: 900_000,
} as const;

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type StudysetContext = {
    title: string;
    description?: string;
    cards: { term: string; definition: string }[];
};

const dropLeadingAssistant = (turns: ChatTurn[]): ChatTurn[] => {
    const firstUser = turns.findIndex((t) => t.role === 'user');
    return firstUser === -1 ? [] : turns.slice(firstUser);
};

export const toChatHistory = (messages: AIMessage[]): ChatTurn[] => {
    const turns = messages.flatMap((m): ChatTurn[] =>
        m.role === 'system' || m.content === ''
            ? []
            : [{ role: m.role, content: m.content.slice(0, AI_LIMITS.message) }]
    );
    return dropLeadingAssistant(turns.slice(-AI_LIMITS.history));
};

export const buildChatBody = (input: {
    provider: AIProvider;
    model: string;
    apiKey: string;
    messages: AIMessage[];
    studysetContext: StudysetContext;
    mode: AIChatMode;
}): string => {
    const { studysetContext: ctx } = input;
    const studysetContext = {
        title: ctx.title.slice(0, AI_LIMITS.title),
        description: ctx.description?.slice(0, AI_LIMITS.description),
        cards: ctx.cards.slice(0, AI_LIMITS.cards).map((c) => ({
            term: c.term.slice(0, AI_LIMITS.cardField),
            definition: c.definition.slice(0, AI_LIMITS.cardField),
        })),
    };
    const encoder = new TextEncoder();
    let messages = toChatHistory(input.messages);
    const serialise = () =>
        JSON.stringify({
            provider: input.provider,
            model: input.model,
            apiKey: input.apiKey,
            messages,
            studysetContext,
            mode: input.mode,
        });
    let body = serialise();
    while (
        encoder.encode(body).length > AI_LIMITS.bodyBytes &&
        messages.length > 1
    ) {
        messages = dropLeadingAssistant(messages.slice(1));
        body = serialise();
    }
    return body;
};

const errorFrom = async (response: Response): Promise<Error> => {
    const body: unknown = await response.json().catch(() => undefined);
    const message =
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { message?: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `AI request failed (${response.status})`;
    return new Error(message);
};

type StreamAIChatParams = {
    provider: AIProvider;
    model: string;
    apiKey: string;
    messages: AIMessage[];
    studysetContext: StudysetContext;
    mode: AIChatMode;
    onChunk: (chunk: string) => void;
    onDone: () => void;
    onError: (error: Error) => void;
    signal: AbortSignal;
};

export const streamAIChat = async ({
    provider,
    model,
    apiKey,
    messages,
    studysetContext,
    mode,
    onChunk,
    onDone,
    onError,
    signal,
}: StreamAIChatParams) => {
    try {
        const response = await fetch(`${BASE_API_URL}/ai/chat`, {
            ...(await getCommonPostRequestProps()),
            body: buildChatBody({
                provider,
                model,
                apiKey,
                messages,
                studysetContext,
                mode,
            }),
            signal,
        });

        if (!response.ok) throw await errorFrom(response);

        // For now, non-streaming parsing (as proxy sends json back)
        const data = await response.json();
        if (data && data.content) {
            onChunk(data.content);
        }
        onDone();
    } catch (err: any) {
        if (err.name === 'AbortError') {
            return;
        }
        onError(err);
    }
};

export const testAPIKey = async (
    provider: AIProvider,
    model: string,
    apiKey: string
): Promise<boolean> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), KEY_CHECK_TIMEOUT_MS);
    try {
        const response = await fetch(`${BASE_API_URL}/ai/chat`, {
            ...(await getCommonPostRequestProps()),
            body: JSON.stringify({
                provider,
                model,
                apiKey,
                messages: [
                    {
                        role: 'user',
                        content:
                            'Say exactly: "Connection successful" and nothing else.',
                    },
                ],
                studysetContext: { title: 'Test', cards: [] },
                mode: 'chat',
                isTest: true,
            }),
            signal: controller.signal,
        });

        return response.ok;
    } catch (err) {
        return false;
    } finally {
        clearTimeout(timer);
    }
};

export const fetchModels = async (
    provider: AIProvider,
    apiKey: string
): Promise<{ id: string; name: string }[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODELS_TIMEOUT_MS);
    try {
        const response = await fetch(`${BASE_API_URL}/ai/models`, {
            ...(await getCommonPostRequestProps()),
            body: JSON.stringify({ provider, apiKey }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }

        const data = await response.json();
        return data.models || [];
    } catch (err) {
        console.error('Error fetching models:', err);
        return [];
    } finally {
        clearTimeout(timer);
    }
};
