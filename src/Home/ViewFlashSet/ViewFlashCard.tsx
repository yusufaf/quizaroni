import { useRef } from "react"
import { useTheme } from "../../theme/useTheme";
import { IconButton, Tooltip, Typography } from '@mui/material/';
import { Star, StarBorder, VolumeUp} from "@mui/icons-material";
import { SimpleFlexContainer } from "src/AppStyles";
import { ViewFlashsetCard, ViewFlashCardActions, ViewCardInfo, ViewCardContainer } from "./ViewFlashSetStyles";

type Props = {
    cardInfo: any; // TODO: Type 
    enableTextColor: boolean;
    enableBackgroundColor: boolean;
    index: number;
}

const ViewFlashCard = (props: Props) => {
    const { 
        cardInfo, 
        enableTextColor, 
        enableBackgroundColor,
        index
    } = props;
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
        <ViewFlashsetCard
            elevation={6}
            key={index}
            style={{
                backgroundColor: `${cardInfo?.backgroundColor && enableBackgroundColor ? cardInfo.backgroundColor : ""}`,
            }}
        >
            <SimpleFlexContainer>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: "bold"
                    }}
                >
                    Card {index + 1}
                </Typography>

                <ViewFlashCardActions>
                    <Tooltip
                        title="Play TTS"
                        placement="top"
                    >
                        <IconButton
                            onClick={handleAudioPlayback}
                        >
                            <VolumeUp/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        title="Mark as important"
                        placement="top"
                    >
                        <IconButton
                            onClick={() => alert("Not implemented yet")}
                        >
                             <StarBorder/>
                        </IconButton>
                    </Tooltip>
                </ViewFlashCardActions>
            </SimpleFlexContainer>
            <ViewCardContainer>
                <ViewCardInfo>
                    <Typography
                        variant="h6"
                        color="primary"
                    >
                        Term
                    </Typography>
                    <Typography
                        sx={{
                            color: `${cardInfo?.textColor && enableTextColor ? cardInfo.textColor : ""}`,
                        }}
                    >
                        {cardInfo.term}
                    </Typography>
                    {/* TODO: Term image */}
                </ViewCardInfo>
                <ViewCardInfo>
                    <Typography
                        variant="h6"
                        color="primary"
                    >
                        Definition
                    </Typography>
                    <Typography
                        sx={{
                            color: `${cardInfo?.textColor && enableTextColor ? cardInfo.textColor : ""}`,
                        }}
                    >
                        {cardInfo.definition}
                    </Typography>
                    {/* TODO: Definition image */}
                </ViewCardInfo>
            </ViewCardContainer>
        </ViewFlashsetCard>
    )
}

export default ViewFlashCard;