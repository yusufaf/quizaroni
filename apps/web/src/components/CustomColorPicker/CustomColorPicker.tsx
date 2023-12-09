import {
    RestartAlt,
    Visibility,
    VisibilityOff,
    Add,
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import { ExtraPickerButton } from "../../views/Create/CreateSetStyles";
import { ColorPickerContainer, ExtraPickerContainer } from "./styles";
import { useDispatch } from "react-redux";
import { setNamedColorsDialogProps } from "state/slices/globalSlice";
import { StyledChromePicker } from "common/AppStyles";
import { useClickAway } from "lib/hooks/useClickAway";

type Props = {
    color: string;
    applyColor: boolean;
    onResetColor: () => void;
    onApplyColor: () => void;
    onChange: (e: any) => void;
    style?: Object;
    onClose: () => void;
    additionalRefs?: any[],
};

const CustomColorPicker = (props: Props) => {
    const { 
        applyColor, 
        color, 
        onResetColor, 
        onApplyColor, 
        onChange, 
        style,
        onClose,
        additionalRefs,
    } = props;

    const ref = useClickAway(onClose, additionalRefs);
    const dispatch = useDispatch();

    const openNamedColorsDialog = () => {
        dispatch(
            setNamedColorsDialogProps({
                open: true,
                color,
            })
        );
    };

    return (
        <ColorPickerContainer style={style} ref={ref}>
            <StyledChromePicker color={color} onChange={onChange} />
            <ExtraPickerContainer>
                <Tooltip title="Reset color" placement="right">
                    <ExtraPickerButton onClick={onResetColor}>
                        <RestartAlt />
                    </ExtraPickerButton>
                </Tooltip>

                <Tooltip title="Apply color" placement="right">
                    <ExtraPickerButton onClick={onApplyColor}>
                        {applyColor ? <Visibility /> : <VisibilityOff />}
                    </ExtraPickerButton>
                </Tooltip>

                <Tooltip title="Add to named colors" placement="right">
                    <ExtraPickerButton onClick={openNamedColorsDialog}>
                        <Add />
                    </ExtraPickerButton>
                </Tooltip>
            </ExtraPickerContainer>
        </ColorPickerContainer>
    );
};

export default CustomColorPicker;
