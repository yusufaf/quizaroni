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
import { Card, SortDirection, Studyset } from "lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useUpdateLastViewedMutation,
    useUpdateStudysetMetadataMutation,
} from "state/api/studysets";
import { selectUserData, setDialogProps } from "state/slices/globalSlice";
import { useTheme } from "theme/useTheme";
import {
    DEFAULT_CATEGORIES,
    DOWNLOAD_FILE_TYPES,
    SORT_DIRECTIONS,
    CONFIRM_DIALOGS,
} from "utilities/constants";
import StudysetActions from "./StudysetActions/StudysetActions";
import DownloadSetModal from "./DownloadSetModal/DownloadSetModal";
import ManageCategoriesDialog from "./ManageCategoriesDialog/ManageCategoriesDialog";
import ManageLabelsDialog from "./ManageLabelsDialog/ManageLabelsDialog";
import NotificationsDialog from "./NotificationsDialog/NotificationsDialog";
import ConfirmDialog from "components/ConfirmDialog/ConfirmDialog";
import ViewStudySetCard from "./ViewStudySetCard";
import {
    CardCount,
    CardFiltersContainer,
    CategoryTab,
    CategoryTabs,
    StudysetInfo,
    SortCardsDropdown,
    ViewStudysetContainer,
    ViewStudysetHeader,
    ViewStudysetPage,
    ViewFlashsetPaper,
} from "./styles";
import useCustomMutation from "lib/hooks/useCustomMutation";
import StudysetSettings from "./StudysetSettings/StudysetSettings";
import ViewStudysetFilters from "./ViewStudysetFilters/ViewStudysetFilters";
import useSortViewCards from "lib/hooks/useSortViewCards";
import useFlas from "lib/hooks/useFil";
import useFilterViewCards from "lib/hooks/useFilterViewCards";

type Props = {};

