import React, { useState, useEffect, useRef } from "react"
import { Tooltip } from '@mui/material/';
import { useTheme } from "../../theme/useTheme";
import * as createSetStyles from '../CreateSet.module.css';
import * as appStyles from "../../App.module.css";

const NewCardInput = props => {
    const { index, handleDelete, updateCardValue, onFileChange, fileInput } = props;

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    return (
        <div
            className={index === 0 ? `${createSetStyles.newCard} ${createSetStyles.firstCard}` : `${createSetStyles.newCard}`}
            key={index}
            style={{ color: theme.foreground, background: theme.background }}
        >
            <div className={createSetStyles.newCardHeader}>
                <span><b>Card {index + 1}</b></span>
                <Tooltip
                    title="Delete this card"
                    placement="bottom"
                    arrow={true}
                >
                    <span className={appStyles.deleteCard} onClick={() => handleDelete(index)}>
                        <i className="material-icons-outlined" style={{ fontSize: "2rem" }}>
                            delete
                        </i>
                    </span>
                </Tooltip>
                <Tooltip
                    title="Upload an image"
                    placement="bottom"
                    arrow={true}
                >
                    {/* Upload file container */}
                    <div className={createSetStyles.uploadImage}>
                        <input
                            type="file"
                            id="fileInput"
                            ref={fileInput}
                            accept=".png, .jpg"
                            onChange={e => onFileChange(e, index)}
                            style={{ display: "none" }}
                        />
                        <i
                            className="material-icons-outlined"
                            style={{ fontSize: "2rem" }}
                            onClick={() => fileInput.current.click()}
                        >
                            image
                        </i>
                    </div>
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
                <div className={createSetStyles.newCardDefinition}>
                    <label className={createSetStyles.inputLabel}>Definition</label>
                    <input
                        className={isDarkMode ? `${createSetStyles.newCardInput} ${appStyles.darkInput}` : `${createSetStyles.newCardInput} ${appStyles.lightInput}`}
                        placeholder="Enter a definition"
                        onChange={(e) => updateCardValue(index, "definition", e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}


export default NewCardInput;