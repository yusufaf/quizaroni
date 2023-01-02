import {
    InputAdornment,
    TextField,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import {
    GridView as GridViewIcon,
    Search as SearchIcon,
    TableView as TableViewIcon,
} from "@mui/icons-material";
import { FLASHSET_VIEWS } from "src/utilities/constants";

type Props = {
    handleViewChange: any,
    selectedView: string,
}

const HomeToolbar = (props: Props) => {
    const {
        handleViewChange,
        selectedView,
    } = props;

    const isTableView = selectedView === FLASHSET_VIEWS.GRID;

    return (
        <div>
            {isTableView &&
                <TextField
                    id="input-with-icon-textfield"
                    label="TextField"
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    variant="standard"
                />
            }
            <ToggleButtonGroup
                aria-label="Grid/Table View Toggle"
                exclusive
                onChange={handleViewChange}
                value={selectedView}
            >
                <ToggleButton
                    value={FLASHSET_VIEWS.TABLE}
                    key="left"
                    title="Table View"
                >
                    <TableViewIcon />
                </ToggleButton>,
                <ToggleButton
                    value={FLASHSET_VIEWS.GRID}
                    key="center"
                    title="Grid View"
                >
                    <GridViewIcon />
                </ToggleButton>
            </ToggleButtonGroup>
        </div>
    )
}

export default HomeToolbar;