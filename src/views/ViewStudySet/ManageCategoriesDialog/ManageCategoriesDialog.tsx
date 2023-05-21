import {
    DialogTitle,
    DialogActions,
    Button,
    Tabs,
    Tab,
    Select,
    Typography,
    InputLabel,
    FormControl,
    MenuItem,
} from "@mui/material/";
import {
    ChangeEvent,
    Dispatch,
    ReactNode,
    SetStateAction,
    SyntheticEvent,
    useEffect,
    useState,
} from "react";
import {
    CategoryInputsContainer,
    CategoryFormControl,
    CategoryField,
    StyledDialog,
    StyledDialogContent,
    StyledMenuItem,
} from "./styles";
import { useDispatch, useSelector } from "react-redux";
import {
    useAssignCardCategoriesMutation,
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useEditCategoryMutation,
    useGetAllStudysetsQuery,
} from "state/api/studysets";
import { Card, Studyset } from "lib/types";
import { selectUserData } from "state/slices/globalSlice";
import { useParams } from "react-router-dom";
import { LoadingButton } from "@mui/lab";
import useCustomMutation from "lib/hooks/useCustomMutation";
import { TABS, ACTIONS, TAB_PROPERTIES } from "./constants";
import CategoriesList from "./CategoriesList";

type Props = {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    selectedStudySet: Studyset;
    studySets: Studyset[];
};

