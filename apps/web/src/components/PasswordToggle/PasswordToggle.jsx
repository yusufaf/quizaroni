import { IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const PasswordToggle = props => {
    const {
        passwordVisibility,
        setPasswordVisibility
    } = props;

    return (
        <InputAdornment position="end">
            <IconButton
                aria-label="toggle password visibility"
                onClick={() => setPasswordVisibility(!passwordVisibility)}
                edge="end"
            >
                {passwordVisibility ? <VisibilityOff /> : <Visibility />}
            </IconButton>
        </InputAdornment>
    )
}


export default PasswordToggle;