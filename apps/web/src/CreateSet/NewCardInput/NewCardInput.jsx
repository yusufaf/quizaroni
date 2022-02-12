import { useState, useEffect, useRef } from "react"
import { Tooltip } from '@mui/material/';
import { useTheme } from "../../theme/useTheme";

import { ChromePicker } from "react-color";

import * as createSetStyles from '../CreateSet.module.css';
import * as appStyles from "../../App.module.css";

const NewCardInput = props => {
    const { index, handleDelete, updateCardValue, onFileChange, onColorChange, fileInputRef } = props;
    const { isDarkMode, theme } = useTheme();

    const colorPickerRef = useRef(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    // localColor is just for testing purposes, don't need this right?
    const [localColor, setLocalColor] = useState("");

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
            <div>
                <span><b>Card {index + 1}</b></span>
                <Tooltip
                    title="Delete this card"
                    placement="right"
                    arrow={true}
                >
                    <span className={createSetStyles.deleteCard} onClick={() => handleDelete(index)}>
                        <i className={`material-icons-outlined  ${appStyles.clickIcon}`}>
                            delete
                        </i>
                    </span>
                </Tooltip>
                {/* Upload file container */}
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
                    placement="right"
                    arrow={true}
                >
                    <span className={createSetStyles.uploadImage}>
                        <i
                            className={`material-icons-outlined  ${appStyles.clickIcon}`}
                            onClick={() => fileInputRef.current.click()}
                        >
                            image
                        </i>
                    </span>
                </Tooltip>
            </div>
            <div className={createSetStyles.newCardInputs}>
                <div className={createSetStyles.newCardTerm}>
                    <label className={createSetStyles.inputLabel}>Term</label>
                    <input
                        className={isDarkMode ? `${createSetStyles.newCardInput} ${appStyles.darkInput}` : `${createSetStyles.newCardInput} ${appStyles.lightInput}`}
                        placeholder="Enter a term"
                        onChange={(e) => updateCardValue(index, "term", e.target.value)}
                    />
                </div>
                <div className={createSetStyles.cardActions}>
                    <span className={`material-icons-round ${createSetStyles.colorPickerIcon}`}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                    >
                        format_color_text
                    </span>
                    {showColorPicker &&
                        <ChromePicker
                            className={`${createSetStyles.colorPicker}`}
                            color={localColor}
                            onChange={(e) => {
                                onColorChange(e, index);
                                setLocalColor(e.hex);
                            }}
                        />
                    }
                </div>
                <div className={createSetStyles.newCardDefinition}>
                    <label className={createSetStyles.inputLabel}>Definition</label>
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