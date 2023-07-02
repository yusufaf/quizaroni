import { Dispatch, SetStateAction } from "react";
import { SwapHoriz, Sync, UploadFile } from "@mui/icons-material";
import { Button } from "@mui/material";
import { SpacedFlexContainer } from "common/AppStyles";
import { handleReverse, handleSwapAll } from "./createUtils";

type Props = {
    studysetCards: any;
    setCardsCallback: any;
    setShowImportModal: Dispatch<SetStateAction<boolean>>;
};

const SetModificationButtons = (props: Props) => {
    const { studysetCards = [], setCardsCallback = () => {}, setShowImportModal } = props;

    const onSwapAllClick = (_e: any) => {
        handleSwapAll({
            createdSetCards: studysetCards,
            setStateCallback: setCardsCallback,
        });
    };

    const onReverseClick = (_e: any) => {
        handleReverse({
            createdSetCards: studysetCards,
            setStateCallback: setCardsCallback,
        });
    };

    return (
        <SpacedFlexContainer style={{ gap: "2rem" }}>
            <Button
                variant="outlined"
                startIcon={<UploadFile fontSize="medium" />}
                onClick={() => setShowImportModal(true)}
            >
                Import Cards
            </Button>
            <Button
                variant="outlined"
                startIcon={<SwapHoriz fontSize="medium" />}
                onClick={onSwapAllClick}
            >
                Swap All
            </Button>
            <Button
                variant="outlined"
                startIcon={<Sync fontSize="medium" />}
                onClick={onReverseClick}
            >
                Reverse Cards
            </Button>
        </SpacedFlexContainer>
    );
};

export default SetModificationButtons;
