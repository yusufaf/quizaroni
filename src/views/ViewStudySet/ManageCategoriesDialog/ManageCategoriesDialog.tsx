import { LoadingButton } from '@mui/lab';
import { Button, SelectChangeEvent, Tab, Tabs } from '@mui/material/';
import useCustomMutation from 'hooks/useCustomMutation';
import { Studyset } from 'shared/types';
import { ChangeEvent, ReactNode, SyntheticEvent, useState } from 'react';
import { useAppDispatch, useAppSelector } from 'state/reduxHooks';
import { useUpdateStudysetMutation } from 'state/api/studysetsAPI';
import {
    capitalizeFirstLetter,
    downloadObjectAsJSON,
} from 'shared/utilities/general';
import AssignTabView from './AssignTabView';
import CategoriesList from './CategoriesList';
import CreateTabView from './CreateTabView';
import ImportTabView from './ImportTabView';
import ManageTabView from './ManageTabView';
import { ACTIONS, TABS } from './constants';
import {
    CategoriesListColumn,
    DownloadListButton,
    StyledDialog,
    StyledDialogActions,
    StyledDialogContent,
} from './styles';
import {
    BoldTypography,
    SimpleFlexContainer,
    StyledDialogTitle,
} from 'styles/AppStyles';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';
import { Download } from '@mui/icons-material';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {
    open: boolean;
    onClose: () => void;
    selectedStudyset: Studyset;
    studysets: Studyset[];
};

