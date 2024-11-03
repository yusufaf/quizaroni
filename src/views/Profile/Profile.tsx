import { Tabs } from '@mui/material/';
import { SyntheticEvent, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'state/reduxHooks';
import AccountTab from './AccountTab';
import CustomizationTab from './CustomizationTab';
import ProfileCard from './ProfileCard';
import {
    ProfileContainer,
    ProfilePage,
    ProfilePaper,
    ProfileTab,
} from './ProfileStyles';
import { useGetUserQuery } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE, PAGE_TITLES } from 'utilities/constants';
import useBrowserTitle from 'lib/hooks/useBrowserTitle';

const TABS = {
    ACCOUNT: 'Account',
    CUSTOMIZATION: 'Customization',
};

type Props = {};

const Profile = (props: Props) => {
    const dispatch = useAppDispatch();

    const { data: { user: userData } = DEFAULT_USER_RESPONSE } =
        useGetUserQuery();

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
                                label={TABS.ACCOUNT}
                                value={TABS.ACCOUNT}
                            />
                        </Tabs>
                        {selectedProfileTab === TABS.CUSTOMIZATION && (
                            <CustomizationTab userData={userData} />
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
