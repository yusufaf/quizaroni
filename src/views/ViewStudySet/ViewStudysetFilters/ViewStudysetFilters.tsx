import { Dispatch, SetStateAction, SyntheticEvent, useMemo } from 'react';
import {
    CardFiltersContainer,
    CategoryTab,
    CategoryTabs,
    SortCardsDropdown,
} from '../styles';
import { SimpleFlexContainer } from 'styles/AppStyles';
import {
    DEFAULT_CATEGORIES,
    SORT_DIRECTIONS,
    VIEW_SET_DIALOGS,
    VIEWSET_LAYOUTS,
} from 'shared/constants';
import { Studyset, SortDirection } from 'shared/types';
import {
    Button,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
} from '@mui/material';
import { ArrowUpward, ArrowDownward, Category, ViewList, ViewModule } from '@mui/icons-material';
import { useViewSetsStore } from 'state/stores/viewSets';

type Props = {
    selectedTab: string;
    setSelectedTab: Dispatch<SetStateAction<string>>;
    selectedStudyset: Studyset | undefined;
    sortDirection: SortDirection;
    setSortDirection: Dispatch<SetStateAction<SortDirection>>;
    selectedSort: string;
    setSelectedSort: Dispatch<SetStateAction<string>>;
    viewMode: string;
    setViewMode: Dispatch<SetStateAction<string>>;
};

const ViewStudysetFilters = ({
    selectedTab,
    setSelectedTab,
    selectedStudyset,
    sortDirection,
    setSortDirection,
    selectedSort,
    setSelectedSort,
    viewMode,
    setViewMode,
}: Props) => {
    const { setSelectedDialog } = useViewSetsStore();

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
        const { ASC, DSC } = SORT_DIRECTIONS;
        const newSortDirection = sortDirection === ASC ? DSC : ASC;
        setSortDirection(newSortDirection);
    };

    const onSortChange = (event: SelectChangeEvent<string>) => {
        setSelectedSort(event.target.value);
    };

    const handleShowCategoriesDialog = () => {
        setSelectedDialog(VIEW_SET_DIALOGS.CATEGORIES);
    };

    const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newView: string | null) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

    return (
        <CardFiltersContainer>
            <SimpleFlexContainer style={{ gap: '1rem' }}>
                <CategoryTabs
                    value={selectedTab}
                    onChange={onTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {categoryTabs}
                </CategoryTabs>
                <Tooltip title="Manage Categories">
                    <IconButton
                        color="primary"
                        onClick={handleShowCategoriesDialog}
                        aria-label="Manage Categories"
                    >
                        <Category />
                    </IconButton>
                </Tooltip>
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
                    <InputLabel id="sort-label" size="small">Sort</InputLabel>
                    <Select
                        labelId="sort-label"
                        label="Sort"
                        value={selectedSort}
                        onChange={onSortChange}
                        autoWidth
                        size="small"
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value={'term'}>Alphabetical - Term</MenuItem>
                        <MenuItem value={'definition'}>
                            Alphabetical - Definition
                        </MenuItem>
                        <MenuItem value={'label'}>
                            Alphabetical - Label
                        </MenuItem>
                    </Select>
                </SortCardsDropdown>
                <ToggleButtonGroup
                    aria-label="View mode toggle"
                    exclusive
                    onChange={handleViewModeChange}
                    value={viewMode}
                    size="small"
                    sx={{ marginLeft: '1rem' }}
                >
                    <ToggleButton value={VIEWSET_LAYOUTS.LIST} title="List View">
                        <ViewList />
                    </ToggleButton>
                    <ToggleButton value={VIEWSET_LAYOUTS.GRID} title="Grid View">
                        <ViewModule />
                    </ToggleButton>
                </ToggleButtonGroup>
            </SimpleFlexContainer>
        </CardFiltersContainer>
    );
};

export default ViewStudysetFilters;
