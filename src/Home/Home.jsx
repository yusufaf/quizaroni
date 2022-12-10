import { useEffect, useRef, useState } from "react";
import { useSelector } from 'react-redux';
import { DataGrid } from '@mui/x-data-grid';

import { collection, getDocs, query, where } from "firebase/firestore";
import { database } from "../firebase/firebase";
import { ContentCopy, Delete, Edit, FavoriteBorder, MenuOpen } from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material/';
import { useNavigate } from "react-router-dom";

import LoginMessage from "../LoginMessage/LoginMessage";
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";
import * as appStyles from "../App.module.css";
import { useTheme } from "../theme/useTheme";
import { updateBrowserTitle } from "../utilities/functions";
import * as homeStyles from './Home.module.css';

const Home = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const reduxUserAuthState = useSelector( (state) => state.userAuthState);

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

    const warningStyling = {
        "& .MuiPaper-root": {
            // backgroundColor: theme.background,
        }
    }

    const retrieveTextStyling = (color, fontSize = "1.5rem") => {
        return {
            color,
            fontSize
        }
    }

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

    const handleCloseDuplicateConfirmation = () => {
        setShowDuplicateConfirmation(false);
    }

    let navigate = useNavigate();

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    const actionsMenuRef = useRef(null);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");


    /* TODO: Move columns elsewhere */
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
                            <MenuItem
                                onClick={() => setShowDuplicateConfirmation(true)}
                            >
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
                                placement="right"
                            >
                                <IconButton
                                    onClick={() => handleDelete(index)}
                                >
                                    <Delete
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
                                    <FavoriteBorder
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
        updateBrowserTitle("Home")
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
            {viewFlashSet && Object.keys(selectedFlashSet).length !== 0 ?
                <ViewFlashSet {...viewSetProps} />
                :
                <div className={homeStyles.homePage} >
                    <div className={homeStyles.flashSets} 
                    // style={{ color: theme.foreground, background: theme.background }}
                    >
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
                                    // color: theme.foreground
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
                    <Dialog
                        open={showDuplicateConfirmation}
                        onClose={handleCloseDuplicateConfirmation}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                        sx={warningStyling}
                    >
                        <DialogTitle id="alert-dialog-title"
                            // sx={retrieveTextStyling(theme.foreground, "1.75rem")}
                        >
                            {"Duplicate this set?"}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description"
                                // sx={retrieveTextStyling(theme.foreground, "1.5rem")}
                            >
                                Are you sure you want to duplicate this set?
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDuplicateConfirmation}
                                sx={{
                                    color: "orange"
                                }}
                            >
                                Cancel</Button>
                            <Button
                                onClick={() => {
                                    handleCloseDuplicateConfirmation();
                                }}
                                autoFocus
                                sx={{
                                    color: "orange"
                                }}
                            >
                                Yes
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
            }
            {/* Message if no flash sets have been created */}
            {/* flashSets.length === 0 */}
        </>
    );
}

export default Home;