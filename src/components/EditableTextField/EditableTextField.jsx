import { useState } from "react";
import {
    IconButton,
    InputAdornment,
    TextField,
    Tooltip,
} from '@mui/material/';
import { Edit } from '@mui/icons-material/';
import { styled } from "@mui/system";
import { useTheme } from "src/theme/useTheme";

const EditableTextField = props => {
    const { style = {}, tooltipText = "", value } = props;

    const { isDarkMode, theme } = useTheme();

    const [editedValue, setEditedValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false)
    const [mouseOver, setMouseOver] = useState(false)

    /* Logic for submitting changes to the backend
        TODO: Pass function down to component to execute in onBlur
    */
    const handleOnBlur = () => {
        setIsEditing(false);
    }

    const handleChange = event => {
        setEditedValue(e.target.value);
    };

    // const handleMouseEnter = event => {
    //     if (!mouseOver) {
    //         setMouseOver(true);
    //     }
    // };

    // const handleMouseLeave = event => {
    //     if (mouseOver) {
    //         setMouseOver(false);
    //     }
    // };

    const handleClick = () => {
        setIsEditing(true);
        setMouseOver(false);
        inputRef.current.focus();
    };

    const StyledTextField = styled(TextField)({
        borderBottom: 0,
        "&:before": {
            borderBottom: 0
        },
        ".Mui-disabled": {
            borderBottom: 0,
            opacity: 1,
            WebkitTextFillColor: `${theme.palette.text.primary} !important`,
            "&:before": {
                borderBottom: 0
            }
        }
    })

    return (
        <div>
            <StyledTextField
                variant="standard"
                defaultValue={value}
                value={editedValue}
                // error={editedValue === ""}
                onBlur={handleOnBlur}
                onChange={handleChange}
                // readOnly={!isEditing}
                disabled={!isEditing}
                // onMouseEnter={handleMouseEnter}
                // onMouseLeave={handleMouseLeave}
                inputRef={input => input && input.focus()}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <Tooltip
                                title={tooltipText}
                                placement="right"
                            >
                                <IconButton onClick={handleClick}>
                                    <Edit
                                        sx={{
                                            color: isEditing ? "orange" : ""
                                        }} 
                                    />
                                </IconButton>
                            </Tooltip>
                        </InputAdornment>
                    )
                }}
                sx={style}
            />
        </div>
    )
}

export default EditableTextField;