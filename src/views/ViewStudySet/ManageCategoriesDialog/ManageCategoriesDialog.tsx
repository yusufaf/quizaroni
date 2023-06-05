import { Close as CloseIcon } from "@mui/icons-material/";
import { LoadingButton } from "@mui/lab";
import {
    Button,
    DialogActions,
    SelectChangeEvent,
    Tab,
    Tabs
} from "@mui/material/";
import useCustomMutation from "lib/hooks/useCustomMutation";
import { Studyset } from "lib/types";
import {
    ChangeEvent,
    ReactNode,
    SyntheticEvent,
    useState
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    useAssignCardCategoriesMutation,
    useCreateCategoryMutation,
    useDeleteCategoryMutation,
    useEditCategoryMutation,
} from "state/api/studysets";
import { selectUserData } from "state/slices/globalSlice";
import { capitalizeFirstLetter } from "utilities/functions";
import AssignTabView from "./AssignTabView";
import CategoriesList from "./CategoriesList";
import CreateTabView from "./CreateTabView";
import ImportTabView from "./ImportTabView";
import ManageTabView from "./ManageTabView";
import { ACTIONS, TABS } from "./constants";
import {
    CloseButton,
    StyledDialog,
    StyledDialogContent,
    StyledDialogTitle
} from "./styles";

type Props = {
    open: boolean;
    onClose: () => void;
    selectedStudyset: Studyset;
    studysets: Studyset[];
};

const ManageCategoriesDialog = (props: Props) => {
    const { open, onClose, selectedStudyset, studysets } = props;

    const { uuid: studySetUUID = "" } = selectedStudyset || {};

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
    } = useCustomMutation({
        mutation: useEditCategoryMutation,
        successMessage: "Successfully edited category",
        errorMessage: "Error editing category",
        onSuccess: () => {
            setEditCategoryName("");
            setEditIndex(null);
        },
    });

    const {
        mutate: deleteCategory,
        isLoading: isDeletingCategory,
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
    } = useCustomMutation({
        mutation: useAssignCardCategoriesMutation,
        successMessage: "Categories assigned to cards",
        errorMessage: "Error assigning categories to cards",
    });

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [errorInfo, setErrorInfo] = useState<any>(null);
    const [categoryName, setCategoryName] = useState<string>("");
    const [editCategoryName, setEditCategoryName] = useState<string>("");
    const [editErrorInfo, setEditErrorInfo] = useState<any>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [selectedStudysetUUID, setSelectedStudysetUUID] =
        useState<string>("");
    const [selectedCardUUID, setSelectedCardUUID] = useState<string>("");

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    const onCreateCategoryChange = (e: ChangeEvent<HTMLInputElement>) => {
        const category = e.target.value;
        const isDuplicate = selectedStudyset.categories.includes(category);
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
        const allOtherCategories = [...selectedStudyset.categories].filter(
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
        setEditCategoryName(selectedStudyset.categories[index]);
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
            const { categories, uuid } = selectedStudyset;
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
                    studysetUUID: uuid,
                    index: editIndex,
                    newCategory: editCategoryName,
                    oldCategory: selectedCategoryName,
                });
            } else if (selectedAction === ACTIONS.DELETE) {
                for (const index of deleteIndices) {
                    const categoryToDelete = categories[index];
                    deleteCategory({
                        studysetUUID: uuid,
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

    const onAssignedCategoriesChange = (e: SelectChangeEvent) => {
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
            studysets.find((studySet) => studySet.uuid === selectedStudysetUUID)
                ?.categories ?? [];

        // Ensure no duplicates, filter out categories that already exist
        const categoriesToImport = importSetCategories.filter(
            (category) => !selectedStudyset.categories.includes(category)
        );

        for (const category of categoriesToImport) {
            createCategory({
                uuid: studySetUUID,
                category,
            });
        }
    };

    const renderDialogButton = (): ReactNode => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!categoryName || Boolean(errorInfo)}
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
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <StyledDialogTitle>
                {capitalizeFirstLetter(selectedTab.toLowerCase())} Categories
                <CloseButton aria-label="close" onClick={onClose} title="Close">
                    <CloseIcon />
                </CloseButton>
            </StyledDialogTitle>
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
                            onAssignedCategoriesChange={onAssignedCategoriesChange}
                            isAssigningCategories={isAssigningCategories}
                        />
                    )}
                </div>
                <CategoriesList
                    categories={selectedStudyset?.categories ?? []}
                    selectedTab={selectedTab}
                    editIndex={editIndex}
                    deleteIndices={deleteIndices}
                    handleEditClick={handleEditClick}
                    handleDeleteClick={handleDeleteClick}
                />
            </StyledDialogContent>
            <DialogActions>{renderDialogButton()}</DialogActions>
        </StyledDialog>
    );
};

export default ManageCategoriesDialog;
