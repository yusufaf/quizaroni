import { useState } from "react";
import { IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const PasswordToggle = props => {
    const [passVisibility, setPassVisibility] = useState(false);

    return (
        <InputAdornment position="end">
            <IconButton
                aria-label="toggle password visibility"
                onClick={() => setPassVisibility(!passVisibility)}
                edge="end"
            >
                {passVisibility ? <VisibilityOff /> : <Visibility />}
            </IconButton>
        </InputAdornment>
    )
}


export default PasswordToggle;