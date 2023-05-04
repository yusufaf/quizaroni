import { MenuOpen as MenuOpenIcon } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material/";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
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
} from "state/slices/globalSlice";
import {
    selectStudySets,
    setSelectedStudySet,
    setStudySets,
} from "state/slices/studysetsSlice";
import { useTheme } from "theme/useTheme";
import { FLASHSET_VIEWS } from "utilities/constants";
import LoginMessage from "views/LoginMessage/LoginMessage";
import HomeGridView from "./HomeGridView";
import {
    HomeContainer,
    HomePage,
    HomePaper,
    HomeSetsContainer,
    HomeSetsHeading
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
    const studySets = useSelector(selectStudySets);

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

    const {
        mutate: duplicateStudySet,
        isLoading: isDuplicatingStudySet,
        isSuccess: isDuplicateStudySetSuccess,
        isError: isDuplicateStudySetError,
    } = useCustomMutation({
        mutation: useDuplicateStudysetMutation,
        successMessage: "Successfully duplicated study set",
        errorMessage: "Error duplicating study set",
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

    /* Functions */
    const openActionsMenu = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
    };

    const closeActionsMenu = () => {
        setAnchorEl(null);
        setActionsMenuOpen(false);
    };

    const navigate = useNavigate();

    const handleShowConfirmDialog = (type: string, studyset: Studyset) => {
        let dialogProps = {};
        switch (type) {
            case "DUPLICATE":
                dialogProps = {
                    open: true,
                    title: "Duplicate this study set?",
                    dialogMessage:
                        "Are you sure you want to duplicate this set?",
                    onConfirm: () => {
                        duplicateStudySet({ uuid: studyset.uuid });
                    },
                };
                break;
            case "DELETE":
                dialogProps = {
                    open: true,
                    title: "Delete this study set?",
                    dialogMessage: "Are you sure you want to delete this set?",
                    onConfirm: () => {
                        deleteStudySet({ uuid: studyset.uuid });
                    },
                };
                break;
        }
        dispatch(setDialogProps(dialogProps));
    };

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    const columns = [
        {
            field: "title",
            headerName: "Title",
            width: 200,
        },
        {
            field: "description",
            headerName: "Description",
            width: 150,
            editable: false,
        },
        {
            field: "createdAt",
            headerName: "Created on",
            type: "date",
            width: 150,
            editable: false,
        },
        {
            field: "label",
            headerName: "Label",
            width: 100,
            editable: false,
        },
        {
            field: "actions",
            headerName: "",
            width: 75,
            editable: false,
            sortable: false,
            renderCell: (cellValues: any) => {
                return (
                    <>
                        <Tooltip title="Open actions menu" placement="right">
                            <IconButton onClick={(e) => openActionsMenu(e)}>
                                <MenuOpenIcon />
                            </IconButton>
                        </Tooltip>
                        <SetActionsMenu
                            studySet={cellValues.row}
                            open={actionsMenuOpen}
                            onClose={closeActionsMenu}
                            anchorEl={anchorEl}
                            handleShowConfirmDialog={handleShowConfirmDialog}
                        />
                    </>
                );
            },
        },
    ];

    const handleFavoriteFilter = () => {};

    const handleViewChange = (event: any, newView: string | null) => {
        if (newView !== null) {
            setSelectedView(newView);
        }
    };

    const onRowDoubleClick = (params, event, details) => {
        console.log({ params, event, details });
        const { row } = params;
        dispatch(setSelectedStudySet(row));
        navigate(`/view/${row.uuid}`);
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
                            <DataGrid
                                rows={studySets}
                                columns={columns}
                                pageSize={10}
                                rowsPerPageOptions={[10]}
                                checkboxSelection
                                // disableSelectionOnClick
                                onRowClick={() => {}}
                                onRowDoubleClick={onRowDoubleClick}
                                components={{ Toolbar: GridToolbar }}
                                componentsProps={{
                                    toolbar: {
                                        // showQuickFilter: true,
                                        // quickFilterProps: {
                                        //     debounceMs: 500,
                                        // },
                                    },
                                }}
                                getRowId={(row) => row.uuid}
                            />
                        ) : (
                            <HomeGridView
                                studySets={studySets}
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
