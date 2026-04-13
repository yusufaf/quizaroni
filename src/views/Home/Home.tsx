import { Favorite, FavoriteBorder, Save } from '@mui/icons-material';
import {
    GridCallbackDetails,
    GridColDef,
    GridColumnVisibilityModel,
    GridDensity,
    GridEventListener,
    GridRenderCellParams,
    GridRowSelectionModel,
    GridSlotsComponentsProps,
    GridSortModel,
    GridToolbar,
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarExport,
    GridToolbarFilterButton,
} from '@mui/x-data-grid';
import { GhostLink, SimpleFlexContainer } from 'styles/AppStyles';
import NoCardsWarningsIcon from 'components/NoCardsWarningsIcon/NoCardsWarningsIcon';
import useBrowserTitle from 'hooks/useBrowserTitle';
import useFilterStudysets from 'hooks/useFilterStudysets';
import useSortStudysets from 'hooks/useSortStudysets';
import { HomeView, SortDirection, Studyset } from 'shared/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGetAllStudysets, useUpdateStudyset } from 'state/api/studysetsAPI';
import { useGetUser, useUpdateUserMetadata } from 'state/api/usersAPI';
import {
    DEFAULT_USER_RESPONSE,
    HOME_LAYOUTS,
    PAGE_TITLES,
    SORT_DIRECTIONS,
} from 'shared/constants';
import HomeGridView from './HomeGridView';
import HomeHTMLView from './HomeHTMLView';
import {
    HomeContainer,
    HomePage,
    HomePaper,
    HomeSetsContainer,
    HomeSetsHeading,
    StyledDataGrid,
} from './HomeStyles';
import HomeToolbar from './HomeToolbar';
import SetActionsMenu from './SetActionsMenu';
import {
    formatDateUsingPreferred,
    getFormattedTimestamp,
} from 'shared/utilities/general';
import {
    Box,
    Button,
    Chip,
    IconButton,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
} from '@mui/material';
import { useStudySetsStore } from 'state/stores/studysets';

// augment the props for the toolbar slot
declare module '@mui/x-data-grid' {
    interface ToolbarPropsOverrides {
        columnVisibilityModel: GridColumnVisibilityModel;
        density: GridDensity;
        t: (key: string) => string;
    }
}

type Props = {};

const CustomToolbar = ({
    columnVisibilityModel,
    density,
    t,
}: NonNullable<GridSlotsComponentsProps['toolbar']>) => {
    const {
        mutate: updateUserMetadata,
        isPending: isUpdateMetadataLoading,
        isSuccess: isUpdateMetadataSuccess,
        isError: isUpdateMetadataError,
    } = useUpdateUserMetadata();

    const handleSavePreferences = async () => {
        updateUserMetadata({
            updates: {
                visibleColumns: columnVisibilityModel,
                density,
            },
        });
    };

    return (
        <GridToolbarContainer>
            <GridToolbarColumnsButton />
            <GridToolbarFilterButton />
            <GridToolbarDensitySelector />
            <GridToolbarExport />
            <Tooltip
                title={
                    t?.('home.saveColumnsAndDensity') ??
                    'Save visible columns and density'
                }
            >
                <Button
                    variant="text"
                    startIcon={<Save />}
                    onClick={handleSavePreferences}
                >
                    {t?.('home.saveTablePreferences') ??
                        'Save Table Preferences'}
                </Button>
            </Tooltip>
        </GridToolbarContainer>
    );
};

