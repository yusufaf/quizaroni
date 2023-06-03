import { CategoryField } from "./styles";
import { ChangeEvent } from "react";

type Props = {
    errorInfo: any;
    categoryName: string;
    onCreateCategoryChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const CreateTabView = (props: Props) => {
    const { errorInfo, categoryName, onCreateCategoryChange } = props;

    return (
        <CategoryField
            margin="dense"
            label="Category Name"
            type="text"
            error={Boolean(errorInfo)}
            helperText={errorInfo?.helperText ?? ""}
            fullWidth
            value={categoryName}
            onChange={onCreateCategoryChange}
        />
    );
};

export default CreateTabView;
