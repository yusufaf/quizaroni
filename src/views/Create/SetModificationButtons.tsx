import { SwapHoriz, Sync, UploadFile } from "@mui/icons-material";
import { Button, IconButton, Tooltip, useMediaQuery } from "@mui/material";
import { SetModificationsContainer } from "./CreateSetStyles";
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
    const hideButtonTextQuery = useMediaQuery(
        "only screen and (max-width:1180px)"
    );

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
        <SetModificationsContainer sx={{gap: hideButtonTextQuery ? "0.5rem" : undefined}}>
            <Tooltip title="Import Cards">
                {hideButtonTextQuery ? (
                    <IconButton
                        onClick={() => dispatch(setShowImportModal(true))}
                    >
                        <UploadFile color="primary" fontSize="medium" />
                    </IconButton>
                ) : (
                    <Button
                        variant="outlined"
                        startIcon={<UploadFile fontSize="medium" />}
                        onClick={() => dispatch(setShowImportModal(true))}
                    >
                        Import Cards
                    </Button>
                )}
            </Tooltip>
            <Tooltip title="Swap All">
                {hideButtonTextQuery ? (
                    <IconButton onClick={onSwapAllClick}>
                        <SwapHoriz color="primary" fontSize="medium" />
                    </IconButton>
                ) : (
                    <Button
                        variant="outlined"
                        startIcon={<SwapHoriz fontSize="medium" />}
                        onClick={onSwapAllClick}
                    >
                        Swap All
                    </Button>
                )}
            </Tooltip>
            <Tooltip title="Reverse Cards">
                {hideButtonTextQuery ? (
                    <IconButton onClick={onReverseClick}>
                        <Sync color="primary" fontSize="medium" />
                    </IconButton>
                ) : (
                    <Button
                        variant="outlined"
                        startIcon={<Sync fontSize="medium" />}
                        onClick={onReverseClick}
                    >
                        Reverse Cards
                    </Button>
                )}
            </Tooltip>
        </SetModificationsContainer>
    );
};

export default SetModificationButtons;