const ViewStudySet = (props: Props) => {
    const {} = props;

    /* Hooks / Redux */

    const navigate = useNavigate();
    const { id: studysetUUID = "" } = useParams();
    const dispatch = useDispatch();
    // const studySets = useSelector(selectStudySets);
    // console.log({ studySets });
    // const selectedStudySet = useSelector(selectSelectedStudySet);
    const { uuid: userUUID = "", labels = [] } = useSelector(selectUserData);

    const {
        data: studysets = [],
        isLoading: isStudysetsLoading,
        isSuccess: isStudysetsSuccess,
    } = useGetAllStudysetsQuery({
        userUUID,
    });

    const {
        data: selectedStudyset,
        isLoading: isStudySetLoading,
        isSuccess: isStudySetSuccess,
    } = useGetStudysetQuery({
        uuid: studysetUUID,
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

    useBrowserTitle(selectedStudyset?.title ?? "");

    const controlAnchorRef = useRef(null);
    const updatedViewTimestamp = useRef<boolean>(false);

    const [showNotificationsModal, setShowNotificationsModal] =
        useState<boolean>(false);
    const [showControlMenu, setShowControlMenu] = useState<boolean>(false);
    const [showManageLabelsDialog, setShowManageLabelsDialog] =
        useState<boolean>(false);
    const [showStudysetSettings, setShowStudysetSettings] = useState<boolean>(false);

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

    // TODO: This leads to an infinite loop. Need to figure out why.
    useEffect(() => {
        if (!updatedViewTimestamp.current) {
            updateLastViewed({
                uuid: selectedStudyset?.uuid ?? "",
            });
            updatedViewTimestamp.current = true;
        }
    }, [selectedStudyset]);

    const updateMetadataField = (property: string, newValue: any) => {
        try {
            if (!selectedStudyset) {
                return;
            }
            const { uuid } = selectedStudyset;
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

    const handleDeleteStudyset = () => {
        const dialogProps = {
            open: true,
            title: "Delete this study set?",
            dialogMessage: "Are you sure you want to delete this set?",
            type: CONFIRM_DIALOGS.DELETE,
            props: {
                uuid: selectedStudyset?.uuid ?? "",
            },
        };
        dispatch(setDialogProps(dialogProps));
    };

    /* TODO: Future future task.
    Ideally: Displaying a modal where a checkbox whether you want a reminder to study this flashset 
    */
    const handleEmailReminders = () => {};

    const testEmail = async () => {};

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    const onSortChange = (event: SelectChangeEvent<string>) => {
        setSelectedSort(event.target.value);
    };

    const categoryTabs = useMemo(() => {
        const jointCategories = [
            ...Object.values(DEFAULT_CATEGORIES),
            ...(selectedStudyset?.categories ?? []),
        ];
        return jointCategories.map((tab, index) => {
            return <CategoryTab key={index} label={tab} value={tab} />;
        });
    }, [selectedStudyset]);

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
        selectedStudyset,
        handleDeleteStudyset,
        setShowStudysetSettings,
    };

    const manageLabelsDialogProps = {
        labels,
        open: showManageLabelsDialog,
        onClose: () => setShowManageLabelsDialog(false),
        selectedStudySet: selectedStudyset,
        userUUID,
    };

    const sortedViewFlashCards = useSortViewCards({
        selectedSort,
        sortDirection,
        studyset: selectedStudyset,
    })

    const filteredViewFlashCards = useFilterViewCards({
        selectedTab,
        sortedViewFlashCards,
    });

    /* TODO: Move this to separate route */
    // selectedStudyMode === STUDY_MODES.FLASHCARDS ?
    // (
    //     <FlashcardsStudy />
    // )
    // :

    const manageCategoriesProps = {
        open: showManageCategories,
        setOpen: setShowManageCategories,
        onClose: () => setShowManageCategories(false),
        selectedStudyset,
        studysets,
    };

    return (
        <ViewStudysetPage>
            <ViewFlashsetPaper elevation={6}>
                <ViewStudysetContainer>
                    <ViewStudysetHeader>
                        <StudysetInfo>
                            <Button
                                onClick={handleBackClick}
                                startIcon={<ArrowBack color="primary" />}
                            >
                                Back to Your Study Sets
                            </Button>
                            <BoldTypography variant="h5">
                                {selectedStudyset?.title}
                            </BoldTypography>
                            <Typography variant="subtitle1">
                                Created by {selectedStudyset?.username}
                            </Typography>
                            <Tooltip title="Manage Labels" placement="right">
                                <Chip
                                    label={
                                        selectedStudyset?.label
                                            ? selectedStudyset.label
                                            : "No label selected"
                                    }
                                    variant="outlined"
                                    onClick={() =>
                                        setShowManageLabelsDialog(true)
                                    }
                                />
                            </Tooltip>
                            <Typography variant="body1">
                                {selectedStudyset?.description}
                            </Typography>
                            <StudysetActions {...actionSectionProps} />
                        </StudysetInfo>
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
                    </ViewStudysetHeader>
                </ViewStudysetContainer>
            </ViewFlashsetPaper>
            <CardCount variant="h6">
                Number of cards in this study set:{" "}
                {selectedStudyset?.cards?.length}
            </CardCount>
            <ViewStudysetFilters
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                selectedSort={selectedSort}
                setSelectedSort={setSelectedSort}
                selectedStudyset={selectedStudyset}
                setSortDirection={setSortDirection}
                sortDirection={sortDirection}
                setShowManageCategories={setShowManageCategories}
            />

            {/* <CardFiltersContainer>
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
            </CardFiltersContainer> */}

            {/* Testing out virtual scrolling */}
            {/* <Virtuoso
                style={{
                    height: "20rem",
                }}
                totalCount={filteredViewFlashCards.length}
                itemContent={(index) => filteredViewFlashCards[index]}
            /> */}
            {filteredViewFlashCards.map((card, index) => {
                    return (
                        <ViewStudySetCard
                            key={card.uuid}
                            card={card}
                            index={index}
                            selectedStudyset={selectedStudyset}
                        />
                    )
                })
            }
            <ManageLabelsDialog {...manageLabelsDialogProps} />
            <NotificationsDialog
                open={showNotificationsModal}
                onClose={() => setShowNotificationsModal(false)}
            />
            <DownloadSetModal
                open={showDownloadPopup}
                handleClose={() => setShowDownloadPopup(false)}
                downloadFileType={downloadFileType}
                setDownloadFileType={setDownloadFileType}
                studyset={selectedStudyset}
            />
            <ManageCategoriesDialog {...manageCategoriesProps} />
            <StudysetSettings
                open={showStudysetSettings}
                onClose={() => setShowStudysetSettings(false)}
                studyset={selectedStudyset}
            />
            <ConfirmDialog />
            <ScrollToTopFab />
        </ViewStudysetPage>
    );
};

export default ViewStudySet;
