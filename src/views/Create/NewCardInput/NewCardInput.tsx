import {
    Add,
} from "@mui/icons-material";
import FileUpload from "components/FileUpload/FileUpload";
import type { TODO } from "lib/types";
import { Dispatch, SetStateAction, useState } from "react";
import {
    AddCardBelowButton,
    BottomActions,
    NewCard,
    NewCardDefinition,
    NewCardInputField,
    NewCardInputs,
    NewCardLabel,
    NewCardRow,
    NewCardTerm,
} from "../CreateSetStyles";
import useFileUpload from "lib/hooks/useFileUpload";
import NewCardHeader from "./NewCardHeader";
import { useSelector } from "react-redux";
import { selectCognitoUser } from "state/slices/globalSlice";
import { addCard } from "utilities/createUtils";
import { useParams } from "react-router-dom";

type Props = {
    actionsStack: TODO[];
    cardValues: any;
    createdSetCards: any;
    index: number;
    onColorChange: any;
    setActionsStack: Dispatch<SetStateAction<TODO[]>>;
    setCreatedSetCards: any;
    updateCardValue: any;
};
const NewCardInput = (props: Props) => {
    const {
        actionsStack,
        cardValues,
        createdSetCards,
        index,
        onColorChange,
        setActionsStack,
        setCreatedSetCards,
        updateCardValue,
    } = props;

    const {
        term,
        definition,
        backgroundColor = "",
        textColor = "",
        uuid,
    } = cardValues;

    const { id: studysetUUID = "" } = useParams();

    const setStateCallback = setCreatedSetCards;

    const cognitoUser = useSelector(selectCognitoUser);
    const { uploadFile } = useFileUpload({
        studysetUUID
    });

    const [localTextColor, setLocalTextColor] = useState(textColor);
    const [localBackgroundColor, setLocalBackgroundColor] =
        useState(backgroundColor);

    const [applyTextColor, setApplyTextColor] = useState<boolean>(false);
    const [applyBackgroundColor, setApplyBackgroundColor] =
        useState<boolean>(false);
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
            <NewCardHeader
                actionsStack={actionsStack}
                setActionsStack={setActionsStack}
                applyBackgroundColor={applyBackgroundColor}
                applyTextColor={applyTextColor}
                createdSetCards={createdSetCards}
                index={index}
                localBackgroundColor={localBackgroundColor}
                localTextColor={localTextColor}
                onColorChange={onColorChange}
                setApplyBackgroundColor={setApplyBackgroundColor}
                setApplyTextColor={setApplyTextColor}
                setLocalBackgroundColor={setLocalBackgroundColor}
                setLocalTextColor={setLocalTextColor}
                setStateCallback={setStateCallback}
                updateCardValue={updateCardValue}
            />
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
                    <FileUpload 
                        handleFiles={uploadFile}
                    />
                </NewCardRow>
                <NewCardRow>
                    <FileUpload 
                        handleFiles={uploadFile}
                    />
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
