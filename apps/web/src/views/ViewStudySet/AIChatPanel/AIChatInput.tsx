import { IconButton, TextField } from '@mui/material';
import { Send, Stop } from '@mui/icons-material';
import { useState, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatInputContainer } from './styles';

type Props = {
    onSend: (content: string) => void;
    onStop: () => void;
    isStreaming: boolean;
    disabled: boolean;
};

const AIChatInput = ({ onSend, onStop, isStreaming, disabled }: Props) => {
    const { t } = useTranslation('ai');
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim() || isStreaming) return;
        onSend(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <ChatInputContainer>
            <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder={t('aiChat.input.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled && !isStreaming}
                variant="outlined"
                size="small"
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '1.5rem',
                    },
                }}
            />
            {isStreaming ? (
                <IconButton
                    color="primary"
                    onClick={onStop}
                    title={t('aiChat.input.stop')}
                    sx={{ alignSelf: 'center' }}
                >
                    <Stop />
                </IconButton>
            ) : (
                <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={!input.trim() || disabled}
                    title={t('aiChat.input.send')}
                    sx={{ alignSelf: 'center' }}
                >
                    <Send />
                </IconButton>
            )}
        </ChatInputContainer>
    );
};

export default AIChatInput;
