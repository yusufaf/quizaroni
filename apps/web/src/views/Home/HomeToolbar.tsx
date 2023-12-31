import {
    Button,
    ButtonGroup,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    ListSubheader,
    MenuItem,
    Select,
    SelectChangeEvent,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import {
    GridView as GridViewIcon,
    Search as SearchIcon,
    TableView as TableViewIcon,
    Html as HTMLIcon,
    ArrowDownward,
    ArrowUpward,
    CloseRounded,
    EditRounded,
    DeleteRounded,
    FavoriteRounded,
    FavoriteBorderRounded,
    ContentCopyRounded,
    LabelRounded,
} from "@mui/icons-material";
import { HOME_LAYOUTS, SORT_DIRECTIONS } from "utilities/constants";
import { SimpleFlexContainer, SpacedFlexContainer } from "common/AppStyles";
import { ChangeEvent, Dispatch, SetStateAction } from "react";
import { SortDirection, Studyset } from "lib/types";
import { setLabelsDialogProps } from "state/slices/globalSlice";
import { useDispatch } from "react-redux";

type Props = {
    handleViewChange: (_event: any, newView: string | null) => void;
    selectedView: string;
    searchText: string;
    setSearchText: Dispatch<SetStateAction<string>>;
    selectedSort: string;
    setSelectedSort: Dispatch<SetStateAction<string>>;
    sortDirection: SortDirection;
    setSortDirection: Dispatch<SetStateAction<SortDirection>>;
    selectedStudysetRows: Studyset[];
    selectedStudysetUUIDs: string[];
};

const HomeToolbar = (props: Props) => {
    const {
        handleViewChange,
        selectedView,
        searchText,
        setSearchText,
        selectedSort,
        setSelectedSort,
        sortDirection,
        setSortDirection,
        selectedStudysetRows,
        selectedStudysetUUIDs,
    } = props;

    const dispatch = useDispatch();

    const isTableView = selectedView === HOME_LAYOUTS.TABLE;
    const firstStudyset = selectedStudysetRows[0];

    const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
    };

    const clearSearchText = () => {
        setSearchText("");
    };

    const onSortChange = (event: SelectChangeEvent<string>) => {
        setSelectedSort(event.target.value);
    };

    const toggleSortDirection = () => {
        const { ASC, DSC } = SORT_DIRECTIONS;
        const newSortDirection = sortDirection === ASC ? DSC : ASC;
        setSortDirection(newSortDirection);
    };

    const handleAssignLabelsClick = () => {
        dispatch(
            setLabelsDialogProps({
                open: true,
                selectedStudysetUUIDs,
                tab: "ASSIGN",
            })
        );
    };

    return (
        <SpacedFlexContainer style={{ alignItems: "baseline" }}>
            {!isTableView && (
                <SimpleFlexContainer style={{ gap: "1rem" }}>
                    <TextField
                        label="Search"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: searchText ? (
                                <InputAdornment position="start">
                                    <IconButton onClick={clearSearchText}>
                                        <CloseRounded />
                                    </IconButton>
                                </InputAdornment>
                            ) : (
                                // Spacing div to prevent moving when no search text
                                <div style={{ width: "3rem" }} />
                            ),
                        }}
                        variant="standard"
                        onChange={onSearchChange}
                        value={searchText}
                    />
                    {/* TODO: Display a modal on mobile? */}

                    <SimpleFlexContainer>
                        <IconButton
                            color="primary"
                            onClick={toggleSortDirection}
                            title="Sort Direction"
                        >
                            {sortDirection === SORT_DIRECTIONS.ASC ? (
                                <ArrowUpward />
                            ) : (
                                <ArrowDownward />
                            )}
                        </IconButton>
                        <FormControl sx={{ m: 1, minWidth: 120 }}>
                            <InputLabel id="sort-label">Sort</InputLabel>
                            <Select
                                labelId="sort-label"
                                label="Sort"
                                onChange={onSortChange}
                                autoWidth
                                value={selectedSort}
                            >
                                <MenuItem value="">
                                    <em>None</em>
                                </MenuItem>
                                <MenuItem value={"title"}>Title</MenuItem>
                                <MenuItem value={"lastViewed"}>
                                    Last Viewed
                                </MenuItem>
                                <MenuItem value={"createdAt"}>
                                    Date Created
                                </MenuItem>
                                <MenuItem value={"numCards"}>
                                    # of Cards
                                </MenuItem>
                            </Select>
                        </FormControl>
                    </SimpleFlexContainer>
                </SimpleFlexContainer>
            )}
            {isTableView && selectedStudysetRows.length > 0 && (
                <SimpleFlexContainer style={{ gap: "1rem" }}>
                    {!(selectedStudysetRows.length > 1) && (
                        <>
                            <Button startIcon={<EditRounded />}>Edit</Button>
                            <Button
                                startIcon={
                                    firstStudyset?.favorited ? (
                                        <FavoriteRounded color="primary" />
                                    ) : (
                                        <FavoriteBorderRounded />
                                    )
                                }
                            >
                                {firstStudyset?.favorited
                                    ? "Unfavorite"
                                    : "Favorite"}
                            </Button>
                        </>
                    )}
                    <Button startIcon={<ContentCopyRounded />}>
                        Duplicate
                    </Button>
                    <Button startIcon={<DeleteRounded />}>Delete</Button>
                    <Button
                        startIcon={<LabelRounded />}
                        onClick={handleAssignLabelsClick}
                    >
                        Assign Labels
                    </Button>
                </SimpleFlexContainer>
            )}
            <ToggleButtonGroup
                aria-label="Home View Toggle Group"
                exclusive
                onChange={handleViewChange}
                value={selectedView}
                sx={{ marginLeft: "auto" }}
            >
                <ToggleButton
                    value={HOME_LAYOUTS.TABLE}
                    key="left"
                    title="Table View"
                >
                    <TableViewIcon />
                </ToggleButton>
                <ToggleButton
                    value={HOME_LAYOUTS.GRID}
                    key="center"
                    title="Grid View"
                >
                    <GridViewIcon />
                </ToggleButton>
                <ToggleButton
                    value={HOME_LAYOUTS.HTML}
                    key="right"
                    title="HTML Table View"
                >
                    <HTMLIcon />
                </ToggleButton>
            </ToggleButtonGroup>
        </SpacedFlexContainer>
    );
};

export default HomeToolbar;
