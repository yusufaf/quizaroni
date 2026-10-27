import { Box, Typography } from '@mui/material';
import { useLogto } from '@logto/react';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { useTranslation } from 'react-i18next';
import { HomeContainer, HomePage, HomePaper } from 'views/Home/HomeStyles';
import CommunitySection from './CommunitySection';
import FeaturedSection from './FeaturedSection';
import PersonalSection from './PersonalSection';
import SignUpBanner from './SignUpBanner';

const Explore = () => {
    const { t } = useTranslation('explore');
    useBrowserTitle(t('title'));
    const { isAuthenticated, isLoading } = useLogto();

    return (
        <HomePage>
            <HomePaper>
                <HomeContainer>
                    <Typography
                        component="h1"
                        variant="h4"
                        fontWeight={700}
                        sx={{ mb: 3 }}
                    >
                        {t('title')}
                    </Typography>
                    {/* Logto starts every page load logged out and loading, so
                        the banner waits for it: a signed-in reload mustn't
                        flash a sign-up pitch. */}
                    {isAuthenticated ? (
                        <PersonalSection />
                    ) : (
                        !isLoading && <SignUpBanner />
                    )}
                    {/* Below the empty-library state and the banner too: a
                        new user can still browse public sets. Featured
                        renders nothing until it has sets. */}
                    <FeaturedSection />
                    <Box sx={{ mt: 5 }}>
                        <CommunitySection />
                    </Box>
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Explore;
