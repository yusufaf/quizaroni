import {
    GridView as GridViewIcon,
    MenuOpen as MenuOpenIcon,
    TableView as TableViewIcon
} from "@mui/icons-material";
import { IconButton, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material/';
import {
    DataGrid,
    GridToolbar
} from '@mui/x-data-grid';
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { BoldHeading } from "src/AppStyles";
import ConfirmDialog from "src/components/ConfirmDialog/ConfirmDialog";
import { FLASHSET_VIEWS } from "src/utilities/constants";
import { updateBrowserTitle } from "src/utilities/functions";
import { database } from "../firebase/firebase";
import LoginMessage from "../LoginMessage/LoginMessage";
import { useTheme } from "../theme/useTheme";
import * as homeStyles from './Home.module.css';
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
import {
    HomePage,
    HomePaper,
    HomeSetGrid,
    HomeSetsHeading,
    HomeTableContainer
} from "./HomeStyles";
import HomeToolbar from "./HomeToolbar";
import SetActionsMenu from "./SetActionsMenu";
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";

const Home = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const reduxUserAuthState = useSelector((state) => state.userAuthState);

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
        userAuthState
    };

    const homeSetProps = {
        flashSets,
        setFlashSets,
        setViewFlashSet,
        setSelectedFlashSet,
        userAuthState,
    }

    const openActionsMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
    }

    const closeActionsMenu = () => {
        setAnchorEl(null)
        setActionsMenuOpen(false);
    }

    const handleCloseConfirmDialog = () => {
        setShowConfirmDialog(false);
    }

    const navigate = useNavigate();

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    const showViewSetPage = viewFlashSet && Object.keys(selectedFlashSet).length !== 0;

    /* TODO: Move columns elsewhere */
    const columns = [
        {
            field: 'title',
            headerName: 'Title',
            width: 200
        },
        {
            field: 'description',
            headerName: 'Description',
            width: 150,
            editable: false,
        },
        {
            field: 'creationDate',
            headerName: 'Created on',
            type: "date",
            width: 150,
            editable: false,
        },
        {
            field: 'label',
            headerName: 'Label',
            width: 100,
            editable: false,
        },
        {
            field: 'actions',
            headerName: '',
            width: 75,
            editable: false,
            sortable: false,
            renderCell: (cellValues) => {
                return (
                    <>
                        <Tooltip title="Open actions menu" placement="right">
                            <IconButton
                                onClick={(e) => openActionsMenu(e)}
                            >
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
            }
        }
    ];

    useEffect(() => {
        updateBrowserTitle("Home")
    }, [])

    /* */
    useEffect(() => {
        retrieveResults();
    }, [userAuthState])

    useEffect(() => {
        if (enteredSearch === "") {
            setFlashSets(originalFlashSets);
        }
        let searchTerm = enteredSearch.toLowerCase();
        let newFlashSets = flashSets.filter(flashSet => {
            let { title, description } = flashSet;
            title = title.toLowerCase();
            description = description.toLowerCase();
            console.log("title.includes(searchTerm) || description.includes(searchTerm) = ", title.includes(searchTerm) || description.includes(searchTerm));
            return title.includes(searchTerm) || description.includes(searchTerm);
        })

        /* Display a message when the search didn't have any results? */
        newFlashSets.length === 0 ? setFlashSets(originalFlashSets) : setFlashSets(newFlashSets);
    }, [enteredSearch])

    /* Retrieve the created flashsets for the signed-in user */
    const retrieveResults = async () => {
        if (userAuthState) {
            /* Query the database for this user's flashcards */
            const uid = userAuthState.uid;
            const flashCollection = collection(database, "flashcards");

            const queryResult = query(flashCollection, where("uid", "==", uid));
            const querySnapshot = await getDocs(queryResult);

            let localFlashSets = [];

            querySnapshot.forEach((doc) => {
                const flashSet = doc.data();
                if (flashSet.cards) {
                    localFlashSets.push(flashSet);
                }
            });
            originalFlashSets = localFlashSets;
            console.log("localFlashSets = ", localFlashSets);
            localFlashSets.map((set) => {
                set.id = set.uid;
            })
            setFlashSets(localFlashSets);
        }
    }

    const handleDeleteSet = async () => {
        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID)
        );

        const querySnapshot = await getDocs(queryResult);
        const setDoc = querySnapshot.docs[0];
        if (setDoc) {
            const setRef = setDoc.ref;
            deleteDoc(setRef).then((result) => {
                setShowConfirmDialog(true);
            })
        }
    }

    const handleFavoriteFilter = () => {

    }

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

    /*  TODO:
    - Add "Last Viewed" property to flashsets + table 
    */

    const handleViewChange = (event, newView) => {
        if (newView !== null) {
            setSelectedView(newView);
        }
    }

    const onRowDoubleClick = (params, event, details) => {
        console.log({ params, event, details })
        const { id, row } = params;
        // TODO: Put this in redux if it's going to be a different route?
        setSelectedFlashSet(row);
        // navigate(`/view/${id}`)
        setViewFlashSet(true);
    }
    

    if (!userAuthState) {
        return <LoginMessage page="home" />;
    }

    /* TODO: View flashset page needs to be rendering based on navigating to a separate route /view */

    return (
        <HomePage>
            {showViewSetPage ?
                <ViewFlashSet {...viewSetProps} />
                :
                <HomePaper elevation={6}>
                    <HomeSetsHeading
                        variant="h5"
                    >
                        Your Flashsets
                    </HomeSetsHeading>
                    <HomeToolbar
                        handleViewChange={handleViewChange}
                        selectedView={selectedView}
                    />
                    <div className={homeStyles.flashSets}>
                        {
                            selectedView === FLASHSET_VIEWS.TABLE ?
                                (
                                    <HomeTableContainer>
                                        <DataGrid
                                            rows={flashSets ?? []}
                                            columns={columns}
                                            pageSize={5}
                                            rowsPerPageOptions={[5]}
                                            checkboxSelection
                                            // disableSelectionOnClick
                                            onRowClick={() => {
                                            }}
                                            onRowDoubleClick={onRowDoubleClick}
                                            components={{ Toolbar: GridToolbar }}
                                            componentsProps={{
                                                toolbar: {
                                                    showQuickFilter: true,
                                                    quickFilterProps: { debounceMs: 500 },
                                                },
                                            }}
                                        />
                                    </HomeTableContainer>
                                )
                                :
                                (
                                    <HomeSetGrid>
                                        {flashSets.map((flashSet, index) => {
                                            return (
                                                <HomeFlashSet
                                                    key={index}
                                                    flashSet={flashSet}
                                                    {...homeSetProps}
                                                />
                                            )
                                        })}
                                    </HomeSetGrid>
                                )
                        }
                    </div>
                    <ConfirmDialog
                        open={showConfirmDialog}
                        onClose={handleCloseConfirmDialog}
                        title="Duplicate this set?"
                        dialogMessage="Are you sure you want to duplicate this set?"
                        onConfirm={handleCloseConfirmDialog}
                    />
                </HomePaper>
            }
            {/* Message if no flash sets have been created */}
            {/* flashSets.length === 0 */}
        </HomePage>
    );
}

export default Home;