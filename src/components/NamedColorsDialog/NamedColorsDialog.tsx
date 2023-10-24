import {
    Button,
    Dialog,
    DialogContent,
    DialogContentText,
    Typography,
    DialogActions,
    List,
    Paper,
    ListItem,
    Tabs,
    Tab,
} from "@mui/material";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { useDispatch, useSelector } from "react-redux";
import {
    selectNamedColorDialogProps,
    setNamedColorDialogProps,
    selectUserData,
    setUserData,
} from "state/slices/global";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import { ChangeEvent, SyntheticEvent, useState } from "react";
import { StyledDialog, StyledDialogContent } from "./styles";
import CreateTabView from "./CreateTabView";
import { ChromePicker } from 'react-color';
import NamedColorPicker from "./NamedColorPicker";

const TABS = {
    ASSIGN: "ASSIGN",
    CREATE: "CREATE",
    MANAGE: "MANAGE",
    IMPORT: "IMPORT",
};

type Props = {
    newColor: ""; 
};

const NamedColorsDialog = (props: Props) => {
    const { newColor } = props;

    const dispatch = useDispatch();
    const userData = useSelector(selectUserData);
    const namedColorDialogProps = useSelector(selectNamedColorDialogProps);

    const [color, setColor] = useState<string>("");
    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [colorName, setColorName] = useState<string>(newColor); // From Create/Edit page
    const [errorInfo, setErrorInfo] = useState<any>(null);

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const closeNamedColorsDialog = () => {
        dispatch(
            setNamedColorDialogProps({
                open: false,
            })
        );
    };
    
    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    const onCreateColorChange = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const isDuplicate = false;
        // const isDuplicate = selectedStudyset.categories.includes(category);
        setColorName(name);
        const localErrorInfo = isDuplicate
            ? {
                  helperText: "Color with that name already exists",
              }
            : null;
        setErrorInfo(localErrorInfo);
    };

    const onColorChange = (e) => {
        // hex, hsl, hsv, rgb
        const { hex } = e;
        console.log("e in onColorChange = ", {e});
        setColor(hex);
    };

    return (
        <StyledDialog
            open={namedColorDialogProps.open}
            onClose={closeNamedColorsDialog}
            fullWidth
            maxWidth="lg"
        >
            <StyledDialogTitle>
                Named Colors
                <CloseDialogButton onClose={closeNamedColorsDialog} />
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
                            colorName={colorName}
                            errorInfo={errorInfo}
                            onCreateColorChange={onCreateColorChange}
                        />
                    )}
                     {/* {isManageTab && (
                        <ManageTabView
                            editErrorInfo={editErrorInfo}
                            editCategoryName={editCategoryName}
                            editIndex={editIndex}
                            onEditCategoryChange={onEditCategoryChange}
                            deleteUnusedCategories={deleteUnusedCategories}
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
                            isAssigningCategories={isAssigningCategories}
                        />
                    )} */}
                </div>

                {/* 
                <Paper elevation={6}>
                    <List>
                        {["test", "bruh"].map((value) => {
                            return <ListItem divider />;
                        })}
                    </List>
                </Paper> */}
                <NamedColorPicker
                    color={color}
                    onChange={onColorChange}
                />
            </StyledDialogContent>
            <DialogActions>
                <Button onClick={closeNamedColorsDialog}>Cancel</Button>
                {/* <Button variant="contained" onClick={handleConfirm}> */}

                {/* </Button> */}
            </DialogActions>
        </StyledDialog>
    );
};

export default NamedColorsDialog;
