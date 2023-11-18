import {
    Tabs
} from "@mui/material/";
import { SyntheticEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    selectAuthenticated,
    selectUserData
} from "state/slices/globalSlice";
import { useTheme } from "theme/useTheme";
import LoginMessage from "views/LoginMessage/LoginMessage";
import AccountTab from "./AccountTab";
import CustomizationTab from "./CustomizationTab";
import ProfileCard from "./ProfileCard";
import {
    ProfileContainer,
    ProfilePage,
    ProfilePaper,
    ProfileTab,
} from "./ProfileStyles";

const TABS = {
    ACCOUNT: "Account",
    CUSTOMIZATION: "Customization",
}

type Props = {};

const Profile = (props: Props) => {
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);
    const userData = useSelector(selectUserData);

    const [selectedProfileTab, setSelectedProfileTab] = useState<string>(TABS.CUSTOMIZATION);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        confirmPassInput: false,
    });

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedProfileTab(newTab);
    };

    if (!authenticated) {
        return <LoginMessage page="profile" />;
    }

    return (
        <>
            <ProfilePage>
                <ProfileCard />
                <ProfilePaper elevation={6}>
                    <ProfileContainer>
                        <Tabs
                            value={selectedProfileTab}
                            onChange={onTabChange}
                        >
                            <ProfileTab
                                label={TABS.CUSTOMIZATION}
                                value={TABS.CUSTOMIZATION}
                            />
                            <ProfileTab
                                label={TABS.ACCOUNT}
                                value={TABS.ACCOUNT}
                            />
                        </Tabs>
                        {selectedProfileTab === TABS.CUSTOMIZATION
                            &&
                            <CustomizationTab userData={userData}/> 
                        }
                        {selectedProfileTab === TABS.ACCOUNT
                            &&
                            <AccountTab/> 
                        }
                    </ProfileContainer>
                </ProfilePaper>
            </ProfilePage>
        </>
    );
};

export default Profile;
