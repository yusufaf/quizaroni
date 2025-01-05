import { ColorNameField } from "./styles";
import { ChangeEvent } from "react";

type Props = {
    errorInfo: any;
    colorName: string;
    onCreateColorChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const CreateTabView = (props: Props) => {
    const { 
        errorInfo, 
        colorName, 
        onCreateColorChange 
    } = props;

    return (
        <ColorNameField
            margin="dense"
            label="Color Name"
            type="text"
            error={Boolean(errorInfo)}
            helperText={errorInfo?.helperText ?? ""}
            fullWidth
            value={colorName}
            onChange={onCreateColorChange}
        />
    );
};

export default CreateTabView;
