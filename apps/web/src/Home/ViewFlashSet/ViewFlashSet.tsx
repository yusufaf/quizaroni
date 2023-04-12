import { useEffect, useRef, useState } from "react";
import { Add, ArrowBack } from "@mui/icons-material/";
import {
    Button,
    Chip,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from "@mui/material/";
import ViewFlashCard from "./ViewFlashCard";
import ActionsSection from "./ActionsSection/ActionsSection";
import CreateLabelDialog from "./CreateLabelDialog/CreateLabelDialog";
import DownloadSetModal from "./DownloadSetModal/DownloadSetModal";
import NotificationsDialog from "./NotificationsDialog/NotificationsDialog";
import { useTheme } from "src/theme/useTheme";
import FLASH_CARDS_IMG from "src/resources/images/flash-card.png";
import {
    DOWNLOAD_FILE_TYPES,
    STUDY_MODES,
    VIEW_SET,
    DEFAULT_CATEGORIES
} from "src/utilities/constants";
import FlashcardsStudy from "./FlashcardsStudy";
import { SimpleFlexContainer } from "src/AppStyles";
import {
    SetInfo,
    StudyModeGrid,
    ViewFlashsetPage,
    ViewFlashsetContainer,
    ViewFlashsetHeader,
    ViewFlashsetPaper,
    StudyModeOption,
    CardCount,
    SortCardsDropdown,
    CardFiltersContainer,
} from "./ViewFlashSetStyles";
import useBrowserTitle from "src/lib/hooks/useBrowserTitle";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    selectStudySets,
    selectSelectedStudySet,
    setSelectedStudySet,
} from "src/slices/studysetsSlice";
import { useDispatch } from "react-redux";
import axios from "axios";
import ManageCategoriesDialog from "./ManageCategoriesDialog/ManageCategoriesDialog";

type Props = {};

