import {
    Dispatch,
    ReactNode,
    SetStateAction,
    useEffect,
    useState,
    SyntheticEvent,
    ChangeEvent,
} from "react";
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material/";
import { TABS, ACTIONS } from "./constants";
import {
    DeleteLabelWarning,
    LabelField,
    StyledDialog,
    StyledDialogContent,
} from "./styles";
import { LoadingButton } from "@mui/lab";
import LabelsList from "./LabelsList";
import { capitalizeFirstLetter } from "utilities/functions";
import { Studyset } from "lib/types";
import { useCreateLabelMutation } from "state/api/studysets";
import useCustomMutation from "lib/hooks/useCustomMutation";

type ErrorInfo = {
    helperText: string;
};

type Props = {
    labels: string[];
    onClose: Dispatch<SetStateAction<boolean>>;
    open: boolean;
    selectedStudySet?: Studyset;
    userUUID: string;
};
const ManageLabelsDialog = (props: Props) => {
    const { 
        labels = [], 
        onClose, 
        open,
        selectedStudySet,
        userUUID,
    } = props;

    const { uuid: studySetUUID = ""} = selectedStudySet || {};

    const {
        mutate: createLabel,
        isLoading: isCreatingLabel,
        isSuccess: isCreateSuccess,
        isError: isCreateError,
    } = useCustomMutation({
        mutation: useCreateLabelMutation,
        successMessage: "Successfully created label",
        errorMessage: "Error creating label",
        onSuccess: () => {
            setLabelName("");
        },
    });

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [labelName, setLabelName] = useState<string>("");
    const [errorInfo, setErrorInfo] = useState(null);
    /* Edit & Delete State */
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editLabelName, setEditLabelName] = useState<string>("");
    const [editErrorInfo, setEditErrorInfo] = useState<ErrorInfo | null>(null);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] =
        useState<boolean>(false);
    const [shouldUpdateLabel, setShouldUpdateLabel] = useState<boolean>(true);

    const isCreateTab = selectedTab === TABS.CREATE;

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
        if (newTab === TABS.CREATE) {
            setShowDeleteConfirmation(false);
        }
    };

    const onCreateLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        const label = e.target.value;
        const isDuplicate = labels.includes(label);
        setLabelName(label);
        if (isDuplicate) {
            setErrorInfo({
                helperText: "Label already exists",
            });
        } else {
            setErrorInfo(null);
        }
    };

    const onEditLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newLabelName = e.target.value;

        const allOtherLabels = [...labels].filter(
            (_, index) => index != editIndex
        );
        const isDuplicate = allOtherLabels.includes(newLabelName);
        setEditLabelName(newLabelName);
        if (isDuplicate) {
            setEditErrorInfo({
                helperText: "Label already exists",
            });
        } else if (!newLabelName) {
            setEditErrorInfo({
                helperText: "Label name can't be empty",
            });
        } else {
            setEditErrorInfo(null);
        }
    };

    const handleEditClick = (index: number) => {
        setDeleteIndices([]);
        setShowDeleteConfirmation(false);
        setSelectedAction(ACTIONS.EDIT);
        setEditIndex(index);
        setEditLabelName(labels[index]);
    };

    const handleDeleteClick = (index: number) => {
        setEditIndex(null);
        setEditLabelName("");
        setEditErrorInfo(null);

        setSelectedAction(ACTIONS.DELETE);
        if (deleteIndices.includes(index)) {
            setDeleteIndices(deleteIndices.filter((value) => value !== index));
        } else {
            setDeleteIndices(deleteIndices.concat(index));
        }
    };

    const handleDeleteConfirmation = () => {
        // TODO: Confirm delete
    };

    const handleEditOrDelete = () => {
        console.log("Entered editOrDelete");
        // TODO:
        switch (selectedAction) {
            case ACTIONS.EDIT:
                break;
            case ACTIONS.DELETE:
                console.log("Showing delete confirm");
                setShowDeleteConfirmation(true);
                break;
        }
    };


    const handleCreate = async () => {
        if (!userUUID) {
            return;
        }
        createLabel({
            userUUID,
            label: labelName,
            studysetUUID: studySetUUID,
            updateStudysetLabel: shouldUpdateLabel 
        });
    };

    const renderTabView = (): ReactNode => {
        const jsx = [];
        switch (selectedTab) {
            case TABS.CREATE:
                jsx.push(
                    <LabelField
                        margin="dense"
                        label="Label Name"
                        type="text"
                        error={Boolean(errorInfo)}
                        helperText={errorInfo?.helperText ?? ""}
                        fullWidth
                        value={labelName}
                        onChange={onCreateLabelChange}
                    />
                );
                break;
            case TABS.MANAGE:
                jsx.push(
                    <LabelField
                        margin="dense"
                        label="Edit Label Name"
                        type="text"
                        variant="standard"
                        error={Boolean(editErrorInfo)}
                        helperText={editErrorInfo?.helperText ?? ""}
                        fullWidth
                        value={editLabelName}
                        disabled={editIndex === null}
                        onChange={onEditLabelChange}
                    />
                );
                break;
        }
        return jsx;
    };

    const renderDialogButton = () => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={handleCreate}
                        disabled={!labelName || Boolean(errorInfo)}
                        // loading={}
                    >
                        Create
                    </LoadingButton>
                );
            case TABS.MANAGE:
                const disabled =
                    (selectedAction === ACTIONS.EDIT && editErrorInfo) ||
                    (selectedAction === ACTIONS.DELETE &&
                        !deleteIndices.length);
                const isEdit = selectedAction === ACTIONS.EDIT;
                let buttonText =
                    selectedAction === ACTIONS.EDIT
                        ? "Save Edit"
                        : `Delete (${deleteIndices.length})`;

                let buttonOnClick = handleEditOrDelete;
                if (showDeleteConfirmation) {
                    buttonText = `Confirm ${buttonText}`;
                    buttonOnClick = handleDeleteConfirmation;
                }

                return (
                    selectedAction && (
                        <Button
                            variant="contained"
                            onClick={() => buttonOnClick()}
                            disabled={disabled}
                        >
                            {buttonText}
                        </Button>
                    )
                );
        }
    };

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>
                {capitalizeFirstLetter(selectedTab.toLowerCase())} Labels
            </DialogTitle>
            <StyledDialogContent>
                <div>
                    <Tabs value={selectedTab} onChange={onTabChange}>
                        {[...Object.values(TABS)].map((tab, index) => (
                            <Tab key={index} label={tab} value={tab} />
                        ))}
                    </Tabs>
                    {renderTabView()}
                </div>
                <LabelsList
                    labels={labels}
                    selectedTab={selectedTab}
                    handleEditClick={handleEditClick}
                    handleDeleteClick={handleDeleteClick}
                    editIndex={editIndex}
                    deleteIndices={deleteIndices}
                />
            </StyledDialogContent>
            <DialogActions>
                {isCreateTab && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={shouldUpdateLabel}
                                onChange={() =>
                                    setShouldUpdateLabel(!shouldUpdateLabel)
                                }
                            />
                        }
                        label="Apply new label to current study set"
                    />
                )}
                {showDeleteConfirmation && (
                    <DeleteLabelWarning variant="body2" color="error">
                        Are you sure you want to delete these labels? This will
                        remove the label from all of your study sets.
                        {"\n"}
                        This action cannot be undone.
                    </DeleteLabelWarning>
                )}
                <Button onClick={onClose} variant="outlined">
                    Close
                </Button>
                {renderDialogButton()}
            </DialogActions>
        </StyledDialog>
    );
};

export default ManageLabelsDialog;
