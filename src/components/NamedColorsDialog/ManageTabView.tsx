import { ChangeEvent } from "react";
import { ColorNameField } from "./styles";

type Props = {
    editErrorInfo: any;
    editColorName: string;
    editIndex: number | null;
    onEditColorChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const ManageTabView = (props: Props) => {
    const { 
        editErrorInfo, 
        editColorName, 
        editIndex, 
        onEditColorChange 
    } = props;

    return (
        <ColorNameField
            margin="dense"
            label="Edit Color Name"
            type="text"
            variant="standard"
            error={Boolean(editErrorInfo)}
            helperText={editErrorInfo?.helperText ?? ""}
            fullWidth
            value={editColorName}
            disabled={editIndex === null}
            onChange={onEditColorChange}
        />
    );
};

export default ManageTabView;
