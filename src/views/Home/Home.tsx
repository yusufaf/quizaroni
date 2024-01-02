import { Favorite, FavoriteBorder } from "@mui/icons-material";
import {
    GridColDef,
    GridEventListener,
    GridRenderCellParams,
    GridRowSelectionModel,
    GridSortModel,
    GridToolbar,
} from "@mui/x-data-grid";
import { GhostLink, SimpleFlexContainer } from "common/AppStyles";
import NoCardsWarningsIcon from "components/NoCardsWarningsIcon/NoCardsWarningsIcon";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import useFilterStudysets from "lib/hooks/useFilterStudysets";
import useSortStudysets from "lib/hooks/useSortStudysets";
import {
    HomeView,
    SortDirection,
    Studyset
} from "lib/types";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useGetAllStudysetsQuery } from "state/api/studysetsAPI";
import {
    useGetUserQuery,
    useUpdateUserMetadataMutation,
} from "state/api/usersAPI";
import {
    selectAuthenticated,
    selectCognitoUser
} from "state/slices/globalSlice";
import { setSelectedStudySet } from "state/slices/studysetsSlice";
import { useTheme } from "theme/useTheme";
import {
    DEFAULT_USER_DATA,
    HOME_LAYOUTS,
    SORT_DIRECTIONS
} from "utilities/constants";
import LoginMessage from "views/LoginMessage/LoginMessage";
import HomeGridView from "./HomeGridView";
import HomeHTMLView from "./HomeHTMLView";
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

type Props = {};

const Home = (props: Props) => {
    /* Hooks / Redux */
    const { isDarkMode, theme } = useTheme();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const authenticated = useSelector(selectAuthenticated);
    const cognitoUser = useSelector(selectCognitoUser);
    const { data: { uuid: userUUID = "" } = DEFAULT_USER_DATA } =
        useGetUserQuery(
            {
                username: cognitoUser.username ?? "",
            },
            {
                skip: !cognitoUser.username,
            }
        );

    /* Skip option prevents hook from running when userUUID is undefined */
    const { data: studysets = [], isLoading: isGetAllStudysetsLoading } =
        useGetAllStudysetsQuery(
            { userUUID: userUUID ?? "" },
            { skip: !userUUID }
        );

    const [
        updateUserMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateUserMetadataMutation();

    useBrowserTitle("Home");

    /* State */
    const [searchText, setSearchText] = useState<string>("");
    const [selectedSort, setSelectedSort] = useState<string>("lastViewed");
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        SORT_DIRECTIONS.DSC
    );

    const [selectedView, setSelectedView] = useState<HomeView>(
        (localStorage.getItem("homeView") as HomeView) ?? "table"
    );

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
    const [rowSelectionModel, setRowSelectionModel] =
        useState<GridRowSelectionModel>([]);

    const selectedStudysetRows: Studyset[] = rowSelectionModel
        .map((studysetUUID) =>
            studysets.find((studyset) => studyset.uuid === studysetUUID)
        )
        .filter(Boolean) as Studyset[];

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    const columns: GridColDef[] = [
        {
            field: "title",
            headerName: "Title",
            width: 300,
            renderCell: (params: GridRenderCellParams<any, any>) => (
                <GhostLink to={`/view/${params.id}`}>{params.value}</GhostLink>
            ),
        },
        {
            field: "description",
            headerName: "Description",
            width: 300,
        },
        {
            field: "createdAt",
            headerName: "Date Created",
            type: "date",
            width: 150,
            valueGetter: ({ value }) => value && new Date(value),
        },
        {
            field: "lastViewed",
            headerName: "Last Viewed",
            type: "date",
            width: 150,
            valueGetter: ({ value }) => value && new Date(value),
        },
        {
            field: "numberOfCards",
            headerName: "# of Cards",
            width: 100,
            valueGetter: (params) => {
                return params.row?.cards?.length;
            },
            renderCell: (params: GridRenderCellParams<any, any>) => (
                <SimpleFlexContainer style={{ gap: "0.5rem" }}>
                    <span>{params.row?.cards?.length}</span>
                    {params.row?.cards?.length === 0 && <NoCardsWarningsIcon />}
                </SimpleFlexContainer>
            ),
        },
        {
            field: "label",
            headerName: "Label",
            width: 200,
        },
        {
            field: "favorited",
            headerName: "Favorited",
            width: 150,
            renderCell: (params: GridRenderCellParams<any, boolean>) => (
                <>
                    {params.value ? (
                        <Favorite color="primary" />
                    ) : (
                        <FavoriteBorder />
                    )}
                </>
            ),
        },
    ];

    const handleViewChange = (_event: any, newView: string | null) => {
        // Enforces one view always being selected
        if (newView === null) {
            return;
        }
        updateUserMetadata({
            uuid: userUUID,
            property: "homeView",
            newValue: newView,
        });
        setSelectedView(newView as HomeView);
        localStorage.setItem("homeView", newView);
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

        const localStudyset = studysets.find(
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

    useEffect(() => {
        // Update the set for which the context menu is open
        if (contextMenuStudyset) {
            setContextMenuStudyset((prevContextMenuStudyset) => {
                const localStudyset = studysets.find(
                    (studyset: Studyset) =>
                        studyset.uuid === prevContextMenuStudyset?.uuid
                );
                return localStudyset ?? null;
            });
        }
    }, [studysets]);

    /* ==== Searching & Filtering for Grid/Table View ==== */
    const sortedStudysets = useSortStudysets({
        sortDirection,
        selectedSort,
        studysets,
    });

    const searchedStudysets = useFilterStudysets({
        searchText,
        studysets: sortedStudysets,
    });

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
                        searchText={searchText}
                        setSearchText={setSearchText}
                        selectedSort={selectedSort}
                        setSelectedSort={setSelectedSort}
                        setSortDirection={setSortDirection}
                        sortDirection={sortDirection}
                        selectedStudysetRows={selectedStudysetRows}
                        selectedStudysetUUIDs={rowSelectionModel as string[]}
                    />
                    <HomeSetsContainer>
                        {selectedView === HOME_LAYOUTS.TABLE && (
                            <>
                                <StyledDataGrid
                                    loading={isGetAllStudysetsLoading}
                                    rows={studysets}
                                    columns={columns}
                                    pageSizeOptions={[10, 25, 100]}
                                    sortModel={sortModel}
                                    onSortModelChange={(model) =>
                                        setSortModel(model)
                                    }
                                    onRowSelectionModelChange={(
                                        newRowSelectionModel
                                    ) => {
                                        setRowSelectionModel(
                                            newRowSelectionModel
                                        );
                                    }}
                                    rowSelectionModel={rowSelectionModel}
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
                                />
                            </>
                        )}
                        {selectedView === HOME_LAYOUTS.GRID && (
                            <HomeGridView studysets={searchedStudysets} />
                        )}
                        {selectedView === HOME_LAYOUTS.HTML && (
                            <HomeHTMLView studysets={searchedStudysets} />
                        )}
                    </HomeSetsContainer>
                </HomeContainer>
            </HomePaper>
        </HomePage>
    );
};

export default Home;
