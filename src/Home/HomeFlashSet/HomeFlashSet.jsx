import { useState, useEffect } from "react"

/* Firebase Operations */

import { addDoc, collection, deleteDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import HomeActionsMenu from "./HomeActionsMenu";

import {
    Alert,
    AlertTitle,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Menu, 
    MenuItem,
    Tooltip,
} from '@mui/material/';

import { ArrowBack } from '@mui/icons-material/';

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as homeFlashStyles from './HomeFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const HomeFlashSet = props => {
    const {
        userAuthState,
        flashSets,
        setFlashSets,
        setSelectedFlashSet,
        setViewFlashSet,
        flashSet
    } = props;

    const {
        cards,
        creationDate,
        title,
        description,
        label,
        setID,
        uid
    } = flashSet;
    const { isDarkMode, theme } = useTheme();

    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);


    useEffect(() => {
        checkIfFavorited();
    }, [])

    const checkIfFavorited = async () => {
        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID)
        );

        const docSnap = await getDocs(queryResult);
        const userDoc = docSnap.docs[0];

        if (userDoc) {
            const { favorited } = userDoc.data();
            setIsFavorited(favorited);
        }
    }


    const handleViewFlashset = e => {
        let target = e.target;
        if (target?.innerText !== "delete") {
            setSelectedFlashSet(flashSet)
            setViewFlashSet(true);
        }
    }

    /* Flipping state */
    const handleFavoriteSet = async (setID) => {
        /* Update the set to be favorited in DB */
        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID)
        );

        const docSnap = await getDocs(queryResult);
        const userDoc = docSnap.docs[0];

        setIsFavorited(!isFavorited);
        if (userDoc) {
            const userRef = userDoc.ref;
            updateDoc(userRef, {
                favorited: !isFavorited
            });
        }
    }

    /**
     * Deletes this flash set.
     * TODO: Make sure that the Home page re renders the flash sets after deletion
     */
    const handleDeleteSet = async () => {
        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID)
        );

        const querySnapshot = await getDocs(queryResult);
        const setDoc = querySnapshot.docs[0];
        if (setDoc) {
            const setRef = setDoc.ref;
            deleteDoc(setRef).then((result) => {
                setShowDeleteConfirmation(false);
            })
        }
    }

    const handleDuplicateSet = async (e) => {
        e.stopPropagation();

        const { uid } = userAuthState;

        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID),
            where("uid", "==", uid)
        );

        const docSnap = await getDocs(queryResult);

        const numDocs = docSnap.docs.length;
        const setDoc = docSnap.docs[0];

        let fullFlashsetInfo;

        if (setDoc) {
            fullFlashsetInfo = setDoc.data();

            const { title } = fullFlashsetInfo
            const duplicateTitle = `${title} (${numDocs})`;
            const creationDate = new Date().toLocaleDateString();
            const lastViewedDate = new Date().toLocaleDateString();

            let modifiedFlashset = {
                ...fullFlashsetInfo,
                title: duplicateTitle,
                creationDate,
                lastViewedDate
            }

            let cardsRef = await addDoc(flashCollection, modifiedFlashset);

            const newID = cardsRef.id;
            // Store the Firebase document ID as the set's "id"
            updateDoc(cardsRef, {
                setID: newID
            })

            let duplicatedFlashset = {
                ...modifiedFlashSet,
                setID: newID
            }

            const currFlashsets = [...flashSets];
            currFlashsets.push(duplicatedFlashset);
            setFlashSets(currFlashsets);
        }
    }


    return (
        <>
            <div
                className={`${homeFlashStyles.flashSet} ${isDarkMode ? `${appStyles.hoverDark} ${appStyles.darkInput}` : `${appStyles.hoverLight} ${appStyles.lightInput}`}`}
                key={uid}
                onClick={handleViewFlashset}
            >
                <div className={homeFlashStyles.data}>{title}</div>
                <div className={homeFlashStyles.data}>{description}</div>
                <div className={homeFlashStyles.data}>{creationDate}</div>
                <div className={homeFlashStyles.data}>{label || "N/A"}</div>
                <div className={homeFlashStyles.actions}>
                    <div className={homeFlashStyles.mainActions}>
                        <Tooltip
                            title="Favorite this card"
                            placement="right"
                            arrow={true}
                        >
                            <span className={homeFlashStyles.favoriteCard}
                            >
                                <i className={`material-icons-outlined ${appStyles.clickIcon}
                                ${isFavorited && homeFlashStyles.favorited}
                            `}
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleFavoriteSet(setID)
                                    }}
                                >
                                    star_outline
                                </i>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title="Delete this card"
                            placement="right"
                            arrow={true}
                        >
                            <span
                                className={homeFlashStyles.deleteCard}
                            >
                                <i className={`material-icons-outlined ${appStyles.clickIcon}`}
                                    onClick={() => setShowDeleteConfirmation(true)}
                                >
                                    delete
                                </i>
                            </span>
                        </Tooltip>
                    </div>

                    <span className={`material-icons-outlined ${appStyles.clickIcon}`}
                        onClick={e => {
                            e.stopPropagation();
                            setShowActionsMenu(!showActionsMenu)
                        }}
                    >
                        more_vert
                    </span>
                    
                    {showActionsMenu &&
                        <HomeActionsMenu
                            flashSet={flashSet}
                            flashSets={flashSets}
                            setFlashSets={setFlashSets}
                            userAuthState={userAuthState}
                        />
                    }

                </div>
            </div>

            {showDeleteConfirmation &&
                <Dialog
                    open={showDeleteConfirmation}
                    onClose={() => setShowDeleteConfirmation(false)}
                    sx={{
                        '& .MuiDialog-paper': {
                            bottom: "10rem",
                            color: theme.foreground,
                            backgroundColor: theme.background
                        },
                    }}
                >
                    <DialogTitle>Delete this flashset?</DialogTitle>
                    <DialogContent>
                        <DialogContentText
                            sx={{
                                color: theme.foreground,
                                backgroundColor: theme.background
                            }}
                        >
                            This will permanently delete the flashset.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <div
                            className={homeFlashStyles.confirmDeleteCard}
                            onClick={() => handleDeleteSet(setID)}
                        >
                            Delete Card
                        </div>
                    </DialogActions>
                </Dialog>
            }
        </>
    )
}

export default HomeFlashSet;