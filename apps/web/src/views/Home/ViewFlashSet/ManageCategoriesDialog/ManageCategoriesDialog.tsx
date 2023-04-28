import { Edit, Delete } from "@mui/icons-material";
import {
    DialogTitle,
    DialogActions,
    DialogContent,
    Button,
    List,
    ListItem,
    Icon,
    Paper,
    IconButton,
    Tabs,
    Tab,
    Select,
    Typography,
    InputLabel,
    FormControl,
    MenuItem,
} from "@mui/material/";
import {
    Dispatch,
    ReactNode,
    SetStateAction,
    useEffect,
    useState,
} from "react";
import {
    AssignCategoryContainer,
    AssignCategoryFormControl,
    CategoriesList,
    CategoryButtons,
    CategoryField,
    StyledDialog,
    StyledMenuItem,
} from "./styles";
import { useDispatch, useSelector } from "react-redux";
import { selectSelectedStudySet, setSelectedStudySet } from "state/slices/studysetsSlice";
import axios from "axios";
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

const TABS = {
    ASSIGN: "ASSIGN",
    CREATE: "CREATE",
    MANAGE: "MANAGE",
    IMPORT: "IMPORT",
};

const TAB_PROPERTIES = {
    [TABS.ASSIGN]: {
        title: "Assign Categories",
    },
    [TABS.CREATE]: {
        title: "Create Categories",
    },
    [TABS.MANAGE]: {
        title: "Manage Categories",
    },
    [TABS.IMPORT]: {
        title: "Import Categories",
    },
};

const ACTIONS = {
    EDIT: "EDIT",
    DELETE: "DELETE",
};

type Props = {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    selectedStudySet: Studyset;
};

