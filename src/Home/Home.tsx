import { MenuOpen as MenuOpenIcon } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material/";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BoldHeading } from "src/AppStyles";
import ConfirmDialog from "src/components/ConfirmDialog/ConfirmDialog";
import useBrowserTitle from "src/lib/hooks/useBrowserTitle";
import { FLASHSET_VIEWS } from "src/utilities/constants";
import LoginMessage from "../LoginMessage/LoginMessage";
import { useTheme } from "../theme/useTheme";
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
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
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthenticated, selectUserData } from "src/state/slices/globalSlice";
import { selectStudySets, setSelectedStudySet, setStudySets } from "src/state/slices/studysetsSlice";
import axios from "axios";

const Home = (props) => {
    const { isDarkMode, theme } = useTheme();

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);
    const userData = useSelector(selectUserData);
    const studySets = useSelector(selectStudySets);

    console.log("User data in Home component = ", { userData });
    console.log("Study sets data in Home component = ", studySets);

    const [flashSets, setFlashSets] = useState([]);
    const [searchFilteredSets, setSearchFilteredSets] = useState([]);
    const [enteredSearch, setEnteredSearch] = useState("");
    const [selectedFlashSet, setSelectedFlashSet] = useState({});

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogProps, setConfirmDialogProps] = useState({});

    const [isFavorited, setIsFavorited] = useState(false);

    const [selectedView, setSelectedView] = useState("table");
    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(false);

    const openActionsMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
    };

    const closeActionsMenu = () => {
        setAnchorEl(null);
        setActionsMenuOpen(false);
    };

    const handleCloseConfirmDialog = () => {
        setShowConfirmDialog(false);
    };

    const navigate = useNavigate();

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
            renderCell: (cellValues) => {
                return (
                    <>
                        <Tooltip title="Open actions menu" placement="right">
                            <IconButton onClick={(e) => openActionsMenu(e)}>
                                <MenuOpenIcon />
                            </IconButton>
                        </Tooltip>
                        <SetActionsMenu
                            studySet={{}}
                            flashSets={flashSets}
                            open={actionsMenuOpen}
                            onClose={closeActionsMenu}
                            anchorEl={anchorEl}
                        />
                    </>
                );
            },
        },
    ];

    useBrowserTitle("Home");

    const fetchStudySets = async () => {
        try {
            const { uuid: userUUID } = userData;
            if (!userUUID) {
                return;
            }

            /* Fetch the study sets for the user */
            const studySetsResponse = await axios.get("/api/studysets/get", {
                params: {
                    userUUID,
                },
            });

            const returnedStudySets = studySetsResponse.data;
            if (returnedStudySets.length === 0) {
                // TODO: Display message?
            }
            console.log({ returnedStudySets, studySetsResponse });

            dispatch(setStudySets(returnedStudySets));
        } catch (error) {
            console.log("Error retrieivng study sets for user = ", error);
        }
    };
    
    /* Fetch user's study sets if it isn't already set */
    useEffect(() => {
        console.log("Entering useEffect on mount = ", studySets);
        if (studySets.length === 0) {
            console.log("Fetching study sets on mount of Home component")
            fetchStudySets();
        }
    }, [userData]);


    const handleDeleteSet = async () => {
        try {
            const studySetUUID = "";
            const response = await axios.post(
                "/api/studysets/delete",
                studySetUUID
            );
            console.log({ response });
        } catch (error) {}
    };

    const handleFavoriteFilter = () => {};

    const handleViewChange = (event, newView) => {
        if (newView !== null) {
            setSelectedView(newView);
        }
    };

    const onRowDoubleClick = (params, event, details) => {
        console.log({ params, event, details });
        const { row } = params;
        dispatch(setSelectedStudySet(row))
        navigate(`/view/${row.uuid}`)
    };


    // TODO: Replace this
    if (!authenticated) {
        return <LoginMessage page="home" />;
    }

    const homeSetProps = {
        flashSets,
        setFlashSets,
        setSelectedFlashSet,
        handleDeleteSet
    };

    return (
        <HomePage>
            <HomePaper elevation={6}>
                <HomeContainer 
                    p={2}
                    borderRadius={5}    
                >
                    <HomeSetsHeading variant="h5">
                        Your Flashsets
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
                                {studySets.map((studySet) => {
                                    return (
                                        <HomeFlashSet
                                            key={studySet.uuid}
                                            studySet={studySet}
                                            {...homeSetProps}
                                        />
                                    );
                                })}
                            </HomeSetGrid>
                        )}
                    </HomeSetsContainer>
                    <ConfirmDialog
                        open={showConfirmDialog}
                        onClose={handleCloseConfirmDialog}
                        title="Duplicate this set?"
                        dialogMessage="Are you sure you want to duplicate this set?"
                        onConfirm={handleCloseConfirmDialog}
                    />
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Home;
