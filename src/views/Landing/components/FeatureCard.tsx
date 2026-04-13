import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type FeatureCardProps = {
    icon: ReactNode;
    title: string;
    description: string;
    accentColor?: string;
    index?: number;
};

const FeatureCard = ({
    icon,
    title,
    description,
    accentColor,
    index = 0,
}: FeatureCardProps) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const accent = accentColor ?? theme.palette.primary.main;

    return (
        <motion.div
            initial={{ opacity: 0, y: 1.5 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-96px' }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
            whileHover={{ y: -0.375 }}
            style={{ height: '100%' }}
        >
            <Box
                sx={{
                    height: '100%',
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: isDark
                        ? '#1a1a1a'
                        : theme.palette.background.paper,
                    border: `0.0625rem solid ${isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)'}`,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    '&:hover': {
                        borderColor: `${accent}33`,
                        background: isDark
                            ? '#20201f'
                            : theme.palette.background.paper,
                        boxShadow: `0 0.75rem 2rem -0.5rem ${accent}2a`,
                    },
                    '&:hover .feature-icon': {
                        transform: 'scale(1.1)',
                    },
                }}
            >
                <Box
                    className="feature-icon"
                    sx={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '999px',
                        background: `${accent}1a`,
                        color: accent,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        transition:
                            'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    {icon}
                </Box>
                <Typography
                    sx={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isDark ? '#ffffff' : theme.palette.text.primary,
                    }}
                >
                    {title}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '0.9375rem',
                        lineHeight: 1.6,
                        color: isDark
                            ? 'rgba(255, 255, 255, 0.65)'
                            : theme.palette.text.secondary,
                    }}
                >
                    {description}
                </Typography>
            </Box>
        </motion.div>
    );
};

export default FeatureCard;
