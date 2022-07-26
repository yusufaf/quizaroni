import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, updateDoc, where } from "firebase/firestore";
import { database } from "../../firebase/firebase";

import { Add, ArrowBack, Download, Edit, EditNotifications, MenuOpen } from '@mui/icons-material/';
import {
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Modal,
    Paper,
    Select,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material/';
import { styled } from "@mui/system";

import ViewFlashCard from "./ViewFlashCard";
import EditableTextField from "src/components/EditableTextField/EditableTextField";
import DownloadSetModal from "./DownloadSetModal/DownloadSetModal";
import NotificationsDialog from "./NotificationsDialog/NotificationsDialog";

import { useTheme } from "src/theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import { updateBrowserTitle } from "src/utilities/functions";

import FLASH_CARDS_IMG from "src/resources/images/flash-card.png";
import { DOWNLOAD_FILE_TYPES, STUDY_MODES, VIEW_SET } from "src/utilities/constants";
import FlashcardsStudy from "./FlashcardsStudy";
import {
    SimpleFlexContainer
} from "src/AppStyles"
import {
    SetInfo,
    StudyModeGrid,
    ViewFlashsetPage, 
    ViewFlashsetContainer,
    ViewFlashsetHeader,
    ViewFlashsetPaper 
} from "./ViewFlashSetStyles"

const { BACKGROUND, TEXT } = VIEW_SET;

const ViewFlashSet = props => {
    const {
        setViewFlashSet,
        selectedFlashSet: flashset,
        setSelectedFlashSet,
        userAuthState
    } = props;

    console.log("flashset = ", flashset)

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const controlAnchorRef = useRef(null);

    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showControlMenu, setShowControlMenu] = useState(false);

    const [showCreateLabelDialog, setShowCreateLabelDialog] = useState(false);
    const [createLabelName, setCreateLabelName] = useState("");

    const [disableTextColor, setDisableTextColor] = useState(false);
    const [disableBackgroundColor, setDisableBackgroundColor] = useState(false);
    const [studySetViewable, setStudySetViewable] = useState(false);

    const [selectedStudyMode, setSelectedStudyMode] = useState("");

    const [showDownloadPopup, setShowDownloadPopup] = useState(false);
    const [downloadFileType, setDownloadFileType] = useState(DOWNLOAD_FILE_TYPES.TXT);

    const [editedDescription, setEditedDescription] = useState(flashset.description ?? "")
    const [isEditingDescription, setIsEditingDescription] = useState(false)
    useEffect(() => {
        console.log({ isEditingDescription })
    }, [isEditingDescription])


    // TODO: Increase size of arrow buttons?
    const arrowIconStyling = {
        '&.MuiIconButton-colorPrimary': {
            color: theme.foreground,
        },
    };

    useEffect(() => {
        const { title } = flashset;
        updateBrowserTitle(title);
    }, [])


    const handleDisableColorToggle = async (type) => {
        const { uid } = userAuthState;
        const { setID } = flashset;

        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID)
        );
        const docSnap = await getDocs(queryResult);
        const flashDoc = docSnap.docs[0];

        if (type === TEXT) {
            setDisableTextColor(!disableTextColor)
            if (flashDoc) {
                const docRef = flashDoc.ref;
                updateDoc(docRef, {
                    disableTextColor: !disableTextColor
                });
            }
        }
        else if (type === BACKGROUND) {
            setDisableBackgroundColor(!disableBackgroundColor)
            if (flashDoc) {
                const docRef = flashDoc.ref;
                updateDoc(docRef, {
                    disableBackgroundColor: !disableBackgroundColor
                });
            }
        }
    }


    /* TODO: Using a library like React-pdf? Otherwise just creating a text file w/ comma sep values */
    const handleDownloadSet = () => {

        /* Initial implementation of the following text file structure:
            Card {index}:
                term: ""
                definition: ""
        */
        const anchor = document.createElement("a");
        const cards = flashset.cards;
        const mappedCards = cards.map((card, index) => ({ [`Card ${index + 1}`]: { term: card.term, definition: card.definition } }));
        const cleanedCards = Object.assign({}, ...mappedCards);

        const type = downloadFileType === DOWNLOAD_FILE_TYPES.TXT ? "text/plain" : "application/json"

        const file = new Blob([JSON.stringify(cleanedCards, null, 2)], { type });
        anchor.href = URL.createObjectURL(file);
        const { title: setTitle } = flashset;
        anchor.download = `${setTitle}_Set.${type.toLowerCase()}`;
        document.body.appendChild(anchor); // Required for this to work in FireFox
        anchor.click();
    }

    /* TODO: Future future task.
    Ideally: Displaying a modal where a checkbox whether you want a reminder to study this flashset 
    */
    const handleEmailReminders = () => {

    }

    const testEmail = async () => {
        const data = {
            to: "yusufafzal12@gmail.com",
            subject: "Test Email lmao",
            text: "Test reminder email WOOOOOOOOOOO,"
        };
        console.log("JSON.stringify(data) = ", JSON.stringify(data));

        const response = await fetch("http://localhost:5000/send_email", {
            method: "POST",
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        return response.json();
    }

    const createNewLabel = () => {
        // TOOD: Check if the label already exists
    }

    const renderActionBar = () => {
        return (
            <>
                <div style={{ marginTop: "1rem" }}>
                    <IconButton
                        onClick={() => setShowDownloadPopup(true)}
                        sx={{
                            padding: "0.75rem"
                        }}
                    >
                        <Download
                        />
                    </IconButton>
                    <Typography
                        component="span"
                    >
                        Download
                    </Typography>
                </div>
                <div>
                    <IconButton
                        onClick={() => setShowNotificationsModal(true)}
                        sx={{
                            padding: "0.75rem"
                        }}
                    >
                        <EditNotifications
                        />
                    </IconButton>
                    <Typography
                        component="span"
                    >
                        Manage Notifications
                    </Typography>
                </div>
                <div
                    ref={controlAnchorRef}
                >
                    <IconButton
                        onClick={() => setShowControlMenu(true)}
                        sx={{
                            padding: "0.75rem"
                        }}
                    >
                        <MenuOpen
                        />
                    </IconButton>

                    <Typography
                        component="span"
                    >
                        Control Menu
                    </Typography>
                </div>
                <Menu
                    open={showControlMenu}
                    onClose={() => setShowControlMenu(false)}
                    anchorEl={controlAnchorRef.current}
                >
                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={disableTextColor}
                                    onChange={() => handleDisableColorToggle("TEXT")}
                                />
                            } label={
                                <Typography
                                    sx={{
                                        color: disableTextColor ? "red" : "green"
                                    }}
                                >
                                    {`Text Color: ${disableTextColor ? "Disabled" : "Enabled"}`}
                                </Typography>
                            }
                        />
                    </MenuItem>
                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={disableBackgroundColor}
                                    onChange={() => handleDisableColorToggle("BACKGROUND")}
                                />
                            }
                            label={
                                <Typography
                                    sx={{
                                        color: disableBackgroundColor ? "red" : "green"
                                    }}
                                >
                                    {`Background Color: ${disableBackgroundColor ? "Disabled" : "Enabled"}`}
                                </Typography>
                            }
                        />
                    </MenuItem>
                    <MenuItem>
                        <FormControlLabel control={
                            <Switch
                                size="small"
                                checked={studySetViewable}
                                onChange={() => setStudySetViewable(!studySetViewable)}
                            />
                        } label={`Viewable: ${studySetViewable ? "Public" : "Private"}`}
                        />
                    </MenuItem>
                </Menu>
            </>
        )
    }

    /**
    * Render the JSX for all the flash sets
    */
    const renderSetCards = () => {
        console.log("flashset in renderSetCards = ", flashset);
        const { cards } = flashset;

        return cards.map((card, index) => {
            return <ViewFlashCard
                key={index}
                cardInfo={card}
                index={index}
                disableTextColor={disableTextColor}
                disableBackgroundColor={disableBackgroundColor}
            />
        })
    }

    const StudyModeOption = styled("div")({
        fontSize: "1.25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",

        userSelect: "none",
        cursor: "pointer",

        padding: "0.75rem 0.5rem",
        borderRadius: "0.25rem",
        "&: hover": {
            background: theme.palette.action.hover,
            transition: "0.2s ease",
        }
    })

    /* TODO: Fix the spacing between the ViewContainer and the (first) ViewCards */
    return (
        <ViewFlashsetPage>
            {
                selectedStudyMode === STUDY_MODES.FLASHCARDS ?
                    (
                        <FlashcardsStudy
                            selectedFlashSet={flashset}
                            userAuthState={userAuthState}
                            setSelectedStudyMode={setSelectedStudyMode}
                        />
                    )
                    :
                    (
                        <ViewFlashsetPaper elevation={6}>
                            <ViewFlashsetContainer>
                                <ViewFlashsetHeader>
                                    <SetInfo>
                                        <SimpleFlexContainer>
                                            <IconButton color="primary"
                                                aria-label="arrow backward" component="span"
                                                sx={arrowIconStyling}
                                                onClick={() => setViewFlashSet(false)}
                                            >
                                                <ArrowBack />
                                            </IconButton>
                                            <Typography component="span">
                                                Back to Your Flashsets
                                            </Typography>
                                        </SimpleFlexContainer>

                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: "bold"
                                            }}
                                        >
                                            {flashset.title}
                                        </Typography>
                                        <EditableTextField style={{ marginTop: "1rem", width: "fit-content" }} value={flashset.title} tooltipText={"Rename title"} />

                                        <Chip label={flashset.label ? flashset.label : "No label selected"} variant="outlined"
                                        />
                                        <Tooltip
                                            title="Create label"
                                            placement="right"
                                        >
                                            <IconButton color="primary"
                                                aria-label="arrow backward" component="span"
                                                sx={arrowIconStyling}
                                                onClick={() => setShowCreateLabelDialog(true)}
                                            >
                                                <Add />
                                            </IconButton>
                                        </Tooltip>

                                        <EditableTextField style={{ marginTop: "1rem" }} value={flashset.description} tooltipText={"Edit description"} />
                                        {renderActionBar()}
                                    </SetInfo>
                                    <div className={viewFlashStyles.studySection}>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: "bold"
                                            }}
                                        >
                                            Study
                                        </Typography>
                                        <StudyModeGrid>
                                            <StudyModeOption
                                                onClick={() => setSelectedStudyMode(STUDY_MODES.FLASHCARDS)}
                                            >
                                                <img src={FLASH_CARDS_IMG} height={32} width={32} />
                                                <span>Flashcards </span>
                                            </StudyModeOption>
                                        </StudyModeGrid>
                                    </div>
                                </ViewFlashsetHeader>
                                <Typography
                                    className=""
                                    variant="h6"
                                >
                                    Number of cards in this study set: {flashset.cards.length}
                                </Typography>
                                {renderSetCards()}
                            </ViewFlashsetContainer>
                            <Dialog open={showCreateLabelDialog} onClose={() => setShowCreateLabelDialog(false)}
                            >
                                <DialogTitle>Create new label</DialogTitle>
                                <DialogContent>
                                    <DialogContentText>
                                        Please enter the name of the label you want to create.
                                    </DialogContentText>
                                    <TextField
                                        autoFocus
                                        margin="dense"
                                        id="name"
                                        label="Label Name"
                                        type="email"
                                        fullWidth
                                        variant="standard"
                                        sx={{
                                            color: "orange"
                                        }}
                                        onChange={e => setCreateLabelName(e.target.value)}
                                    />
                                </DialogContent>
                                <DialogActions>
                                    {/* Todo: Figure out good color for a cancel button */}
                                    <Button onClick={() => setShowCreateLabelDialog(false)}
                                        sx={{ color: "gray" }}
                                    >Cancel</Button>
                                    <Button onClick={() => createNewLabel()}
                                        sx={{ color: "orange" }}

                                    >Create</Button>
                                </DialogActions>
                            </Dialog>
                            <NotificationsDialog
                                open={showNotificationsModal}
                                handleClose={() => setShowNotificationsModal(false)}
                            />
                            <DownloadSetModal
                                open={showDownloadPopup}
                                handleClose={() => setShowDownloadPopup(false)}
                                downloadFileType={downloadFileType}
                                setDownloadFileType={setDownloadFileType}
                            />
                        </ViewFlashsetPaper>
                    )
            }
        </ViewFlashsetPage>
    )
}

export default ViewFlashSet;