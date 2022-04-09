import { useState, useRef } from "react"
import { IconButton, Tooltip, Typography } from '@mui/material/';
import { AddPhotoAlternate, Delete } from "@mui/icons-material";
import { useTheme } from "../../theme/useTheme";

import { ChromePicker } from "react-color";

import * as createSetStyles from '../CreateSet.module.css';
import * as appStyles from "../../App.module.css";

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
        <div
            className={index === 0 ? `${createSetStyles.newCard} ${createSetStyles.firstCard}` : `${createSetStyles.newCard}`}
            key={index}
            style={{ color: theme.foreground, background: theme.background }}
        >
            <div className={createSetStyles.newCardHeader}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: "bold"
                    }}
                >
                    Card {index + 1}
                </Typography>

                <div className={createSetStyles.newCardActions}>
                    <Tooltip
                        title="Delete this card"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => handleDelete(index)}
                        >
                            <Delete
                                sx={{
                                    color: theme.foreground
                                }}
                            />
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
                                sx={{
                                    color: theme.foreground
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>
            <div className={createSetStyles.newCardInputs}>
                <div className={createSetStyles.newCardTerm}>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            color: "orange",
                        }}
                    >
                        Term
                    </Typography>
                    {/* <label className={createSetStyles.inputLabel}>Term</label> */}

                    <input
                        className={isDarkMode ? `${createSetStyles.newCardInput} ${appStyles.darkInput}` : `${createSetStyles.newCardInput} ${appStyles.lightInput}`}
                        placeholder="Enter a term"
                        onChange={(e) => updateCardValue(index, "term", e.target.value)}
                    />
                </div>
                <div className={createSetStyles.cardActions}>
                    <Tooltip
                        title="Change card text color"
                        placement="top"
                        arrow={true}
                    >
                        <span className={`material-icons-round ${createSetStyles.colorPickerIcon}`}
                            onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                            style={{ color: `${localTextColor ? localTextColor : ""}` }}
                        >
                            format_color_text
                        </span>
                    </Tooltip>
                    {showTextColorPicker &&
                        <div className={createSetStyles.colorPickerContainer}>
                            <div className={`material-icons-round ${createSetStyles.colorClose}`}
                                style={{ color: theme.foreground, background: theme.background }}
                            >
                                close
                            </div>
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
                        placement="bottom"
                        arrow={true}
                    >
                        <span className={`material-icons-round ${createSetStyles.colorPickerIcon}`}
                            onClick={() => setShowBackgroundColorPicker(!showBackgroundColorPicker)}
                            style={{ color: `${localBackgroundColor ? localBackgroundColor : ""}` }}
                        >
                            format_color_fill
                        </span>
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
                </div>
                <div className={createSetStyles.newCardDefinition}>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            color: "orange",
                        }}
                    >
                        Definition
                    </Typography>
                    {/* <label className={createSetStyles.inputLabel}>Definition</label> */}
                    <input
                        className={isDarkMode ? `${createSetStyles.newCardInput} ${appStyles.darkInput}` : `${createSetStyles.newCardInput} ${appStyles.lightInput}`}
                        placeholder="Enter a definition"
                        onChange={(e) => updateCardValue(index, "definition", e.target.value)}
                    />
                </div>
            </div>
        </div >
    )
}

export default NewCardInput;