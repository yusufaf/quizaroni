import { Dispatch, SetStateAction } from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

type Props = {
    passwordVisibility: boolean;
    setPasswordVisibility: Dispatch<SetStateAction<boolean>>;
};
const PasswordToggle = (props: Props) => {
    const { passwordVisibility, setPasswordVisibility } = props;

    return (
        <InputAdornment position="end">
            <IconButton
                aria-label="Toggle password visibility"
                onClick={() => setPasswordVisibility(!passwordVisibility)}
                edge="end"
                tabIndex={-1}
            >
                {passwordVisibility ? <VisibilityOff /> : <Visibility />}
            </IconButton>
        </InputAdornment>
    );
};

export default PasswordToggle;
