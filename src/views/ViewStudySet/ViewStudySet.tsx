import { ArrowBack } from "@mui/icons-material/";
import { Button, Chip, Tooltip, Typography } from "@mui/material/";
import { BoldTypography } from "common/AppStyles";
import ConfirmDialog from "components/ConfirmDialog/ConfirmDialog";
import ScrollToTopFab from "components/ScrollToTopFab/ScrollToTopFab";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import useFilterViewCards from "lib/hooks/useFilterViewCards";
import useSortViewCards from "lib/hooks/useSortViewCards";
import { OpenCardNotes, SortDirection, UUID } from "lib/types";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useUpdateLastViewedMutation,
    useUpdateStudysetMetadataMutation,
} from "state/api/studysetsAPI";
import { selectUserData, setDialogProps } from "state/slices/globalSlice";
import {
    selectSelectedDialog,
    setSelectedDialog,
} from "state/slices/viewSetsSlice";
import {
    CONFIRM_DIALOGS,
    DEFAULT_CATEGORIES,
    DOWNLOAD_FILE_TYPES,
    SORT_DIRECTIONS,
    VIEW_SET_DIALOGS,
} from "utilities/constants";
import DownloadSetModal from "./DownloadSetModal/DownloadSetModal";
import ManageCategoriesDialog from "./ManageCategoriesDialog/ManageCategoriesDialog";
import ManageLabelsDialog from "./ManageLabelsDialog/ManageLabelsDialog";
import NotificationsDialog from "./NotificationsDialog/NotificationsDialog";
import PrintDialog from "./PrintDialog.tsx/PrintDialog";
import StudysetActions from "./StudysetActions/StudysetActions";
import StudysetSettings from "./StudysetSettings/StudysetSettings";
import ViewStudySetCard from "./ViewStudySetCard";
import ViewStudysetFilters from "./ViewStudysetFilters/ViewStudysetFilters";
import {
    CardCount,
    NoCardsMessage,
    StudysetInfo,
    ViewFlashsetPaper,
    ViewStudysetContainer,
    ViewStudysetHeader,
    ViewStudysetPage,
} from "./styles";
import NotesDrawer from "./NotesDrawer/NotesDrawer";

type Props = {};

const ViewStudySet = (props: Props) => {
    const {} = props;

    /* Hooks / Redux */
    const navigate = useNavigate();
    const { id: studysetUUID = "" } = useParams();
    const dispatch = useDispatch();
    const { uuid: userUUID = "", labels = [] } = useSelector(selectUserData);

    const selectedDialog = useSelector(selectSelectedDialog);

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

    const [showControlMenu, setShowControlMenu] = useState<boolean>(false);

    const [selectedStudyMode, setSelectedStudyMode] = useState("");
    const [downloadFileType, setDownloadFileType] = useState<string>(
        DOWNLOAD_FILE_TYPES.TXT
    );
    const [selectedTab, setSelectedTab] = useState(DEFAULT_CATEGORIES.ALL);
    const [selectedSort, setSelectedSort] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        SORT_DIRECTIONS.ASC
    );

    useEffect(() => {
        if (!updatedViewTimestamp.current && studysetUUID) {
            updateLastViewed({
                studysetUUID,
            });
            updatedViewTimestamp.current = true;
        }
    }, [studysetUUID]);

    const updateMetadataField = (property: string, newValue: any) => {
        try {
            updateStudysetMetadata({
                property,
                newValue,
                uuid: studysetUUID,
            });
        } catch (error) {
            console.error("Error updating study set metadata");
        }
    };

    const handleBackClick = () => {
        navigate("/");
    };

    const sortedViewFlashCards = useSortViewCards({
        selectedSort,
        sortDirection,
        studyset: selectedStudyset,
    });

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

    const showManageLabelsDialog = () => {
        dispatch(setSelectedDialog(VIEW_SET_DIALOGS.LABELS));
    };

    const onDialogClose = () => {
        dispatch(setSelectedDialog(""));
    };

    return (
        <>
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
                                <Tooltip
                                    title="Manage Labels"
                                    placement="right"
                                >
                                    <Chip
                                        label={
                                            selectedStudyset?.label ??
                                            "No label selected"
                                        }
                                        variant="outlined"
                                        onClick={showManageLabelsDialog}
                                    />
                                </Tooltip>
                                <Typography variant="body1">
                                    {selectedStudyset?.description}
                                </Typography>
                                <StudysetActions
                                    controlAnchorRef={controlAnchorRef}
                                    updateMetadataField={updateMetadataField}
                                    setShowControlMenu={setShowControlMenu}
                                    showControlMenu={showControlMenu}
                                    selectedStudyset={selectedStudyset}
                                />
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
                    {selectedStudyset?.cards.length ?? "N/A"}
                </CardCount>
                <ViewStudysetFilters
                    selectedTab={selectedTab}
                    setSelectedTab={setSelectedTab}
                    selectedSort={selectedSort}
                    setSelectedSort={setSelectedSort}
                    selectedStudyset={selectedStudyset}
                    setSortDirection={setSortDirection}
                    sortDirection={sortDirection}
                />
                {/* Testing out virtual scrolling */}
                {/* <Virtuoso
                style={{
                    height: "20rem",
                }}
                totalCount={filteredViewFlashCards.length}
                itemContent={(index) => filteredViewFlashCards[index]}
            /> */}
                {filteredViewFlashCards.length === 0 &&
                selectedTab !== DEFAULT_CATEGORIES.ALL ? (
                    <NoCardsMessage>
                        No cards matched the selected category.
                    </NoCardsMessage>
                ) : filteredViewFlashCards.length === 0 ? (
                    <NoCardsMessage>No cards in this study set.</NoCardsMessage>
                ) : (
                    filteredViewFlashCards.map((card, index) => {
                        return (
                            <ViewStudySetCard
                                key={card.uuid}
                                card={card}
                                index={index}
                                selectedStudyset={selectedStudyset}
                            />
                        );
                    })
                )}
                <NotesDrawer selectedStudyset={selectedStudyset} />
            </ViewStudysetPage>
            <ManageLabelsDialog
                labels={labels}
                open={selectedDialog === VIEW_SET_DIALOGS.LABELS}
                onClose={onDialogClose}
                selectedStudySet={selectedStudyset}
                userUUID={userUUID}
            />
            <NotificationsDialog
                open={selectedDialog === VIEW_SET_DIALOGS.NOTIFICATIONS}
                onClose={onDialogClose}
            />
            <DownloadSetModal
                open={selectedDialog === VIEW_SET_DIALOGS.DOWNLOAD}
                onClose={onDialogClose}
                downloadFileType={downloadFileType}
                setDownloadFileType={setDownloadFileType}
                studyset={selectedStudyset}
            />
            <ManageCategoriesDialog
                open={selectedDialog === VIEW_SET_DIALOGS.CATEGORIES}
                onClose={onDialogClose}
                selectedStudyset={selectedStudyset}
                studysets={studysets}
            />
            <StudysetSettings
                open={selectedDialog === VIEW_SET_DIALOGS.SETTINGS}
                onClose={onDialogClose}
                studyset={selectedStudyset}
            />
            <PrintDialog
                open={selectedDialog === VIEW_SET_DIALOGS.PRINT}
                onClose={onDialogClose}
                studyset={selectedStudyset}
            />
            <ConfirmDialog />
            <ScrollToTopFab />
        </>
    );
};

export default ViewStudySet;