const ViewFlashSet = (props: Props) => {
    const {} = props;

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const navigate = useNavigate();

    const { id } = useParams();
    const dispatch = useDispatch();
    const studySets = useSelector(selectStudySets);
    const selectedStudySet = useSelector(selectSelectedStudySet);

    const controlAnchorRef = useRef(null);

    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showControlMenu, setShowControlMenu] = useState(false);

    const [showCreateLabelDialog, setShowCreateLabelDialog] = useState(false);
    const [createLabelName, setCreateLabelName] = useState("");

    const [enableTextColor, setEnableTextColor] = useState(
        selectedStudySet?.metadata?.textColorVisible ?? false
    );
    const [enableBackgroundColor, setEnableBackgroundColor] = useState(
        selectedStudySet?.metadata?.backgroundColorVisible ?? false
    );
    const [studySetViewable, setStudySetViewable] = useState(
        selectedStudySet?.metadata?.publiclyViewable ?? false
    );

    const [selectedStudyMode, setSelectedStudyMode] = useState("");

    const [showDownloadPopup, setShowDownloadPopup] = useState(false);
    const [downloadFileType, setDownloadFileType] = useState(
        DOWNLOAD_FILE_TYPES.TXT
    );

    const [showManageCategories, setShowManageCategories] = useState<boolean>(false);
    const [newCategory, setNewCategory] = useState<string>("");


    const [selectedTab, setSelectedTab] = useState(DEFAULT_CATEGORIES.ALL);

    const arrowIconStyling = {
        "&.MuiIconButton-colorPrimary": {
            color: theme.foreground,
        },
    };

    useBrowserTitle(selectedStudySet?.title ?? "");

    useEffect(() => {
        if (!selectedStudySet) {
            console.log("Finding the study set from the id in URL", {
                id,
                selectedStudySet,
                studySets,
            });
            const studySet = studySets.find((value) => value.uuid === id);
            if (studySet) {
                dispatch(setSelectedStudySet(studySet));
            }
        }
    }, [id, selectedStudySet, studySets]);

    const updateMetadataField = async (property, newValue) => {
        try {
            if (!selectedStudySet) {
                return;
            }
            const { uuid } = selectedStudySet;
            const updateBody = {
                property,
                newValue,
                uuid,
            };
            const response = await axios.post(
                "/api/studysets/updateMetadata",
                updateBody
            );
            console.log({ response });
        } catch (error) {
            console.error("Error updating study set metadata");
        }
    };

    /* TODO: Using a library like React-pdf? Otherwise just creating a text file w/ comma sep values */
    const handleDownloadSet = () => {
        // /* Initial implementation of the following text file structure:
        //     Card {index}:
        //         term: ""
        //         definition: ""
        // */
        // const anchor = document.createElement("a");
        // const cards = flashset.cards;
        // const mappedCards = cards.map((card, index) => ({ [`Card ${index + 1}`]: { term: card.term, definition: card.definition } }));
        // const cleanedCards = Object.assign({}, ...mappedCards);
        // const type = downloadFileType === DOWNLOAD_FILE_TYPES.TXT ? "text/plain" : "application/json"
        // const file = new Blob([JSON.stringify(cleanedCards, null, 2)], { type });
        // anchor.href = URL.createObjectURL(file);
        // const { title: setTitle } = flashset;
        // anchor.download = `${setTitle}_Set.${type.toLowerCase()}`;
        // document.body.appendChild(anchor); // Required for this to work in FireFox
        // anchor.click();
    };

    /* TODO: Future future task.
    Ideally: Displaying a modal where a checkbox whether you want a reminder to study this flashset 
    */
    const handleEmailReminders = () => {};

    const testEmail = async () => {};

    const createNewLabel = () => {
        // TOOD: Check if the label already exists
    };

    // event: React.SyntheticEvent, newValue: number
    const onTabChange = (e, newTab) => {
        setSelectedTab(newTab);
    };

    const renderTabs = () => {
        /* TODO: Putting this in a render function because want a future functionality of custom tabs */
        return Object.values(DEFAULT_CATEGORIES).map((tab) => {
            return <Tab label={tab} value={tab} />;
        });
    };

    const handleBackClick = () => {
        navigate("/");
    };

    const actionSectionProps = {
        controlAnchorRef,
        enableBackgroundColor,
        enableTextColor,
        updateMetadataField,
        metadata: selectedStudySet?.metadata,
        setEnableBackgroundColor,
        setEnableTextColor,
        setShowControlMenu,
        setShowDownloadPopup,
        setShowNotificationsModal,
        setStudySetViewable,
        showControlMenu,
        studySetViewable,
    };

    const createLabelDialogProps = {
        createNewLabel,
        showCreateLabelDialog,
        setCreateLabelName,
        setShowCreateLabelDialog,
    };

    /**
     * Render the JSX for all the flash sets
     */
    const renderSetCards = () => {
        if (!selectedStudySet) {
            return;
        }
        const { cards } = selectedStudySet;

        return cards.map((card, index) => {
            return (
                <ViewFlashCard
                    key={card.uuid}
                    cardInfo={card}
                    index={index}
                    enableTextColor={enableTextColor}
                    enableBackgroundColor={enableBackgroundColor}
                />
            );
        });
    };

    /* TODO: Move this to separate route */
    // selectedStudyMode === STUDY_MODES.FLASHCARDS ?
    // (
    //     <FlashcardsStudy />
    // )
    // :

    const manageCategoriesProps = {
        newCategory,
        open: showManageCategories, 
        setNewCategory,
        setOpen: setShowManageCategories
    }


    /* TODO: Fix the spacing between the ViewContainer and the (first) ViewCards */
    return (
        <ViewFlashsetPage>
            <ViewFlashsetPaper elevation={6}>
                <ViewFlashsetContainer>
                    <ViewFlashsetHeader>
                        <SetInfo>
                            <SimpleFlexContainer>
                                <IconButton
                                    color="primary"
                                    aria-label="arrow backward"
                                    component="span"
                                    sx={arrowIconStyling}
                                    onClick={handleBackClick}
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
                                    fontWeight: "bold",
                                }}
                            >
                                {selectedStudySet?.title}
                            </Typography>
                            <Typography variant="subtitle1">
                                Created by {selectedStudySet?.username}
                            </Typography>
                            {/* <EditableTextField
                                style={{
                                    marginTop: "1rem",
                                    width: "fit-content",
                                }}
                                value={selectedStudySet?.title}
                                tooltipText={"Rename title"}
                            /> */}
                            <Chip
                                label={
                                    selectedStudySet?.label
                                        ? selectedStudySet.label
                                        : "No label selected"
                                }
                                variant="outlined"
                            />
                            <Typography variant="body1">
                                {selectedStudySet?.description}
                            </Typography>
                            {/* <Tooltip title="Create label" placement="right">
                                <IconButton
                                    color="primary"
                                    aria-label="arrow backward"
                                    component="span"
                                    sx={arrowIconStyling}
                                    onClick={() =>
                                        setShowCreateLabelDialog(true)
                                    }
                                >
                                    <Add />
                                </IconButton>
                            </Tooltip> */}

                            {/* <EditableTextField
                                style={{ marginTop: "1rem" }}
                                value={selectedStudySet?.description}
                                tooltipText={"Edit description"}
                            /> */}
                            <ActionsSection {...actionSectionProps} />
                        </SetInfo>
                        {/* <div className={viewFlashStyles.studySection}>
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
                                                    <Typography>Flashcards</Typography>
                                                </StudyModeOption>
                                            </StudyModeGrid>
                                        </div> */}
                    </ViewFlashsetHeader>
                </ViewFlashsetContainer>
            </ViewFlashsetPaper>
            <CardCount variant="h6">
                Number of cards in this study set:{" "}
                {selectedStudySet?.cards?.length}
            </CardCount>
            <CardFiltersContainer>
                <Tabs
                    value={selectedTab}
                    onChange={onTabChange}
                    scrollButtons="auto"
                >
                    {renderTabs()}
                </Tabs>
                <Button 
                    variant="outlined"
                    onClick={() => setShowManageCategories(true)}
                >
                    Manage Categories
                </Button>
                {/* TODO: Sort dropdown for sorting the cards
                                - Ideas/Notes: Maintain the index? Or is that confusing
                                */}
                <SortCardsDropdown>
                    <InputLabel id="sort-label">Sort</InputLabel>
                    <Select
                        labelId="sort-label"
                        // value={}
                        // onChange={handleChange}
                        autoWidth
                        label="Age"
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value={10}>Twenty</MenuItem>
                        <MenuItem value={21}>Twenty one</MenuItem>
                        <MenuItem value={22}>Twenty one and a half</MenuItem>
                    </Select>
                </SortCardsDropdown>
            </CardFiltersContainer>

            {/* Container for the cards */}
            {renderSetCards()}
            <CreateLabelDialog {...createLabelDialogProps} />
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
            <ManageCategoriesDialog
                {...manageCategoriesProps}
            />
        </ViewFlashsetPage>
    );
};

export default ViewFlashSet;
