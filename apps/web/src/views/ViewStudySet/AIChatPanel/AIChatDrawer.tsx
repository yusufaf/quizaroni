import { Box } from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { Studyset } from 'shared/types';
import { useAIChatStore } from 'state/stores/aiChat';
import { getApiKey } from 'shared/ai/aiKeyStorage';
import { streamAIChat } from 'shared/ai/aiService';
import {
    loadConversation,
    saveConversation,
    clearConversation,
} from 'shared/ai/aiChatStorage';
import { parseSuggestedCards } from 'shared/ai/suggestedCards';
import { AIChatMode } from 'shared/ai/providers';
import { useGetUser } from 'state/api/usersAPI';
import AIChatHeader from './AIChatHeader';
import AIChatMessages from './AIChatMessages';
import AIChatInput from './AIChatInput';
import AIChatSetupBanner from './AIChatSetupBanner';

type Props = {
    selectedStudyset: Studyset;
};

type SendOptions = {
    mode?: AIChatMode;
};

const AIChatDrawer = ({ selectedStudyset }: Props) => {
    const { data: { user } = {} } = useGetUser();
    const store = useAIChatStore();
    const abortControllerRef = useRef<AbortController | null>(null);
    const loadedSetRef = useRef<string | null>(null);

    // Sync settings from user metadata
    useEffect(() => {
        if (user?.metadata) {
            store.setProvider(user.metadata.aiProvider || null);
            store.setModel(user.metadata.aiModel || null);

            // Check if API key exists
            if (user.metadata.aiProvider && user.userUUID) {
                getApiKey(user.metadata.aiProvider, user.userUUID).then(
                    (key) => {
                        store.setHasApiKey(!!key);
                    }
                );
            }
        }
    }, [user?.metadata?.aiProvider, user?.metadata?.aiModel, user?.userUUID]);

    // Load persisted conversation when the study set changes
    useEffect(() => {
        const studysetUUID = selectedStudyset.studysetUUID;
        loadedSetRef.current = null;
        loadConversation(studysetUUID).then((messages) => {
            store.setMessages(messages);
            loadedSetRef.current = studysetUUID;
        });
    }, [selectedStudyset.studysetUUID]);

    const handleSend = useCallback(
        async (content: string, options: SendOptions = {}) => {
            const mode = options.mode ?? store.mode;
            if (!store.provider || !store.model || !user?.userUUID) return;

            const apiKey = await getApiKey(store.provider, user.userUUID);
            if (!apiKey) {
                toast.error('API Key not found');
                return;
            }

            const newUserMessage = {
                id: crypto.randomUUID(),
                role: 'user' as const,
                content,
                timestamp: new Date().toISOString(),
                mode,
            };

            store.addMessage(newUserMessage);
            store.setIsStreaming(true);
            store.setError(null);

            const allMessages = [...store.messages, newUserMessage];

            abortControllerRef.current = new AbortController();

            await streamAIChat({
                provider: store.provider,
                model: store.model,
                apiKey,
                messages: allMessages,
                studysetContext: {
                    title: selectedStudyset.title,
                    description: selectedStudyset.description,
                    cards: selectedStudyset.cards.map((c) => ({
                        term: c.term,
                        definition: c.definition,
                    })),
                },
                mode,
                onChunk: (chunk) => {
                    store.appendStreamingContent(chunk);
                },
                onDone: () => {
                    const finalContent =
                        useAIChatStore.getState().streamingContent;
                    if (finalContent) {
                        const suggestedCards =
                            mode === 'suggestCards'
                                ? parseSuggestedCards(finalContent)
                                : undefined;
                        store.addMessage({
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: finalContent,
                            timestamp: new Date().toISOString(),
                            mode,
                            ...(suggestedCards?.length
                                ? { suggestedCards }
                                : {}),
                        });
                    }
                    store.setStreamingContent('');
                    store.setIsStreaming(false);
                    // Persist the updated conversation
                    saveConversation(
                        selectedStudyset.studysetUUID,
                        useAIChatStore.getState().messages
                    );
                },
                onError: (err) => {
                    store.setError(err.message);
                    store.setIsStreaming(false);
                    toast.error(err.message);
                },
                signal: abortControllerRef.current.signal,
            });
        },
        [store, user?.userUUID, selectedStudyset]
    );

    // Consume programmatic prompts queued from elsewhere (explain a card,
    // generate key concepts, suggest cards, etc.)
    useEffect(() => {
        const queued = store.queuedPrompt;
        if (!queued || store.isStreaming) return;
        store.clearQueuedPrompt();
        store.setMode(queued.mode);
        handleSend(queued.content, { mode: queued.mode });
    }, [store.queuedPrompt, store.isStreaming, handleSend]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        store.setIsStreaming(false);
    };

    const handleClear = () => {
        store.clearMessages();
        clearConversation(selectedStudyset.studysetUUID);
    };

    const isReady = store.provider && store.model && store.hasApiKey;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <AIChatHeader
                mode={store.mode}
                onModeChange={store.setMode}
                onClose={store.togglePanel}
                onClear={handleClear}
                onExport={() =>
                    import('shared/ai/exportConversation').then(
                        ({ exportConversation }) =>
                            exportConversation(
                                selectedStudyset.title,
                                store.messages
                            )
                    )
                }
                canExport={store.messages.length > 0}
            />

            {!isReady ? (
                <AIChatSetupBanner />
            ) : (
                <>
                    <AIChatMessages
                        messages={store.messages}
                        streamingContent={store.streamingContent}
                        isStreaming={store.isStreaming}
                        mode={store.mode}
                        studyset={selectedStudyset}
                        onGenerateKeyConcepts={() =>
                            store.setQueuedPrompt({
                                content:
                                    'Generate the key concepts for this study set.',
                                mode: 'keyConcepts',
                            })
                        }
                        onGenerateCards={() =>
                            store.setQueuedPrompt({
                                content:
                                    'Generate 5 new flashcards similar to these.',
                                mode: 'suggestCards',
                            })
                        }
                    />
                    <AIChatInput
                        onSend={(content) => handleSend(content)}
                        onStop={handleStop}
                        isStreaming={store.isStreaming}
                        disabled={!isReady}
                    />
                </>
            )}
        </Box>
    );
};

export default AIChatDrawer;
