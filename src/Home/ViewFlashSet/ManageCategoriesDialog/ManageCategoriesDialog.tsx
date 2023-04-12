import { Edit, Delete } from "@mui/icons-material";
import {
    Dialog,
    DialogTitle,
    DialogActions,
    TextField,
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
import { CategoriesList, CategoryButtons, StyledDialog } from "./styles";

const TABS = {
    CREATE: "CREATE",
    MANAGE: "MANAGE",
};

type Props = {
    newCategory: string;
    open: boolean;
    setNewCategory: Dispatch<SetStateAction<string>>;
    setOpen: Dispatch<SetStateAction<boolean>>;
};

const ManageCategoriesDialog = (props: Props) => {
    const { newCategory, open, setNewCategory, setOpen } = props;

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);

    const onClose = () => {
        setOpen(false);
    };

    const onTabChange = (e, newTab) => {
        setSelectedTab(newTab);
    };

    const renderListItems = (): ReactNode[] => {
        return ["bruh", "bruh"].map((value, index) => {
            return (
                <ListItem
                    divider={index !== 1}
                    key={index}
                    secondaryAction={<CategoryButtons>
                        <IconButton edge="end" aria-label="delete">
                            <Edit />
                        </IconButton>
                        <IconButton edge="end" aria-label="delete">
                            <Delete />
                        </IconButton>
                    </CategoryButtons>}
                >
                    {value}
                </ListItem>
            );
        });
    };

    const title = selectedTab === TABS.CREATE ? "Create" : "Manage";

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
                </Tabs>
                {selectedTab === TABS.CREATE ? (
                    <>
                        <TextField
                            margin="dense"
                            label="Category Name"
                            type="text"
                            fullWidth
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                    </>
                ) : (
                    <Paper elevation={6}>
                        <CategoriesList>{renderListItems()}</CategoriesList>
                    </Paper>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onClose}>Save</Button>
            </DialogActions>
        </StyledDialog>
    );
};

export default ManageCategoriesDialog;
