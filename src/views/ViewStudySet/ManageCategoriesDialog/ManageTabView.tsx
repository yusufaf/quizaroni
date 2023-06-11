import { ChangeEvent } from "react";
import { CategoryField, ManageTabContainer, ManageTabButton } from "./styles";

type Props = {
    editErrorInfo: any;
    editCategoryName: string;
    editIndex: number | null;
    onEditCategoryChange: (e: ChangeEvent<HTMLInputElement>) => void;
    deleteUnusedCategories: () => void;
};

const ManageTabView = (props: Props) => {
    const { 
        editErrorInfo, 
        editCategoryName, 
        editIndex, 
        onEditCategoryChange,
        deleteUnusedCategories
    } = props;

    return (
        <ManageTabContainer>
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
            <ManageTabButton
                variant="outlined"
                color="primary"
                onClick={() => deleteUnusedCategories()}
            >
                Delete Unused Categories
            </ManageTabButton>
        </ManageTabContainer>

    );
};

export default ManageTabView;
