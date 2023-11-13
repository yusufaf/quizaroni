import {
    RestartAlt,
    Visibility,
    VisibilityOff,
    Add,
} from "@mui/icons-material";
import {
    Tooltip,
} from "@mui/material";
import { ExtraPickerButton } from "../CreateSetStyles";
import { ColorPickerContainer, ExtraPickerContainer } from "./styles";
import { ChromePicker } from "react-color";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setNamedColorsDialogProps } from "state/slices/globalSlice";
import { StyledChromePicker } from "common/AppStyles";

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

    const dispatch = useDispatch();

    const openNamedColorsDialog = () => {
        dispatch(setNamedColorsDialogProps({
            open: true,
            color,
        }))
    }

    return (
        <ColorPickerContainer style={style}>
            <StyledChromePicker color={color} onChange={onChange} />
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
                        onClick={openNamedColorsDialog}
                    >
                        <Add />
                    </ExtraPickerButton>
                </Tooltip>
            </ExtraPickerContainer>
        </ColorPickerContainer>
    );
};

export default CustomColorPicker;
