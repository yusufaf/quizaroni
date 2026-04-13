import { Tabs } from '@mui/material/';
import { SyntheticEvent, useState } from 'react';
import AccountTab from './AccountTab';
import AccessibilityTab from './AccessibilityTab';
import CustomizationTab from './CustomizationTab';
import JsonSettingsTab from './JsonSettingsTab';
import ProfileCard from './ProfileCard';
import {
    ProfileContainer,
    ProfilePage,
    ProfilePaper,
    ProfileTab,
} from './ProfileStyles';
import { useGetUser } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE, PAGE_TITLES } from 'shared/constants';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { useTranslation } from 'react-i18next';

const TABS = {
    CUSTOMIZATION: 'Customization',
    ACCESSIBILITY: 'Accessibility',
    ACCOUNT: 'Account',
    JSON: 'JSON',
};

type Props = {};

const Profile = (props: Props) => {
    const { t } = useTranslation();
    const { data: { user: userData } = DEFAULT_USER_RESPONSE } = useGetUser();

    useBrowserTitle(PAGE_TITLES.PROFILE);

    const [selectedProfileTab, setSelectedProfileTab] = useState<string>(
        localStorage.getItem('profileTab') ?? TABS.CUSTOMIZATION
    );

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        confirmPassInput: false,
    });

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        localStorage.setItem('profileTab', newTab);
        setSelectedProfileTab(newTab);
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
                                label={t('profile.accessibility')}
                                value={TABS.ACCESSIBILITY}
                            />
                            <ProfileTab
                                label={t('profile.account')}
                                value={TABS.ACCOUNT}
                            />
                            <ProfileTab
                                label={t('profile.json')}
                                value={TABS.JSON}
                            />
                        </Tabs>
                        {selectedProfileTab === TABS.CUSTOMIZATION && (
                            <CustomizationTab userData={userData} />
                        )}
                        {selectedProfileTab === TABS.ACCESSIBILITY && (
                            <AccessibilityTab userData={userData} />
                        )}
                        {selectedProfileTab === TABS.ACCOUNT && (
                            <AccountTab userData={userData} />
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
