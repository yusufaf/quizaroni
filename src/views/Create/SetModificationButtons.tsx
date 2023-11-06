import { SwapHoriz, Sync, UploadFile } from "@mui/icons-material";
import { Button } from "@mui/material";
import { SetModificationsContainer } from "./createSetStyles";
import { handleReverse, swapAllCards } from "../../utilities/createUtils";
import { useDispatch } from "react-redux";
import { setShowImportModal } from "state/slices/createSetSlice";

type Props = {
    studysetCards: any;
    setCardsCallback: any;
};

const SetModificationButtons = (props: Props) => {
    const { studysetCards = [], setCardsCallback = () => {} } = props;

    const dispatch = useDispatch();
    
    const onSwapAllClick = (_e: any) => {
        swapAllCards({
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
        <SetModificationsContainer>
            <Button
                variant="outlined"
                startIcon={<UploadFile fontSize="medium" />}
                onClick={() => dispatch(setShowImportModal(true))}
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
        </SetModificationsContainer>
    );
};

export default SetModificationButtons;
