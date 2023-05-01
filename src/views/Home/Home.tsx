import { MenuOpen as MenuOpenIcon } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material/";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "components/ConfirmDialog/ConfirmDialog";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import {
    useDeleteStudysetMutation,
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
import { FLASHSET_VIEWS } from "utilities/constants";
import LoginMessage from "views/LoginMessage/LoginMessage";
import { useTheme } from "theme/useTheme";
import HomeStudySetCard from "./HomeStudySetCard/HomeStudySetCard";
import {
    HomeContainer,
    HomePage,
    HomePaper,
    HomeSetGrid,
    HomeSetsContainer,
    HomeSetsHeading,
} from "./HomeStyles";
import HomeToolbar from "./HomeToolbar";
import SetActionsMenu from "./SetActionsMenu";
import { Studyset } from "lib/types";
import useCustomMutation from "lib/hooks/useCustomMutation";

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

    useEffect(() => {
        dispatch(setStudySets(studySetsData));
    }, [studySetsData]);

    useBrowserTitle("Home");

    /* State */
    const [searchFilteredSets, setSearchFilteredSets] = useState([]);
    const [enteredSearch, setEnteredSearch] = useState("");

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogProps, setConfirmDialogProps] = useState({});

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
                    onConfirm: () => {},
                };
                break;
            case "DELETE":
                dialogProps = {
                    open: true,
                    title: "Delete this study set?",
                    dialogMessage: "Are you sure you want to delete this set?",
                    onConfirm: () => {
                        // deleteStudySet();
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
                console.log({ cellValues })
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
                                pageSize={5}
                                rowsPerPageOptions={[5]}
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
                            <HomeSetGrid>
                                {studySets.map((studySet: Studyset) => {
                                    return (
                                        <HomeStudySetCard
                                            key={studySet.uuid}
                                            studySet={studySet}
                                            handleDeleteSet={() => {}}
                                        />
                                    );
                                })}
                            </HomeSetGrid>
                        )}
                    </HomeSetsContainer>
                    <ConfirmDialog />
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Home;
