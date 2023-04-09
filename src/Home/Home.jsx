import { MenuOpen as MenuOpenIcon } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material/";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BoldHeading } from "src/AppStyles";
import ConfirmDialog from "src/components/ConfirmDialog/ConfirmDialog";
import useBrowserTitle from "src/lib/hooks/useBrowserTitle";
import { FLASHSET_VIEWS } from "src/utilities/constants";
import { database } from "../firebase/firebase";
import LoginMessage from "../LoginMessage/LoginMessage";
import { useTheme } from "../theme/useTheme";
import * as homeStyles from "./Home.module.css";
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
import {
    HomePage,
    HomePaper,
    HomeSetGrid,
    HomeSetsHeading,
    HomeTableContainer,
} from "./HomeStyles";
import HomeToolbar from "./HomeToolbar";
import SetActionsMenu from "./SetActionsMenu";
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthenticated, selectUserData } from "src/slices/globalSlice";
import { selectStudySets, setStudySets } from "src/slices/studysetsSlice";
import axios from "axios";

const Home = (props) => {
    const { isDarkMode, theme } = useTheme();

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);
    const userData = useSelector(selectUserData);
    const studySets = useSelector(selectStudySets);

    console.log("User data in Home component = ", {userData})
    console.log("Study sets data in Home component = ", {studySets})


    let originalFlashSets;

    const [flashSets, setFlashSets] = useState([]);
    const [searchFilteredSets, setSearchFilteredSets] = useState([]);
    const [enteredSearch, setEnteredSearch] = useState("");
    const [viewFlashSet, setViewFlashSet] = useState(false);
    const [selectedFlashSet, setSelectedFlashSet] = useState({});

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogProps, setConfirmDialogProps] = useState({});

    const [isFavorited, setIsFavorited] = useState(false);

    const [selectedView, setSelectedView] = useState("table");
    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(false);

    const viewSetProps = {
        viewFlashSet,
        setViewFlashSet,
        selectedFlashSet,
        setSelectedFlashSet,
    };

    const homeSetProps = {
        flashSets,
        setFlashSets,
        setViewFlashSet,
        setSelectedFlashSet,
    };

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

    const showViewSetPage =
        viewFlashSet && Object.keys(selectedFlashSet).length !== 0;

    /* TODO: Move columns elsewhere */
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
                            setFlashSets={setFlashSets}
                            flashSet={{}}
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
            console.log({returnedStudySets})

            dispatch(setStudySets(returnedStudySets));
        } catch (error) {
            console.log("Error retrieivng study sets for user = ", error);
        }
    };

    /* Fetch user's study sets if it isn't already set */
    useEffect(() => {
        if (studySets.length === 0) {
            fetchStudySets();
        }
    }, []);

    useEffect(() => {
        // if (enteredSearch === "") {
        //     setFlashSets(originalFlashSets);
        // }

        // let searchTerm = enteredSearch.toLowerCase();
        // let newFlashSets = flashSets?.filter((flashSet) => {
        //     let { title, description } = flashSet;
        //     title = title.toLowerCase();
        //     description = description.toLowerCase();
        //     console.log(
        //         "title.includes(searchTerm) || description.includes(searchTerm) = ",
        //         title.includes(searchTerm) || description.includes(searchTerm)
        //     );
        //     return (
        //         title.includes(searchTerm) || description.includes(searchTerm)
        //     );
        // });

        // /* Display a message when the search didn't have any results? */
        // newFlashSets?.length === 0
        //     ? setFlashSets(originalFlashSets)
        //     : setFlashSets(newFlashSets);
    }, [enteredSearch]);

    const handleDeleteSet = async () => {};

    const handleFavoriteFilter = () => {};

    /**
     * Renders the flashsets for the "Your Flashsets" page
     */
    // const renderFlashSets = () => {
    //     return flashSets.map((flashSet, index) => {
    //         return (
    //             <HomeFlashSet
    //                 key={index}
    //                 flashSet={flashSet}
    //                 {...homeSetProps}
    //             />
    //         )
    //     })
    // }

    const handleViewChange = (event, newView) => {
        if (newView !== null) {
            setSelectedView(newView);
        }
    };

    const onRowDoubleClick = (params, event, details) => {
        console.log({ params, event, details });
        const { id, row } = params;
        // TODO: Put this in redux if it's going to be a different route?
        setSelectedFlashSet(row);
        // navigate(`/view/${id}`)
        setViewFlashSet(true);
    };

    if (!authenticated) {
        return <LoginMessage page="home" />;
    }

    /* TODO: View flashset page needs to be rendering based on navigating to a separate route /view */

    // {showViewSetPage ? (
    //     <ViewFlashSet {...viewSetProps} />
    // ) : (

    return (
        <HomePage>
            <HomePaper elevation={6}>
                <HomeSetsHeading variant="h5">Your Flashsets</HomeSetsHeading>
                <HomeToolbar
                    handleViewChange={handleViewChange}
                    selectedView={selectedView}
                />
                <div className={homeStyles.flashSets}>
                    {selectedView === FLASHSET_VIEWS.TABLE ? (
                        <HomeTableContainer>
                            <DataGrid
                                rows={studySets ?? []}
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
                                        showQuickFilter: true,
                                        quickFilterProps: {
                                            debounceMs: 500,
                                        },
                                    },
                                }}
                            />
                        </HomeTableContainer>
                    ) : (
                        <HomeSetGrid>
                            {flashSets?.map((flashSet, index) => {
                                return (
                                    <HomeFlashSet
                                        key={index}
                                        flashSet={flashSet}
                                        {...homeSetProps}
                                    />
                                );
                            })}
                        </HomeSetGrid>
                    )}
                </div>
                <ConfirmDialog
                    open={showConfirmDialog}
                    onClose={handleCloseConfirmDialog}
                    title="Duplicate this set?"
                    dialogMessage="Are you sure you want to duplicate this set?"
                    onConfirm={handleCloseConfirmDialog}
                />
            </HomePaper>
        </HomePage>
    );
};

export default Home;
