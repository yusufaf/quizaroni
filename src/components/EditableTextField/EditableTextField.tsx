import {
    TextField,
    Typography,
} from "@mui/material/";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useTheme } from "theme/useTheme";

type Props = {
    isEditing: boolean;
    style?: Object;
    value: string;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
}

const EditableTextField = (props: Props) => {
    const { isEditing, style = {}, value, setIsEditing } = props;

    const { isDarkMode, theme } = useTheme();

    const [editedValue, setEditedValue] = useState(value);

    const handleChange = (event) => {
        setEditedValue(event.target.value);
    };

    /* Logic for submitting changes to the backend
        TODO: Pass function down to component to execute in onBlur
    */
    const handleOnBlur = (event: any) => {
        setIsEditing(false);
    }

    // const StyledTextField = styled(TextField)({
    //     borderBottom: 0,
    //     "&:before": {
    //         borderBottom: 0,
    //     },
    //     ".Mui-disabled": {
    //         borderBottom: 0,
    //         opacity: 1,
    //         WebkitTextFillColor: `${theme.palette.text.primary} !important`,
    //         "&:before": {
    //             borderBottom: 0,
    //         },
    //     },
    // });

    return (
        <>
            {!isEditing ? (
                <Typography sx={{wordBreak: "break-word", width: "100%"}}>
                    {value}
                </Typography>
            ) : (
                <TextField
                    autoFocus
                    variant="standard"
                    fullWidth
                    multiline
                    defaultValue={value}
                    value={editedValue}
                    // error={editedValue === ""}
                    onBlur={handleOnBlur}
                    onChange={handleChange}
                    sx={style}
                />
            )}
        </>
    );
};

export default EditableTextField;
