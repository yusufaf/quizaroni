import { Alert, Button, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const AIChatSetupBanner = () => {
    const { t } = useTranslation('ai');
    const navigate = useNavigate();

    return (
        <Box sx={{ p: 2 }}>
            <Alert
                severity="info"
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={() => navigate('/profile?tab=AI')}
                    >
                        {t('aiChat.setup.goToSettings')}
                    </Button>
                }
            >
                {t('aiChat.setup.description')}
            </Alert>
        </Box>
    );
};

export default AIChatSetupBanner;
