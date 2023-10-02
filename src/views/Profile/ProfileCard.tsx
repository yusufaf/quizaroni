import { AddPhotoAlternate as AddPhotoIcon } from "@mui/icons-material";
import { Typography } from "@mui/material/";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectUserData } from "state/slices/global";
import { selectStudySets } from "state/slices/studysets";
import { useTheme } from "theme/useTheme";
import {
    ProfilePicture,
    StyledProfileCard,
    UploadImageButton,
    UserInfoContainer,
    UserInfoHeading,
} from "./ProfileStyles";

type Props = {};

const ProfileCard = (props: Props) => {
    const { isDarkMode, theme } = useTheme();

    const userData = useSelector(selectUserData);
    const studySets = useSelector(selectStudySets);

    const profilePicRef = useRef(null);
    console.log({ userData });

    useEffect(() => {}, []);

    const handleProfilePicture = () => {};

    return (
        <>
            <StyledProfileCard elevation={6}>
                <ProfilePicture style={{ backgroundImage: "" }}>
                    {/* TODO: In fileChange function, have a switch case that restricts it to images only */}
                    <input
                        type="file"
                        id="profilePicture"
                        ref={profilePicRef}
                        accept=".png, .jpg"
                        // onChange={e => onFileChange(e, index)}
                        style={{ display: "none" }}
                    />
                    <UploadImageButton
                        onClick={() => profilePicRef.current.click()}
                    >
                        <AddPhotoIcon fontSize="large" />
                    </UploadImageButton>
                </ProfilePicture>
                <UserInfoContainer>
                    <UserInfoHeading>Username</UserInfoHeading>
                    <Typography>{userData?.username ?? "N/A"}</Typography>
                </UserInfoContainer>
                <UserInfoContainer>
                    <UserInfoHeading># of Study Sets Created</UserInfoHeading>
                    <Typography>{studySets?.length ?? 0}</Typography>
                </UserInfoContainer>
                <UserInfoContainer>
                    <UserInfoHeading>Account Created</UserInfoHeading>
                    <Typography>
                        {new Date(userData.createdAt).toLocaleDateString() ??
                            "N/A"}
                    </Typography>
                </UserInfoContainer>
            </StyledProfileCard>
        </>
    );
};

export default ProfileCard;
