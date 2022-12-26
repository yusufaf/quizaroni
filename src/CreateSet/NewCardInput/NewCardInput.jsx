import { useState, useRef } from "react"
import { IconButton, TextField, Tooltip, Typography } from '@mui/material/';
import { AddPhotoAlternate, Delete, FormatColorText, FormatColorFill, SwapHoriz } from "@mui/icons-material";
import { useTheme } from "src/theme/useTheme";

import { ChromePicker } from "react-color";

import * as createSetStyles from '../CreateSet.module.css';
import { NewCard, NewCardHeader, NewCardInputField } from "../CreateSetStyles";

const NewCardInput = props => {
    const { index, handleDelete, updateCardValue, onFileChange, onColorChange, fileInputRef } = props;
    const { isDarkMode, theme } = useTheme();

    const colorPickerRef = useRef(null);
    const [showTextColorPicker, setShowTextColorPicker] = useState(false);
    const [showBackgroundColorPicker, setShowBackgroundColorPicker] = useState(false);
    const [localTextColor, setLocalTextColor] = useState("");
    const [localBackgroundColor, setLocalBackgroundColor] = useState("");

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

    return (
        <NewCard
            raised
            // className={index === 0 ? `${createSetStyles.newCard} ${createSetStyles.firstCard}` : `${createSetStyles.newCard}`}
            key={index}
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

                <div className={createSetStyles.cardActions}>
                    <Tooltip
                        title="Change card text color"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => {
                                setShowBackgroundColorPicker(false)
                                setShowTextColorPicker(!showTextColorPicker)
                            }}
                        >
                            <FormatColorText
                                fontSize="medium"
                                sx={{
                                    color: `${localTextColor ? localTextColor : theme.foreground}`
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                    {showTextColorPicker &&
                        <div className={createSetStyles.colorPickerContainer}>
                            <ChromePicker
                                className={`${createSetStyles.colorPicker} ${createSetStyles.backgroundPicker}`}
                                color={localTextColor}
                                onChange={(e) => {
                                    onColorChange(e, index);
                                    setLocalTextColor(e.hex);
                                }}
                            />
                        </div>
                    }

                    <Tooltip
                        title="Change background color"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => {
                                setShowTextColorPicker(false);
                                setShowBackgroundColorPicker(!showBackgroundColorPicker);
                            }}
                        >
                            <FormatColorFill
                                fontSize="medium"
                                sx={{
                                    color: `${localBackgroundColor ? localBackgroundColor : theme.foreground}`
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                    {showBackgroundColorPicker &&
                        <ChromePicker
                            className={`${createSetStyles.colorPicker}`}
                            color={localBackgroundColor}
                            onChange={(e) => {
                                onColorChange(e, index);
                                setLocalBackgroundColor(e.hex);
                            }}
                        />
                    }
                    {/* TODO: Implement swapping of the term and the definition */}
                    <Tooltip
                        title="Swap term and definition"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => alert("Bruh")}
                        >
                            <SwapHoriz
                                fontSize="medium"
                            />
                        </IconButton>
                    </Tooltip>
                </div>

                <div className={createSetStyles.newCardActions}>
                    <Tooltip
                        title="Delete this card"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => handleDelete(index)}
                        >
                            <Delete fontSize="medium"/>
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
                </div>
            </NewCardHeader>
            <div className={createSetStyles.newCardInputs}>
                <div className={createSetStyles.newCardTerm}>
                    <Typography
                        variant="subtitle1"
                        sx={{color: theme.palette.primary.main}}
                    >
                        Term
                    </Typography>
                    
                    <NewCardInputField
                        variant="standard"
                        placeholder={"Enter a term"}
                        onChange={(e) => updateCardValue(index, "term", e.target.value)}
                        multiline
                        maxRows={4}
                    />
                </div>
                <div className={createSetStyles.newCardDefinition}>
                    <Typography
                        variant="subtitle1"
                        sx={{color: theme.palette.primary.main}}
                    >
                        Definition
                    </Typography>
                    <NewCardInputField
                        variant="standard"
                        placeholder={"Enter a definition"}
                        onChange={(e) => updateCardValue(index, "definition", e.target.value)}
                        multiline
                        maxRows={4}
                    />
                </div>
            </div>
        </NewCard>
    )
}

export default NewCardInput;