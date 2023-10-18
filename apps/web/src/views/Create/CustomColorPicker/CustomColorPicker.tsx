import { RestartAlt, Visibility, VisibilityOff, Add } from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { ExtraPickerButton } from "../createSetStyles";
import { ColorPickerContainer, ExtraPickerContainer } from "./styles";
import { ChromePicker } from "react-color";
import { useState } from "react";

type Props = {
    onResetColor: () => void;
    onApplyColor: () => void;
};

const CustomColorPicker = (props: Props) => {
    const {
        onResetColor,
        onApplyColor,
    } = props;

    const [showNamedColorsDialog, setShowNamedColorsDialog] = useState(false);

    const resetColor = () => {

    }

    const toggleApplyColor = () => {
    }

    

    return (
        <>
            <ColorPickerContainer>
                <ChromePicker
                // color={localTextColor}
                // onChange={onTextColorChange}
                />
                <ExtraPickerContainer>
                    <Tooltip title="Reset text color" placement="right">
                        <ExtraPickerButton onClick={() => {}}>
                            <RestartAlt />
                        </ExtraPickerButton>
                    </Tooltip>

                    <Tooltip title="Apply text color" placement="right">
                        <ExtraPickerButton onClick={() => {}}>
                            {/* {applyTextColor ? <Visibility /> : <VisibilityOff />} */}
                        </ExtraPickerButton>
                    </Tooltip>

                    <Tooltip title="Add to named colors" placement="right">
                        <ExtraPickerButton>
                            <Add />
                        </ExtraPickerButton>
                    </Tooltip>
                </ExtraPickerContainer>
            </ColorPickerContainer>
        </>
        
    );
};

export default CustomColorPicker;