const ManageCategoriesDialog = (props: Props) => {
    const { open, onClose, selectedStudyset, studysets } = props;

    const {
        cards,
        categories = [],
        title: studysetTitle = '',
        studysetUUID = '',
    } = selectedStudyset;

    const dispatch = useAppDispatch();

    const [updateStudySet] = useUpdateStudysetMutation();

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [errorInfo, setErrorInfo] = useState<any>(null);
    const [categoryName, setCategoryName] = useState<string>('');
    const [editCategoryName, setEditCategoryName] = useState<string>('');
    const [editErrorInfo, setEditErrorInfo] = useState<any>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [selectedStudysetUUID, setSelectedStudysetUUID] =
        useState<string>('');
    const [selectedCardUUID, setSelectedCardUUID] = useState<string>('');

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    // #region Create Category
    const onCreateCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
        const category = e.target.value;
        const isDuplicate = categories.includes(category);
        setCategoryName(category);
        if (isDuplicate) {
            setErrorInfo({
                helperText: 'Category already exists',
            });
        } else {
            setErrorInfo(null);
        }
    };

    const createCategory = () => {
        if (!studysetUUID) {
            return;
        }
        const newCategories = categories.concat(categoryName);

        updateStudySet({
            studysetUUID,
            updates: {
                categories: newCategories,
            },
        });
    };
    // #endregion Create Category

    // #region Edit Category
    const onEditCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newCategoryName = e.target.value;
        const allOtherCategories = categories.filter(
            (_, index) => index !== editIndex
        );
        const isDuplicate = allOtherCategories.includes(newCategoryName);
        console.log({ isDuplicate, newCategoryName });
        setEditCategoryName(newCategoryName);
        if (isDuplicate) {
            setEditErrorInfo({
                helperText: 'Category already exists',
            });
        } else if (!newCategoryName) {
            setEditErrorInfo({
                helperText: "Category name can't be empty",
            });
        } else {
            setEditErrorInfo(null);
        }
    };

    const handleEditClick = (index: number) => {
        setDeleteIndices([]);
        setSelectedAction(ACTIONS.EDIT);
        setEditIndex(index);
        setEditCategoryName(categories[index]);
    };
    // #endregion Edit Category

    const handleDeleteClick = (index: number) => {
        setEditIndex(null);
        setEditCategoryName('');
        setEditErrorInfo(null);

        setSelectedAction(ACTIONS.DELETE);
        if (deleteIndices.includes(index)) {
            setDeleteIndices(deleteIndices.filter((value) => value !== index));
        } else {
            setDeleteIndices(deleteIndices.concat(index));
        }
    };

    const handleEditOrDelete = async () => {
        try {
            /* Don't need to check categories cause they're paired */

            if (selectedAction === ACTIONS.EDIT && editIndex !== null) {
                const oldCategoryName = categories[editIndex];
                // Check if it's the same
                if (editCategoryName === oldCategoryName) {
                    return;
                }

                const categoriesAfterEdit = [...categories];
                categoriesAfterEdit[editIndex] = editCategoryName;

                /* Update the category name in all affected cards */
                const modifiedCards = [...cards].map((card) => {
                    const { categories: cardCategories = [] } = card;
                    const newCardCategories = cardCategories.map((category) => {
                        if (category === oldCategoryName) {
                            return editCategoryName;
                        }
                        return category;
                    });
                    return {
                        ...card,
                        categories: newCardCategories,
                    };
                });

                updateStudySet({
                    studysetUUID,
                    updates: {
                        cards: modifiedCards,
                        categories: categoriesAfterEdit,
                    },
                });
            } else if (selectedAction === ACTIONS.DELETE) {
                deleteCategories();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSelectedAction(null);
        }
    };

    // TODO: Debouncing?
    const onAssignedCategoriesChange = (e: SelectChangeEvent) => {
        const newCategories = e.target.value;
        const modifiedCards = [...cards].map((card) => {
            if (card.cardUUID === selectedCardUUID) {
                return {
                    ...card,
                    categories: newCategories,
                };
            }
            return card;
        });

        updateStudySet({
            studysetUUID,
            updates: {
                cards: modifiedCards,
            },
        });
    };

    const handleImport = () => {
        if (!selectedStudysetUUID) {
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
        updateStudySet({
            studysetUUID,
            updates: {
                categories: combinedCategories,
            },
        });
    };

    // #region Delete Category
    const deleteCategories = (
        deletionType: 'unused' | 'standard' = 'standard'
    ) => {
        const isUnusedDelete = deletionType === 'unused';

        let categoriesToDelete: string[];
        if (isUnusedDelete) {
            categoriesToDelete = categories.filter((category) => {
                return !cards.some((card) =>
                    card.categories.includes(category)
                );
            });
        } else {
            categoriesToDelete = deleteIndices.map(
                (index) => categories[index]
            );
        }

        const filteredCategories = categories.filter((category, index) => {
            if (isUnusedDelete) {
                return cards.some((card) => card.categories.includes(category));
            }
            return !deleteIndices.includes(index);
        });

        /* Delete the category name from the study set's cards */
        const modifiedCards = [...cards].map((card) => {
            const { categories: cardCategories = [] } = card;
            const newCardCategories = cardCategories.filter((category) => {
                return !categoriesToDelete.includes(category);
            });
            return {
                ...card,
                categories: newCardCategories,
            };
        });

        updateStudySet({
            studysetUUID,
            updates: {
                cards: modifiedCards,
                categories: filteredCategories,
            },
        });
    };
    // #endregion Delete Category

    const renderDialogButton = (): ReactNode => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={createCategory}
                        disabled={!categoryName || Boolean(errorInfo)}
                        // loading={isCreatingCategory}
                    >
                        Create
                    </LoadingButton>
                );
            case TABS.MANAGE:
                const editDisabled =
                    selectedAction === ACTIONS.EDIT && editErrorInfo;
                const deleteDisabled =
                    selectedAction === ACTIONS.DELETE && !deleteIndices.length;
                const disabled = editDisabled || deleteDisabled;
                const buttonText =
                    selectedAction === ACTIONS.EDIT
                        ? 'Save Edit'
                        : `Delete (${deleteIndices.length})`;
                return (
                    selectedAction && (
                        <Button
                            variant="contained"
                            onClick={handleEditOrDelete}
                            disabled={disabled}
                        >
                            {buttonText}
                        </Button>
                    )
                );
            case TABS.IMPORT:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={handleImport}
                        disabled={!selectedStudysetUUID}
                    >
                        Import Categories
                    </LoadingButton>
                );
        }
    };

    const downloadCategoriesList = () => {
        downloadObjectAsJSON(
            categories,
            `Quizaroni_${studysetTitle}_Categories.json`
        );
    };

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StandardDialogTitle
                title={`${capitalizeFirstLetter(selectedTab.toLowerCase())} Categories`}
                onClose={onClose}
            />
            <StyledDialogContent>
                <div>
                    <Tabs
                        value={selectedTab}
                        onChange={onTabChange}
                        scrollButtons="auto"
                    >
                        {[...Object.values(TABS)].map((tab, index) => (
                            <Tab key={index} label={tab} value={tab} />
                        ))}
                    </Tabs>
                    {isCreateTab && (
                        <CreateTabView
                            categoryName={categoryName}
                            errorInfo={errorInfo}
                            onCreateCategoryChange={onCreateCategoryChange}
                        />
                    )}
                    {isManageTab && (
                        <ManageTabView
                            editErrorInfo={editErrorInfo}
                            editCategoryName={editCategoryName}
                            editIndex={editIndex}
                            onEditCategoryChange={onEditCategoryChange}
                            deleteUnusedCategories={() =>
                                deleteCategories('unused')
                            }
                        />
                    )}
                    {isImportTab && (
                        <ImportTabView
                            selectedStudysetUUID={selectedStudysetUUID}
                            studysets={studysets}
                            selectedStudyset={selectedStudyset}
                            setSelectedStudysetUUID={setSelectedStudysetUUID}
                        />
                    )}
                    {isAssignTab && (
                        <AssignTabView
                            selectedCardUUID={selectedCardUUID}
                            setSelectedCardUUID={setSelectedCardUUID}
                            selectedStudyset={selectedStudyset}
                            onAssignedCategoriesChange={
                                onAssignedCategoriesChange
                            }
                        />
                    )}
                </div>
                <CategoriesListColumn>
                    <SimpleFlexContainer style={{ alignItems: 'baseline' }}>
                        <BoldTypography>Categories</BoldTypography>
                        <DownloadListButton
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={downloadCategoriesList}
                        >
                            Download
                        </DownloadListButton>
                    </SimpleFlexContainer>
                    <CategoriesList
                        categories={selectedStudyset?.categories ?? []}
                        selectedTab={selectedTab}
                        editIndex={editIndex}
                        deleteIndices={deleteIndices}
                        handleEditClick={handleEditClick}
                        handleDeleteClick={handleDeleteClick}
                    />
                </CategoriesListColumn>
            </StyledDialogContent>
            <StyledDialogActions>{renderDialogButton()}</StyledDialogActions>
        </StyledDialog>
    );
};

export default ManageCategoriesDialog;
