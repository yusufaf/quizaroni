export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AIChatMode =
    | 'chat'
    | 'quiz'
    | 'explain'
    | 'keyConcepts'
    | 'suggestCards';

export type SuggestedCard = {
    term: string;
    definition: string;
};

export type AIMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    mode?: AIChatMode;
    suggestedCards?: SuggestedCard[];
};

export const AI_PROVIDERS = {
    openai: {
        id: 'openai',
        name: 'OpenAI',
        icon: '🟢',
        models: [
            { id: 'gpt-5.5', name: 'GPT-5.5', recommended: true },
            { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', recommended: false },
            { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', recommended: false },
        ],
        keyPrefix: 'sk-',
        keyPlaceholder: 'sk-...',
        docsUrl: 'https://platform.openai.com/api-keys',
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        icon: '🟠',
        models: [
            {
                id: 'claude-sonnet-4.6',
                name: 'Claude Sonnet 4.6',
                recommended: true,
            },
            {
                id: 'claude-opus-4.8',
                name: 'Claude Opus 4.8',
                recommended: false,
            },
            {
                id: 'claude-haiku-4.5',
                name: 'Claude Haiku 4.5',
                recommended: false,
            },
        ],
        keyPrefix: 'sk-ant-',
        keyPlaceholder: 'sk-ant-...',
        docsUrl: 'https://console.anthropic.com/settings/keys',
    },
    google: {
        id: 'google',
        name: 'Google Gemini',
        icon: '🔵',
        models: [
            {
                id: 'gemini-3.5-flash',
                name: 'Gemini 3.5 Flash',
                recommended: true,
            },
            {
                id: 'gemini-3.1-pro',
                name: 'Gemini 3.1 Pro',
                recommended: false,
            },
            {
                id: 'gemini-3.1-flash-lite',
                name: 'Gemini 3.1 Flash-Lite',
                recommended: false,
            },
        ],
        keyPrefix: 'AIza',
        keyPlaceholder: 'AIza...',
        docsUrl: 'https://aistudio.google.com/apikey',
    },
} as const;

export const AI_CHAT_MODES = {
    chat: {
        id: 'chat',
        name: 'Chat',
        icon: '💬',
        description: 'Ask questions about your study material',
    },
    quiz: {
        id: 'quiz',
        name: 'Quiz Me',
        icon: '🧠',
        description: 'Test your knowledge with AI-generated questions',
    },
    explain: {
        id: 'explain',
        name: 'Explain',
        icon: '📖',
        description: 'Get detailed explanations of concepts',
    },
    keyConcepts: {
        id: 'keyConcepts',
        name: 'Key Concepts',
        icon: '🔑',
        description: 'Discover the most important takeaways',
    },
    suggestCards: {
        id: 'suggestCards',
        name: 'Suggest Cards',
        icon: '✨',
        description: 'Generate new flashcards similar to these',
    },
} as const;
