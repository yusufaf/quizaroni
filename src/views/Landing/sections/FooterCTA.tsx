import { Box, Button, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const FooterCTA = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <Box
            component="section"
            sx={{
                paddingX: { xs: '1.5rem', md: '3rem' },
                paddingBottom: '4rem',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 1.5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-64px' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
            >
                <Box
                    sx={{
                        maxWidth: '80rem',
                        marginX: 'auto',
                        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                        borderRadius: '2rem',
                        paddingX: { xs: '2rem', md: '4rem' },
                        paddingY: { xs: '4rem', md: '6rem' },
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: `0 1.5rem 4rem -0.75rem ${theme.palette.primary.main}4d`,
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '-5rem',
                            right: '-5rem',
                            width: '20rem',
                            height: '20rem',
                            borderRadius: '999px',
                            background: 'rgba(255, 255, 255, 0.12)',
                            filter: 'blur(4rem)',
                            pointerEvents: 'none',
                        }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '-5rem',
                            left: '-5rem',
                            width: '20rem',
                            height: '20rem',
                            borderRadius: '999px',
                            background: 'rgba(255, 255, 255, 0.12)',
                            filter: 'blur(4rem)',
                            pointerEvents: 'none',
                        }}
                    />

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography
                            component="h2"
                            sx={{
                                fontSize: { xs: '2rem', md: '3.5rem' },
                                fontWeight: 900,
                                lineHeight: 1.1,
                                letterSpacing: '-0.03em',
                                color: '#3a2100',
                                marginBottom: '1.5rem',
                            }}
                        >
                            {t('landing.footerCta.headline')}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: { xs: '1rem', md: '1.25rem' },
                                color: 'rgba(58, 33, 0, 0.72)',
                                fontWeight: 500,
                                marginBottom: '2.5rem',
                                maxWidth: '32rem',
                                marginX: 'auto',
                            }}
                        >
                            {t('landing.footerCta.subheadline')}
                        </Typography>
                        <Button
                            onClick={() => navigate('/signUp')}
                            sx={{
                                background: '#0e0e0e',
                                color: theme.palette.primary.light,
                                fontWeight: 800,
                                fontSize: '1.125rem',
                                textTransform: 'none',
                                paddingX: '2.5rem',
                                paddingY: '1.125rem',
                                borderRadius: '999px',
                                boxShadow:
                                    '0 1rem 2.5rem -0.5rem rgba(0, 0, 0, 0.4)',
                                transition:
                                    'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                '&:hover': {
                                    background: '#1a1a1a',
                                    transform: 'scale(1.04)',
                                },
                                '&:active': { transform: 'scale(0.96)' },
                            }}
                        >
                            {t('landing.footerCta.button')}
                        </Button>
                    </Box>
                </Box>
            </motion.div>
        </Box>
    );
};

export default FooterCTA;
