import {
    Add,
    ArrowBack,
    ArrowDownward,
    ArrowUpward,
} from "@mui/icons-material/";
import {
    Button,
    Chip,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Tooltip,
    Typography,
} from "@mui/material/";
import ScrollToTopFab from "components/ScrollToTopFab/ScrollToTopFab";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import { Card, SortDirection } from "lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { SimpleFlexContainer } from "src/AppStyles";
import {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useUpdateLastViewedMutation,
    useUpdateStudysetMetadataMutation,
} from "state/api/studysets";
import { selectUserData } from "state/slices/globalSlice";
import { useTheme } from "theme/useTheme";
import {
    DEFAULT_CATEGORIES,
    DOWNLOAD_FILE_TYPES,
    SORT_DIRECTIONS,
} from "utilities/constants";
import ActionsSection from "./ActionsSection/ActionsSection";
import DownloadSetModal from "./DownloadSetModal/DownloadSetModal";
import ManageCategoriesDialog from "./ManageCategoriesDialog/ManageCategoriesDialog";
import ManageLabelsDialog from "./ManageLabelsDialog/ManageLabelsDialog";
import NotificationsDialog from "./NotificationsDialog/NotificationsDialog";
import ViewFlashCard from "./ViewFlashCard";
import {
    CardCount,
    CardFiltersContainer,
    CategoryTab,
    CategoryTabs,
    SetInfo,
    SortCardsDropdown,
    ViewFlashsetContainer,
    ViewFlashsetHeader,
    ViewFlashsetPage,
    ViewFlashsetPaper,
} from "./styles";

type Props = {};

const ViewStudySet = (props: Props) => {
    const {} = props;

    /* Hooks / Redux */
    const { isDarkMode, theme } = useTheme();

    const navigate = useNavigate();
    const { id: studySetUUID = "" } = useParams();
    const dispatch = useDispatch();
    // const studySets = useSelector(selectStudySets);
    // console.log({ studySets });
    // const selectedStudySet = useSelector(selectSelectedStudySet);
    const { uuid: userUUID = "", labels = [] } = useSelector(selectUserData);

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
    const [showManageLabelsDialog, setShowManageLabelsDialog] =
        useState<boolean>(false);

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

    const manageLabelsDialogProps = {
        labels,
        open: showManageLabelsDialog,
        onClose: () => setShowManageLabelsDialog(false),
        selectedStudySet,
        userUUID,
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

    console.log({ filteredViewFlashCards });

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
                            <Tooltip
                                title="Manage labels"
                                placement="right"
                            >
                                <Chip
                                    label={
                                        selectedStudySet?.label
                                            ? selectedStudySet.label
                                            : "No label selected"
                                    }
                                    variant="outlined"
                                    onClick={() =>
                                        setShowManageLabelsDialog(true)
                                    }
                                />
                            </Tooltip>
                            <Typography variant="body1">
                                {selectedStudySet?.description}
                            </Typography>
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

            {/* Testing out virtual scrolling */}
            {/* <Virtuoso
                style={{
                    height: "20rem",
                }}
                totalCount={filteredViewFlashCards.length}
                itemContent={(index) => filteredViewFlashCards[index]}
            /> */}
            {filteredViewFlashCards}
            <ManageLabelsDialog {...manageLabelsDialogProps} />
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

export default ViewStudySet;
