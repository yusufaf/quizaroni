import {
    Box,
    Button,
    Typography,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VerifiedOutlined as VerifiedIcon } from '@mui/icons-material/';
import FloatingCard from '../components/FloatingCard';

const Hero = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const navigate = useNavigate();
    const isDark = theme.palette.mode === 'dark';
    const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

    return (
        <Box
            component="section"
            sx={{
                position: 'relative',
                paddingTop: { xs: '4rem', md: '6rem' },
                paddingBottom: { xs: '5rem', md: '8rem' },
                paddingX: { xs: '1.5rem', md: '3rem' },
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    maxWidth: '80rem',
                    marginX: 'auto',
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: { xs: '4rem', md: '3rem' },
                    alignItems: 'center',
                }}
            >
                <Box sx={{ position: 'relative', zIndex: 2 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 1.5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <Typography
                            component="h1"
                            sx={{
                                fontSize: { xs: '2.75rem', md: '4.5rem' },
                                fontWeight: 800,
                                lineHeight: 1.05,
                                letterSpacing: '-0.02em',
                                marginBottom: '1.5rem',
                                color: isDark
                                    ? '#ffffff'
                                    : theme.palette.text.primary,
                            }}
                        >
                            {t('landing.hero.headlineStart')}
                            <br />
                            {t('landing.hero.headlineEnd')}{' '}
                            <Box
                                component="span"
                                sx={{
                                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                {t('landing.hero.headlineHighlight')}
                            </Box>
                        </Typography>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 1 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            delay: 0.1,
                            ease: 'easeOut',
                        }}
                    >
                        <Typography
                            sx={{
                                fontSize: { xs: '1.0625rem', md: '1.25rem' },
                                lineHeight: 1.6,
                                maxWidth: '32rem',
                                marginBottom: '2.5rem',
                                color: isDark
                                    ? 'rgba(255, 255, 255, 0.68)'
                                    : theme.palette.text.secondary,
                            }}
                        >
                            {t('landing.hero.subheadline')}
                        </Typography>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 1 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.6,
                            delay: 0.2,
                            ease: 'easeOut',
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                gap: '1rem',
                                marginBottom: '2rem',
                            }}
                        >
                            <Button
                                onClick={() => navigate('/signUp')}
                                sx={{
                                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                                    color: '#3a2100',
                                    fontWeight: 800,
                                    fontSize: '1.0625rem',
                                    textTransform: 'none',
                                    paddingX: '2rem',
                                    paddingY: '1rem',
                                    borderRadius: '999px',
                                    boxShadow: `0 0.75rem 2rem -0.375rem ${theme.palette.primary.main}66`,
                                    transition:
                                        'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    '&:hover': {
                                        transform: 'scale(1.04)',
                                        filter: 'brightness(1.08)',
                                        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                                    },
                                    '&:active': { transform: 'scale(0.96)' },
                                }}
                            >
                                {t('landing.hero.signUpCta')}
                            </Button>
                            <Button
                                onClick={() => navigate('/explore')}
                                sx={{
                                    border: `0.125rem solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)'}`,
                                    color: isDark
                                        ? '#ffffff'
                                        : theme.palette.text.primary,
                                    fontWeight: 800,
                                    fontSize: '1.0625rem',
                                    textTransform: 'none',
                                    paddingX: '2rem',
                                    paddingY: '0.9375rem',
                                    borderRadius: '999px',
                                    transition:
                                        'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    '&:hover': {
                                        background: isDark
                                            ? 'rgba(255, 160, 0, 0.08)'
                                            : 'rgba(255, 160, 0, 0.06)',
                                        borderColor: theme.palette.primary.main,
                                    },
                                    '&:active': { transform: 'scale(0.96)' },
                                }}
                            >
                                {t('landing.hero.exploreCta')}
                            </Button>
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: isDark
                                    ? 'rgba(255, 255, 255, 0.42)'
                                    : 'rgba(0, 0, 0, 0.42)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                            }}
                        >
                            <VerifiedIcon sx={{ fontSize: '1rem' }} />
                            <span>{t('landing.hero.trustLine')}</span>
                        </Box>
                    </motion.div>
                </Box>

                {isMdUp && (
                    <Box
                        sx={{
                            position: 'relative',
                            height: '32rem',
                            width: '100%',
                        }}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '2rem',
                                right: 0,
                                width: '16rem',
                                height: '20rem',
                                transform: 'rotate(6deg)',
                            }}
                        >
                            <FloatingCard
                                label={t('landing.flashcards.biologyLabel')}
                                title={t('landing.flashcards.biologyTerm')}
                                body={t('landing.flashcards.biologyDefinition')}
                                rotate={6}
                                floatDelay={0}
                            />
                        </Box>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '5rem',
                                left: '1rem',
                                width: '15rem',
                                height: '18rem',
                                transform: 'rotate(-12deg)',
                            }}
                        >
                            <FloatingCard
                                label={t('landing.flashcards.spanishLabel')}
                                title={t('landing.flashcards.spanishTerm')}
                                rotate={-12}
                                floatDelay={1}
                            />
                        </Box>
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                right: '2.5rem',
                                width: '16rem',
                                height: '18rem',
                                transform: 'rotate(-4deg)',
                            }}
                        >
                            <FloatingCard
                                label={t('landing.flashcards.calculusLabel')}
                                title={t('landing.flashcards.calculusTerm')}
                                body={
                                    <Box
                                        component="code"
                                        sx={{
                                            display: 'inline-block',
                                            background: isDark
                                                ? '#000000'
                                                : '#f5f5f7',
                                            padding: '0.5rem 0.875rem',
                                            borderRadius: '0.5rem',
                                            color: theme.palette.primary.light,
                                            fontFamily: 'monospace',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {t('landing.flashcards.calculusAnswer')}
                                    </Box>
                                }
                                rotate={-4}
                                floatDelay={2}
                            />
                        </Box>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '14rem',
                                height: '18rem',
                                zIndex: 3,
                            }}
                        >
                            <FloatingCard
                                label={t('landing.flashcards.historyLabel')}
                                title={t('landing.flashcards.historyTerm')}
                                rotate={3}
                                floatDelay={1.5}
                                emphasized
                            />
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default Hero;
