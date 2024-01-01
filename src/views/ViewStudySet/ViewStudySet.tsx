import { ArrowBack } from "@mui/icons-material/";
import { Button, Chip, Skeleton, Tooltip, Typography } from "@mui/material/";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
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
import {
    selectCognitoUser,
    setConfirmDialogProps,
    setLabelsDialogProps,
} from "state/slices/globalSlice";
import {
    selectSelectedDialog,
    setSelectedDialog,
} from "state/slices/viewSetsSlice";
import {
    STUDYSET_CONFIRM_DIALOGS,
    DEFAULT_CATEGORIES,
    DEFAULT_USER_DATA,
    SORT_DIRECTIONS,
    VIEW_SET_DIALOGS,
} from "utilities/constants";
import DownloadSetModal from "./DownloadSetModal/DownloadSetModal";
import ManageCategoriesDialog from "./ManageCategoriesDialog/ManageCategoriesDialog";
import NotificationsDialog from "./NotificationsDialog/NotificationsDialog";
import PrintDialog from "./PrintDialog.tsx/PrintDialog";
import StudysetActions from "./StudysetActions/StudysetActions";
import StudysetSettings from "./StudysetSettings/StudysetSettings";
import ViewStudySetCard from "./ViewStudySetCard";
import ViewStudysetFilters from "./ViewStudysetFilters/ViewStudysetFilters";
import {
    NoCardsMessage, 
    StudysetInfo,
    UpdateCardsButton,
    ViewFlashsetPaper,
    ViewStudysetContainer,
    ViewStudysetHeader,
    ViewStudysetPage,
} from "./styles";
import NotesDrawer from "./NotesDrawer/NotesDrawer";
import { useGetUserQuery } from "state/api/usersAPI";
import NoCardsWarningsIcon from "components/NoCardsWarningsIcon/NoCardsWarningsIcon";

type Props = {};

const ViewStudySet = (props: Props) => {
    /* Hooks / Redux */
    const navigate = useNavigate();
    const { id: studysetUUID = "" } = useParams();
    const dispatch = useDispatch();
    const cognitoUser = useSelector(selectCognitoUser);
    const { data: { labels = [], uuid: userUUID = "" } = DEFAULT_USER_DATA } =
        useGetUserQuery({
            username: cognitoUser.username ?? "",
        });

    const selectedDialog = useSelector(selectSelectedDialog);

    /* Skip option prevents hook from running when userUUID is undefined */
    const { data: studysets = [] } = useGetAllStudysetsQuery(
        { userUUID: userUUID ?? "" },
        { skip: !userUUID }
    );

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

    const updatedViewTimestamp = useRef<boolean>(false);

    const [selectedStudyMode, setSelectedStudyMode] = useState("");

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

    const showManageLabelsDialog = () => {
        dispatch(
            setLabelsDialogProps({
                open: true,
                //   studyset: selectedStudyset
                studySetUUID: selectedStudyset?.uuid ?? "",
            })
        );
    };

    const onDialogClose = () => {
        dispatch(setSelectedDialog(""));
    };

    const handleUpdateCardsClick = () => {
        navigate(`/edit/${studysetUUID}`);
    }

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
                                    {isStudySetLoading ? (
                                        <Skeleton />
                                    ) : (
                                        <>{selectedStudyset?.title}</>
                                    )}
                                </BoldTypography>
                                <Typography variant="subtitle1">
                                    {isStudySetLoading ? (
                                        <Skeleton />
                                    ) : (
                                        <>{`Created by ${selectedStudyset?.username}`}</>
                                    )}
                                </Typography>
                                <Tooltip
                                    title="Manage Labels"
                                    placement="right"
                                >
                                    <Chip
                                        label={
                                            selectedStudyset?.label
                                                ? selectedStudyset?.label
                                                : "No label selected"
                                        }
                                        color={
                                            !selectedStudyset?.label
                                                ? "error"
                                                : undefined
                                        }
                                        variant="outlined"
                                        onClick={showManageLabelsDialog}
                                    />
                                </Tooltip>
                                <Typography variant="body1">
                                    {isStudySetLoading ? (
                                        <Skeleton />
                                    ) : (
                                        <>{selectedStudyset?.description}</>
                                    )}
                                </Typography>
                                <StudysetActions
                                    updateMetadataField={updateMetadataField}
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
                <SimpleFlexContainer style={{ gap: "0.5rem" }}>
                    <Typography variant="h6">
                        Number of cards in this study set:{" "}
                        {selectedStudyset?.cards.length ?? "N/A"}
                    </Typography>
                    {!selectedStudyset?.cards.length && <NoCardsWarningsIcon />}
                </SimpleFlexContainer>
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
                <UpdateCardsButton
                    variant="contained"
                    onClick={handleUpdateCardsClick}
                >
                    Update Cards
                </UpdateCardsButton>
                <NotesDrawer selectedStudyset={selectedStudyset} />
            </ViewStudysetPage>
            <NotificationsDialog
                open={selectedDialog === VIEW_SET_DIALOGS.NOTIFICATIONS}
                onClose={onDialogClose}
            />
            <DownloadSetModal
                open={selectedDialog === VIEW_SET_DIALOGS.DOWNLOAD}
                onClose={onDialogClose}
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
            <ScrollToTopFab />
        </>
    );
};

export default ViewStudySet;
