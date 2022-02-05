import React, { useState, useEffect } from "react"

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const ViewFlashCard = props => {
    const { cardInfo, index } = props;
    const { isDarkMode, theme } = useTheme();


    return (
        <div className={`${viewFlashStyles.viewFlashCard} ${index === 0 ? viewFlashStyles.firstCard : ""}`}
            key={index}
            style={{ color: theme.foreground, background: theme.background }}
        >
            <span><b>Card {index + 1}</b></span>
        </div>
    )
}

export default ViewFlashCard;