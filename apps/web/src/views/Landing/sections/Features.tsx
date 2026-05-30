import { Box, Typography, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    AutoAwesome as AutoAwesomeIcon,
    Style as StyleIcon,
    QueryStats as QueryStatsIcon,
    GroupAdd as GroupAddIcon,
} from '@mui/icons-material/';
import FeatureCard from '../components/FeatureCard';

const Features = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const features = [
        {
            icon: <AutoAwesomeIcon fontSize="inherit" />,
            title: t('landing.features.create.title'),
            description: t('landing.features.create.description'),
            accent: theme.palette.primary.main,
        },
        {
            icon: <StyleIcon fontSize="inherit" />,
            title: t('landing.features.study.title'),
            description: t('landing.features.study.description'),
            accent: '#fdcf47',
        },
        {
            icon: <QueryStatsIcon fontSize="inherit" />,
            title: t('landing.features.progress.title'),
            description: t('landing.features.progress.description'),
            accent: '#fff2a2',
        },
        {
            icon: <GroupAddIcon fontSize="inherit" />,
            title: t('landing.features.share.title'),
            description: t('landing.features.share.description'),
            accent: theme.palette.primary.light,
        },
    ];

    return (
        <Box
            component="section"
            sx={{
                paddingY: { xs: '4rem', md: '6rem' },
                paddingX: { xs: '1.5rem', md: '3rem' },
                background: isDark ? '#131313' : '#fafafc',
            }}
        >
            <Box sx={{ maxWidth: '80rem', marginX: 'auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 1.25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-64px' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <Box sx={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <Typography
                            component="h2"
                            sx={{
                                fontSize: { xs: '2rem', md: '3rem' },
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                marginBottom: '1rem',
                                color: isDark
                                    ? '#ffffff'
                                    : theme.palette.text.primary,
                            }}
                        >
                            {t('landing.features.sectionTitle')}
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '1.125rem',
                                color: isDark
                                    ? 'rgba(255, 255, 255, 0.65)'
                                    : theme.palette.text.secondary,
                            }}
                        >
                            {t('landing.features.sectionSubtitle')}
                        </Typography>
                    </Box>
                </motion.div>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: 'repeat(4, 1fr)',
                        },
                        gap: '1.5rem',
                    }}
                >
                    {features.map((f, i) => (
                        <FeatureCard
                            key={f.title}
                            icon={f.icon}
                            title={f.title}
                            description={f.description}
                            accentColor={f.accent}
                            index={i}
                        />
                    ))}
                </Box>
            </Box>
        </Box>
    );
};

export default Features;
