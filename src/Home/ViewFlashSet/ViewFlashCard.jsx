import { useState, useEffect } from "react"

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const ViewFlashCard = props => {
    const { cardInfo, index } = props;
    const { isDarkMode, theme } = useTheme();


    console.log("cardInfo in ", cardInfo);

    return (
        <div className={`${viewFlashStyles.viewFlashCard} ${index === 0 ? viewFlashStyles.firstCard : ""}`}
            key={index}
            style={{ color: theme.foreground, background: theme.background }}
        >
            <span><b>Card {index + 1}</b></span>
            <div className={viewFlashStyles.viewCardContainer}>
                <div className={viewFlashStyles.viewCardTerm}>
                    <label className={appStyles.inputLabel}>Term</label>
                    <span style={{ color: `${cardInfo?.textColor && cardInfo.textColor}` }}>
                        {cardInfo.term}
                    </span>
                </div>
                <div className={viewFlashStyles.viewCardDefinition}>
                    <label className={appStyles.inputLabel}>Definition</label>
                    <span style={{ color: `${cardInfo?.textColor && cardInfo.textColor}` }}>
                        {cardInfo.definition}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default ViewFlashCard;