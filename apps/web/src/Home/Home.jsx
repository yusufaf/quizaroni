import { useEffect, useRef, useState } from "react";
import { useSelector } from 'react-redux';
import { DataGrid } from '@mui/x-data-grid';
import { collection, getDocs, query, where } from "firebase/firestore";
import { database } from "../firebase/firebase";
import {
    GridView as GridViewIcon,
    MenuOpen as MenuOpenIcon,
    TableView as TableViewIcon
} from "@mui/icons-material";
import { Button, IconButton, Menu, MenuItem, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material/';
import { useNavigate } from "react-router-dom";
import LoginMessage from "../LoginMessage/LoginMessage";
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";
import { useTheme } from "../theme/useTheme";
import { updateBrowserTitle } from "src/utilities/functions";
import * as homeStyles from './Home.module.css';
import ConfirmDialog from "src/components/ConfirmDialog/ConfirmDialog";
import { BoldHeading } from "src/AppStyles";
import {
    HomePage,
    HomePaper,
    HomeSetGrid,
} from "./HomeStyles";
import SetActionsMenu from "./SetActionsMenu";

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
    const [showActionsMenu, setShowActionsMenu] = useState(false);

    const [showDuplicateConfirmation, setShowDuplicateConfirmation] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
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

    const handleCloseDuplicateConfirmation = () => {
        setShowDuplicateConfirmation(false);
    }

    const FLASHSET_VIEWS = {
        TABLE: "table",
        GRID: "grid",
    }

    const navigate = useNavigate();

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);
    const actionsMenuRef = useRef(null);

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
                    <div className={homeStyles.actionsContainer}>
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
                        {/* <div className={homeStyles.importantActions}>
                            <Tooltip
                                title="Delete this set"
                                placement="right"
                            >
                                <IconButton
                                    onClick={() => handleDelete(index)}
                                >
                                    <DeleteIcon
                                        fontSize="medium"
                                    />
                                </IconButton>
                            </Tooltip>
                            <Tooltip
                                title="Favorite this card"
                                placement="right"
                            >
                                <IconButton
                                    onClick={() => handleDelete(index)}
                                >
                                    <FavoriteBorderIcon
                                        fontSize="medium"
                                    />
                                </IconButton>
                            </Tooltip>
                        </div> */}
                    </div>
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

        console.log("newFlashSets = ", newFlashSets);

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
                setShowDeleteConfirmation(false);
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

    if (!userAuthState) {
        return <LoginMessage page="home" />;
    }

    return (
        <HomePage>
            {showViewSetPage ?
                <ViewFlashSet {...viewSetProps} />
                :
                <HomePaper elevation={6}>
                    <ToggleButtonGroup
                        aria-label="Grid/Table View Toggle"
                        exclusive
                        onChange={handleViewChange}
                        value={selectedView}
                    >
                        <ToggleButton value={FLASHSET_VIEWS.TABLE} key="left" title="Table View">
                            <TableViewIcon />
                        </ToggleButton>,
                        <ToggleButton value={FLASHSET_VIEWS.GRID} key="center" title="Grid View">
                            <GridViewIcon />
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {/* ✅ */}
                    <div className={homeStyles.flashSets}>
                        <BoldHeading
                            variant="h5"
                        >
                            Your Flashsets
                        </BoldHeading>
                        <div className={homeStyles.tableContainer}>
                            {
                                selectedView === FLASHSET_VIEWS.TABLE ?
                                    (
                                        <DataGrid
                                            rows={flashSets ?? []}
                                            columns={columns}
                                            pageSize={5}
                                            rowsPerPageOptions={[5]}
                                            checkboxSelection
                                            // disableSelectionOnClick
                                            onRowClick={() => {
                                            }}
                                            onRowDoubleClick={(params, event, details) => {
                                                console.log({ params, event, details })
                                                const { id, row } = params;
                                                setSelectedFlashSet(row);
                                                setViewFlashSet(true);
                                            }}
                                        />
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
                                                    >
                                                        value
                                                    </HomeFlashSet>
                                                )
                                            })}
                                        </HomeSetGrid>
                                    )
                            }

                        </div>
                        {!viewFlashSet && flashSets?.length > 0 &&
                            (
                                <>
                                    {/* {renderFlashSets()} */}
                                </>
                            )
                        }
                    </div>
                    <ConfirmDialog
                        open={showDuplicateConfirmation}
                        onClose={handleCloseDuplicateConfirmation}
                        title="Duplicate this set?"
                        dialogMessage="Are you sure you want to duplicate this set?"
                        onConfirm={handleCloseDuplicateConfirmation}
                    />
                </HomePaper>
            }
            {/* Message if no flash sets have been created */}
            {/* flashSets.length === 0 */}
        </HomePage>
    );
}

export default Home;