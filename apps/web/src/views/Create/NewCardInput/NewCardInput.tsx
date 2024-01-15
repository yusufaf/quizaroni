import {
    Add,
    AddPhotoAlternate,
    ContentCopy,
    Delete,
    FormatColorFill,
    FormatColorText,
    SwapHoriz,
} from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material/";
import {
    BoldTypography
} from "common/AppStyles";
import FileUpload from "components/FileUpload/FileUpload";
import type { ColorPickerType, TODO } from "lib/types";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useTheme } from "theme/useTheme";
import {
    addCard,
    deleteCard,
    duplicateCard,
    swapCard,
} from "utilities/createUtils";
import CustomColorPicker from "../../../components/CustomColorPicker/CustomColorPicker";
import {
    AddCardBelowButton,
    BottomActions,
    CenterActions,
    NewCard,
    NewCardDefinition,
    NewCardHeader,
    NewCardInputField,
    NewCardInputs,
    NewCardLabel,
    NewCardRow,
    NewCardTerm,
    RightActions,
} from "../CreateSetStyles";

type Props = {
    cardValues: any;
    createdSetCards: any;
    index: number;
    onColorChange: any;
    setCreatedSetCards: any;
    updateCardValue: any;
    actionsStack: TODO[];
    setActionsStack: Dispatch<SetStateAction<TODO[]>>;
};
const NewCardInput = (props: Props) => {
    const {
        index,
        updateCardValue,
        onColorChange,
        cardValues,
        createdSetCards,
        setCreatedSetCards,
        actionsStack,
        setActionsStack,
    } = props;

    const {
        term,
        definition,
        backgroundColor = "",
        textColor = "",
        uuid,
    } = cardValues;

    const setStateCallback = setCreatedSetCards;

    const { theme } = useTheme();

    const textColorButtonRef = useRef(null);
    const backgroundColorButtonRef = useRef(null);

    const [showTextColorPicker, setShowTextColorPicker] =
        useState<boolean>(false);
    const [showBackgroundColorPicker, setShowBackgroundColorPicker] =
        useState<boolean>(false);
    const [localTextColor, setLocalTextColor] = useState(textColor);
    const [localBackgroundColor, setLocalBackgroundColor] =
        useState(backgroundColor);

    const [applyTextColor, setApplyTextColor] = useState<boolean>(false);
    const [applyBackgroundColor, setApplyBackgroundColor] =
        useState<boolean>(false);

    useEffect(() => {
        if (showTextColorPicker || showBackgroundColorPicker) {
            const elements = document.querySelectorAll("[id]");
            for (const el of elements) {
                if (el.id.startsWith("rc-editable-input")) {
                    const domElement = document.getElementById(el.id);
                    // @ts-ignore
                    domElement.style.color = theme.palette.text.primary;
                    // @ts-ignore
                    domElement.style.background =
                        theme.palette.background.paper;
                    break;
                }
            }
        }
    }, [showTextColorPicker, showBackgroundColorPicker, theme]);

    const toggleBackgroundColorPicker = () => {
        setShowTextColorPicker(false);
        setShowBackgroundColorPicker(!showBackgroundColorPicker);
    };

    const toggleTextColorPicker = () => {
        setShowBackgroundColorPicker(false);
        setShowTextColorPicker(!showTextColorPicker);
    };

    const onColorPickerChange = (e, type: ColorPickerType) => {
        const localStateCallback =
            type === "textColor" ? setLocalTextColor : setLocalBackgroundColor;
        onColorChange(e, type, index);
        localStateCallback(e.hex);
    };

    const resetColor = (type: ColorPickerType) => {
        const localStateCallback =
            type === "textColor" ? setLocalTextColor : setLocalBackgroundColor;
        updateCardValue(index, type, "");
        localStateCallback("");
    };

    const toggleApplyColor = (type: ColorPickerType) => {
        if (type === "textColor") {
            setApplyTextColor(!applyTextColor);
        } else {
            setApplyBackgroundColor(!applyBackgroundColor);
        }
    };

    const colorPickerActiveStyling = {
        backgroundColor: theme.palette.action.hover,
    };

    const displayBackgroundColor = applyBackgroundColor && localBackgroundColor;
    const displayTextColor = applyTextColor && localTextColor;

    return (
        <NewCard
            raised
            key={uuid}
            sx={{
                background: displayBackgroundColor
                    ? localBackgroundColor
                    : undefined,
            }}
        >
            <NewCardHeader>
                <BoldTypography variant="h6">Card {index + 1}</BoldTypography>
                <CenterActions>
                    <Tooltip title="Change card text color" placement="top">
                        <IconButton
                            ref={textColorButtonRef}
                            onClick={toggleTextColorPicker}
                            sx={
                                showTextColorPicker
                                    ? colorPickerActiveStyling
                                    : {}
                            }
                        >
                            <FormatColorText fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                    {showTextColorPicker && (
                        <CustomColorPicker
                            applyColor={applyTextColor}
                            color={localTextColor}
                            additionalRefs={[textColorButtonRef]}
                            onClose={() => setShowTextColorPicker(false)}
                            onChange={(e) =>
                                onColorPickerChange(e, "textColor")
                            }
                            onResetColor={() => resetColor("textColor")}
                            onApplyColor={() => toggleApplyColor("textColor")}
                        />
                    )}
                    <Tooltip
                        title="Change card background color"
                        placement="top"
                    >
                        <IconButton
                            ref={backgroundColorButtonRef}
                            onClick={toggleBackgroundColorPicker}
                            sx={
                                showBackgroundColorPicker
                                    ? colorPickerActiveStyling
                                    : {}
                            }
                        >
                            <FormatColorFill fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                    {showBackgroundColorPicker && (
                        <CustomColorPicker
                            applyColor={applyBackgroundColor}
                            color={localBackgroundColor}
                            additionalRefs={[backgroundColorButtonRef]}
                            onClose={() => setShowBackgroundColorPicker(false)}
                            onChange={(e) =>
                                onColorPickerChange(e, "backgroundColor")
                            }
                            onResetColor={() => resetColor("backgroundColor")}
                            onApplyColor={() =>
                                toggleApplyColor("backgroundColor")
                            }
                            style={{
                                left: "4rem",
                            }}
                        />
                    )}
                    <Tooltip title="Swap term and definition" placement="top">
                        <IconButton
                            onClick={() =>
                                swapCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                        >
                            <SwapHoriz fontSize="medium" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicate" placement="top">
                        <IconButton
                            onClick={() =>
                                duplicateCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                        >
                            <ContentCopy />
                        </IconButton>
                    </Tooltip>
                </CenterActions>
                <RightActions>
                    <Tooltip title="Delete this card" placement="top">
                        <IconButton
                            onClick={() =>
                                deleteCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                    actionsStack,
                                    setActionsStack,
                                })
                            }
                        >
                            <Delete fontSize="medium" color="error" />
                        </IconButton>
                    </Tooltip>
                </RightActions>
            </NewCardHeader>
            <NewCardInputs>
                <NewCardRow>
                    <NewCardTerm>
                        <NewCardLabel variant="subtitle1">Term</NewCardLabel>
                        <NewCardInputField
                            variant="standard"
                            placeholder={"Enter a term"}
                            onChange={(e) =>
                                updateCardValue(index, "term", e.target.value)
                            }
                            multiline
                            maxRows={4}
                            value={term}
                            InputProps={{
                                style: {
                                    color: displayTextColor
                                        ? localTextColor
                                        : undefined,
                                },
                            }}
                        />
                    </NewCardTerm>
                    <FileUpload />
                </NewCardRow>
                <NewCardRow>
                    <FileUpload />
                    <NewCardDefinition>
                        <NewCardLabel variant="subtitle1">
                            Definition
                        </NewCardLabel>
                        <NewCardInputField
                            variant="standard"
                            placeholder={"Enter a definition"}
                            onChange={(e) =>
                                updateCardValue(
                                    index,
                                    "definition",
                                    e.target.value
                                )
                            }
                            multiline
                            maxRows={4}
                            value={definition}
                            InputProps={{
                                style: {
                                    color: displayTextColor
                                        ? localTextColor
                                        : undefined,
                                },
                            }}
                        />
                    </NewCardDefinition>
                </NewCardRow>
                <BottomActions>
                    {index !== createdSetCards.length - 1 && (
                        <AddCardBelowButton
                            onClick={() =>
                                addCard({
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                })
                            }
                            title="Add card below"
                        >
                            <Add fontSize="medium" />
                        </AddCardBelowButton>
                    )}
                </BottomActions>
            </NewCardInputs>
        </NewCard>
    );
};

export default NewCardInput;
