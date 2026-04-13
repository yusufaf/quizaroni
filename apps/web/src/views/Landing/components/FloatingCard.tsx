import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type FloatingCardProps = {
    label: string;
    title: string;
    body?: ReactNode;
    rotate?: number;
    floatDelay?: number;
    emphasized?: boolean;
};

const FloatingCard = ({
    label,
    title,
    body,
    rotate = 0,
    floatDelay = 0,
    emphasized = false,
}: FloatingCardProps) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    const background = emphasized
        ? `linear-gradient(135deg, ${theme.palette.primary.main}22 0%, transparent 100%)`
        : isDark
          ? '#262626'
          : theme.palette.background.paper;

    const borderColor = emphasized
        ? `${theme.palette.primary.main}66`
        : isDark
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(0, 0, 0, 0.08)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 2 }}
            animate={{
                opacity: 1,
                y: [0, -0.75, 0],
                rotate: [rotate, rotate + 1.2, rotate],
            }}
            transition={{
                opacity: { duration: 0.6, delay: floatDelay * 0.15 },
                y: {
                    duration: 4 + floatDelay * 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: floatDelay * 0.3,
                },
                rotate: {
                    duration: 5 + floatDelay * 0.6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: floatDelay * 0.3,
                },
            }}
            style={{ width: '100%', height: '100%' }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    background,
                    borderRadius: '1.25rem',
                    border: `0.0625rem solid ${borderColor}`,
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: `0 0.75rem 3rem -0.75rem ${theme.palette.primary.main}40`,
                    backdropFilter: emphasized ? 'blur(0.75rem)' : undefined,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '50%',
                        height: '50%',
                        background: `radial-gradient(circle at top right, ${theme.palette.primary.main}14, transparent 70%)`,
                        pointerEvents: 'none',
                    },
                }}
            >
                <Typography
                    sx={{
                        color: theme.palette.primary.main,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    sx={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        lineHeight: 1.2,
                        color: isDark ? '#ffffff' : theme.palette.text.primary,
                    }}
                >
                    {title}
                </Typography>
                {body && (
                    <Box
                        sx={{
                            fontSize: '0.875rem',
                            color: isDark
                                ? 'rgba(255, 255, 255, 0.65)'
                                : theme.palette.text.secondary,
                        }}
                    >
                        {body}
                    </Box>
                )}
            </Box>
        </motion.div>
    );
};

export default FloatingCard;
