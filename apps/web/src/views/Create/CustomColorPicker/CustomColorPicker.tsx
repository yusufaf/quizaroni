import {
    RestartAlt,
    Visibility,
    VisibilityOff,
    Add,
} from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, Tooltip, Typography } from "@mui/material";
import { ExtraPickerButton } from "../createSetStyles";
import { ColorPickerContainer, ExtraPickerContainer } from "./styles";
import { ChromePicker } from "react-color";
import { useState } from "react";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";

type Props = {
    color: string;
    applyColor: boolean;
    onResetColor: () => void;
    onApplyColor: () => void;
    onChange: (e: any) => void;
    style?: Object;
};

const CustomColorPicker = (props: Props) => {
    const { applyColor, color, onResetColor, onApplyColor, onChange, style } =
        props;

    const [showNamedColorsDialog, setShowNamedColorsDialog] = useState(false);

    const closeNamedColorsDialog = () => {
        setShowNamedColorsDialog(false);
    }

    return (
        <>
            <ColorPickerContainer style={style}>
                <ChromePicker color={color} onChange={onChange} />
                <ExtraPickerContainer>
                    <Tooltip title="Reset text color" placement="right">
                        <ExtraPickerButton onClick={onResetColor}>
                            <RestartAlt />
                        </ExtraPickerButton>
                    </Tooltip>

                    <Tooltip title="Apply text color" placement="right">
                        <ExtraPickerButton onClick={onApplyColor}>
                            {applyColor ? <Visibility /> : <VisibilityOff />}
                        </ExtraPickerButton>
                    </Tooltip>

                    <Tooltip title="Add to named colors" placement="right">
                        <ExtraPickerButton
                            onClick={() => setShowNamedColorsDialog(true)}
                        >
                            <Add />
                        </ExtraPickerButton>
                    </Tooltip>
                </ExtraPickerContainer>
            </ColorPickerContainer>

            <Dialog open={showNamedColorsDialog} onClose={closeNamedColorsDialog}>
                <StyledDialogTitle>
                    Named Colors
                    <CloseDialogButton onClose={closeNamedColorsDialog} />
                </StyledDialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <Typography>"real"</Typography>
                    </DialogContentText>
                </DialogContent>
                {/* <DialogActions>
                    <Button onClick={onClose}>
                        {dialogProps?.cancelButtonText || "Cancel"}
                    </Button>
                    <Button variant="contained" onClick={handleConfirm}>
                        {dialogProps?.confirmButtonText || "Confirm"}
                    </Button>
                </DialogActions> */}
            </Dialog>
        </>
    );
};

export default CustomColorPicker;
