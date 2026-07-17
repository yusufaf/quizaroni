import { Tabs } from '@mui/material/';
import { SyntheticEvent, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AccountTab from './AccountTab';
import AccessibilityTab from './AccessibilityTab';
import CustomizationTab from './CustomizationTab';
import JsonSettingsTab from './JsonSettingsTab';
import AchievementsTab from './AchievementsTab';
import ProfileCard from './ProfileCard';
import AISettingsTab from './AISettingsTab';
import {
    ProfileContainer,
    ProfilePage,
    ProfilePaper,
    ProfileTab,
} from './ProfileStyles';
import { useGetUser } from 'state/api/usersAPI';
import {
    DEFAULT_USER_RESPONSE,
    PAGE_TITLES,
    QUERY_PARAMS,
} from 'shared/constants';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { useTranslation } from 'react-i18next';

const TABS = {
    CUSTOMIZATION: 'Customization',
    ACHIEVEMENTS: 'Achievements',
    ACCESSIBILITY: 'Accessibility',
    ACCOUNT: 'Account',
    JSON: 'JSON',
    AI: 'AI',
};

const VALID_TABS = new Set<string>(Object.values(TABS));

type Props = {};

const Profile = (props: Props) => {
    const { t } = useTranslation();
    const { data: { user: userData } = DEFAULT_USER_RESPONSE } = useGetUser();

    useBrowserTitle(PAGE_TITLES.PROFILE);

    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get(QUERY_PARAMS.PROFILE_TAB);
    const selectedProfileTab =
        urlTab && VALID_TABS.has(urlTab) ? urlTab : TABS.CUSTOMIZATION;

    // Backfill URL param on first load so the tab is reflected in the URL.
    useEffect(() => {
        if (!urlTab || !VALID_TABS.has(urlTab)) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set(QUERY_PARAMS.PROFILE_TAB, TABS.CUSTOMIZATION);
                    return next;
                },
                { replace: true }
            );
        }
    }, []);

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set(QUERY_PARAMS.PROFILE_TAB, newTab);
                return next;
            },
            { replace: true }
        );
    };

    return (
        <>
            <ProfilePage>
                <ProfileCard userData={userData} />
                <ProfilePaper elevation={6}>
                    <ProfileContainer>
                        <Tabs value={selectedProfileTab} onChange={onTabChange}>
                            <ProfileTab
                                label={t('profile.customization')}
                                value={TABS.CUSTOMIZATION}
                            />
                            <ProfileTab
                                label={t('profile.achievements')}
                                value={TABS.ACHIEVEMENTS}
                            />
                            <ProfileTab
                                label={t('profile.accessibility')}
                                value={TABS.ACCESSIBILITY}
                            />
                            <ProfileTab
                                label={t('profile.account')}
                                value={TABS.ACCOUNT}
                            />
                            <ProfileTab label="AI Settings" value={TABS.AI} />
                            <ProfileTab
                                label={t('profile.json')}
                                value={TABS.JSON}
                            />
                        </Tabs>
                        {selectedProfileTab === TABS.CUSTOMIZATION && (
                            <CustomizationTab userData={userData} />
                        )}
                        {selectedProfileTab === TABS.ACHIEVEMENTS && (
                            <AchievementsTab />
                        )}
                        {selectedProfileTab === TABS.ACCESSIBILITY && (
                            <AccessibilityTab userData={userData} />
                        )}
                        {selectedProfileTab === TABS.ACCOUNT && (
                            <AccountTab userData={userData} />
                        )}
                        {selectedProfileTab === TABS.AI && (
                            <AISettingsTab userData={userData} />
                        )}
                        {selectedProfileTab === TABS.JSON && (
                            <JsonSettingsTab userData={userData} />
                        )}
                    </ProfileContainer>
                </ProfilePaper>
            </ProfilePage>
        </>
    );
};

export default Profile;
