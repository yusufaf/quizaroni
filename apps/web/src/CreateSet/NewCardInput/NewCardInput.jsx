import { useState, useRef } from "react"
import { IconButton, TextField, Tooltip, Typography } from '@mui/material/';
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
    VisibilityOff
} from "@mui/icons-material";
import { useTheme } from "src/theme/useTheme";
import { ChromePicker } from "react-color";
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
    NewCardLabel
} from "../CreateSetStyles";

/* 
type Props = {

}
*/
const NewCardInput = props => {
    const {
        index,
        handleDelete,
        updateCardValue,
        onFileChange,
        onColorChange,
        fileInputRef,
        handleSwap,
        cardValues,
        handleDuplicateCard,
    } = props;

    const {
        term,
        definition,
        backgroundColor = "",
        textColor = "",
    } = cardValues;

    const { isDarkMode, theme } = useTheme();

    const [showTextColorPicker, setShowTextColorPicker] = useState(false);
    const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);
    const [localTextColor, setLocalTextColor] = useState(textColor);
    const [localBackgroundColor, setLocalBackgroundColor] = useState(backgroundColor);

    const [applyTextColor, setApplyTextColor] = useState(false);
    const [applyBackgroundColor, setApplyBackgroundColor] = useState(false);


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
    const handleClickOutside = e => {
        // console.log("colorPickerRef.current = ", colorPickerRef.current);
        // console.log("e.target = ", e.target);
        // if (colorPickerRef.current && !colorPickerRef?.current?.contains(e.target) && !colorPik) {
        //     setShowColorPicker(false);
        // }
    }

    const onBackgroundColorChange = (e) => {
        onColorChange(e, "backgroundColor", index);
        setLocalBackgroundColor(e.hex);
    }

    const toggleBackgroundColorPicker = () => {
        setShowTextColorPicker(false);
        setShowBackgroundColorPicker(!showBackgroundColorPicker);
    }

    const onTextColorChange = (e) => {
        onColorChange(e, "textColor", index);
        setLocalTextColor(e.hex);
    }

    const toggleTextColorPicker = () => {
        setShowBackgroundColorPicker(false)
        setShowTextColorPicker(!showTextColorPicker)
    }

    const resetTextColor = () => {
        updateCardValue(index, "textColor", "");
        setLocalTextColor("");
    }

    const resetBackgroundColor = () => {
        updateCardValue(index, "backgroundColor", "");
        setLocalBackgroundColor("");
    }

    const toggleApplyTextColor = () => {
        setApplyTextColor(!applyTextColor);
    }

    const toggleApplyBackgroundColor = () => {
        setApplyBackgroundColor(!applyBackgroundColor);
    }

    const colorPickerActiveStyling = {
        backgroundColor: theme.palette.action.hover,
    }

    const displayBackgroundColor = applyBackgroundColor && localBackgroundColor;
    const displayTextColor = applyTextColor && localTextColor;

    /* TODO/IDEA:
    - Ability to create named colors, appear in some dropdown in the color picker container you've created

    */

    return (
        <NewCard
            raised
            key={index}
            sx={{
                background: displayBackgroundColor ? localBackgroundColor : undefined
            }}
        >
            <NewCardHeader>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: "bold"
                    }}
                >
                    Card {index + 1}
                </Typography>

                <CenterActions>
                    <Tooltip
                        title="Change card text color"
                        placement="top"
                    >
                        <IconButton
                            onClick={toggleTextColorPicker}
                            sx={showTextColorPicker && colorPickerActiveStyling}
                        >
                            <FormatColorText
                                fontSize="medium"
                                // sx={{
                                //     color: `${localTextColor ? localTextColor : theme.foreground}`
                                // }}
                            />
                        </IconButton>
                    </Tooltip>
                    {showTextColorPicker &&
                        <TextColorPickerContainer>
                            <ChromePicker
                                color={localTextColor}
                                onChange={onTextColorChange}
                            />
                            <ExtraPickerContainer>
                                <ExtraPickerButton
                                    onClick={resetTextColor}
                                >
                                    <RestartAlt />
                                </ExtraPickerButton>
                                <ExtraPickerButton
                                    onClick={toggleApplyTextColor}
                                >
                                    {applyTextColor ? <Visibility /> : <VisibilityOff />}
                                </ExtraPickerButton>
                            </ExtraPickerContainer>
                        </TextColorPickerContainer>
                    }
                    <Tooltip
                        title="Change background color"
                        placement="top"
                    >
                        <IconButton
                            onClick={toggleBackgroundColorPicker}
                            sx={showBackgroundColorPicker && colorPickerActiveStyling}
                        >
                            <FormatColorFill
                                fontSize="medium"
                                // sx={{
                                //     color: `${localBackgroundColor ? localBackgroundColor : theme.foreground}`
                                // }}
                            />
                        </IconButton>
                    </Tooltip>
                    {showBackgroundColorPicker &&
                        <BgColorPickerContainer >
                            <ChromePicker
                                color={localBackgroundColor}
                                onChange={onBackgroundColorChange}
                            />
                            <ExtraPickerContainer>
                                <ExtraPickerButton
                                    onClick={resetBackgroundColor}
                                >
                                    <RestartAlt />
                                </ExtraPickerButton>
                                <ExtraPickerButton
                                    onClick={toggleApplyBackgroundColor}
                                >
                                    {applyBackgroundColor ? <Visibility /> : <VisibilityOff />}
                                </ExtraPickerButton>
                            </ExtraPickerContainer>
                        </BgColorPickerContainer>
                    }
                    <Tooltip
                        title="Swap term and definition"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => handleSwap(index)}
                        >
                            <SwapHoriz
                                fontSize="medium"
                            />
                        </IconButton>
                    </Tooltip>
                    {/* TODO */}
                    <IconButton>
                        <Add />
                    </IconButton>
                    <Tooltip
                        title="Duplicate"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => handleDuplicateCard(index)}
                        >
                            <ContentCopy />
                        </IconButton>
                    </Tooltip>
                </CenterActions>
                <RightActions>
                    <Tooltip
                        title="Delete this card"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => handleDelete(index)}
                        >
                            <Delete fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                    <input
                        type="file"
                        id="fileInput"
                        ref={fileInputRef}
                        accept=".png, .jpg"
                        onChange={e => onFileChange(e, index)}
                        style={{ display: "none" }}
                    />
                    <Tooltip
                        title="Upload an image"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => fileInputRef.current.click()}
                        >
                            <AddPhotoAlternate
                                fontSize="medium"
                            />
                        </IconButton>
                    </Tooltip>
                </RightActions>
            </NewCardHeader>
            <NewCardInputs>
                <NewCardTerm>
                    <NewCardLabel
                        variant="subtitle1"
                    >
                        Term
                    </NewCardLabel>
                    <NewCardInputField
                        variant="standard"
                        placeholder={"Enter a term"}
                        onChange={(e) => updateCardValue(index, "term", e.target.value)}
                        multiline
                        maxRows={4}
                        value={term}
                        inputProps={{ 
                            style: { color: displayTextColor ? localTextColor : undefined } 
                        }}
                    />
                </NewCardTerm>
                <NewCardDefinition>
                    <NewCardLabel
                        variant="subtitle1"
                    >
                        Definition
                    </NewCardLabel>
                    <NewCardInputField
                        variant="standard"
                        placeholder={"Enter a definition"}
                        onChange={(e) => updateCardValue(index, "definition", e.target.value)}
                        multiline
                        maxRows={4}
                        value={definition}
                        inputProps={{ 
                            style: { color: displayTextColor ? localTextColor : undefined } 
                        }}
                    />
                </NewCardDefinition>
            </NewCardInputs>
        </NewCard >
    )
}

export default NewCardInput;