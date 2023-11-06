import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useTheme } from "theme/useTheme";
import { IconButton, Popover, Tooltip, Typography } from "@mui/material/";
import { SpeakerNotes, Star, StarBorder, VolumeUp } from "@mui/icons-material";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import {
    ViewFlashsetCard,
    ViewFlashCardActions,
    ViewCardInfo,
    ViewCardContainer,
    CategoryChips,
    CategoryChip,
} from "./styles";
import { Card, OpenCardNotes, Studyset, UUID } from "lib/types";
import { useMarkCardAsImportantMutation } from "state/api/studysetsAPI";
import {
    DEFAULT_TERMINOLOGY,
    FORMAT_TERMINOLOGIES,
    LABEL_TERMINOLOGIES,
} from "utilities/constants";
import useSpeechSynthesis from "lib/hooks/useSpeechSynthesis";

type Props = {
    card: Card;
    index: number;
    selectedStudyset: Studyset;
};

const ViewStudySetCard = (props: Props) => {
    const { card, index, selectedStudyset } = props;

    const { isDarkMode, theme } = useTheme();
    const { speak, cancel } = useSpeechSynthesis();

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const timeoutRef = useRef(null);

    const { categories = [] } = card;

    const selectedTerminology =
        selectedStudyset?.metadata?.terminology ?? DEFAULT_TERMINOLOGY;
    const [terminology1, terminology2] =
        selectedTerminology === FORMAT_TERMINOLOGIES.CUSTOM
            ? selectedStudyset?.metadata?.customTerminology?.split("/") ?? []
            : selectedTerminology.split("/");
    const selectedLabelTerminology =
        selectedStudyset?.metadata?.labelTerminology ??
        LABEL_TERMINOLOGIES.CARD;
    const labelTerminology =
        selectedLabelTerminology === LABEL_TERMINOLOGIES.CUSTOM
            ? selectedStudyset?.metadata?.customLabelTerminology ?? ""
            : selectedLabelTerminology;

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

    /**
     * Marks a card as important, making an API call to do so
     * @returns {void}
     */
    const handleMarkAsImportant = async () => {
        await markCardAsImportant({
            studysetUUID: selectedStudyset.uuid,
            cardUUID: card.uuid ?? "",
            newValue: !card.important,
        });
    };

    /* ==== Categories Popover ==== */
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };
  
    const handlePopoverClose = () => {
      setAnchorEl(null);
    };
  
    const open = Boolean(anchorEl);

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
                <BoldTypography variant="h5">
                    {labelTerminology} {index + 1}
                </BoldTypography>
                <CategoryChips>
                    {categories.length > 3 ? (
                        <>
                            <CategoryChip
                                aria-owns={open ? 'mouse-over-popover' : undefined}
                                aria-haspopup="true"
                                onMouseEnter={handlePopoverOpen}
                                onMouseLeave={handlePopoverClose}
                                label={`View ${categories.length} Categories`}
                                variant="outlined"
                            />
                            <Popover
                                id="mouse-over-popover"
                                sx={{
                                    pointerEvents: "none",
                                    maxWidth: "70rem",
                                }}
                                open={open}
                                anchorEl={anchorEl}
                                anchorOrigin={{
                                    vertical: "top",
                                    horizontal: "right",
                                }}
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "left",
                                }}
                                onClose={handlePopoverClose}
                                disableRestoreFocus
                            >
                                <Typography sx={{ p: 2, borderRadius: "0.25rem" }}>
                                    {categories.map((category) => category).join(", ")}
                                </Typography>
                            </Popover>
                        </>
                    ) : (
                        <>
                            {categories.map(
                                (category: string, index: number) => (
                                    <CategoryChip
                                        key={index}
                                        label={category}
                                        variant="outlined"
                                        title={category}
                                    />
                                )
                            )}
                        </>
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
                                <Star
                                    sx={{ color: theme.palette.other.gold }}
                                />
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
