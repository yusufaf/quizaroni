import {
    FormControl,
    InputAdornment,
    InputLabel,
    ListSubheader,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import {
    GridView as GridViewIcon,
    Search as SearchIcon,
    TableView as TableViewIcon,
    Html as HTMLIcon,
} from "@mui/icons-material";
import { HOME_LAYOUTS } from "utilities/constants";
import { SimpleFlexContainer, SpacedFlexContainer } from "common/AppStyles";

type Props = {
    handleViewChange: (_event: any, newView: string) => void;
    selectedView: string;
};

const HomeToolbar = (props: Props) => {
    const { handleViewChange, selectedView } = props;

    const notTableView = selectedView !== HOME_LAYOUTS.TABLE;

    return (
        <SpacedFlexContainer>
            {notTableView && (
                <SimpleFlexContainer>
                    <TextField
                        id="input-with-icon-textfield"
                        label="TextField"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="end">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        variant="standard"
                    />
                    {/* TODO: Display a modal on mobile? */}
                    <FormControl sx={{ m: 1, minWidth: 120 }}>
                        <InputLabel htmlFor="grouped-select">
                            Grouping
                        </InputLabel>
                        <Select
                            defaultValue=""
                            id="grouped-select"
                            label="Grouping"
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            <ListSubheader>Category 1</ListSubheader>
                            <MenuItem value={1}>Option 1</MenuItem>
                            <MenuItem value={2}>Option 2</MenuItem>
                            <ListSubheader>Category 2</ListSubheader>
                            <MenuItem value={3}>Option 3</MenuItem>
                            <MenuItem value={4}>Option 4</MenuItem>
                        </Select>
                    </FormControl>
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
