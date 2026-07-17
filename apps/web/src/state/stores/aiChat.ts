import { create } from 'zustand';
import { AIChatMode, AIMessage, AIProvider } from 'shared/ai/providers';

export type QueuedPrompt = {
    content: string;
    mode: AIChatMode;
    cardContext?: { term: string; definition: string };
};

type AIChatState = {
    isOpen: boolean;
    mode: AIChatMode;
    messages: AIMessage[];
    isStreaming: boolean;
    streamingContent: string;
    provider: AIProvider | null;
    model: string | null;
    hasApiKey: boolean;
    error: string | null;
    queuedPrompt: QueuedPrompt | null;

    togglePanel: () => void;
    setOpen: (open: boolean) => void;
    setMode: (mode: AIChatMode) => void;
    addMessage: (message: AIMessage) => void;
    setMessages: (messages: AIMessage[]) => void;
    setIsStreaming: (streaming: boolean) => void;
    setStreamingContent: (content: string) => void;
    appendStreamingContent: (chunk: string) => void;
    clearMessages: () => void;
    setProvider: (provider: AIProvider | null) => void;
    setModel: (model: string | null) => void;
    setHasApiKey: (has: boolean) => void;
    setError: (error: string | null) => void;
    setQueuedPrompt: (prompt: QueuedPrompt) => void;
    clearQueuedPrompt: () => void;
    reset: () => void;
};

export const useAIChatStore = create<AIChatState>((set) => ({
    isOpen: false,
    mode: 'chat',
    messages: [],
    isStreaming: false,
    streamingContent: '',
    provider: null,
    model: null,
    hasApiKey: false,
    error: null,
    queuedPrompt: null,

    togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open }),
    setMode: (mode) => set({ mode }),
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
    setMessages: (messages) => set({ messages }),
    setIsStreaming: (isStreaming) => set({ isStreaming }),
    setStreamingContent: (streamingContent) => set({ streamingContent }),
    appendStreamingContent: (chunk) =>
        set((state) => ({ streamingContent: state.streamingContent + chunk })),
    clearMessages: () =>
        set({ messages: [], streamingContent: '', error: null }),
    setProvider: (provider) => set({ provider }),
    setModel: (model) => set({ model }),
    setHasApiKey: (hasApiKey) => set({ hasApiKey }),
    setError: (error) => set({ error }),
    setQueuedPrompt: (queuedPrompt) => set({ queuedPrompt }),
    clearQueuedPrompt: () => set({ queuedPrompt: null }),
    reset: () =>
        set({
            isOpen: false,
            mode: 'chat',
            messages: [],
            isStreaming: false,
            streamingContent: '',
            error: null,
            queuedPrompt: null,
        }),
}));
