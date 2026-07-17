import { AIChatMode, AIMessage, AIProvider } from './providers';

const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

type StreamAIChatParams = {
    provider: AIProvider;
    model: string;
    apiKey: string;
    messages: AIMessage[];
    studysetContext: {
        title: string;
        description?: string;
        cards: { term: string; definition: string }[];
    };
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
        const response = await fetch(`${getApiBaseUrl()}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider,
                model,
                apiKey,
                messages: messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
                studysetContext,
                mode,
            }),
            signal,
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API error: ${response.status} - ${errBody}`);
        }

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
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${getApiBaseUrl()}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
    }
};

export const fetchModels = async (
    provider: AIProvider,
    apiKey: string
): Promise<{ id: string; name: string }[]> => {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${getApiBaseUrl()}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider,
                apiKey,
                action: 'fetchModels',
            }),
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
    }
};
