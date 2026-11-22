import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const NotFound = () => {
    const { t } = useTranslation();

    return (
        <Box
            sx={{
                maxWidth: '32rem',
                marginX: 'auto',
                paddingX: 2,
                paddingY: 8,
                textAlign: 'center',
            }}
        >
            <Typography component="h1" variant="h5" gutterBottom>
                {t('notFound.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ marginBottom: 3 }}>
                {t('notFound.body')}
            </Typography>
            <Button variant="contained" component={Link} to="/">
                {t('notFound.home')}
            </Button>
        </Box>
    );
};

export default NotFound;
