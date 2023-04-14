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
} from "@mui/material/";
import React, { Dispatch, ReactNode, SetStateAction, useState } from "react";
import {
    CategoriesList,
    CategoryButtons,
    CategoryField,
    StyledDialog,
} from "./styles";
import { useSelector } from "react-redux";
import { selectSelectedStudySet } from "src/state/slices/studysetsSlice";
import axios from "axios";

const TABS = {
    CREATE: "CREATE",
    MANAGE: "MANAGE",
    IMPORT: "IMPORT"
};

type Props = {
    // newCategory: string;
    open: boolean;
    // setNewCategory: Dispatch<SetStateAction<string>>;
    setOpen: Dispatch<SetStateAction<boolean>>;
};

const ManageCategoriesDialog = (props: Props) => {
    const { open, setOpen } = props;

    const selectedStudySet = useSelector(selectSelectedStudySet);

    console.log({ selectedStudySet });

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [errorInfo, setErrorInfo] = useState(null);
    const [categoryName, setCategoryName] = useState<string>("");

    const [editCategoryName, setEditCategoryName] = useState<string>("");
    const [editErrorInfo, setEditErrorInfo] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const onClose = () => {
        setOpen(false);
    };

    const onTabChange = (e, newTab) => {
        setSelectedTab(newTab);
    };

    const onCreateCategoryChange = (e: any) => {
        const category = e.target.value;
        const isDuplicate = selectedStudySet.categories.includes(category);
        setCategoryName(e.target.value);
        if (isDuplicate) {
            setErrorInfo({
                helperText: "Category already exists",
            });
        } else {
            setErrorInfo(null);
        }
    };

    const onEditCategoryChange = (e: any) => {
        const category = e.target.value;
        const allOtherCategories = [...selectedStudySet.categories].filter((_, index) => index != selectedIndex);
        const isDuplicate = allOtherCategories.includes(category);
        console.log({isDuplicate, allOtherCategories})
        setEditCategoryName(e.target.value);
        if (isDuplicate) {
            setEditErrorInfo({
                helperText: "Category already exists",
            });
        } else {
            setEditErrorInfo(null);
        }
    }

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

    const handleEditClick = (index) => {
        setSelectedIndex(index)
        setEditCategoryName(selectedStudySet.categories[index]);
    }

    const isCreateTab = selectedTab === TABS.CREATE;
    const title = isCreateTab ? "Create" : "Manage";

    const renderListItems = (): ReactNode[] => {
        return selectedStudySet?.categories?.map((value, index) => {
            const isSelected = selectedIndex === index;
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
                                        color={isSelected ? "primary" : undefined}
                                    />
                                </IconButton>
                                <IconButton edge="end" aria-label="delete">
                                    <Delete />
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

    return (
        <StyledDialog open={open} onClose={onClose}>
            <DialogTitle> {title} Categories</DialogTitle>
            <DialogContent>
                <Tabs
                    value={selectedTab}
                    onChange={onTabChange}
                    scrollButtons="auto"
                >
                    <Tab label="Create" value={TABS.CREATE} />
                    <Tab label="Manage" value={TABS.MANAGE} />
                    <Tab label="Import" value={TABS.IMPORT} />
                </Tabs>
                {isCreateTab ? (
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
                ) : (
                    <CategoryField
                        margin="dense"
                        label="Edit Category Name"
                        type="text"
                        variant="standard"
                        error={editErrorInfo}
                        helperText={editErrorInfo?.helperText ?? ""}
                        fullWidth
                        value={editCategoryName}
                        disabled={selectedIndex === null}
                        onChange={onEditCategoryChange}
                    />
                )}

                <Paper elevation={6}>
                    <CategoriesList>{renderListItems()}</CategoriesList>
                </Paper>
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
                {isCreateTab ? (
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!categoryName || errorInfo}
                    >
                        Create
                    </Button>
                ) : (
                    <Button 
                        variant="contained" 
                        onClick={onClose}
                        
                    >
                        Save
                    </Button>
                )}
            </DialogActions>
        </StyledDialog>
    );
};

export default ManageCategoriesDialog;
