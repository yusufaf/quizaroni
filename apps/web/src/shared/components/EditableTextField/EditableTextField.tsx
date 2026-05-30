import { TextField, Typography } from '@mui/material/';
import { useState } from 'react';

type Props = {
    isEditing: boolean;
    style?: object;
    value: string;
    placeholder?: string;
    onBlur: (editedValue: string) => void;
};

const EditableTextField = ({
    isEditing,
    style = {},
    value,
    placeholder = 'No value',
    onBlur,
}: Props) => {
    const [editedValue, setEditedValue] = useState(value);

    const handleChange = (event) => {
        setEditedValue(event.target.value);
    };

    const handleOnBlur = () => {
        onBlur(editedValue);
    };

    return (
        <>
            {!isEditing ? (
                <Typography
                    sx={{
                        wordBreak: 'break-word',
                        width: '100%',
                        opacity: value ? 1 : 0.5, // Adjust opacity
                    }}
                >
                    {value || placeholder}
                </Typography>
            ) : (
                <TextField
                    autoFocus
                    variant="standard"
                    fullWidth
                    multiline
                    value={editedValue}
                    // error={editedValue === ""}
                    placeholder={placeholder}
                    onBlur={handleOnBlur}
                    onChange={handleChange}
                    sx={style}
                />
            )}
        </>
    );
};

export default EditableTextField;