const ManageCategoriesDialog = (props: Props) => {
    const { 
        open, 
        setOpen,
        selectedStudySet, 
    } = props;

    /* Hooks / Redux */

    const { id: studySetUUID } = useParams();

    const dispatch = useDispatch();
    // const selectedStudySet = useSelector(selectSelectedStudySet);

    const { uuid: userUUID = "" } = useSelector(selectUserData);

    /* Skip option prevents hook from running when userUUID is undefined */
    const { data: studySetsData, refetch } = useGetAllStudysetsQuery(
        userUUID ?? "",
        {
            skip: !userUUID,
        }
    );

    const [createCategory] = useCreateCategoryMutation();
    const [editCategory] = useEditCategoryMutation();
    const [deleteCategory] = useDeleteCategoryMutation();
    const [assignCardCategories, {isSuccess}] = useAssignCardCategoriesMutation();

    useEffect(() => {
        if (isSuccess) {
            refetch();
            setTimeout(() => {
                dispatch(setSelectedStudySet(studySetsData));
            }, 1000);
        }
    }, [isSuccess]);

    console.log({ selectedStudySet });

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [errorInfo, setErrorInfo] = useState(null);
    const [categoryName, setCategoryName] = useState<string>("");
    const [editCategoryName, setEditCategoryName] = useState<string>("");
    const [editErrorInfo, setEditErrorInfo] = useState(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [selectedCardUUID, setSelectedCardUUID] = useState<string>("");

    const isCreateTab = selectedTab === TABS.CREATE;

    const handleClose = () => {
        setOpen(false);
    };

    const onTabChange = (e, newTab) => {
        setSelectedTab(newTab);
    };

    const onCreateCategoryChange = (e: any) => {
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

    const onEditCategoryChange = (e: any) => {
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
        try {
            const { uuid } = selectedStudySet;
            const response = await axios.post("/api/studysets/createCategory", {
                uuid,
                category: categoryName,
            });
            console.log({ response });

            /* Clear the text field */
            setCategoryName("");

            /* TODO: Show a toast notification? */
        } catch (error) {
            console.error(error);
        }
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

            if (selectedAction === ACTIONS.EDIT) {
                const selectedCategoryName = categories[editIndex];
                /* Don't make network call if it's unchanged */
                if (editCategoryName === selectedCategoryName) {
                    return;
                }

                const response = await axios.post(
                    "/api/studysets/editCategory",
                    {
                        uuid,
                        index: editIndex,
                        newCategory: editCategoryName,
                    }
                );
                console.log({ response });
            } else if (selectedAction === ACTIONS.DELETE) {
                for (const index of deleteIndices) {
                    const categoryToDelete = categories[index];
                    const response = await axios.post(
                        "/api/studysets/deleteCategory",
                        {
                            uuid,
                            categoryToDelete,
                        }
                    );
                    console.log({ response });
                }
            }
            /* TODO: Show a toast notification? */
        } catch (error) {
            console.error(error);
        } finally {
            /* Clear relevant state */
            if (selectedAction === ACTIONS.EDIT) {
                setEditIndex(null);
                setEditCategoryName("");
            } else {
                setDeleteIndices([]);
            }
            setSelectedAction(null);
        }
    };

    const onAssignedCategoriesChange = (e: any) => {
        assignCardCategories({
            uuid: selectedCardUUID,
            categories: e.target.value,
        }).unwrap()
        // .then((response) => {
        //     console.log({ response });
        // })
        // .catch((error) => {
        //     console.error(error);
        // });
        // refetch();
    };

    const renderListItems = (): ReactNode[] => {
        return selectedStudySet?.categories?.map((value, index) => {
            const isEditSelected = editIndex === index;
            const isDeleteSelected = deleteIndices.includes(index);
            return (
                <ListItem
                    divider={index !== 1}
                    key={index}
                    secondaryAction={
                        !isCreateTab && (
                            <CategoryButtons>
                                <IconButton
                                    edge="end"
                                    aria-label="edit"
                                    onClick={() => handleEditClick(index)}
                                >
                                    <Edit
                                        color={
                                            isEditSelected
                                                ? "primary"
                                                : undefined
                                        }
                                    />
                                </IconButton>
                                <IconButton
                                    edge="end"
                                    aria-label="delete"
                                    onClick={() => handleDeleteClick(index)}
                                >
                                    <Delete
                                        color={
                                            isDeleteSelected
                                                ? "primary"
                                                : undefined
                                        }
                                    />
                                </IconButton>
                            </CategoryButtons>
                        )
                    }
                >
                    {value}
                </ListItem>
            );
        });
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
                        error={errorInfo}
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
                        error={editErrorInfo}
                        helperText={editErrorInfo?.helperText ?? ""}
                        fullWidth
                        value={editCategoryName}
                        disabled={editIndex === null}
                        onChange={onEditCategoryChange}
                    />
                );
                jsx.push(
                    <Paper elevation={6}>
                        <CategoriesList>{renderListItems()}</CategoriesList>
                    </Paper>
                );
                break;
            case TABS.IMPORT:
                break;
            case TABS.ASSIGN:
                const { cards, categories } = selectedStudySet;
                const selectedCardCategories =
                    cards?.find((card) => card.uuid === selectedCardUUID)
                        ?.categories ?? [];
                console.log({ categories });
                jsx.push(
                    <AssignCategoryContainer>
                        <AssignCategoryFormControl fullWidth>
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
                        </AssignCategoryFormControl>
                        {selectedCardUUID && (
                            <AssignCategoryFormControl fullWidth>
                                <InputLabel id="category-select-label">
                                    Categories
                                </InputLabel>
                                <Select
                                    labelId="category-select-label"
                                    label="Category"
                                    multiple
                                    value={selectedCardCategories}
                                    onChange={onAssignedCategoriesChange}
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
                            </AssignCategoryFormControl>
                        )}
                    </AssignCategoryContainer>
                );
                break;
        }
        return jsx;
    };

    const renderDialogButton = (): ReactNode => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!categoryName || errorInfo}
                    >
                        Create
                    </Button>
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
        }
    };

    return (
        <StyledDialog open={open} onClose={handleClose}>
            <DialogTitle>{TAB_PROPERTIES[selectedTab].title}</DialogTitle>
            <DialogContent>
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
            </DialogContent>
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
