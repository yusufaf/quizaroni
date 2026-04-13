import { Box, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const HowItWorks = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const steps = [
        {
            title: t('landing.howItWorks.step1.title'),
            description: t('landing.howItWorks.step1.description'),
        },
        {
            title: t('landing.howItWorks.step2.title'),
            description: t('landing.howItWorks.step2.description'),
        },
        {
            title: t('landing.howItWorks.step3.title'),
            description: t('landing.howItWorks.step3.description'),
        },
    ];

    return (
        <Box
            component="section"
            sx={{
                paddingY: { xs: '4rem', md: '6rem' },
                paddingX: { xs: '1.5rem', md: '3rem' },
            }}
        >
            <Box sx={{ maxWidth: '80rem', marginX: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 1.25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-64px' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <Typography
                        component="h2"
                        sx={{
                            fontSize: { xs: '2rem', md: '3rem' },
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            textAlign: 'center',
                            marginBottom: '5rem',
                            color: isDark
                                ? '#ffffff'
                                : theme.palette.text.primary,
                        }}
                    >
                        {t('landing.howItWorks.sectionTitle')}
                    </Typography>
                </motion.div>

                <Box sx={{ position: 'relative' }}>
                    <Box
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            position: 'absolute',
                            top: '2.5rem',
                            left: '16.66%',
                            right: '16.66%',
                            height: 0,
                            borderTop: `0.125rem dashed ${theme.palette.primary.main}4d`,
                            zIndex: 0,
                        }}
                    />

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(3, 1fr)',
                            },
                            gap: { xs: '3rem', md: '4rem' },
                            position: 'relative',
                            zIndex: 1,
                        }}
                    >
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 1.25 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-64px' }}
                                transition={{
                                    duration: 0.5,
                                    delay: i * 0.15,
                                    ease: 'easeOut',
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '5rem',
                                            height: '5rem',
                                            borderRadius: '999px',
                                            background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                                            color: '#3a2100',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2rem',
                                            fontWeight: 900,
                                            marginBottom: '2rem',
                                            boxShadow: `0 0.75rem 2rem -0.375rem ${theme.palette.primary.main}66`,
                                            border: `0.5rem solid ${isDark ? '#0e0e0e' : '#fafafc'}`,
                                        }}
                                    >
                                        {i + 1}
                                    </Box>
                                    <Typography
                                        sx={{
                                            fontSize: '1.5rem',
                                            fontWeight: 800,
                                            marginBottom: '1rem',
                                            color: isDark
                                                ? '#ffffff'
                                                : theme.palette.text.primary,
                                        }}
                                    >
                                        {step.title}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            maxWidth: '18rem',
                                            color: isDark
                                                ? 'rgba(255, 255, 255, 0.65)'
                                                : theme.palette.text.secondary,
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {step.description}
                                    </Typography>
                                </Box>
                            </motion.div>
                        ))}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default HowItWorks;
