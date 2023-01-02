import { useEffect, useState, useRef } from "react";
import { database } from "../firebase/firebase";
import { query, where, collection, getDocs } from "firebase/firestore";
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

const ProfileCard = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const profilePicRef = useRef(null);

    const [createdSetCount, setCreatedSetCount] = useState(0);
    const [createdDate, setCreatedDate] = useState("");

    // TODO: Should this go to the parent component to change based if user changes username in main container
    const [username, setUsername] = useState("");

    useEffect(() => {
        retrieveMetadata()
    }, [])

    const handleProfilePicture = () => {

    }

    const retrieveMetadata = async () => {
        const { uid } = userAuthState;
        console.log(userAuthState);
        const usersCollection = collection(database, "users");
        const queryResult = query(usersCollection, where("uid", "==", uid));
        const querySnapshot = await getDocs(queryResult);

        const userDoc = querySnapshot.docs[0];
        if (userDoc) {
            const { creationDate, username } = userDoc.data();
            setCreatedDate(creationDate);
            setUsername(username);
        }

        const flashCollection = collection(database, "flashcards");
        const flashQueryResult = query(flashCollection, where("uid", "==", uid));
        const flashSnapshot = await getDocs(flashQueryResult);
        setCreatedSetCount(flashSnapshot.docs.length);
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
                <Typography>{createdDate}</Typography>
            </UserInfoContainer>
        </StyledProfileCard>
    )
}

export default ProfileCard;