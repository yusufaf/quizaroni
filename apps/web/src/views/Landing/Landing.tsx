import { Box, useTheme } from '@mui/material';
import { LazyMotion } from 'framer-motion';
import Hero from './sections/Hero';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import FooterCTA from './sections/FooterCTA';

// Landing is in the entry chunk, so it renders m.* components and loads the
// animation features separately instead of bundling all of framer-motion.
const loadMotionFeatures = () =>
    import('./motionFeatures').then((module) => module.default);

const Landing = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <LazyMotion features={loadMotionFeatures} strict>
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
        </LazyMotion>
    );
};

export default Landing;