const ManageCategoriesDialog = (props: Props) => {
    const { open, setOpen, selectedStudySet, studySets } = props;

    /* Hooks / Redux */
    const { id: studySetUUID } = useParams();

    const dispatch = useDispatch();
    const { uuid: userUUID = "" } = useSelector(selectUserData);

    const {
        mutate: createCategory,
        isLoading: isCreatingCategory,
        isSuccess: isCreateSuccess,
        isError: isCreateError,
    } = useCustomMutation({
        mutation: useCreateCategoryMutation,
        successMessage: "Successfully created category",
        errorMessage: "Error creating category",
        onSuccess: () => {
            setCategoryName("");
        },
    });

    const {
        mutate: editCategory,
        isLoading: isEditingCategory,
        isSuccess: isEditSuccess,
        isError: isEditError,
    } = useCustomMutation({
        mutation: useEditCategoryMutation,
        successMessage: "Successfully created category",
        errorMessage: "Error creating category",
        onSuccess: () => {
            setEditCategoryName("");
            setEditIndex(null);
        },
    });

    const {
        mutate: deleteCategory,
        isLoading: isDeletingCategory,
        isSuccess: isDeleteSuccess,
        isError: isDeleteError,
    } = useCustomMutation({
        mutation: useDeleteCategoryMutation,
        successMessage: "Successfully deleted category",
        errorMessage: "Error deleting category",
        onSuccess: () => {
            setDeleteIndices([]);
        },
    });

    const {
        mutate: assignCardCategories,
        isLoading: isAssigningCategories,
        isSuccess: isAssignSuccess,
        isError: isAssignError,
    } = useCustomMutation({
        mutation: useAssignCardCategoriesMutation,
        successMessage: "Categories assigned to cards",
        errorMessage: "Error assigning categories to cards",
    });

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [errorInfo, setErrorInfo] = useState(null);
    const [categoryName, setCategoryName] = useState<string>("");
    const [editCategoryName, setEditCategoryName] = useState<string>("");
    const [editErrorInfo, setEditErrorInfo] = useState(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [selectedStudysetUUID, setSelectedStudysetUUID] =
        useState<string>("");
    const [selectedCardUUID, setSelectedCardUUID] = useState<string>("");

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;

    const handleClose = () => {
        setOpen(false);
    };

    const onTabChange = (e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    const onCreateCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
        const category = e.target.value;
        const isDuplicate = selectedStudySet.categories.includes(category);
        setCategoryName(category);
        if (isDuplicate) {
            setErrorInfo({
                helperText: "Category already exists",
            });
        } else {
            setErrorInfo(null);
        }
    };

    const onEditCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newCategoryName = e.target.value;
        const allOtherCategories = [...selectedStudySet.categories].filter(
            (_, index) => index != editIndex
        );
        const isDuplicate = allOtherCategories.includes(newCategoryName);
        setEditCategoryName(newCategoryName);
        if (isDuplicate) {
            setEditErrorInfo({
                helperText: "Category already exists",
            });
        } else if (!newCategoryName) {
            setEditErrorInfo({
                helperText: "Category name can't be empty",
            });
        } else {
            setEditErrorInfo(null);
        }
    };

    const handleCreate = async () => {
        if (!studySetUUID) {
            return;
        }
        createCategory({
            uuid: studySetUUID,
            category: categoryName,
        });
    };

    const handleEditClick = (index: number) => {
        setDeleteIndices([]);
        setSelectedAction(ACTIONS.EDIT);
        setEditIndex(index);
        setEditCategoryName(selectedStudySet.categories[index]);
    };

    const handleDeleteClick = (index: number) => {
        setEditIndex(null);
        setEditCategoryName("");
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
            const { categories, uuid } = selectedStudySet;
            /* Don't need to check categories cause they're paired */
            if (!uuid) {
                return;
            }

            if (selectedAction === ACTIONS.EDIT && editIndex !== null) {
                const selectedCategoryName = categories[editIndex];
                /* Don't make network call if it's unchanged */
                if (editCategoryName === selectedCategoryName) {
                    return;
                }

                editCategory({
                    uuid,
                    index: editIndex,
                    newCategory: editCategoryName,
                });
            } else if (selectedAction === ACTIONS.DELETE) {
                for (const index of deleteIndices) {
                    const categoryToDelete = categories[index];
                    deleteCategory({
                        uuid,
                        categoryToDelete,
                    });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSelectedAction(null);
        }
    };

    const onAssignedCategoriesChange = (e: any) => {
        assignCardCategories({
            cardUUID: selectedCardUUID,
            categories: e.target.value,
        });
    };

    const handleImport = () => {
        if (!selectedStudysetUUID) {
            return;
        }
        const importSetCategories =
            studySets.find((studySet) => studySet.uuid === selectedStudysetUUID)
                ?.categories ?? [];

        // Ensure no duplicates, filter out categories that already exist
        const categoriesToImport = importSetCategories.filter(
            (category) => !selectedStudySet.categories.includes(category));

        for (const category of categoriesToImport) {
            createCategory({
                uuid: studySetUUID,
                category,
            });
        }
    };

    const renderTabView = (): ReactNode => {
        const jsx = [];
        switch (selectedTab) {
            case TABS.CREATE:
                jsx.push(
                    <CategoryField
                        margin="dense"
                        label="Category Name"
                        type="text"
                        error={Boolean(errorInfo)}
                        helperText={errorInfo?.helperText ?? ""}
                        fullWidth
                        value={categoryName}
                        onChange={onCreateCategoryChange}
                    />
                );
                break;
            case TABS.MANAGE:
                jsx.push(
                    <CategoryField
                        margin="dense"
                        label="Edit Category Name"
                        type="text"
                        variant="standard"
                        error={Boolean(editErrorInfo)}
                        helperText={editErrorInfo?.helperText ?? ""}
                        fullWidth
                        value={editCategoryName}
                        disabled={editIndex === null}
                        onChange={onEditCategoryChange}
                    />
                );
                break;
            case TABS.IMPORT:
                const filteredStudySets = studySets.filter(
                    (set) => set.uuid !== selectedStudySet.uuid
                );
                const importSetCategories =
                    filteredStudySets.find(
                        (studySet) => studySet.uuid === selectedStudysetUUID
                    )?.categories ?? [];
                jsx.push(
                    <CategoryInputsContainer>
                        <CategoryFormControl fullWidth>
                            <InputLabel id="study-set-select-label">
                                Study Set
                            </InputLabel>
                            <Select
                                labelId="study-set-select-label"
                                label="Study Set"
                                value={selectedStudysetUUID}
                                onChange={(e) =>
                                    setSelectedStudysetUUID(e.target.value)
                                }
                            >
                                {filteredStudySets.map((studySet, index) => (
                                    <StyledMenuItem
                                        key={studySet.uuid}
                                        value={studySet.uuid}
                                    >
                                        <Typography
                                            variant="inherit"
                                            noWrap
                                            title={studySet.title}
                                        >
                                            {studySet.title}
                                        </Typography>
                                    </StyledMenuItem>
                                ))}
                            </Select>
                        </CategoryFormControl>
                        <Typography variant="caption">
                            Categories from the selected study set will be
                            imported into this study set. Duplicates will be
                            ignored.
                        </Typography>
                        {selectedStudysetUUID && (
                            <CategoriesList
                                categories={importSetCategories}
                                selectedTab={selectedTab}
                                type={TABS.IMPORT}
                            />
                        )}
                    </CategoryInputsContainer>
                );
                break;
            case TABS.ASSIGN:
                const { cards, categories } = selectedStudySet;
                const selectedCardCategories =
                    cards?.find((card) => card.uuid === selectedCardUUID)
                        ?.categories ?? [];
                jsx.push(
                    <CategoryInputsContainer>
                        <CategoryFormControl fullWidth>
                            <InputLabel id="card-select-label">Card</InputLabel>
                            <Select
                                labelId="card-select-label"
                                label="Card"
                                value={selectedCardUUID}
                                onChange={(e) =>
                                    setSelectedCardUUID(e.target.value)
                                }
                            >
                                {cards.map((card, index) => {
                                    const text = `Term: ${card.term} | Definition: ${card.definition}`;
                                    return (
                                        <StyledMenuItem
                                            key={card.uuid}
                                            value={card.uuid}
                                            title={text}
                                        >
                                            <Typography
                                                variant="inherit"
                                                noWrap
                                                title={text}
                                            >
                                                {text}
                                            </Typography>
                                        </StyledMenuItem>
                                    );
                                })}
                            </Select>
                        </CategoryFormControl>
                        {selectedCardUUID && (
                            <CategoryFormControl fullWidth>
                                <InputLabel id="category-select-label">
                                    Categories
                                </InputLabel>
                                <Select
                                    labelId="category-select-label"
                                    label="Categories"
                                    multiple
                                    value={selectedCardCategories}
                                    onChange={onAssignedCategoriesChange}
                                    disabled={isAssigningCategories}
                                >
                                    {categories.map((category, index) => {
                                        return (
                                            <StyledMenuItem
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </StyledMenuItem>
                                        );
                                    })}
                                </Select>
                            </CategoryFormControl>
                        )}
                    </CategoryInputsContainer>
                );
                break;
        }
        return jsx;
    };

    const renderDialogButton = (): ReactNode => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!categoryName || errorInfo}
                        loading={isCreatingCategory}
                    >
                        Create
                    </LoadingButton>
                );
            case TABS.MANAGE:
                const disabled =
                    (selectedAction === ACTIONS.EDIT && editErrorInfo) ||
                    (selectedAction === ACTIONS.DELETE &&
                        !deleteIndices.length);
                const buttonText =
                    selectedAction === ACTIONS.EDIT
                        ? "Save Edit"
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
                        loading={isCreatingCategory}
                    >
                        Import Categories
                    </LoadingButton>
                );
        }
    };

    return (
        <StyledDialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
            <DialogTitle>{TAB_PROPERTIES[selectedTab].title}</DialogTitle>
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
                    {renderTabView()}
                </div>
                <CategoriesList
                    categories={selectedStudySet?.categories ?? []}
                    selectedTab={selectedTab}
                    editIndex={editIndex}
                    deleteIndices={deleteIndices}
                    handleEditClick={handleEditClick}
                    handleDeleteClick={handleDeleteClick}
                />
            </StyledDialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={handleClose}>
                    Close
                </Button>
                {renderDialogButton()}
            </DialogActions>
        </StyledDialog>
    );
};

export default ManageCategoriesDialog;
