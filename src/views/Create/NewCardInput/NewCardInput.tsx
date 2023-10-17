import { useState, useRef } from "react";
import { IconButton, TextField, Tooltip, Typography } from "@mui/material/";
import {
    AddPhotoAlternate,
    Delete,
    FormatColorText,
    FormatColorFill,
    SwapHoriz,
    Add,
    ContentCopy,
    RestartAlt,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";
import { useTheme } from "theme/useTheme";
import { ChromePicker } from "react-color";
import { BoldTypography } from "common/AppStyles";
import {
    BgColorPickerContainer,
    NewCard,
    NewCardDefinition,
    NewCardHeader,
    NewCardInputField,
    NewCardInputs,
    RightActions,
    CenterActions,
    NewCardTerm,
    TextColorPickerContainer,
    ExtraPickerButton,
    ExtraPickerContainer,
    NewCardLabel,
    BottomActions,
    AddCardBelowButton,
} from "../CreateSetStyles";
import { TODO } from "lib/types";
import {
    addCard,
    deleteCard,
    duplicateCard,
    swapCard,
} from "utilities/createUtils";

type Props = {
    index: number,
    updateCardValue: any;
    onFileChange: any;
    onColorChange: any;
    fileInputRef: any;
    cardValues: any;
    createdSetCards: any;
    setCreatedSetCards: any;
}
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

    const onBackgroundColorChange = (e: any) => {
        onColorChange(e, "backgroundColor", index);
        setLocalBackgroundColor(e.hex);
    };

    const toggleBackgroundColorPicker = () => {
        setShowTextColorPicker(false);
        setShowBackgroundColorPicker(!showBackgroundColorPicker);
    };

    const onTextColorChange = (e: any) => {
        onColorChange(e, "textColor", index);
        setLocalTextColor(e.hex);
    };

    const toggleTextColorPicker = () => {
        setShowBackgroundColorPicker(false);
        setShowTextColorPicker(!showTextColorPicker);
    };

    const resetTextColor = () => {
        updateCardValue(index, "textColor", "");
        setLocalTextColor("");
    };

    const resetBackgroundColor = () => {
        updateCardValue(index, "backgroundColor", "");
        setLocalBackgroundColor("");
    };

    const toggleApplyTextColor = () => {
        setApplyTextColor(!applyTextColor);
    };

    const toggleApplyBackgroundColor = () => {
        setApplyBackgroundColor(!applyBackgroundColor);
    };

    const colorPickerActiveStyling = {
        backgroundColor: theme.palette.action.hover,
    };

    const displayBackgroundColor = applyBackgroundColor && localBackgroundColor;
    const displayTextColor = applyTextColor && localTextColor;

    /* TODO/IDEA:
    - Ability to create named colors, appear in some dropdown in the color picker container you've created

    */

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
                        <TextColorPickerContainer>
                            <ChromePicker
                                color={localTextColor}
                                onChange={onTextColorChange}
                            />
                            <ExtraPickerContainer>
                                <Tooltip
                                    title="Reset text color"
                                    placement="right"
                                >
                                    <ExtraPickerButton onClick={resetTextColor}>
                                        <RestartAlt />
                                    </ExtraPickerButton>
                                </Tooltip>

                                <Tooltip
                                    title="Apply text color"
                                    placement="right"
                                >
                                    <ExtraPickerButton
                                        onClick={toggleApplyTextColor}
                                    >
                                        {applyTextColor ? (
                                            <Visibility />
                                        ) : (
                                            <VisibilityOff />
                                        )}
                                    </ExtraPickerButton>
                                </Tooltip>

                                <Tooltip
                                    title="Add to named colors"
                                    placement="right"
                                >
                                    <ExtraPickerButton>
                                        <Add />
                                    </ExtraPickerButton>
                                </Tooltip>
                            </ExtraPickerContainer>
                        </TextColorPickerContainer>
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
                        <BgColorPickerContainer>
                            <ChromePicker
                                color={localBackgroundColor}
                                onChange={onBackgroundColorChange}
                            />
                            <ExtraPickerContainer>
                                <Tooltip
                                    title="Reset background color"
                                    placement="right"
                                >
                                    <ExtraPickerButton
                                        onClick={resetBackgroundColor}
                                    >
                                        <RestartAlt />
                                    </ExtraPickerButton>
                                </Tooltip>

                                <Tooltip
                                    title="Apply background color"
                                    placement="right"
                                >
                                    <ExtraPickerButton
                                        onClick={toggleApplyBackgroundColor}
                                    >
                                        {applyBackgroundColor ? (
                                            <Visibility />
                                        ) : (
                                            <VisibilityOff />
                                        )}
                                    </ExtraPickerButton>
                                </Tooltip>
                                <Tooltip
                                    title="Add to named colors"
                                    placement="right"
                                >
                                    <ExtraPickerButton>
                                        <Add />
                                    </ExtraPickerButton>
                                </Tooltip>
                            </ExtraPickerContainer>
                        </BgColorPickerContainer>
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
