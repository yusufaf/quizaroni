import { Box, SelectChangeEvent } from '@mui/material';
import {
    GetStudysetResponse,
    Studyset,
    UpdateStudysetRequest,
} from 'shared/types';
import { ChangeEvent, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import AssignTabView from './AssignTabView';
import { CategoriesCreateTab } from './CategoriesCreateTab';
import { CategoriesManageTab } from './CategoriesManageTab';
import ImportTabView from './ImportTabView';
import { TABS } from './constants';
import {
    MetadataDialogShell,
    TabConfig,
    ErrorInfo,
} from 'shared/components/MetadataDialogs';
import {
    Edit as EditIcon,
    SwapHoriz as ImportIcon,
    Label as AssignIcon,
} from '@mui/icons-material';

type Props = {
    open: boolean;
    onClose: () => void;
    selectedStudyset: Studyset;
    studysets: Studyset[];
};

// An Assign pick waiting for its debounce. The set and card are captured when
// the pick is made, not when the timer fires.
type PendingAssign = {
    studysetUUID: string;
    targetCardUUID: string;
    newCategories: string[];
};

const ASSIGN_DEBOUNCE_MS = 400;

const ManageCategoriesDialog = (props: Props) => {
    const { open, onClose, selectedStudyset, studysets } = props;

    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const {
        cards = [],
        categories = [],
        title: studysetTitle = '',
        studysetUUID = '',
    } = selectedStudyset;

    // mutateAsync, not mutate: per-call mutate() callbacks only run for the
    // latest call on the hook, so a second save dropped the first one's
    // error handling (#113).
    const { mutateAsync: updateStudySet } = useUpdateStudyset();

    const [selectedTab, setSelectedTab] = useState<string>(TABS.MANAGE);
    const [errorInfo, setErrorInfo] = useState<ErrorInfo>(null);
    const [categoryName, setCategoryName] = useState<string>('');
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [selectedStudysetUUID, setSelectedStudysetUUID] =
        useState<string>('');
    const [selectedCardUUID, setSelectedCardUUID] = useState<string>('');
    const [assignedCategoriesSelection, setAssignedCategoriesSelection] =
        useState<string[]>([]);
    const [savingCount, setSavingCount] = useState(0);
    const [assignPending, setAssignPending] = useState(false);

    const savingRef = useRef(0);
    const assignTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingAssignRef = useRef<PendingAssign | null>(null);
    const assignSeqRef = useRef(0);
    const cardsRef = useRef(cards);
    cardsRef.current = cards;
    const studysetUUIDRef = useRef(studysetUUID);
    studysetUUIDRef.current = studysetUUID;
    const selectedStudysetRef = useRef(selectedStudyset);
    selectedStudysetRef.current = selectedStudyset;
    const selectedCardUUIDRef = useRef(selectedCardUUID);
    selectedCardUUIDRef.current = selectedCardUUID;
    const categoryNameRef = useRef(categoryName);
    categoryNameRef.current = categoryName;
    const tRef = useRef(t);
    tRef.current = t;

    // Render-time state: a save or the refetch it starts is in flight...
    const isRefetching =
        useIsFetching({ queryKey: ['studysets', studysetUUID] }) > 0;
    const isSaving = savingCount > 0 || isRefetching;
    // ...or an Assign pick is still waiting for its debounce.
    const isUpdating = isSaving || assignPending;

    // Handler-time check. It asks the query client instead of reading render
    // state: the refetch starts inside invalidateQueries before mutateAsync
    // resolves, and its data reaches these props a tick after it ends.
    // ViewStudySet passes the cached studyset object as is, so a different
    // object in the cache means the props are behind.
    const isSaveInFlight = useCallback(() => {
        const queryKey = ['studysets', studysetUUIDRef.current];
        const cached =
            queryClient.getQueryData<GetStudysetResponse>(queryKey)?.studyset;
        return (
            savingRef.current > 0 ||
            queryClient.isFetching({ queryKey }) > 0 ||
            (cached !== undefined && cached !== selectedStudysetRef.current)
        );
    }, [queryClient]);

    const isBusy = useCallback(
        () => isSaveInFlight() || assignTimerRef.current !== null,
        [isSaveInFlight]
    );

    const save = useCallback(
        async (
            updates: UpdateStudysetRequest['updates'],
            errorKey: string
        ): Promise<boolean> => {
            savingRef.current += 1;
            setSavingCount((n) => n + 1);
            try {
                await updateStudySet({
                    studysetUUID: studysetUUIDRef.current,
                    updates,
                });
                return true;
            } catch {
                toast.error(t(errorKey));
                return false;
            } finally {
                savingRef.current -= 1;
                setSavingCount((n) => n - 1);
            }
        },
        [updateStudySet, t]
    );
    const saveRef = useRef(save);
    saveRef.current = save;

    const buildAssignUpdates = (
        targetCardUUID: string,
        newCategories: string[]
    ): UpdateStudysetRequest['updates'] => ({
        cards: cardsRef.current.map((card) =>
            card.cardUUID === targetCardUUID
                ? { ...card, categories: newCategories }
                : card
        ),
    });

    const clearAssignTimer = () => {
        if (assignTimerRef.current) {
            clearTimeout(assignTimerRef.current);
        }
        assignTimerRef.current = null;
    };

    const armAssign = (pending: PendingAssign) => {
        pendingAssignRef.current = pending;
        clearAssignTimer();
        assignTimerRef.current = setTimeout(
            () => void runAssignRef.current(),
            ASSIGN_DEBOUNCE_MS
        );
        setAssignPending(true);
    };

    const dropAssign = () => {
        clearAssignTimer();
        pendingAssignRef.current = null;
        setAssignPending(false);
    };

    const runAssign = async () => {
        const pending = pendingAssignRef.current;
        if (!pending) {
            return;
        }
        // Its cards payload can only be built from the set it was picked in.
        if (pending.studysetUUID !== studysetUUIDRef.current) {
            dropAssign();
            toast.error(t('categories.assignFailed'));
            setAssignedCategoriesSelection(
                cardsRef.current.find(
                    (card) => card.cardUUID === selectedCardUUIDRef.current
                )?.categories ?? []
            );
            return;
        }
        // cardsRef is about to be replaced by the in-flight save's refetch.
        if (isSaveInFlight()) {
            armAssign(pending);
            return;
        }
        dropAssign();
        const seq = ++assignSeqRef.current;
        const saved = await saveRef.current(
            buildAssignUpdates(pending.targetCardUUID, pending.newCategories),
            'categories.assignFailed'
        );
        // Revert unless a newer pick has taken over the selection.
        if (
            !saved &&
            seq === assignSeqRef.current &&
            pendingAssignRef.current === null &&
            selectedCardUUIDRef.current === pending.targetCardUUID
        ) {
            setAssignedCategoriesSelection(
                cardsRef.current.find(
                    (card) => card.cardUUID === pending.targetCardUUID
                )?.categories ?? []
            );
        }
    };
    const runAssignRef = useRef(runAssign);
    runAssignRef.current = runAssign;

    const flushAssign = () => {
        if (!pendingAssignRef.current) {
            return;
        }
        clearAssignTimer();
        void runAssignRef.current();
    };

    useEffect(() => {
        // A pick for this card that hasn't saved yet wins over the server copy.
        if (pendingAssignRef.current?.targetCardUUID === selectedCardUUID) {
            return;
        }
        // Use cardsRef to avoid dependency on the defaulted cards array,
        // which is a new [] on every render while the set loads.
        const card = cardsRef.current.find(
            (c) => c.cardUUID === selectedCardUUID
        );
        setAssignedCategoriesSelection(card?.categories ?? []);
        // Re-run when the server data changes, not only on card/open change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCardUUID, open, selectedStudyset.cards]);

    useEffect(
        () => () => {
            const pending = pendingAssignRef.current;
            if (!pending) {
                return;
            }
            clearAssignTimer();
            // The cleanup can't wait for an in-flight save, and its refetch
            // would replace the cards this payload is built from, so the
            // pick is dropped in that case, with the same error as a failed save.
            if (
                pending.studysetUUID === studysetUUIDRef.current &&
                !isSaveInFlight()
            ) {
                void saveRef.current(
                    buildAssignUpdates(
                        pending.targetCardUUID,
                        pending.newCategories
                    ),
                    'categories.assignFailed'
                );
            } else {
                toast.error(tRef.current('categories.assignFailed'));
            }
        },
        // Only touches refs and the stable query client
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const tabs: TabConfig[] = [
        {
            value: TABS.MANAGE,
            label: t('categories.manage'),
            icon: <EditIcon />,
        },
        {
            value: TABS.IMPORT,
            label: t('categories.import'),
            icon: <ImportIcon />,
        },
        {
            value: TABS.ASSIGN,
            label: t('categories.assign'),
            icon: <AssignIcon />,
        },
    ];

    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const handleTabChange = (newTab: string) => {
        flushAssign();
        setSelectedTab(newTab);
    };

    const handleClose = () => {
        flushAssign();
        onClose();
    };

    const handleCardChange = (cardUUID: string) => {
        flushAssign();
        setSelectedCardUUID(cardUUID);
    };

    // Validation
    const validateCategory = useCallback(
        (value: string, excludeIndex?: number): ErrorInfo => {
            if (!value.trim()) {
                return { helperText: t('categories.nameCannotBeEmpty') };
            }
            const isDuplicate = categories.some(
                (cat, i) => cat === value && i !== excludeIndex
            );
            if (isDuplicate) {
                return { helperText: t('categories.categoryAlreadyExists') };
            }
            return null;
        },
        [categories, t]
    );

    // Create Category
    const onCreateCategoryChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const category = e.target.value;
            setCategoryName(category);
            const error = validateCategory(category);
            setErrorInfo(error);
        },
        [validateCategory]
    );

    // A name kept in the field across a save is checked against the new list.
    // Keyed on the server data, not the defaulted categories array, which is
    // a new [] on every render while the set loads.
    useEffect(() => {
        if (categoryNameRef.current) {
            setErrorInfo(validateCategory(categoryNameRef.current));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStudyset.categories]);

    const createCategory = useCallback(async () => {
        if (!studysetUUID || !categoryName.trim() || errorInfo || isBusy()) {
            return;
        }
        const submittedName = categoryName;
        const newCategories = [...categories, categoryName.trim()];
        if (
            (await save(
                { categories: newCategories },
                'categories.createFailed'
            )) &&
            // Keep anything typed while the save was in flight
            categoryNameRef.current === submittedName
        ) {
            setCategoryName('');
            setErrorInfo(null);
        }
    }, [studysetUUID, categoryName, errorInfo, categories, isBusy, save]);

    // Edit Category (inline)
    const handleEditStart = useCallback((index: number) => {
        setEditIndex(index);
        setDeleteIndices([]);
    }, []);

    const handleEditCancel = useCallback(() => {
        setEditIndex(null);
    }, []);

    const handleEdit = useCallback(
        async (index: number, newName: string) => {
            const oldCategoryName = categories[index];
            if (!oldCategoryName || newName === oldCategoryName) {
                setEditIndex(null);
                return;
            }
            if (isBusy()) {
                return;
            }

            const categoriesAfterEdit = [...categories];
            categoriesAfterEdit[index] = newName.trim();

            // Update category name in all affected cards
            const modifiedCards = cards.map((card) => ({
                ...card,
                categories: card.categories.map((cat) =>
                    cat === oldCategoryName ? newName.trim() : cat
                ),
            }));

            if (
                await save(
                    { cards: modifiedCards, categories: categoriesAfterEdit },
                    'categories.renameFailed'
                )
            ) {
                setEditIndex(null);
            }
        },
        [categories, cards, isBusy, save]
    );

    // Delete Categories
    const handleDeleteToggle = useCallback((index: number) => {
        setDeleteIndices((prev) =>
            prev.includes(index)
                ? prev.filter((i) => i !== index)
                : [...prev, index]
        );
        setEditIndex(null);
    }, []);

    const handleDelete = useCallback(async () => {
        if (deleteIndices.length === 0 || isBusy()) return;

        const categoriesToDelete = deleteIndices.map((i) => categories[i]);
        const filteredCategories = categories.filter(
            (_, i) => !deleteIndices.includes(i)
        );

        // Remove categories from all cards
        const modifiedCards = cards.map((card) => ({
            ...card,
            categories: card.categories.filter(
                (cat) => !categoriesToDelete.includes(cat)
            ),
        }));

        if (
            await save(
                { cards: modifiedCards, categories: filteredCategories },
                'categories.deleteFailed'
            )
        ) {
            setDeleteIndices([]);
        }
    }, [deleteIndices, categories, cards, isBusy, save]);

    const onAssignedCategoriesChange = (e: SelectChangeEvent<string[]>) => {
        const raw = e.target.value;
        const newCategories =
            typeof raw === 'string'
                ? (raw as string).split(',')
                : (raw as string[]);
        setAssignedCategoriesSelection(newCategories);
        armAssign({
            studysetUUID: studysetUUIDRef.current,
            targetCardUUID: selectedCardUUIDRef.current,
            newCategories,
        });
    };

    const handleImport = () => {
        if (!selectedStudysetUUID || isBusy()) {
            return;
        }
        const importSetCategories =
            studysets.find(
                (studySet) => studySet.studysetUUID === selectedStudysetUUID
            )?.categories ?? [];

        // Ensure no duplicates, filter out categories that already exist
        const categoriesToImport = importSetCategories.filter(
            (category) => !categories.includes(category)
        );

        const combinedCategories = categories.concat(categoriesToImport);
        void save(
            { categories: combinedCategories },
            'categories.importFailed'
        );
    };

    const handleFileImport = useCallback(
        (newCategories: string[]) => {
            if (isBusy()) {
                return;
            }
            const combinedCategories = categories.concat(newCategories);
            void save(
                { categories: combinedCategories },
                'categories.importFailed'
            );
        },
        [categories, isBusy, save]
    );

    // Delete Unused Categories
    const handleDeleteUnused = useCallback(() => {
        if (isBusy()) {
            return;
        }
        const usedCategories = new Set(
            cards.flatMap((card) => card.categories)
        );
        const unusedCategories = categories.filter(
            (cat) => !usedCategories.has(cat)
        );

        if (unusedCategories.length === 0) {
            toast.error(t('categories.noUnusedCategories'));
            return;
        }

        const filteredCategories = categories.filter((cat) =>
            usedCategories.has(cat)
        );

        void save(
            { categories: filteredCategories },
            'categories.deleteUnusedFailed'
        );
    }, [categories, cards, isBusy, save, t]);

    return (
        <MetadataDialogShell
            open={open}
            onClose={handleClose}
            title={t('categories.manageCategories')}
            tabs={tabs}
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
            maxWidth="lg"
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns:
                        selectedTab === TABS.MANAGE ? '1fr 1fr' : '1fr',
                    gap: '1.25rem',
                    '@media (max-width: 900px)': {
                        gridTemplateColumns: '1fr',
                    },
                }}
            >
                {/* MANAGE tab: 2 columns (form + list) */}
                {isManageTab && (
                    <>
                        {/* Left: Create form */}
                        <Box>
                            <CategoriesCreateTab
                                categoryName={categoryName}
                                errorInfo={errorInfo}
                                onCategoryChange={onCreateCategoryChange}
                                onSubmit={createCategory}
                                isLoading={isUpdating}
                            />
                        </Box>

                        {/* Right: Categories List */}
                        <Box>
                            <CategoriesManageTab
                                categories={categories}
                                studysetTitle={studysetTitle}
                                editIndex={editIndex}
                                deleteIndices={deleteIndices}
                                onEdit={handleEditStart}
                                onDelete={handleDeleteToggle}
                                onSave={handleEdit}
                                onCancel={handleEditCancel}
                                validateFn={validateCategory}
                                onDeleteSelected={handleDelete}
                                onDeleteUnused={handleDeleteUnused}
                                isLoading={isUpdating}
                            />
                        </Box>
                    </>
                )}

                {/* IMPORT tab: 1 column */}
                {isImportTab && (
                    <ImportTabView
                        selectedStudysetUUID={selectedStudysetUUID}
                        studysets={studysets}
                        selectedStudyset={selectedStudyset}
                        setSelectedStudysetUUID={setSelectedStudysetUUID}
                        handleImport={handleImport}
                        onFileImport={handleFileImport}
                        isLoading={isUpdating}
                    />
                )}

                {/* ASSIGN tab: 1 column */}
                {isAssignTab && (
                    <AssignTabView
                        selectedCardUUID={selectedCardUUID}
                        setSelectedCardUUID={handleCardChange}
                        selectedStudyset={selectedStudyset}
                        assignedCategories={assignedCategoriesSelection}
                        onAssignedCategoriesChange={onAssignedCategoriesChange}
                        isAssigningCategories={isSaving}
                    />
                )}
            </Box>
        </MetadataDialogShell>
    );
};

export default ManageCategoriesDialog;
