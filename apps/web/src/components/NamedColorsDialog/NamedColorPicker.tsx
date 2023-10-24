"use strict";
import { IconButton, Paper, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Swatch, SwatchPaper } from "./styles";
import { useTheme } from "lib/theme/useTheme";
import { StyledChromePicker, SimpleFlexContainer } from "common/AppStyles";
import {
    ContentCopy as CopyIcon,
} from "@mui/icons-material";


type Props = {
    color: string;
    onChange: (e: any) => void;
};
const NamedColorPicker = (props: Props) => {
    const { color, onChange } = props;

    const { theme } = useTheme();
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        if (showColorPicker) {
            const elements = document.querySelectorAll("[id]");
            for (const el of elements) {
                if (el.id.startsWith("rc-editable-input")) {
                    const domElement = document.getElementById(el.id)
                    // @ts-ignore
                    domElement.style.color = theme.palette.text.primary;
                    // @ts-ignore
                    domElement.style.background = theme.palette.grey[800];
                    break;
                }
            }
        }
    }, [showColorPicker]);

    const handleClick = () => {
        setShowColorPicker(!showColorPicker);
    };

    const handleClose = () => {
        setShowColorPicker(false);
    };

    return (
        <div>
            <SwatchPaper elevation={6}>
                <Swatch
                    onClick={handleClick}
                    style={{
                        background: color,
                    }}
                />
                <SimpleFlexContainer>
                    <Typography sx={{minWidth: "4rem"}}>{color}</Typography>
                    <IconButton>
                        <CopyIcon fontSize="small"/>
                    </IconButton>
                </SimpleFlexContainer>
            </SwatchPaper>
            {showColorPicker && (
                <StyledChromePicker color={color} onChange={onChange} />
            )}
        </div>
    );
};
export default NamedColorPicker;
