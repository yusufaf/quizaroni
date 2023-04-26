import { useRef } from "react";
import { useTheme } from "../../theme/useTheme";
import { Chip, IconButton, Tooltip, Typography } from "@mui/material/";
import { Star, StarBorder, VolumeUp } from "@mui/icons-material";
import { SimpleFlexContainer } from "src/AppStyles";
import {
    ViewFlashsetCard,
    ViewFlashCardActions,
    ViewCardInfo,
    ViewCardContainer,
    CategoryChips,
} from "./ViewFlashSetStyles";
import axios from "axios";
import { Card, Studyset } from "src/lib/types";

type Props = {
    card: Card; // TODO: Type
    index: number;
    selectedStudySet: Studyset
};

const ViewFlashCard = (props: Props) => {
    const { 
        card, 
        index,
        selectedStudySet,
    } = props;

    const { isDarkMode, theme } = useTheme();
    const timeoutRef = useRef(null);

    // TODO: Adjust to clear timeout / reset if clicked multiple times
    const handleAudioPlayback = () => {
        // if (timeoutRef.current) {
        //     clearTimeout(timeoutRef.current)
        // }
        const audio = new SpeechSynthesisUtterance();
        audio.text = card.term;
        window.speechSynthesis.speak(audio);
        // Wait half a second before speaking of definition
        timeoutRef.current = setTimeout(() => {
            audio.text = card.definition;
            window.speechSynthesis.speak(audio);
        }, 500);
        // timeoutRef.current = "";
    };

    const handleMarkAsImportant = async () => {
        try {
            const { important, uuid } = card;
            const response = await axios.post(
                `/api/studysets/markCardAsImportant`,
                {
                    uuid,
                    newValue: !important,
                }
            );
            console.log({ response });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <ViewFlashsetCard
            elevation={6}
            key={index}
            style={{
                backgroundColor: `${
                    card?.backgroundColor && selectedStudySet?.metadata?.backgroundColorVisible
                        ? card.backgroundColor
                        : ""
                }`,
            }}
        >
            <SimpleFlexContainer>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: "bold",
                    }}
                >
                    Card {index + 1}
                </Typography>
                <CategoryChips>
                    {card?.categories?.map((category: any, index: number) => (
                        <Chip key={index} label={category} variant="outlined"/>
                    ))}
                </CategoryChips>

                <ViewFlashCardActions>
                    <Tooltip title="Play TTS" placement="top">
                        <IconButton onClick={handleAudioPlayback}>
                            <VolumeUp />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Mark as important" placement="top">
                        <IconButton onClick={handleMarkAsImportant}>
                            {card.important ? (
                                <Star sx={{ color: "yellow" }} />
                            ) : (
                                <StarBorder />
                            )}
                        </IconButton>
                    </Tooltip>
                </ViewFlashCardActions>
            </SimpleFlexContainer>
            <ViewCardContainer>
                <ViewCardInfo>
                    <Typography variant="h6" color="primary">
                        Term
                    </Typography>
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor && selectedStudySet?.metadata?.textColorVisible
                                    ? card.textColor
                                    : ""
                            }`,
                        }}
                    >
                        {card.term}
                    </Typography>
                    {/* TODO: Term image */}
                </ViewCardInfo>
                <ViewCardInfo>
                    <Typography variant="h6" color="primary">
                        Definition
                    </Typography>
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor && selectedStudySet?.metadata?.textColorVisible
                                    ? card.textColor
                                    : ""
                            }`,
                        }}
                    >
                        {card.definition}
                    </Typography>
                    {/* TODO: Definition image */}
                </ViewCardInfo>
            </ViewCardContainer>
        </ViewFlashsetCard>
    );
};

export default ViewFlashCard;
