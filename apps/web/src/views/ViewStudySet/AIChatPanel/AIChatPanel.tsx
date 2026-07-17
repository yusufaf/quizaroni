import { Fab, Tooltip, Box } from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Studyset } from 'shared/types';
import { useAIChatStore } from 'state/stores/aiChat';
import { AIChatStyledDrawer } from './styles';
import AIChatDrawer from './AIChatDrawer';
import { AI_PANEL_POSITIONS } from 'shared/constants';

type Props = {
    selectedStudyset: Studyset;
    notesDrawerPosition: 'left' | 'right';
};

const AIChatPanel = ({ selectedStudyset, notesDrawerPosition }: Props) => {
    const { t } = useTranslation('ai');
    const { isOpen, togglePanel } = useAIChatStore();

    const aiPanelPosition =
        notesDrawerPosition === 'right'
            ? AI_PANEL_POSITIONS.LEFT
            : AI_PANEL_POSITIONS.RIGHT;

    const fabPosition =
        aiPanelPosition === 'left' ? { left: '1.5rem' } : { right: '1.5rem' };

    return (
        <>
            {!isOpen && (
                <Tooltip
                    title={t('aiChat.openPanel') || 'Open AI Assistant'}
                    placement={aiPanelPosition === 'left' ? 'right' : 'left'}
                >
                    <Fab
                        color="primary"
                        onClick={togglePanel}
                        sx={{
                            position: 'fixed',
                            top: '25rem',
                            ...fabPosition,
                            zIndex: 10, // above other content
                        }}
                    >
                        <AutoAwesome />
                    </Fab>
                </Tooltip>
            )}

            <AIChatStyledDrawer
                anchor={aiPanelPosition as 'left' | 'right'}
                variant="persistent"
                open={isOpen}
            >
                <Box>
                    <AIChatDrawer selectedStudyset={selectedStudyset} />
                </Box>
            </AIChatStyledDrawer>
        </>
    );
};

export default AIChatPanel;
