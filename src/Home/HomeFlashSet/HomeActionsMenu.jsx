import { useState, useEffect } from "react"

/* Firebase Operations */
import { addDoc, collection, deleteDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { database } from "../../firebase/firebase";

import {
    Alert,
    AlertTitle,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tooltip,
} from '@mui/material/';

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as homeFlashStyles from './HomeFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const HomeActionsMenu = props => {
    const {
        userAuthState,
        flashSets,
        setFlashSets,
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

    const [showRenameModal, setShowRenameModal] = useState(false);
    const [enteredRename, setEnteredRename] = useState("");

    console.log("showRenameModal = ", showRenameModal);

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

    /**
     * Renames the selected flash set
     */
    const handleRenameSet = async () => {
        const { uid } = userAuthState;

        const flashCollection = collection(database, "flashcards");

        const queryResult = query(flashCollection,
            where("setID", "==", setID),
            where("uid", "==", uid)
        );

        const docSnap = await getDocs(queryResult);

        const setDoc = docSnap.docs[0];


        if (setDoc) {
        }
    }


    return (
        <>
            <div className={homeFlashStyles.actionsMenu}
                style={{ color: theme.foreground, background: theme.background }}
            >
                <div className={homeFlashStyles.menuItem}>
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}
                        onClick={(e) => handleDuplicateSet(e)}
                    >
                        content_copy
                    </i>
                    Duplicate
                </div>
                <div className={homeFlashStyles.menuItem}>
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowRenameModal(true);
                        }}
                    >
                        edit
                    </i>
                    Rename
                </div>
            </div>

            {/* Stop Propagation here  */}
            {showRenameModal &&
                <Dialog
                    open={showRenameModal}
                    onClose={() => setShowRenameModal(false)}
                    sx={{
                        '& .MuiDialog-paper': {
                            bottom: "10rem",
                            color: theme.foreground,
                            backgroundColor: theme.background
                        },
                    }}
                >
                    <DialogTitle>Rename this flashset?</DialogTitle>
                    <DialogContent>
                        <input
                            className={`${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                            placeholder="Enter the new name for the study set"
                            onChange={e => {
                                e.stopPropagation();
                                setEnteredRename(e.target.value)
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <div
                            className={`${homeFlashStyles.renameCard} ${appStyles.textButton} ${isDarkMode ? `${appStyles.hoverDark}` : `${appStyles.hoverLight}`}`}
                            onClick={() => handleRenameSet(setID)}
                        >
                            Rename Flash Set
                        </div>
                    </DialogActions>
                </Dialog>
            }
        </>
    );
}

export default HomeActionsMenu;