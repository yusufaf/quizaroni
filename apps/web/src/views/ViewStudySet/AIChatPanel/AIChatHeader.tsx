import { Box, Typography, IconButton } from '@mui/material';
import {
    AutoAwesome,
    DeleteOutline,
    Close,
    DownloadOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { AIChatMode, AI_CHAT_MODES } from 'shared/ai/providers';
import { ModeChip } from './styles';
import { SimpleFlexContainer } from 'shared/styles/AppStyles';

type Props = {
    mode: AIChatMode;
    onModeChange: (mode: AIChatMode) => void;
    onClose: () => void;
    onClear: () => void;
    onExport: () => void;
    canExport: boolean;
};

const AIChatHeader = ({
    mode,
    onModeChange,
    onClose,
    onClear,
    onExport,
    canExport,
}: Props) => {
    const { t } = useTranslation('ai');

    return (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoAwesome color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        {t('aiChat.title')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                        size="small"
                        onClick={onExport}
                        disabled={!canExport}
                        title={t('aiChat.actions.exportChat')}
                    >
                        <DownloadOutlined fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={onClear}
                        title={t('aiChat.messages.clearChat')}
                    >
                        <DeleteOutline fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={onClose}>
                        <Close fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <SimpleFlexContainer sx={{ gap: 1, flexWrap: 'wrap' }}>
                {Object.values(AI_CHAT_MODES).map((m) => (
                    <ModeChip
                        key={m.id}
                        label={`${m.icon} ${t(`aiChat.modes.${m.id}`)}`}
                        active={mode === m.id}
                        onClick={() => onModeChange(m.id as AIChatMode)}
                        size="small"
                    />
                ))}
            </SimpleFlexContainer>
        </Box>
    );
};

export default AIChatHeader;
