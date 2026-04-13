import { Box, useTheme } from '@mui/material';
import Hero from './sections/Hero';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import FooterCTA from './sections/FooterCTA';

const Landing = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            sx={{
                position: 'relative',
                minHeight: '100%',
                background: isDark ? '#0e0e0e' : '#fafafc',
                backgroundImage: isDark
                    ? 'radial-gradient(circle, #262626 0.0625rem, transparent 0.0625rem)'
                    : 'radial-gradient(circle, rgba(0, 0, 0, 0.06) 0.0625rem, transparent 0.0625rem)',
                backgroundSize: '2rem 2rem',
                overflowX: 'hidden',
            }}
        >
            <Hero />
            <Features />
            <HowItWorks />
            <FooterCTA />
        </Box>
    );
};

export default Landing;
