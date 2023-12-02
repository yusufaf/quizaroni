import { ChangeEvent } from "react";
import { LabelField } from "./styles";

type Props = {
    editErrorInfo: any;
    editLabelName: string;
    editIndex: number | null;
    onEditLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const ManageTabView = (props: Props) => {
    const { 
        editErrorInfo, 
        editLabelName, 
        editIndex, 
        onEditLabelChange 
    } = props;

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
};

export default ManageTabView;
