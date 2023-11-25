import { AddPhotoAlternate as AddPhotoIcon } from "@mui/icons-material";
import { Typography } from "@mui/material/";
import { useEffect, useRef } from "react";
import { useTheme } from "theme/useTheme";
import {
    ProfilePicture,
    StyledProfileCard,
    UploadImageButton,
    UserInfoContainer,
    UserInfoHeading,
} from "./ProfileStyles";
import { useGetAllStudysetsQuery } from "state/api/studysetsAPI";
import { User } from "lib/types";

type Props = {
    userData: User;
};
const ProfileCard = (props: Props) => {
    const { userData } = props;

    const { isDarkMode, theme } = useTheme();

    const { data: studysets = [] } = useGetAllStudysetsQuery(
        { userUUID: userData.uuid ?? "" },
        { skip: !userData.uuid }
    );

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
                    <Typography>{studysets?.length ?? 0}</Typography>
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
