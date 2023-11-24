import { MoreHoriz } from "@mui/icons-material/";
import { IconButton, Typography } from "@mui/material/";
import { useState } from "react";
import ConfirmDialog from "components/ConfirmDialog/ConfirmDialog";
import { useTheme } from "theme/useTheme";
import {
    CardBottom,
    CardContent,
    CardDescription,
    CardInfo,
    CardTitle,
    HomeSetCard,
    LabelChip,
    SpacedContainer,
    TermsLabel,
} from "../HomeStyles";
import SetActionsMenu from "../SetActionsMenu";
import { useDispatch } from "react-redux";
import { setSelectedStudySet } from "state/slices/studysetsSlice";
import { useNavigate } from "react-router-dom";
import { Studyset } from "lib/types";

type Props = {
    studyset: Studyset;
    handleShowConfirmDialog: any;
};

const HomeStudySetCard = (props: Props) => {
    const { studyset, handleShowConfirmDialog } = props;

    const {
        cards,
        createdAt,
        title,
        description,
        label,
        lastViewed,
        uuid,
        username,
    } = studyset;

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const onCardClick = () => {
        dispatch(setSelectedStudySet(studyset));
        navigate(`/view/${uuid}`);
    };

    const openActionsMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setActionsMenuOpen(true);
    };

    const closeActionsMenu = () => {
        setAnchorEl(null);
        setActionsMenuOpen(false);
    };

    return (
        <>
            <HomeSetCard raised onClick={onCardClick}>
                <CardContent>
                    <CardTitle title={title} variant="h6">
                        {title}
                    </CardTitle>
                    <Typography variant="subtitle1">
                        {`Created by ${username}`}
                    </Typography>
                    <CardDescription title={description}>
                        {description}
                    </CardDescription>
                    <CardInfo>
                        <TermsLabel>{cards.length} Terms</TermsLabel>
                        <SpacedContainer>
                            <Typography>Date Created</Typography>
                            <Typography>
                                {new Date(createdAt).toLocaleDateString()}
                            </Typography>
                        </SpacedContainer>
                        <SpacedContainer>
                            <Typography>Last viewed</Typography>
                            <Typography>
                                {new Date(lastViewed).toLocaleDateString()}
                            </Typography>
                        </SpacedContainer>
                    </CardInfo>
                    <CardBottom>
                        <LabelChip
                            label={label ? label : "No label selected"}
                            variant="outlined"
                            color={!label ? "error" : undefined}
                        />
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation();
                                openActionsMenu(e);
                            }}
                            sx={{
                                background: actionsMenuOpen
                                    ? theme.palette.action.selected
                                    : undefined,
                            }}
                        >
                            <MoreHoriz />
                        </IconButton>
                    </CardBottom>
                </CardContent>
            </HomeSetCard>
            <SetActionsMenu
                studyset={studyset}
                open={actionsMenuOpen}
                onClose={closeActionsMenu}
                anchorEl={anchorEl}
                handleShowConfirmDialog={handleShowConfirmDialog}
            />
            <ConfirmDialog />
        </>
    );
};

export default HomeStudySetCard;
