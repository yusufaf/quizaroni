import { useState, useEffect } from "react"
import { addDoc, collection, deleteDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { database } from "../firebase/firebase";
import {
    Menu,
    MenuItem,
    Typography,
} from '@mui/material/';
import {
    ContentCopy as CopyIcon,
    Edit as EditIcon,
} from "@mui/icons-material";
import { useTheme } from "../theme/useTheme";

const SetActionsMenu = props => {
    const {
        flashSets,
        setFlashSets,
        flashSet,
        open,
        onClose,
        ref,
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
    }

    return (
        <>
            <Menu
                anchorEl={ref?.current}
                open={open}
                onClose={onClose}
            >
                <MenuItem
                >
                    <EditIcon
                        sx={{
                            marginRight: "0.75rem"
                        }}
                    />
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontSize: '1.5rem',
                        }}
                    >
                        Rename
                    </Typography>
                </MenuItem>
                <MenuItem
                    // onClick=
                >
                    <CopyIcon
                        sx={{
                            marginRight: "0.75rem"
                        }}
                    />
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontSize: '1.5rem',
                        }}
                    >
                        Duplicate
                    </Typography>
                </MenuItem>
            </Menu>

            {/* {showRenameModal &&
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
            } */}
        </>
    );
}

export default SetActionsMenu;