import { useEffect, useMemo, useRef, useState } from "react";
import {
    Add,
    ArrowBack,
    ArrowDownward,
    ArrowUpward,
} from "@mui/icons-material/";
import {
    Button,
    Chip,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
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
import { useTheme } from "theme/useTheme";
import FLASH_CARDS_IMG from "resources/images/flash-card.png";
import {
    DOWNLOAD_FILE_TYPES,
    STUDY_MODES,
    VIEW_SET,
    DEFAULT_CATEGORIES,
    SORT_DIRECTIONS,
} from "utilities/constants";
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
    CategoryTabs,
    CategoryTab,
} from "./styles";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    selectStudySets,
    selectSelectedStudySet,
    setSelectedStudySet,
} from "state/slices/studysetsSlice";
import { useDispatch } from "react-redux";
import axios from "axios";
import ManageCategoriesDialog from "./ManageCategoriesDialog/ManageCategoriesDialog";
import { Card, SortDirection } from "lib/types";
import {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useUpdateLastViewedMutation,
    useUpdateStudysetMetadataMutation,
} from "state/api/studysets";
import { selectUserData } from "state/slices/globalSlice";
import ScrollToTopFab from "components/ScrollToTopFab/ScrollToTopFab";

type Props = {};

const ViewFlashSet = (props: Props) => {
    const {} = props;

    /* Hooks / Redux */
    const { isDarkMode, theme } = useTheme();

    const navigate = useNavigate();
    const { id: studySetUUID = "" } = useParams();
    const dispatch = useDispatch();
    // const studySets = useSelector(selectStudySets);
    // console.log({ studySets });
    // const selectedStudySet = useSelector(selectSelectedStudySet);
    const { uuid: userUUID = "" } = useSelector(selectUserData);

    const {
        data: studySets = [],
        isLoading: isStudySetsLoading,
        isSuccess: isStudySetsSuccess,
    } = useGetAllStudysetsQuery({
        userUUID,
    });

    const {
        data: selectedStudySet,
        isLoading: isStudySetLoading,
        isSuccess: isStudySetSuccess,
    } = useGetStudysetQuery({
        uuid: studySetUUID,
    });

    const [
        updateStudysetMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateStudysetMetadataMutation();

    const [updateLastViewed] = useUpdateLastViewedMutation();

    console.log({ selectedStudySet, isStudySetLoading });

    const controlAnchorRef = useRef(null);

    const updatedViewTimestamp = useRef<boolean>(false);

    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showControlMenu, setShowControlMenu] = useState(false);
    const [showCreateLabelDialog, setShowCreateLabelDialog] = useState(false);
    const [createLabelName, setCreateLabelName] = useState("");

    const [selectedStudyMode, setSelectedStudyMode] = useState("");

    const [showDownloadPopup, setShowDownloadPopup] = useState<boolean>(false);
    const [downloadFileType, setDownloadFileType] = useState<string>(
        DOWNLOAD_FILE_TYPES.TXT
    );
    const [showManageCategories, setShowManageCategories] =
        useState<boolean>(false);
    const [selectedTab, setSelectedTab] = useState(DEFAULT_CATEGORIES.ALL);

    const [selectedSort, setSelectedSort] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        SORT_DIRECTIONS.ASC
    );

    const arrowIconStyling = {
        "&.MuiIconButton-colorPrimary": {
            color: theme.foreground,
        },
    };

    useBrowserTitle(selectedStudySet?.title ?? "");

    // TODO: This leads to an infinite loop. Need to figure out why.
    useEffect(() => {
        if (!updatedViewTimestamp.current) {
            updateLastViewed({
                uuid: selectedStudySet?.uuid ?? "",
            });
            updatedViewTimestamp.current = true;
        }
    }, [selectedStudySet]);

    const updateMetadataField = (property: string, newValue: any) => {
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
            updateStudysetMetadata(updateBody);
        } catch (error) {
            console.error("Error updating study set metadata");
        }
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
    const onTabChange = (e: any, newTab: any) => {
        setSelectedTab(newTab);
    };

    const onSortChange = (event: SelectChangeEvent<string>) => {
        setSelectedSort(event.target.value);
    };

    const categoryTabs = useMemo(() => {
        const jointCategories = [
            ...Object.values(DEFAULT_CATEGORIES),
            ...(selectedStudySet?.categories ?? []),
        ];
        return jointCategories.map((tab, index) => {
            return <CategoryTab key={index} label={tab} value={tab} />;
        });
    }, [selectedStudySet]);

    const toggleSortDirection = () => {
        const newSortDirection =
            sortDirection === SORT_DIRECTIONS.ASC
                ? SORT_DIRECTIONS.DSC
                : SORT_DIRECTIONS.ASC;
        setSortDirection(newSortDirection);
    };

    const handleBackClick = () => {
        navigate("/");
    };

    const actionSectionProps = {
        controlAnchorRef,
        updateMetadataField,
        setShowControlMenu,
        setShowDownloadPopup,
        setShowNotificationsModal,
        showControlMenu,
        selectedStudySet,
    };

    const createLabelDialogProps = {
        createNewLabel,
        showCreateLabelDialog,
        setCreateLabelName,
        setShowCreateLabelDialog,
    };

    /* Sorting */
    const sortedViewFlashCards = useMemo(() => {
        const sortModifier = sortDirection === SORT_DIRECTIONS.ASC ? 1 : -1;
        const sortedCards = [...(selectedStudySet?.cards ?? [])];
        if (selectedSort) {
            sortedCards.sort((a: Card, b: Card) => {
                if (a[selectedSort] < b[selectedSort]) {
                    return -1 * sortModifier;
                }
                if (a[selectedSort] > b[selectedSort]) {
                    return 1 * sortModifier;
                }
                return 0;
            });
        }

        return sortedCards?.map((card, index) => {
            return (
                <ViewFlashCard
                    key={card.uuid}
                    card={card}
                    index={index}
                    selectedStudySet={selectedStudySet}
                />
            );
        });
    }, [selectedStudySet, selectedSort, sortDirection]);

    /* Filtering */
    const filteredViewFlashCards = useMemo(() => {
        switch (selectedTab) {
            case DEFAULT_CATEGORIES.ALL:
                return sortedViewFlashCards;
            case DEFAULT_CATEGORIES.IMPORTANT:
                return [...sortedViewFlashCards].filter((value) => {
                    return value.props.card.important;
                });
            default:
                return [...sortedViewFlashCards].filter((value) => {
                    return value.props.card.categories.includes(selectedTab);
                });
        }
    }, [selectedTab, sortedViewFlashCards]);

    /* TODO: Move this to separate route */
    // selectedStudyMode === STUDY_MODES.FLASHCARDS ?
    // (
    //     <FlashcardsStudy />
    // )
    // :

    const manageCategoriesProps = {
        open: showManageCategories,
        setOpen: setShowManageCategories,
        selectedStudySet,
        studySets,
    };

    /* TODO: Fix the spacing between the ViewContainer and the (first) ViewCards */
    return (
        <ViewFlashsetPage>
            <ViewFlashsetPaper elevation={6}>
                <ViewFlashsetContainer>
                    <ViewFlashsetHeader>
                        <SetInfo>
                            <Button
                                onClick={handleBackClick}
                                startIcon={<ArrowBack sx={arrowIconStyling} />}
                            >
                                Back to Your Study Sets
                            </Button>
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
                            <Tooltip title="Create label" placement="right">
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
                            </Tooltip>
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
                <SimpleFlexContainer style={{ gap: "1rem" }}>
                    <CategoryTabs
                        value={selectedTab}
                        onChange={onTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {categoryTabs}
                    </CategoryTabs>
                    <Button
                        variant="outlined"
                        onClick={() => setShowManageCategories(true)}
                    >
                        Manage Categories
                    </Button>
                </SimpleFlexContainer>
                <SimpleFlexContainer>
                    <IconButton
                        color="primary"
                        onClick={toggleSortDirection}
                        title="Sort Direction"
                    >
                        {sortDirection === SORT_DIRECTIONS.ASC ? (
                            <ArrowUpward />
                        ) : (
                            <ArrowDownward />
                        )}
                    </IconButton>
                    <SortCardsDropdown>
                        <InputLabel id="sort-label">Sort</InputLabel>
                        <Select
                            labelId="sort-label"
                            label="Sort"
                            value={selectedSort}
                            onChange={onSortChange}
                            autoWidth
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            <MenuItem value={"term"}>
                                Alphabetical - Term
                            </MenuItem>
                            <MenuItem value={"definition"}>
                                Alphabetical - Definition
                            </MenuItem>
                            <MenuItem value={"label"}>
                                Alphabetical - Label
                            </MenuItem>
                        </Select>
                    </SortCardsDropdown>
                </SimpleFlexContainer>
            </CardFiltersContainer>

            {/* Container for the cards */}
            {filteredViewFlashCards}
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
                studySet={selectedStudySet}
            />
            <ManageCategoriesDialog {...manageCategoriesProps} />
            <ScrollToTopFab />
        </ViewFlashsetPage>
    );
};

export default ViewFlashSet;
