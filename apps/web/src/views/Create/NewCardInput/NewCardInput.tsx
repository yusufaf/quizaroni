import { useState, useRef, useEffect } from "react";
import { IconButton, TextField, Tooltip, Typography } from "@mui/material/";
import {
    AddPhotoAlternate,
    Delete,
    FormatColorText,
    FormatColorFill,
    SwapHoriz,
    Add,
    ContentCopy,
} from "@mui/icons-material";
import { useTheme } from "theme/useTheme";
import { BoldTypography } from "common/AppStyles";
import {
    NewCard,
    NewCardDefinition,
    NewCardHeader,
    NewCardInputField,
    NewCardInputs,
    RightActions,
    CenterActions,
    NewCardTerm,
    NewCardLabel,
    BottomActions,
    AddCardBelowButton,
} from "../CreateSetStyles";
import {
    addCard,
    deleteCard,
    duplicateCard,
    swapCard,
} from "utilities/createUtils";
import CustomColorPicker from "../CustomColorPicker/CustomColorPicker";
import type { ColorPickerType } from "lib/types";

type Props = {
    index: number;
    updateCardValue: any;
    onFileChange: any;
    onColorChange: any;
    fileInputRef: any;
    cardValues: any;
    createdSetCards: any;
    setCreatedSetCards: any;
};
const NewCardInput = (props: Props) => {
    const {
        index,
        updateCardValue,
        onFileChange,
        onColorChange,
        fileInputRef,
        cardValues,
        createdSetCards,
        setCreatedSetCards,
    } = props;

    const {
        term,
        definition,
        backgroundColor = "",
        textColor = "",
        uuid,
    } = cardValues;

    const setStateCallback = setCreatedSetCards;

    const { isDarkMode, theme } = useTheme();

    const [showTextColorPicker, setShowTextColorPicker] =
        useState<boolean>(false);
    const [showBackgroundColorPicker, setShowBackgroundColorPicker] =
        useState<boolean>(false);
    const [localTextColor, setLocalTextColor] = useState(textColor);
    const [localBackgroundColor, setLocalBackgroundColor] =
        useState(backgroundColor);

    const [applyTextColor, setApplyTextColor] = useState<boolean>(false);
    const [applyBackgroundColor, setApplyBackgroundColor] =
        useState<boolean>(false);

    useEffect(() => {
        if (showTextColorPicker || showBackgroundColorPicker) {
            const elements = document.querySelectorAll("[id]");
            for (const el of elements) {
                if (el.id.startsWith("rc-editable-input")) {
                    const domElement = document.getElementById(el.id)
                    // @ts-ignore
                    domElement.style.color = theme.palette.text.primary;
                    // @ts-ignore
                    domElement.style.background = theme.palette.background.paper;
                    break;
                }
            }
        }
    }, [showTextColorPicker, showBackgroundColorPicker, theme]);

    // TODO: Clicking away from ColorPicker
    // useEffect(() => {
    //     window.addEventListener("click", handleClickOutside);
    //     return () => {
    //         window.removeEventListener("click", handleClickOutside);
    //     }
    // }, [colorPickerRef])

    /**
     * Handles hiding dropdown when clicking away from it
     * @param {*} e
     */
    const handleClickOutside = (e) => {
        // console.log("colorPickerRef.current = ", colorPickerRef.current);
        // console.log("e.target = ", e.target);
        // if (colorPickerRef.current && !colorPickerRef?.current?.contains(e.target) && !colorPik) {
        //     setShowColorPicker(false);
        // }
    };

    const toggleBackgroundColorPicker = () => {
        setShowTextColorPicker(false);
        setShowBackgroundColorPicker(!showBackgroundColorPicker);
    };

    const toggleTextColorPicker = () => {
        setShowBackgroundColorPicker(false);
        setShowTextColorPicker(!showTextColorPicker);
    };

    const onColorPickerChange = (e, type: ColorPickerType) => {
        const localStateCallback =
            type === "textColor" ? setLocalTextColor : setLocalBackgroundColor;
        onColorChange(e, type, index);
        localStateCallback(e.hex);
    };

    const resetColor = (type: ColorPickerType) => {
        const localStateCallback =
            type === "textColor" ? setLocalTextColor : setLocalBackgroundColor;
        updateCardValue(index, type, "");
        localStateCallback("");
    };

    const toggleApplyColor = (type: ColorPickerType) => {
        if (type === "textColor") {
            setApplyTextColor(!applyTextColor);
        } else {
            setApplyBackgroundColor(!applyBackgroundColor);
        }
    };

    const colorPickerActiveStyling = {
        backgroundColor: theme.palette.action.hover,
    };

    const displayBackgroundColor = applyBackgroundColor && localBackgroundColor;
    const displayTextColor = applyTextColor && localTextColor;

    return (
        <NewCard
            raised
            key={uuid}
            sx={{
                background: displayBackgroundColor
                    ? localBackgroundColor
                    : undefined,
            }}
        >
            <NewCardHeader>
                <BoldTypography variant="h6">Card {index + 1}</BoldTypography>
                <CenterActions>
                    <Tooltip title="Change card text color" placement="top">
                        <IconButton
                            onClick={toggleTextColorPicker}
                            sx={
                                showTextColorPicker
                                    ? colorPickerActiveStyling
                                    : {}
                            }
                        >
                            <FormatColorText
                                fontSize="medium"
                                // sx={{
                                //     color: `${localTextColor ? localTextColor : theme.foreground}`
                                // }}
                            />
                        </IconButton>
                    </Tooltip>
                    {showTextColorPicker && (
                        <CustomColorPicker
                            applyColor={applyTextColor}
                            color={localTextColor}
                            onChange={(e) => onColorPickerChange(e, "textColor")}
                            onResetColor={() => resetColor("textColor")}
                            onApplyColor={() => toggleApplyColor("textColor")}
                        />
                    )}
                    <Tooltip title="Change background color" placement="top">
                        <IconButton
                            onClick={toggleBackgroundColorPicker}
                            sx={
                                showBackgroundColorPicker
                                    ? colorPickerActiveStyling
                                    : {}
                            }
                        >
                            <FormatColorFill
                                fontSize="medium"
                                // sx={{
                                //     color: `${localBackgroundColor ? localBackgroundColor : theme.foreground}`
                                // }}
                            />
                        </IconButton>
                    </Tooltip>
                    {showBackgroundColorPicker && (
                        <CustomColorPicker
                            applyColor={applyBackgroundColor}
                            color={localBackgroundColor}
                            onChange={(e) => onColorPickerChange(e, "backgroundColor")}
                            onResetColor={() => resetColor("backgroundColor")}
                            onApplyColor={() =>
                                toggleApplyColor("backgroundColor")
                            }
                            style={{
                                left: "4rem",
                            }}
                        />
                    )}
                    <Tooltip title="Swap term and definition" placement="top">
                        <IconButton
                            onClick={() =>
                                swapCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                        >
                            <SwapHoriz fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate" placement="top">
                        <IconButton
                            onClick={() =>
                                duplicateCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                        >
                            <ContentCopy />
                        </IconButton>
                    </Tooltip>
                </CenterActions>
                <RightActions>
                    <Tooltip title="Delete this card" placement="top">
                        <IconButton
                            onClick={() =>
                                deleteCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                        >
                            <Delete fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                    <input
                        type="file"
                        id="fileInput"
                        ref={fileInputRef}
                        accept=".png, .jpg"
                        onChange={(e) => onFileChange(e, index)}
                        style={{ display: "none" }}
                    />
                    <Tooltip title="Upload an image" placement="top">
                        <IconButton
                            onClick={() => fileInputRef.current.click()}
                        >
                            <AddPhotoAlternate fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                </RightActions>
            </NewCardHeader>
            <NewCardInputs>
                <NewCardTerm>
                    <NewCardLabel variant="subtitle1">Term</NewCardLabel>
                    <NewCardInputField
                        variant="standard"
                        placeholder={"Enter a term"}
                        onChange={(e) =>
                            updateCardValue(index, "term", e.target.value)
                        }
                        multiline
                        maxRows={4}
                        value={term}
                        inputProps={{
                            style: {
                                color: displayTextColor
                                    ? localTextColor
                                    : undefined,
                            },
                        }}
                    />
                </NewCardTerm>
                <NewCardDefinition>
                    <NewCardLabel variant="subtitle1">Definition</NewCardLabel>
                    <NewCardInputField
                        variant="standard"
                        placeholder={"Enter a definition"}
                        onChange={(e) =>
                            updateCardValue(index, "definition", e.target.value)
                        }
                        multiline
                        maxRows={4}
                        value={definition}
                        inputProps={{
                            style: {
                                color: displayTextColor
                                    ? localTextColor
                                    : undefined,
                            },
                        }}
                    />
                </NewCardDefinition>
                <BottomActions>
                    {index !== createdSetCards.length - 1 && (
                        <AddCardBelowButton
                            onClick={() =>
                                addCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                            title="Add card below"
                        >
                            <Add fontSize="medium" />
                        </AddCardBelowButton>
                    )}
                </BottomActions>
            </NewCardInputs>
        </NewCard>
    );
};

export default NewCardInput;
