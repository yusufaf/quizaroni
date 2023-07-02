import { Dispatch, SetStateAction, SyntheticEvent, useMemo } from "react";
import {
    CardFiltersContainer,
    CategoryTab,
    CategoryTabs,
    SortCardsDropdown,
} from "../styles";
import { SimpleFlexContainer } from "common/AppStyles";
import { DEFAULT_CATEGORIES, SORT_DIRECTIONS } from "utilities/constants";
import { Studyset, SortDirection } from "lib/types";
import {
    Button,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
} from "@mui/material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

type Props = {
    selectedTab: string;
    setSelectedTab: Dispatch<SetStateAction<string>>;
    selectedStudyset: Studyset | undefined;
    sortDirection: SortDirection;
    setSortDirection: Dispatch<SetStateAction<SortDirection>>;
    setShowManageCategories: Dispatch<SetStateAction<boolean>>;
    selectedSort: string;
    setSelectedSort: Dispatch<SetStateAction<string>>;
};

const ViewStudysetFilters = (props: Props) => {
    const {
        selectedTab,
        setSelectedTab,
        selectedStudyset,
        sortDirection,
        setSortDirection,
        setShowManageCategories,
        selectedSort,
        setSelectedSort,
    } = props;

    const categoryTabs = useMemo(() => {
        const jointCategories = [
            ...Object.values(DEFAULT_CATEGORIES),
            ...(selectedStudyset?.categories ?? []),
        ];
        return jointCategories.map((tab, index) => {
            return <CategoryTab key={index} label={tab} value={tab} />;
        });
    }, [selectedStudyset]);

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    const toggleSortDirection = () => {
        const newSortDirection =
            sortDirection === SORT_DIRECTIONS.ASC
                ? SORT_DIRECTIONS.DSC
                : SORT_DIRECTIONS.ASC;
        setSortDirection(newSortDirection);
    };

    const onSortChange = (event: SelectChangeEvent<string>) => {
        setSelectedSort(event.target.value);
    };

    return (
        <CardFiltersContainer>
            <SimpleFlexContainer style={{ gap: "1rem" }}>
                <CategoryTabs
                    value={selectedTab}
                    onChange={onTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {categoryTabs}
                </CategoryTabs>
                <Button
                    variant="outlined"
                    onClick={() => setShowManageCategories(true)}
                >
                    Manage Categories
                </Button>
            </SimpleFlexContainer>
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
                <SortCardsDropdown>
                    <InputLabel id="sort-label">Sort</InputLabel>
                    <Select
                        labelId="sort-label"
                        label="Sort"
                        value={selectedSort}
                        onChange={onSortChange}
                        autoWidth
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value={"term"}>Alphabetical - Term</MenuItem>
                        <MenuItem value={"definition"}>
                            Alphabetical - Definition
                        </MenuItem>
                        <MenuItem value={"label"}>
                            Alphabetical - Label
                        </MenuItem>
                    </Select>
                </SortCardsDropdown>
            </SimpleFlexContainer>
        </CardFiltersContainer>
    );
};

export default ViewStudysetFilters;
