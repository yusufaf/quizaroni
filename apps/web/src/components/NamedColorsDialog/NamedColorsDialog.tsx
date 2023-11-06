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
    selectNamedColorsDialogProps,
    setNamedColorsDialogProps,
    selectUserData,
    setUserData,
} from "state/slices/globalSlice";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import { ChangeEvent, ReactNode, SyntheticEvent, useState } from "react";
import { StyledDialog, StyledDialogActions, StyledDialogContent } from "./styles";
import CreateTabView from "./CreateTabView";
import { ChromePicker } from 'react-color';
import NamedColorPicker from "./NamedColorPicker";
import { LoadingButton } from "@mui/lab";
import { useUpdateUserMetadataMutation } from "state/api/usersAPI";

const TABS = {
    ASSIGN: "ASSIGN",
    CREATE: "CREATE",
    MANAGE: "MANAGE",
    IMPORT: "IMPORT",
};

type Props = {
};
const NamedColorsDialog = (props: Props) => {
    /* Redux / Hooks */
    const dispatch = useDispatch();
    const { metadata: { namedColors = [] }, uuid: userUUID = ""} = useSelector(selectUserData);
    const namedColorsDialogProps = useSelector(selectNamedColorsDialogProps);

    const [
        updateUserMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateUserMetadataMutation();

    const [color, setColor] = useState<string>(namedColorsDialogProps.color ? namedColorsDialogProps.color : "#000000");
    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [colorName, setColorName] = useState<string>(""); // From Create/Edit page
    const [errorInfo, setErrorInfo] = useState<any>(null);

    console.log({namedColorsDialogProps})

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const closeNamedColorsDialog = () => {
        dispatch(
            setNamedColorsDialogProps({
                open: false,
            })
        );
    };
    
    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    /* Create Tab */
    const handleCreateNamedColor = async () => {
        if (!userUUID) {
            return;
        }
        const newColorObject = {
            color,
            name: colorName,
        }
        const newNamedColors = [...namedColors, newColorObject]
        updateUserMetadata({
            uuid: userUUID,
            property: "namedColors",
            newValue: newNamedColors
        })
    };

    const onCreateColorChange = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        console.log({namedColors})
        const isDuplicate = namedColors.some((colorObject) => colorObject.name === name);
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

    const renderDialogButtons = (): ReactNode => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={handleCreateNamedColor}
                        disabled={!colorName || Boolean(errorInfo)}
                        loading={isUpdateMetadataLoading}
                    >
                        Create
                    </LoadingButton>
                );
            // case TABS.MANAGE:
            //     const disabled =
            //         (selectedAction === ACTIONS.EDIT && editErrorInfo) ||
            //         (selectedAction === ACTIONS.DELETE &&
            //             !deleteIndices.length);
            //     const buttonText =
            //         selectedAction === ACTIONS.EDIT
            //             ? "Save Edit"
            //             : `Delete (${deleteIndices.length})`;
            //     return (
            //         selectedAction && (
            //             <Button
            //                 variant="contained"
            //                 onClick={handleEditOrDelete}
            //                 disabled={disabled}
            //             >
            //                 {buttonText}
            //             </Button>
            //         )
            //     );
            // case TABS.IMPORT:
            //     return (
            //         <LoadingButton
            //             variant="contained"
            //             onClick={handleImport}
            //             disabled={!selectedStudysetUUID}
            //             loading={isCreatingCategory}
            //         >
            //             Import Categories
            //         </LoadingButton>
            //     );
        }
    };

    return (
        <StyledDialog
            open={namedColorsDialogProps.open}
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
            <StyledDialogActions>
                {renderDialogButtons()}
            </StyledDialogActions>
        </StyledDialog>
    );
};

export default NamedColorsDialog;
