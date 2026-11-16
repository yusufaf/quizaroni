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
import { useAIChatEnabled } from 'state/api/aiAPI';

const TABS = {
    CUSTOMIZATION: 'Customization',
    ACHIEVEMENTS: 'Achievements',
    ACCESSIBILITY: 'Accessibility',
    ACCOUNT: 'Account',
    JSON: 'JSON',
    AI: 'AI',
};

const tabsFor = (aiEnabled: boolean | undefined) =>
    new Set<string>(
        Object.values(TABS).filter(
            (tab) => tab !== TABS.AI || aiEnabled === true
        )
    );

type Props = {};

const Profile = (props: Props) => {
    const { t } = useTranslation();
    const {
        data: {
            user: userData = DEFAULT_USER_RESPONSE.user,
        } = DEFAULT_USER_RESPONSE,
    } = useGetUser();

    useBrowserTitle(PAGE_TITLES.PROFILE);
    const aiEnabled = useAIChatEnabled();
    const validTabs = tabsFor(aiEnabled);

    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get(QUERY_PARAMS.PROFILE_TAB);
    const selectedProfileTab =
        urlTab && validTabs.has(urlTab) ? urlTab : TABS.CUSTOMIZATION;

    // Backfill URL param on first load so the tab is reflected in the URL.
    // Waits for the AI status, so a fresh load of ?tab=AI keeps its tab.
    useEffect(() => {
        if (aiEnabled === undefined) return;
        if (!urlTab || !validTabs.has(urlTab)) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set(QUERY_PARAMS.PROFILE_TAB, TABS.CUSTOMIZATION);
                    return next;
                },
                { replace: true }
            );
        }
    }, [aiEnabled]);

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
                            {aiEnabled === true && (
                                <ProfileTab
                                    label="AI Settings"
                                    value={TABS.AI}
                                />
                            )}
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
