import { DataGrid, GridEventListener } from "@mui/x-data-grid";
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
} from "state/api/studysets";
import {
    selectAuthenticated,
    selectUserData,
    setDialogProps,
} from "state/slices/global";
import {
    selectStudySets,
    setSelectedStudySet,
    setStudySets,
} from "state/slices/studysets";
import { useTheme } from "theme/useTheme";
import { CONFIRM_DIALOGS, FLASHSET_VIEWS } from "utilities/constants";
import LoginMessage from "views/LoginMessage/LoginMessage";
import HomeGridView from "./HomeGridView";
import {
    HomeContainer,
    HomePage,
    HomePaper,
    HomeSetsContainer,
    HomeSetsHeading,
} from "./HomeStyles";
import HomeToolbar from "./HomeToolbar";
import SetActionsMenu from "./SetActionsMenu";

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

    useEffect(() => {
        dispatch(setStudySets(studySetsData));
    }, [studySetsData]);

    useBrowserTitle("Home");

    /* State */
    const [searchFilteredSets, setSearchFilteredSets] = useState([]);
    const [enteredSearch, setEnteredSearch] = useState("");

    const [isFavorited, setIsFavorited] = useState(false);

    const [selectedView, setSelectedView] = useState("table");
    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(false);

    const [contextMenuStudyset, setContextMenuStudyset] = useState<Studyset | null>(null);

    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);

    const navigate = useNavigate();

    const handleShowConfirmDialog = (type: string, studyset: Studyset) => {
        let dialogProps = {};
        switch (type) {
            case CONFIRM_DIALOGS.DUPLICATE:
                dialogProps = {
                    title: "Duplicate this study set?",
                    dialogMessage:
                        "Are you sure you want to duplicate this set?",
                };
                break;
            case CONFIRM_DIALOGS.DELETE:
                dialogProps = {
                    title: "Delete this study set?",
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
            field: "label",
            headerName: "Label",
            width: 200,
            editable: false,
        }
    ];

    const handleFavoriteFilter = () => {};

    const handleViewChange = (event: any, newView: string | null) => {
        if (newView !== null) {
            setSelectedView(newView);
        }
    };

    const onRowDoubleClick: GridEventListener<'rowDoubleClick'> = (
        params,  // GridRowParams
        event,   // MuiEvent<React.MouseEvent<HTMLElement>>
        details, // GridCallbackDetails
      ) => {
        console.log({ params, event, details });
        const { row } = params;
        dispatch(setSelectedStudySet(row));
        navigate(`/view/${row.uuid}`);
    }

    const handleContextMenu = (event: React.MouseEvent) => {
        console.log("HELP = ", { event });
        event.preventDefault();
        
        const localStudyset = studySetsData.find((studyset: Studyset) => studyset.uuid === event.currentTarget.getAttribute('data-id'))
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
                <HomeContainer p={2} borderRadius={5}>
                    <HomeSetsHeading variant="h5">
                        Your Study Sets
                    </HomeSetsHeading>
                    <HomeToolbar
                        handleViewChange={handleViewChange}
                        selectedView={selectedView}
                    />
                    <HomeSetsContainer>
                        {selectedView === FLASHSET_VIEWS.TABLE ? (
                            <>
                                <DataGrid
                                    rows={studysets}
                                    columns={columns}
                                    pageSizeOptions={[10, 25, 100]}
                                    checkboxSelection
                                    // disableSelectionOnClick
                                    onRowDoubleClick={onRowDoubleClick}
                                    slotProps={{
                                        // toolbar: GridToolbar,
                                        row: {
                                            onContextMenu: handleContextMenu,
                                            style: { cursor: "context-menu" },
                                        },
                                    }}
                                    // components={{ Toolbar: GridToolbar }}
                                    // componentsProps={{
                                    //     toolbar: {
                                    //         // showQuickFilter: true,
                                    //         // quickFilterProps: {
                                    //         //     debounceMs: 500,
                                    //         // },
                                    //     },
                                    //     row: {
                                    //         onContextMenu: handleContextMenu,
                                    //         style: { cursor: 'context-menu' },
                                    //     }
                                    // }}
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
                                     handleShowConfirmDialog={handleShowConfirmDialog}
                                />

                            </>
                        ) : (
                            <HomeGridView
                                studysets={studysets}
                                handleShowConfirmDialog={
                                    handleShowConfirmDialog
                                }
                            />
                        )}
                    </HomeSetsContainer>
                    <ConfirmDialog />
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Home;
