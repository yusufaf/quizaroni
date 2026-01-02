import { Tabs } from '@mui/material/';
import { SyntheticEvent, useState } from 'react';
import AccountTab from './AccountTab';
import AccessibilityTab from './AccessibilityTab';
import CustomizationTab from './CustomizationTab';
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

const TABS = {
    CUSTOMIZATION: 'Customization',
    ACCESSIBILITY: 'Accessibility',
    ACCOUNT: 'Account',
};

type Props = {};

const Profile = (props: Props) => {
    const { data: { user: userData } = DEFAULT_USER_RESPONSE } =
        useGetUser();

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
                                label={TABS.CUSTOMIZATION}
                                value={TABS.CUSTOMIZATION}
                            />
                            <ProfileTab
                                label={TABS.ACCESSIBILITY}
                                value={TABS.ACCESSIBILITY}
                            />
                            <ProfileTab
                                label={TABS.ACCOUNT}
                                value={TABS.ACCOUNT}
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
                    </ProfileContainer>
                </ProfilePaper>
            </ProfilePage>
        </>
    );
};

export default Profile;
