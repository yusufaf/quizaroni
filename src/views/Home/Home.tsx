import {
    DataGrid,
    GridEventListener,
    GridSortModel,
    GridToolbar,
} from "@mui/x-data-grid";
import ConfirmDialog from "components/ConfirmDialog/ConfirmDialog";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import useCustomMutation from "lib/hooks/useCustomMutation";
import { Studyset } from "lib/types";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    useDeleteStudysetMutation,
    useDuplicateStudysetMutation,
    useGetAllStudysetsQuery,
} from "state/api/studysetsAPI";
import { useUpdateUserMetadataMutation } from "state/api/usersAPI";
import {
    selectAuthenticated,
    selectUserData,
    setDialogProps,
} from "state/slices/globalSlice";
import {
    selectStudySets,
    setSelectedStudySet,
    setStudySets,
} from "state/slices/studysetsSlice";
import { useTheme } from "theme/useTheme";
import { CONFIRM_DIALOGS, HOME_LAYOUTS } from "utilities/constants";
import LoginMessage from "views/LoginMessage/LoginMessage";
import HomeGridView from "./HomeGridView";
import {
    HomeContainer,
    HomePage,
    HomePaper,
    HomeSetsContainer,
    HomeSetsHeading,
    StyledDataGrid,
} from "./HomeStyles";
import HomeToolbar from "./HomeToolbar";
import SetActionsMenu from "./SetActionsMenu";
import HomeHTMLView from "./HomeHTMLView";

type Props = {};

