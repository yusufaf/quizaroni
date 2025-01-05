import { Add } from '@mui/icons-material';
import FileUpload from 'components/FileUpload/FileUpload';
import type { Card, TODO } from 'shared/types';
import { Dispatch, SetStateAction, useState } from 'react';
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
} from '../CreateSetStyles';
import useFileUpload from 'hooks/useFileUpload';
import NewCardHeader from './NewCardHeader';
import { addCard } from 'shared/utilities/createUtils';
import { useParams } from 'react-router-dom';

type Props = {
    actionsStack: TODO[];
    card: Card;
    createdSetCards: Card[];
    index: number;
    onColorChange: (event: any, property: string, index: number) => void;
    setActionsStack: Dispatch<SetStateAction<TODO[]>>;
    setCreatedSetCards: Dispatch<SetStateAction<Card[]>>;
    updateCardValue: (index: number, property: string, value: any) => void;
};
const NewCardInput = ({
    actionsStack,
    card,
    createdSetCards,
    index,
    onColorChange,
    setActionsStack,
    setCreatedSetCards,
    updateCardValue,
}: Props) => {
    const {
        cardUUID,
        term,
        definition,
        backgroundColor = '',
        textColor = '',
    } = card;

    const { id: studysetUUID = '' } = useParams();

    const setStateCallback = setCreatedSetCards;

    const { uploadFile } = useFileUpload({
        cardUUID,
        studysetUUID,
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
            key={cardUUID}
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
                            placeholder={'Enter a term'}
                            onChange={(e) =>
                                updateCardValue(index, 'term', e.target.value)
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
                        handleFiles={(files) => uploadFile(files, 'term')}
                    />
                </NewCardRow>
                <NewCardRow>
                    <FileUpload
                        handleFiles={(files) => uploadFile(files, 'definition')}
                    />
                    <NewCardDefinition>
                        <NewCardLabel variant="subtitle1">
                            Definition
                        </NewCardLabel>
                        <NewCardInputField
                            variant="standard"
                            placeholder={'Enter a definition'}
                            onChange={(e) =>
                                updateCardValue(
                                    index,
                                    'definition',
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
                                    actionsStack,
                                    createdSetCards,
                                    index,
                                    setStateCallback,
                                    setActionsStack,
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
