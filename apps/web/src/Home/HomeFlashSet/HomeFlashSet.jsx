import { useState, useEffect, useRef } from "react"
import { addDoc, collection, deleteDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";
import { Link, useNavigate } from "react-router-dom";
import HomeActionsMenu from "../SetActionsMenu";
import {
    Alert,
    AlertTitle,
    Card,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material/';
import { ArrowBack, MoreHoriz } from '@mui/icons-material/';
import { useTheme } from "src/theme/useTheme";
import * as homeFlashStyles from './HomeFlashSet.module.css';
import * as appStyles from "../../App.module.css";
import ConfirmDialog from "src/components/ConfirmDialog/ConfirmDialog";
import {
    CardBottom,
    CardContent,
    CardInfo,
    CardTitle,
    HomeSetCard,
    LabelChip,
    SpacedContainer,
    TermsLabel
} from "../HomeStyles"
import SetActionsMenu from "../SetActionsMenu";

const HomeFlashSet = props => {
    const {
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

    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(false);

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
        // let target = e.target;
        // if (target?.innerText !== "delete") {
        //     setSelectedFlashSet(flashSet)
        //     setViewFlashSet(true);
        // }

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
        const uid = "";

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

    const handleShowDeleteConfirmation = () => {
        console.log("ConfirmDialog should now be showing bruh");
        setShowDeleteConfirmation(true);
    }

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
    }

    const openActionsMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
    }

    const closeActionsMenu = () => {
        setAnchorEl(null)
        setActionsMenuOpen(false);
    }

    /* 
        handleFavoriteSet(setID)
    */

    const actionMenuProps = {
        setFlashSets,
        flashSet,
        flashSets,
        open: actionsMenuOpen,
        onClose: closeActionsMenu,
        anchorEl: anchorEl,
        handleShowDeleteConfirmation,
    }

    return (
        <>
            <HomeSetCard
                raised
                onClick={(e) => {
                    e.stopPropagation();
                    // alert();
                }}
            >
                <CardContent>
                    <CardTitle title={title}>{title}</CardTitle>
                    <CardInfo>
                        <TermsLabel>{cards.length} Terms</TermsLabel>
                        <SpacedContainer>
                            <Typography>Date Created</Typography>
                            <Typography>{creationDate}</Typography>
                        </SpacedContainer>
                        <SpacedContainer>
                            <Typography>Last viewed</Typography>
                            <Typography>{creationDate}</Typography>
                        </SpacedContainer>
                    </CardInfo>
                    {/* TODO: Label background color */}
                    <CardBottom>
                        <LabelChip label={label ? label : "No label selected"} variant="outlined" />
                        <IconButton
                            onClick={(e) => openActionsMenu(e)}
                        >
                            <MoreHoriz />
                        </IconButton>
                        <SetActionsMenu
                            {...actionMenuProps}
                        />
                    </CardBottom>
                </CardContent>
            </HomeSetCard>
            <ConfirmDialog
                open={showDeleteConfirmation}
                onClose={handleCloseDeleteConfirmation}
                title="Delete this flashset?"
                dialogMessage="This will permanently delete the flashset."
                // @ts-ignore
                onConfirm={() => handleDeleteSet(setID)}
                confirmButtonText="Delete"
            />
        </>
    )
}

export default HomeFlashSet;