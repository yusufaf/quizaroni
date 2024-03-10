import {
    KeyboardArrowLeftRounded,
    KeyboardArrowRightRounded,
    KeyboardRounded,
    SwapHoriz,
    Sync,
    UndoRounded,
    UploadFile,
} from "@mui/icons-material";
import {
    Button,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import {
    SetModificationsContainer,
    KeysToPressContainer,
} from "./CreateSetStyles";
import { handleReverse, swapAllCards } from "../../utilities/createUtils";
import { useDispatch } from "react-redux";
import { setShowImportModal } from "state/slices/createSetSlice";
import { Dispatch, MouseEvent, SetStateAction, useState } from "react";
import { Card } from "lib/types";

type Props = {
    studysetCards: Card[];
    setCardsCallback: Dispatch<SetStateAction<Card[]>>;
};

const SetModificationButtons = ({
    studysetCards = [],
    setCardsCallback = () => {},
}: Props) => {
    const dispatch = useDispatch();
    const hideButtonTextQuery = useMediaQuery(
        "only screen and (max-width:1280px)"
    );
    const [expanded, setExpanded] = useState<boolean>(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const keyboardShortcutsOpen = Boolean(anchorEl);

    const expandButtonTitle = expanded ? "Hide Buttons" : "Expand Buttons";

    const onImportClick = (_e: MouseEvent<HTMLButtonElement>) => {
        dispatch(setShowImportModal(true));
    };

    const onSwapAllClick = (_e: MouseEvent<HTMLButtonElement>) => {
        swapAllCards({
            createdSetCards: studysetCards,
            setStateCallback: setCardsCallback,
        });
    };

    const onReverseClick = (_e: MouseEvent<HTMLButtonElement>) => {
        handleReverse({
            createdSetCards: studysetCards,
            setStateCallback: setCardsCallback,
        });
    };

    const onToggleExpanded = () => {
        setExpanded(!expanded);
    };

    const handleOpenShortcutsMenu = (
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseShortcutsMenu = () => {
        setAnchorEl(null);
    };

    return (
        <SetModificationsContainer
            sx={{ gap: hideButtonTextQuery ? "0.5rem" : undefined }}
        >
            <Tooltip title="Keyboard Shortcuts">
                <IconButton onClick={handleOpenShortcutsMenu}>
                    <KeyboardRounded color="primary" fontSize="medium" />
                </IconButton>
            </Tooltip>
            <Menu
                id="keyboard-shortcuts-menu"
                anchorEl={anchorEl}
                open={keyboardShortcutsOpen}
                onClose={handleCloseShortcutsMenu}
                MenuListProps={{
                    "aria-labelledby": "basic-button",
                }}
                disableScrollLock
            >
                <MenuItem onClick={handleCloseShortcutsMenu}>
                    <ListItemIcon>
                        <UndoRounded />
                    </ListItemIcon>
                    <ListItemText>Undo</ListItemText>
                    <KeysToPressContainer>
                        <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Z</kbd>
                    </KeysToPressContainer>
                </MenuItem>
            </Menu>
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
                            <IconButton onClick={onImportClick}>
                                <UploadFile color="primary" fontSize="medium" />
                            </IconButton>
                        ) : (
                            <Button
                                variant="outlined"
                                startIcon={<UploadFile fontSize="medium" />}
                                onClick={onImportClick}
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
