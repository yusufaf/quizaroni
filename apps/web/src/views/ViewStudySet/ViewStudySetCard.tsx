import { useRef } from "react";
import { useTheme } from "theme/useTheme";
import { Chip, IconButton, Tooltip, Typography } from "@mui/material/";
import { Star, StarBorder, VolumeUp } from "@mui/icons-material";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import {
    ViewFlashsetCard,
    ViewFlashCardActions,
    ViewCardInfo,
    ViewCardContainer,
    CategoryChips,
} from "./styles";
import { Card, Studyset } from "lib/types";
import { useMarkCardAsImportantMutation } from "state/api/studysets";
import {
    DEFAULT_TERMINOLOGY,
    STUDYSET_TERMINOLOGIES,
} from "utilities/constants";

type Props = {
    card: Card;
    index: number;
    selectedStudyset: Studyset;
};

const ViewStudySetCard = (props: Props) => {
    const { card, index, selectedStudyset } = props;

    const { isDarkMode, theme } = useTheme();
    const timeoutRef = useRef(null);

    const selectedTerminology =
        selectedStudyset?.metadata?.terminology ?? DEFAULT_TERMINOLOGY;
    const [terminology1, terminology2] =
        selectedTerminology === STUDYSET_TERMINOLOGIES.CUSTOM
            ? selectedStudyset?.metadata?.customTerminology?.split("/") ?? []
            : selectedTerminology.split("/");

    const [markCardAsImportant] = useMarkCardAsImportantMutation();

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
        markCardAsImportant({
            cardUUID: card.uuid ?? "",
            newValue: !card.important,
        });
    };

    return (
        <ViewFlashsetCard
            elevation={6}
            key={index}
            style={{
                backgroundColor: `${
                    card?.backgroundColor &&
                    selectedStudyset?.metadata?.backgroundColorVisible
                        ? card.backgroundColor
                        : ""
                }`,
            }}
            tabIndex={index}
        >
            <SimpleFlexContainer>
                <BoldTypography variant="h5">Card {index + 1}</BoldTypography>
                {/* TODO: Handle when there's too many categories, max width or a tooltip on a singular one? */}
                <CategoryChips>
                    {card?.categories?.map(
                        (category: string, index: number) => (
                            <Chip
                                key={index}
                                label={category}
                                variant="outlined"
                            />
                        )
                    )}
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
                        {terminology1 ?? "Term"}
                    </Typography>
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor &&
                                selectedStudyset?.metadata?.textColorVisible
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
                        {terminology2 ?? "Definition"}
                    </Typography>
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor &&
                                selectedStudyset?.metadata?.textColorVisible
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

export default ViewStudySetCard;
