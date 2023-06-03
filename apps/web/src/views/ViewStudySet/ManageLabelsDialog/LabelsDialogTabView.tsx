import { ChangeEvent } from "react";

import { LabelField } from "./styles";
import { TABS } from "./constants";

type Props = {
    editErrorInfo: any;
    editIndex: number | null;
    editLabelName: string;
    errorInfo: any;
    labelName: string;
    onCreateLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onEditLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
    selectedTab: string;
};

const LabelsDialogTabView = (props: Props) => {
    const {
        editErrorInfo,
        editIndex,
        editLabelName,
        errorInfo,
        labelName,
        onCreateLabelChange,
        onEditLabelChange,
        selectedTab,
    } = props;

    switch (selectedTab) {
        case TABS.CREATE:
            return (
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
        case TABS.MANAGE:
            return (
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
        default:
            return null;
    }
};

export default LabelsDialogTabView;
