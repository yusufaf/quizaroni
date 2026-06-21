import {
    Button,
    ButtonGroup,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
    useMediaQuery,
    useTheme,
} from '@mui/material';
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
    Tune,
} from '@mui/icons-material';
import {
    HOME_LAYOUTS,
    SORT_DIRECTIONS,
    STUDYSET_CONFIRM_DIALOGS,
} from 'shared/constants';
import { SimpleFlexContainer, SpacedFlexContainer } from 'styles/AppStyles';
import { ChangeEvent, Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SortDirection, Studyset } from 'shared/types';
import { useNavigate } from 'react-router-dom';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import { useGlobalStore } from 'state/stores/global';

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

const HomeToolbar = ({
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
}: Props) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [filtersOpen, setFiltersOpen] = useState(false);
    const navigate = useNavigate();

    const { setLabelsDialogProps, showConfirmDialog } = useGlobalStore();

    const { mutate: updateStudyset } = useUpdateStudyset();

    const isTableView = selectedView === HOME_LAYOUTS.TABLE;
    const firstStudyset = selectedStudysetRows[0];
    const multipleStudysetsSelected = selectedStudysetRows.length > 1;

    const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
    };

    const clearSearchText = () => {
        setSearchText('');
    };

    const onSortChange = (event: SelectChangeEvent<string>) => {
        setSelectedSort(event.target.value);
    };

    const toggleSortDirection = () => {
        const { ASC, DSC } = SORT_DIRECTIONS;
        const newSortDirection = sortDirection === ASC ? DSC : ASC;
        setSortDirection(newSortDirection);
    };

    /* ==== Table View: Studyset Action Buttons ==== */
    const handleEditClick = () => {
        if (!firstStudyset) {
            return;
        }
        navigate(`/edit/${firstStudyset.studysetUUID}`);
    };

    const handleFavoriteClick = () => {
        if (!firstStudyset) {
            return;
        }
        const { studysetUUID, favorited: oldFavorited } = firstStudyset;
        updateStudyset({
            studysetUUID,
            updates: {
                favorited: !oldFavorited,
            },
        });
    };

    /**
     * Handles delete or duplicate
     */
    const handleMassActionClick = (type: string) => {
        const modifiedType = multipleStudysetsSelected
            ? `${type}_MULTIPLE`
            : type;

        showConfirmDialog({
            type: modifiedType,
            studysets: selectedStudysetRows,
        });
    };

    const handleAssignLabelsClick = () => {
        setLabelsDialogProps({
            open: true,
            selectedStudysetUUIDs,
            tab: 'ASSIGN',
        });
    };

    const searchField = (
        <TextField
            placeholder={t('home.toolbar.searchPlaceholder')}
            fullWidth={isSmallScreen}
            inputProps={{ 'data-shortcut-search': 'true' }}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon />
                    </InputAdornment>
                ),
                endAdornment: searchText ? (
                    <InputAdornment position="end">
                        <IconButton onClick={clearSearchText} size="small">
                            <CloseRounded />
                        </IconButton>
                    </InputAdornment>
                ) : null,
            }}
            variant="outlined"
            onChange={onSearchChange}
            value={searchText}
            size="small"
            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: '1.5rem',
                    paddingRight: searchText ? '0.25rem' : '0.875rem',
                },
            }}
        />
    );

    const sortControls = (
        <SimpleFlexContainer>
            <IconButton
                color="primary"
                onClick={toggleSortDirection}
                title={t('home.toolbar.sortDirection')}
            >
                {sortDirection === SORT_DIRECTIONS.ASC ? (
                    <ArrowUpward />
                ) : (
                    <ArrowDownward />
                )}
            </IconButton>
            <FormControl sx={{ minWidth: '8.75rem' }} size="small">
                <InputLabel id="sort-label">
                    {t('home.toolbar.sortBy')}
                </InputLabel>
                <Select
                    labelId="sort-label"
                    label={t('home.toolbar.sortBy')}
                    onChange={onSortChange}
                    value={selectedSort}
                    sx={{
                        borderRadius: '0.5rem',
                    }}
                >
                    <MenuItem value="">
                        <em>{t('viewStudySet.none')}</em>
                    </MenuItem>
                    <MenuItem value={'title'}>
                        {t('home.columns.title')}
                    </MenuItem>
                    <MenuItem value={'lastViewed'}>
                        {t('home.columns.lastViewed')}
                    </MenuItem>
                    <MenuItem value={'createdAt'}>
                        {t('home.columns.created')}
                    </MenuItem>
                    <MenuItem value={'numCards'}>
                        {t('home.columns.numberOfCards')}
                    </MenuItem>
                </Select>
            </FormControl>
        </SimpleFlexContainer>
    );

    return (
        <SpacedFlexContainer style={{ alignItems: 'baseline' }}>
            {isTableView ? (
                // Table view: show only search field (sort is handled by DataGrid)
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    {searchField}
                </SimpleFlexContainer>
            ) : isSmallScreen ? (
                // Grid/HTML view on small screens: filters dialog
                <>
                    <IconButton
                        color="primary"
                        onClick={() => setFiltersOpen(true)}
                        aria-label={t('home.toolbar.filtersDialogTitle')}
                    >
                        <Tune />
                    </IconButton>
                    <Dialog
                        open={filtersOpen}
                        onClose={() => setFiltersOpen(false)}
                        fullWidth
                    >
                        <DialogTitle>
                            {t('home.toolbar.filtersDialogTitle')}
                        </DialogTitle>
                        <DialogContent
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                pt: '1rem',
                            }}
                        >
                            {searchField}
                            {sortControls}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setFiltersOpen(false)}>
                                {t('home.toolbar.done')}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            ) : (
                // Grid/HTML view on large screens: show search + sort
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    {searchField}
                    {sortControls}
                </SimpleFlexContainer>
            )}
            {isTableView && selectedStudysetRows.length > 0 && (
                <SimpleFlexContainer
                    style={{ gap: '1rem', marginLeft: '2.5rem' }}
                >
                    {!(selectedStudysetRows.length > 1) && (
                        <>
                            <Button
                                startIcon={<EditRounded />}
                                onClick={handleEditClick}
                            >
                                Edit
                            </Button>
                            <Button
                                startIcon={
                                    firstStudyset?.favorited ? (
                                        <FavoriteRounded color="primary" />
                                    ) : (
                                        <FavoriteBorderRounded />
                                    )
                                }
                                onClick={handleFavoriteClick}
                            >
                                {firstStudyset?.favorited
                                    ? 'Unfavorite'
                                    : 'Favorite'}
                            </Button>
                        </>
                    )}
                    <Button
                        startIcon={<ContentCopyRounded />}
                        onClick={() =>
                            handleMassActionClick(
                                STUDYSET_CONFIRM_DIALOGS.DUPLICATE
                            )
                        }
                    >
                        Duplicate
                    </Button>
                    <Button
                        startIcon={<DeleteRounded />}
                        onClick={() =>
                            handleMassActionClick(
                                STUDYSET_CONFIRM_DIALOGS.DELETE
                            )
                        }
                    >
                        Delete
                    </Button>
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
                sx={{ marginLeft: 'auto' }}
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
