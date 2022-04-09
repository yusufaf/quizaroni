/* Styling */
import { useRef } from "react"
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import * as appStyles from "../../App.module.css";

import { IconButton, Tooltip, Typography } from '@mui/material/';
import { VolumeUp } from "@mui/icons-material";

const ViewFlashCard = props => {
    const { cardInfo, disableTextColor, disableBackgroundColor, index } = props;
    const { isDarkMode, theme } = useTheme();

    const timeoutRef = useRef(null);

    // TODO: Adjust to clear timeout / reset if clicked multiple times
    const handleAudioPlayback = () => {
        // if (timeoutRef.current) {
        //     clearTimeout(timeoutRef.current)
        // }
        const audio = new SpeechSynthesisUtterance();
        audio.text = cardInfo.term;
        window.speechSynthesis.speak(audio);
        // Wait half a second before speaking of definition
        timeoutRef.current = setTimeout(() => {
            audio.text = cardInfo.definition;
            window.speechSynthesis.speak(audio);
        }, 500)
        // timeoutRef.current = "";
    }

    return (
        <div className={`${viewFlashStyles.viewFlashCard} ${index === 0 ? viewFlashStyles.firstCard : ""}`}
            key={index}
            style={{
                color: theme.foreground, backgroundColor: `${cardInfo?.backgroundColor && !disableBackgroundColor ? cardInfo.backgroundColor : theme.background}`
            }}
        >
            <div className={viewFlashStyles.cardHeader}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: "bold"
                    }}
                >
                    Card {index + 1}
                </Typography>

                <div className={viewFlashStyles.cardActions}>
                    <Tooltip
                        title="Play TTS"
                        placement="top"
                    >
                        <IconButton
                            onClick={handleAudioPlayback}
                        >
                            <VolumeUp
                                sx={{
                                    color: theme.foreground
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            <div className={viewFlashStyles.viewCardContainer}>
                <div className={viewFlashStyles.viewCardTerm}>
                    <Typography
                        variant="h6"
                        sx={{
                            color: "orange"
                        }}
                    >
                        Term
                    </Typography>
                    {/* <label className={appStyles.inputLabel}>Term</label> */}
                    <span style={{
                        color: `${cardInfo?.textColor && !disableTextColor ? cardInfo.textColor : ""}`,
                    }}>
                        {cardInfo.term}
                    </span>
                </div>
                <div className={viewFlashStyles.viewCardDefinition}>
                    <Typography
                        variant="h6"
                        sx={{
                            color: "orange"
                        }}
                    >
                        Definition
                    </Typography>
                    {/* <label className={appStyles.inputLabel}>Definition</label> */}
                    <span style={{ color: `${cardInfo?.textColor && !disableTextColor ? cardInfo.textColor : ""}` }}>
                        {cardInfo.definition}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default ViewFlashCard;