const Home = (props: Props) => {
    /* Hooks / Redux */
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { selectedStudySet, setSelectedStudySet } = useStudySetsStore();

    const { data: userData = DEFAULT_USER_RESPONSE } = useGetUser();
    const preferredDateFormat = userData.user?.metadata?.preferredDateFormat;

    const { data: studysetsResponse, isLoading: isGetAllStudysetsLoading } =
        useGetAllStudysets();
    const studysets = studysetsResponse?.studysets ?? [];

    const { mutate: updateStudyset } = useUpdateStudyset();
    const {
        mutate: updateUserMetadata,
        isPending: isUpdateMetadataLoading,
        isSuccess: isUpdateMetadataSuccess,
        isError: isUpdateMetadataError,
    } = useUpdateUserMetadata();

    useBrowserTitle(PAGE_TITLES.HOME);

    /* State */
    const [searchText, setSearchText] = useState<string>('');
    const [selectedSort, setSelectedSort] = useState<string>('lastViewed');
    const [sortDirection, setSortDirection] = useState<SortDirection>(
        SORT_DIRECTIONS.DSC
    );

    const [selectedView, setSelectedView] = useState<HomeView>(
        (localStorage.getItem('homeView') as HomeView) ?? 'table'
    );

    const [contextMenuStudyset, setContextMenuStudyset] =
        useState<Studyset | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);
    const [sortModel, setSortModel] = useState<GridSortModel>([
        {
            field: 'lastViewed',
            sort: 'desc',
        },
    ]);
    const [rowSelectionModel, setRowSelectionModel] =
        useState<GridRowSelectionModel>([]);
    const [density, setDensity] = useState<GridDensity>('compact');

    const selectedStudysetRows: Studyset[] = rowSelectionModel
        .map((studysetUUID) =>
            studysets.find((studyset) => studyset.studysetUUID === studysetUUID)
        )
        .filter(Boolean) as Studyset[];

    const columns: GridColDef[] = useMemo(
        () => [
            {
                display: 'flex',
                field: 'favorited',
                headerName: t('home.columns.favorited'),
                width: 75,
                cellClassName: `favorited-cell`,
                renderCell: (params: GridRenderCellParams<any, boolean>) => {
                    const currentFavorited = params.value;
                    return (
                        <IconButton
                            onClick={(event) => {
                                event.stopPropagation();
                                updateStudyset({
                                    studysetUUID: params.id as string,
                                    updates: {
                                        favorited: !currentFavorited,
                                    },
                                });
                            }}
                        >
                            {currentFavorited ? (
                                <Favorite color="primary" />
                            ) : (
                                <FavoriteBorder />
                            )}
                        </IconButton>
                    );
                },
            },
            {
                field: 'title',
                headerName: t('home.columns.title'),
                width: 300,
                renderCell: (params: GridRenderCellParams<any, any>) => (
                    <GhostLink to={`/view/${params.id}`}>
                        {params.value}
                    </GhostLink>
                ),
            },
            {
                field: 'description',
                headerName: t('home.columns.description'),
                width: 300,
            },
            {
                field: 'createdAt',
                headerName: t('home.columns.created'),
                width: 150,
                valueFormatter: (value) => {
                    return formatDateUsingPreferred(value, preferredDateFormat);
                },
            },
            {
                field: 'lastViewed',
                headerName: t('home.columns.lastViewed'),
                width: 150,
                valueFormatter: (value) => {
                    return formatDateUsingPreferred(value, preferredDateFormat);
                },
            },
            {
                field: 'updatedAt',
                headerName: t('home.columns.lastUpdated'),
                width: 150,
                valueFormatter: (value) => {
                    return formatDateUsingPreferred(value, preferredDateFormat);
                },
            },
            {
                field: 'numberOfCards',
                headerName: t('home.columns.numberOfCards'),
                width: 100,
                valueGetter: (_value, row) => {
                    return row.cards.length;
                },
                renderCell: (params: GridRenderCellParams<any, any>) => (
                    <SimpleFlexContainer style={{ gap: '0.5rem' }}>
                        <span>{params.row?.cards?.length}</span>
                        {params.row?.cards?.length === 0 && (
                            <NoCardsWarningsIcon />
                        )}
                    </SimpleFlexContainer>
                ),
            },
            {
                field: 'labels',
                headerName: t('home.columns.labels'),
                width: 300,
                renderCell: (params: any) => {
                    const labels = params.value as string[];
                    if (!labels || labels.length === 0) {
                        return (
                            <Typography variant="body2" color="text.secondary">
                                {t('home.noLabels')}
                            </Typography>
                        );
                    }
                    return (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            {labels
                                .slice(0, 3)
                                .map((label: string, idx: number) => (
                                    <Chip
                                        key={idx}
                                        label={label}
                                        size="small"
                                    />
                                ))}
                            {labels.length > 3 && (
                                <Chip
                                    label={`+${labels.length - 3}`}
                                    size="small"
                                />
                            )}
                        </Box>
                    );
                },
            },
        ],
        [t, preferredDateFormat, updateStudyset]
    );

    // Create default visibility model where all columns are visible by default
    const defaultVisibilityModel: GridColumnVisibilityModel = columns.reduce(
        (acc, column) => {
            acc[column.field] = true;
            return acc;
        },
        {} as GridColumnVisibilityModel
    );

    const [columnVisibilityModel, setColumnVisibilityModel] =
        useState<GridColumnVisibilityModel>(defaultVisibilityModel);

    const handleViewChange = (_event: any, newView: string | null) => {
        // Enforces one view always being selected
        if (newView === null) {
            return;
        }
        updateUserMetadata({
            updates: {
                homeView: newView,
            },
        });
        setSelectedView(newView as HomeView);
        localStorage.setItem('homeView', newView);
    };

    const onRowDoubleClick: GridEventListener<'rowDoubleClick'> = (
        params, // GridRowParams
        event, // MuiEvent<React.MouseEvent<HTMLElement>>
        details // GridCallbackDetails
    ) => {
        const { row } = params;
        setSelectedStudySet(row);
        navigate(`/view/${row.studysetUUID}`);
    };

    /* ==== Right-Click Context Menu ==== */
    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();

        const localStudyset = studysets.find(
            (studyset: Studyset) =>
                studyset.studysetUUID ===
                event.currentTarget.getAttribute('data-id')
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

    const handleColumnVisibilityChange = (
        newModel: GridColumnVisibilityModel,
        _details: GridCallbackDetails
    ) => {
        setColumnVisibilityModel(newModel);
    };

    const handleDensityChange = (newDensity: GridDensity) => {
        setDensity(newDensity);
    };

    return (
        <HomePage>
            <HomePaper elevation={6}>
                <HomeContainer>
                    <HomeSetsHeading variant="h5">
                        {t('home.yourStudySets')}
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
                                    slots={{
                                        toolbar: CustomToolbar,
                                    }}
                                    // density=
                                    slotProps={{
                                        toolbar: {
                                            csvOptions: {
                                                fileName: `Quizaroni_Studysets_${getFormattedTimestamp()}`,
                                            },
                                            showQuickFilter: true,
                                            columnVisibilityModel,
                                            density,
                                            t,
                                        },
                                        row: {
                                            onContextMenu: handleContextMenu,
                                            style: { cursor: 'context-menu' },
                                        },
                                    }}
                                    getRowId={(row) => row.studysetUUID}
                                    columnVisibilityModel={
                                        columnVisibilityModel
                                    }
                                    onColumnVisibilityModelChange={
                                        handleColumnVisibilityChange
                                    }
                                    density={density}
                                    onDensityChange={handleDensityChange}
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
                            <HomeGridView
                                studysets={searchedStudysets}
                                isLoading={isGetAllStudysetsLoading}
                            />
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