const Home = (props: Props) => {
    /* Hooks / Redux */
    const { isDarkMode, theme } = useTheme();

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);
    const { uuid: userUUID = "" } = useSelector(selectUserData);
    const studysets = useSelector(selectStudySets);

    /* Skip option prevents hook from running when userUUID is undefined */
    const { data: studySetsData = [] } = useGetAllStudysetsQuery(
        { userUUID: userUUID ?? "" },
        { skip: !userUUID }
    );

    const {
        mutate: deleteStudySet,
        isLoading: isDeletingStudySet,
        isSuccess: isDeleteStudySetSuccess,
        isError: isDeleteStudySetError,
    } = useCustomMutation({
        mutation: useDeleteStudysetMutation,
        successMessage: "Successfully deleted study set",
        errorMessage: "Error deleting study set",
    });

    const [
        updateUserMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateUserMetadataMutation();

    useEffect(() => {
        dispatch(setStudySets(studySetsData));
    }, [studySetsData]);

    useBrowserTitle("Home");

    /* State */
    const [searchFilteredSets, setSearchFilteredSets] = useState([]);
    const [enteredSearch, setEnteredSearch] = useState("");

    const [isFavorited, setIsFavorited] = useState(false);

    const [selectedView, setSelectedView] = useState("table");

    const [contextMenuStudyset, setContextMenuStudyset] =
        useState<Studyset | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);
    const [sortModel, setSortModel] = useState<GridSortModel>([
        {
            field: "lastViewed",
            sort: "desc",
        },
    ]);

    const navigate = useNavigate();

    const handleShowConfirmDialog = (type: string, studyset: Studyset) => {
        let dialogProps = {};
        switch (type) {
            case CONFIRM_DIALOGS.DUPLICATE:
                dialogProps = {
                    title: `Duplicate the study set "${studyset.title}"?`,
                    dialogMessage:
                        "Are you sure you want to duplicate this set?",
                };
                break;
            case CONFIRM_DIALOGS.DELETE:
                dialogProps = {
                    title: `Delete the study set "${studyset.title}"?`,
                    dialogMessage: "Are you sure you want to delete this set?",
                };
                break;
        }
        dialogProps = {
            ...dialogProps,
            open: true,
            type,
            props: {
                uuid: studyset.uuid,
            },
        };
        dispatch(setDialogProps(dialogProps));
    };

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    const columns = [
        {
            field: "title",
            headerName: "Title",
            width: 300,
        },
        {
            field: "description",
            headerName: "Description",
            width: 300,
            editable: false,
        },
        {
            field: "createdAt",
            headerName: "Created on",
            type: "date",
            width: 150,
            editable: false,
            valueGetter: ({ value }) => value && new Date(value),
        },
        {
            field: "lastViewed",
            headerName: "Last Viewed",
            type: "date",
            width: 150,
            editable: false,
            valueGetter: ({ value }) => value && new Date(value),
        },
        {
            field: "numberOfCards",
            headerName: "# of Cards",
            width: 100,
            valueGetter: (params) => {
                return params.row?.cards?.length;
            },
        },
        {
            field: "label",
            headerName: "Label",
            width: 200,
            editable: false,
        },
    ];

    const handleFavoriteFilter = () => {};

    const handleViewChange = (_event: any, newView: string | null) => {
        if (newView !== null) {
            updateUserMetadata({
                uuid: userUUID,
                property: "homeView",
                newValue: newView,
            });
            setSelectedView(newView);
        }
    };

    const onRowDoubleClick: GridEventListener<"rowDoubleClick"> = (
        params, // GridRowParams
        event, // MuiEvent<React.MouseEvent<HTMLElement>>
        details // GridCallbackDetails
    ) => {
        console.log({ params, event, details });
        const { row } = params;
        dispatch(setSelectedStudySet(row));
        navigate(`/view/${row.uuid}`);
    };

    /* ==== Right-Click Context Menu ==== */
    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();

        const localStudyset = studySetsData.find(
            (studyset: Studyset) =>
                studyset.uuid === event.currentTarget.getAttribute("data-id")
        );
        if (localStudyset) {
            setContextMenuStudyset(localStudyset);
        }

        setContextMenu(
            contextMenu === null
                ? { mouseX: event.clientX - 2, mouseY: event.clientY - 4 }
                : null
        );
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    // TODO: Replace this
    if (!authenticated) {
        return <LoginMessage page="home" />;
    }

    return (
        <HomePage>
            <HomePaper elevation={6}>
                <HomeContainer>
                    <HomeSetsHeading variant="h5">
                        Your Study Sets
                    </HomeSetsHeading>
                    <HomeToolbar
                        handleViewChange={handleViewChange}
                        selectedView={selectedView}
                    />
                    <HomeSetsContainer>
                        {selectedView === HOME_LAYOUTS.TABLE && (
                            <>
                                <StyledDataGrid
                                    rows={studysets}
                                    columns={columns}
                                    pageSizeOptions={[10, 25, 100]}
                                    sortModel={sortModel}
                                    onSortModelChange={(model) =>
                                        setSortModel(model)
                                    }
                                    checkboxSelection
                                    // disableSelectionOnClick
                                    onRowDoubleClick={onRowDoubleClick}
                                    slots={{ toolbar: GridToolbar }}
                                    slotProps={{
                                        toolbar: {
                                            showQuickFilter: true,
                                        },
                                        row: {
                                            onContextMenu: handleContextMenu,
                                            style: { cursor: "context-menu" },
                                        },
                                    }}
                                    getRowId={(row) => row.uuid}
                                />
                                <SetActionsMenu
                                    anchorPosition={
                                        contextMenu !== null
                                            ? {
                                                  top: contextMenu.mouseY,
                                                  left: contextMenu.mouseX,
                                              }
                                            : undefined
                                    }
                                    anchorReference="anchorPosition"
                                    onClose={handleCloseContextMenu}
                                    open={contextMenu !== null}
                                    slotProps={{
                                        root: {
                                            onContextMenu: (e) => {
                                                e.preventDefault();
                                                handleCloseContextMenu();
                                            },
                                        },
                                    }}
                                    studyset={contextMenuStudyset}
                                    anchorEl={null}
                                    handleShowConfirmDialog={
                                        handleShowConfirmDialog
                                    }
                                />
                            </>
                        )}
                        {selectedView === HOME_LAYOUTS.GRID && (
                            <HomeGridView
                                studysets={studysets}
                                handleShowConfirmDialog={
                                    handleShowConfirmDialog
                                }
                            />
                        )}
                        {selectedView === HOME_LAYOUTS.HTML && (
                            <HomeHTMLView studysets={studysets} />
                        )}
                    </HomeSetsContainer>
                    <ConfirmDialog />
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Home;
