import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AIMessage, AIChatMode } from 'shared/ai/providers';
import { Studyset } from 'shared/types';
import { MessageBubble, MessagesContainer, EmptyStateBox } from './styles';
import { AutoAwesome, Key, AutoFixHigh } from '@mui/icons-material';
import SuggestedCards from './SuggestedCards';

type Props = {
    messages: AIMessage[];
    streamingContent: string;
    isStreaming: boolean;
    mode: AIChatMode;
    studyset: Studyset;
    onGenerateKeyConcepts: () => void;
    onGenerateCards: () => void;
};

const AIChatMessages = ({
    messages,
    streamingContent,
    isStreaming,
    mode,
    studyset,
    onGenerateKeyConcepts,
    onGenerateCards,
}: Props) => {
    const { t } = useTranslation('ai');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent]);

    if (messages.length === 0 && !streamingContent) {
        return (
            <EmptyStateBox>
                <AutoAwesome sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">
                    {t('aiChat.messages.emptyState')}
                </Typography>
                {mode === 'keyConcepts' && (
                    <Button
                        variant="contained"
                        startIcon={<Key />}
                        onClick={onGenerateKeyConcepts}
                        sx={{ mt: 2 }}
                    >
                        {t('aiChat.actions.generateKeyConcepts')}
                    </Button>
                )}
                {mode === 'suggestCards' && (
                    <Button
                        variant="contained"
                        startIcon={<AutoFixHigh />}
                        onClick={onGenerateCards}
                        sx={{ mt: 2 }}
                    >
                        {t('aiChat.actions.generateCards')}
                    </Button>
                )}
            </EmptyStateBox>
        );
    }

    return (
        <MessagesContainer>
            {messages.map((msg) => (
                <Box key={msg.id}>
                    <MessageBubble isUser={msg.role === 'user'}>
                        {msg.content}
                    </MessageBubble>
                    {msg.suggestedCards && msg.suggestedCards.length > 0 && (
                        <SuggestedCards
                            cards={msg.suggestedCards}
                            studyset={studyset}
                        />
                    )}
                </Box>
            ))}

            {streamingContent && (
                <MessageBubble isUser={false}>{streamingContent}</MessageBubble>
            )}

            {isStreaming && !streamingContent && (
                <MessageBubble isUser={false}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption">Thinking...</Typography>
                    </Box>
                </MessageBubble>
            )}
            <div ref={bottomRef} />
        </MessagesContainer>
    );
};

export default AIChatMessages;
