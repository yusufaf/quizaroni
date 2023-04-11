import { useEffect, useState, useRef } from "react";

import { Typography } from '@mui/material/';
import { AddPhotoAlternate as AddPhotoIcon } from "@mui/icons-material";
import { useTheme } from "../theme/useTheme";
import {
    ProfilePicture,
    StyledProfileCard,
    UploadImageButton,
    UserInfoContainer,
    UserInfoHeading
} from "./ProfileStyles"
import { useSelector } from "react-redux";
import { selectUserData } from "src/slices/globalSlice";

const ProfileCard = props => {
    const { isDarkMode, theme } = useTheme();


    const userData = useSelector(selectUserData);
    const profilePicRef = useRef(null);
    console.log({userData})

    const [createdSetCount, setCreatedSetCount] = useState(0);
    const [createdDate, setCreatedDate] = useState("");

    // TODO: Should this go to the parent component to change based if user changes username in main container
    const [username, setUsername] = useState("");

    useEffect(() => {
    }, [])

    const handleProfilePicture = () => {

    }

    return (
        <StyledProfileCard 
            elevation={6}
        >
            <ProfilePicture 
                style={{ backgroundImage: "" }}
            >
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
                <Typography>{username}</Typography>
            </UserInfoContainer>
            <UserInfoContainer>
                <UserInfoHeading># of Flashsets Created</UserInfoHeading>
                <Typography>{createdSetCount}</Typography>
            </UserInfoContainer>
            <UserInfoContainer>
                <UserInfoHeading>Account Created</UserInfoHeading>
                <Typography>{new Date(userData.createdAt).toLocaleDateString() ?? "N/A"}</Typography>
            </UserInfoContainer>
        </StyledProfileCard>
    )
}

export default ProfileCard;