import { useState, useEffect, useRef } from "react"
import { useSelector, useDispatch } from 'react-redux'
// import { setUserAuthState } from "../reducers/userAuthState";
import { DataGrid } from '@mui/x-data-grid';


/* Firebase Operations */

import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material/';
import { ContentCopy, Delete, Edit, MenuOpen, FavoriteBorder, Favorite } from "@mui/icons-material";

import LoginMessage from "../LoginMessage/LoginMessage";
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";

import { FLASHSET_COLUMNS } from "../utilities/constants";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as homeStyles from './Home.module.css';
import * as appStyles from "../App.module.css";

/*
    Home Component
*/
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

    const openActionsMenu = () => {
        setShowActionsMenu(true);
    }

    const hideActionsMenu = () => {
        setShowActionsMenu(false);
    }

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    const actionsMenuRef = useRef(null);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    const columns = [
        {
            field: 'title',
            headerName: 'Title',
            width: 100
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
                    <div ref={actionsMenuRef} className={homeStyles.actionsContainer}>
                        <Tooltip title="Open actions menu" placement="right">
                            <IconButton
                                onClick={openActionsMenu}
                                sx={{
                                    color: theme.foreground
                                }}
                            >
                                <MenuOpen />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            anchorEl={actionsMenuRef.current}
                            open={showActionsMenu} onClose={hideActionsMenu}
                        >
                            <MenuItem>
                                <Edit
                                    sx={{
                                        marginRight: "0.75rem"
                                    }}
                                />
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontSize: '1.5rem',
                                    }}
                                >
                                    Rename
                                </Typography>
                            </MenuItem>
                            <MenuItem>
                                <ContentCopy
                                    sx={{
                                        marginRight: "0.75rem"
                                    }}
                                />
                                <Typography
                                    variant="subtitle1"
                                    sx={{
                                        fontSize: '1.5rem',
                                    }}
                                >
                                    Duplicate
                                </Typography>
                            </MenuItem>
                        </Menu>
                        <div className={homeStyles.importantActions}>
                            <Tooltip
                                title="Delete this set"
                                placement="top"
                            >
                                <IconButton
                                    onClick={() => handleDelete(index)}
                                >
                                    <Delete
                                        sx={{
                                            color: theme.foreground
                                        }}
                                        fontSize="medium"
                                    />
                                </IconButton>
                            </Tooltip>
                        </div>

                    </div>
                );
            }
        }
    ];

    useEffect(() => {
        document.title = `Quizaroni | Home`
        return () => {
            document.title = `Quizaroni`;
        }
    }, [])

    /* */
    useEffect(() => {
        retrieveResults();
    }, [userAuthState])

    useEffect(() => {
        if (enteredSearch === "") {
            // console.log("originalFlashSets = ", originalFlashSets);
            setFlashSets(originalFlashSets);
        }
        let searchTerm = enteredSearch.toLowerCase();
        // console.log("searchTerm = ", searchTerm)
        // console.log("flashSets in Search useEffect = ", flashSets);
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

    const handleFavoriteFilter = () => {

    }

    /* Render the search bar for the "Your Flashsets" page */
    const renderSearchBar = () => {
        return (
            <div className={homeStyles.searchContainer}>
                <input
                    className={`${homeStyles.search} ${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                    placeholder="Search for a study set"
                    onChange={e => setEnteredSearch(e.target.value)}
                />
            </div>
        )
    }

    /**
     * Renders the the header for the "Your Flashsets" page
     */
    const renderHeader = () => {
        return (
            <div className={homeStyles.header}>
                <span>Title</span>
                <span>Description</span>
                <span>Created on</span>
                <span style={{ marginRight: "7rem" }}>Label</span>
                {/* TODO: Favorited filter */}
                <span className={homeStyles.favoriteFilter}>
                    <input
                        id="favorite"
                        type="checkbox"
                        onChange={() => handleFavoriteFilter()}
                    />
                    <label htmlFor="favorite" style={{ marginBottom: "0.3rem" }}>{'\u2605'}</label>
                </span>
            </div>
        )
    }

    /**
     * Renders the flashsets for the "Your Flashsets" page
     */
    const renderFlashSets = () => {
        let localFlashSets = [...flashSets];

        return localFlashSets.map((flashSet, index) => {
            return <HomeFlashSet
                key={index}
                flashSet={flashSet}
                {...homeSetProps}
            />
        })
    }

    // const filterFlashsets = (column) => {
    //     switch (column) {
    //         case "Title":

    //             break;

    //         default:
    //             break;
    //     }
    // }

    /*  TODO:
    - Add "Last Viewed" property to flashsets + table 
    */


    if (!userAuthState) {
        return <LoginMessage page="home" />;
    }

    return (
        <>
            {/* ViewFlashset rendered right here? */}
            {viewFlashSet && Object.keys(selectedFlashSet).length !== 0 ?
                <ViewFlashSet {...viewSetProps} />
                :
                (
                    <div className={homeStyles.flashSets} style={{ color: theme.foreground, background: theme.background }}>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: "bold"
                            }}
                        >
                            Your Flashsets
                        </Typography>

                        {renderSearchBar()}
                        {/* {renderHeader()} */}

                        <div className={homeStyles.tableContainer}>
                            {/* TODO: Have loading spinner for when data is loading */}
                            <DataGrid
                                rows={flashSets ?? []}
                                columns={columns}
                                pageSize={5}
                                rowsPerPageOptions={[5]}
                                checkboxSelection
                                disableSelectionOnClick
                                onRowClick={() => {
                                }}
                                sx={{
                                    color: theme.foreground
                                }}
                            />
                        </div>


                        {/* TODO: Review */}
                        {!viewFlashSet && flashSets?.length > 0 &&
                            (
                                <>
                                    {renderFlashSets()}
                                </>
                            )
                        }
                    </div>
                )
            }
            {/* Message if no flash sets have bene created */}
            {/* flashSets.length === 0 */}
        </>
    );
}

export default Home;