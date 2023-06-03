import { ChangeEvent } from "react";
import { CategoryField } from "./styles";

type Props = {
    editErrorInfo: any;
    editCategoryName: string;
    editIndex: number | null;
    onEditCategoryChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const ManageTabView = (props: Props) => {
    const { 
        editErrorInfo, 
        editCategoryName, 
        editIndex, 
        onEditCategoryChange 
    } = props;

    return (
        <CategoryField
            margin="dense"
            label="Edit Category Name"
            type="text"
            variant="standard"
            error={Boolean(editErrorInfo)}
            helperText={editErrorInfo?.helperText ?? ""}
            fullWidth
            value={editCategoryName}
            disabled={editIndex === null}
            onChange={onEditCategoryChange}
        />
    );
};

export default ManageTabView;
