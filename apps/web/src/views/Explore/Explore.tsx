import { Box, Typography } from '@mui/material';
import { useLogto } from '@logto/react';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { QUERY_PARAMS } from 'shared/constants';
import { HomeContainer, HomePage, HomePaper } from 'views/Home/HomeStyles';
import CommunitySection from './CommunitySection';
import ExploreSearchField from './ExploreSearchField';
import FeaturedSection from './FeaturedSection';
import PersonalSection from './PersonalSection';
import { activeQuery } from './searchQuery';
import SignUpBanner from './SignUpBanner';

const Explore = () => {
    const { t } = useTranslation('explore');
    useBrowserTitle(t('title'));
    const { isAuthenticated, isLoading } = useLogto();
    const [searchParams] = useSearchParams();
    // While searching, the results sit right under the field: For you and
    // Featured step aside (#137).
    const searching =
        activeQuery(searchParams.get(QUERY_PARAMS.EXPLORE_QUERY)) !== '';

    return (
        <HomePage>
            <HomePaper>
                <HomeContainer>
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            mb: 3,
                        }}
                    >
                        <Typography
                            component="h1"
                            variant="h4"
                            fontWeight={700}
                        >
                            {t('title')}
                        </Typography>
                        <ExploreSearchField />
                    </Box>
                    {/* Logto starts every page load logged out and loading, so
                        the banner waits for it: a signed-in reload mustn't
                        flash a sign-up pitch. */}
                    {isAuthenticated ? (
                        <PersonalSection searching={searching} />
                    ) : (
                        !isLoading && <SignUpBanner />
                    )}
                    {/* Below the empty-library state and the banner too: a
                        new user can still browse public sets. Featured
                        renders nothing until it has sets. */}
                    {!searching && <FeaturedSection />}
                    <Box sx={{ mt: 5 }}>
                        <CommunitySection />
                    </Box>
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Explore;
