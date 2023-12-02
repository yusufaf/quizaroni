import { LabelField } from "./styles";
import { ChangeEvent } from "react";

type Props = {
    errorInfo: any;
    labelName: string;
    onCreateLabelChange: (e: ChangeEvent<HTMLInputElement>) => void;
};
const CreateTabView = (props: Props) => {
    const { errorInfo, labelName, onCreateLabelChange } = props;

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
};

export default CreateTabView;
