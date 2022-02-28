import { useEffect, useState, useRef } from "react";

import { database } from "../firebase/firebase";
import { query, where, collection, getDocs } from "firebase/firestore";

import { Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

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

    /*
 <div className={createSetStyles.uploadImage}>
                        <input
                            type="file"
                            id="fileInput"
                            ref={fileInputRef}
                            accept=".png, .jpg"
                            onChange={e => onFileChange(e, index)}
                            style={{ display: "none" }}
                        />
                        <i
                            className="material-icons-outlined"
                            style={{ fontSize: "2rem" }}
                            onClick={() => fileInputRef.current.click()}
                        >
                            image
                        </i>
                    </div>
    */

    return (
        <div className={profileStyles.profileCard} style={{ color: theme.foreground, background: theme.background }}>
            <div className={profileStyles.profilePicture} style={{ backgroundImage: "" }}>
                {/* TODO: In fileChange function, have a switch case that restricts it to images only */}
                <input
                    type="file"
                    id="profilePicture"
                    ref={profilePicRef}
                    accept=".png, .jpg"
                    // onChange={e => onFileChange(e, index)}
                    style={{ display: "none" }}
                />
                <span
                    className={`material-icons-outlined ${profileStyles.uploadImage}`}
                    onClick={() => profilePicRef.current.click()}
                >
                    add_photo_alternate
                </span>
            </div>
            <div className={profileStyles.info}>
                <span className={profileStyles.infoHeading}>Username</span>
                <span>{username}</span>
            </div>
            <div className={profileStyles.info}>
                <span className={profileStyles.infoHeading}># of Flashsets Created</span>
                <span>{createdSetCount}</span>
            </div>
            <div className={profileStyles.info}>
                <span className={profileStyles.infoHeading}>Account Created</span>
                <span>{createdDate}</span>
            </div>
        </div>
    )
}

export default ProfileCard;