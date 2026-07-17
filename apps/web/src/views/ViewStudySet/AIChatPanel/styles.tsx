import { Drawer, Box, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

export const AIChatStyledDrawer = styled(Drawer)<{ anchor?: 'left' | 'right' }>(
    ({ theme, anchor }) => ({
        '& .MuiDrawer-paper': {
            position: 'fixed',
            top: '5rem',
            height: 'calc(100vh - 6.5rem)',
            width: '24rem',
            ...(anchor === 'left' ? { left: '1.5rem' } : { right: '1.5rem' }),
            overflowY: 'auto',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            '& > div': {
                background: theme.palette.background.paper,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                boxShadow: theme.shadows[8],
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border:
                    theme.palette.mode === 'light'
                        ? '1px solid rgba(0, 0, 0, 0.08)'
                        : 'none',
            },
        },
    })
);

export const MessageBubble = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser?: boolean }>(({ theme, isUser }) => ({
    padding: '0.75rem 1rem',
    borderRadius: '1rem',
    maxWidth: '85%',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    marginBottom: '1rem',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    backgroundColor: isUser
        ? theme.palette.primary.main
        : theme.palette.mode === 'dark'
          ? theme.palette.grey[800]
          : theme.palette.grey[100],
    color: isUser
        ? theme.palette.primary.contrastText
        : theme.palette.text.primary,
    borderBottomRightRadius: isUser ? '0.25rem' : '1rem',
    borderBottomLeftRadius: isUser ? '1rem' : '0.25rem',
}));

export const ModeChip = styled(Chip, {
    shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
    fontWeight: active ? 'bold' : 'normal',
    backgroundColor: active
        ? theme.palette.primary.main
        : theme.palette.action.hover,
    color: active
        ? theme.palette.primary.contrastText
        : theme.palette.text.primary,
    '&:hover': {
        backgroundColor: active
            ? theme.palette.primary.dark
            : theme.palette.action.selected,
    },
}));

export const ChatInputContainer = styled(Box)(({ theme }) => ({
    padding: '1rem',
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.5rem',
}));

export const EmptyStateBox = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    textAlign: 'center',
    height: '100%',
    flex: 1,
    opacity: 0.7,
});

export const MessagesContainer = styled(Box)(({ theme }) => ({
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    '&::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '&::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[500],
        borderRadius: '0.25rem',
    },
}));
