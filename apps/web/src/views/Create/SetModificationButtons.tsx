import {
    KeyboardArrowLeftRounded,
    KeyboardArrowRightRounded,
    SwapHoriz,
    Sync,
    UploadFile,
} from "@mui/icons-material";
import { Button, IconButton, Tooltip, useMediaQuery } from "@mui/material";
import { SetModificationsContainer } from "./CreateSetStyles";
import { handleReverse, swapAllCards } from "../../utilities/createUtils";
import { useDispatch } from "react-redux";
import { setShowImportModal } from "state/slices/createSetSlice";
import { useState } from "react";

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
    const [expanded, setExpanded] = useState<boolean>(false);

    const expandButtonTitle = expanded ? "Hide Buttons" : "Expand Buttons";

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

    const onToggleExpanded = () => {
        setExpanded(!expanded);
    };

    return (
        <SetModificationsContainer
            sx={{ gap: hideButtonTextQuery ? "0.5rem" : undefined }}
        >
            <IconButton
                onClick={onToggleExpanded}
                title={`${expandButtonTitle}`}
            >
                {expanded ? (
                    <KeyboardArrowLeftRounded fontSize="medium" />
                ) : (
                    <KeyboardArrowRightRounded fontSize="medium" />
                )}
            </IconButton>
            {expanded && (
                <>
                    <Tooltip title="Import Cards">
                        {hideButtonTextQuery ? (
                            <IconButton
                                onClick={() =>
                                    dispatch(setShowImportModal(true))
                                }
                            >
                                <UploadFile color="primary" fontSize="medium" />
                            </IconButton>
                        ) : (
                            <Button
                                variant="outlined"
                                startIcon={<UploadFile fontSize="medium" />}
                                onClick={() =>
                                    dispatch(setShowImportModal(true))
                                }
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
                </>
            )}
        </SetModificationsContainer>
    );
};

export default SetModificationButtons;
