import { MoreHoriz } from '@mui/icons-material/';
import { IconButton, Typography } from '@mui/material/';
import { useState } from 'react';
import { useTheme } from 'theme/useTheme';
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
} from './HomeStyles';
import SetActionsMenu from './SetActionsMenu';
import { useAppDispatch } from 'state/reduxHooks';
import { setSelectedStudySet } from 'state/slices/studysetsSlice';
import { useNavigate } from 'react-router-dom';
import { Studyset } from 'shared/types';
import { GhostLink } from 'styles/AppStyles';

type Props = {
    studyset: Studyset;
};
const HomeStudySetCard = ({ studyset }: Props) => {
    const {
        cards,
        createdAt,
        title,
        description,
        label,
        lastViewed,
        studysetUUID,
        username,
    } = studyset;

    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { muiTheme } = useTheme();

    const [actionsMenuOpen, setActionsMenuOpen] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const onCardClick = () => {
        dispatch(setSelectedStudySet(studyset));
        navigate(`/view/${studysetUUID}`);
    };

    const openActionsMenu = (
        event: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
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
                        <GhostLink to={`/view/${studysetUUID}`}>
                            {title}
                        </GhostLink>
                    </CardTitle>
                    <Typography variant="subtitle1">
                        {`Created by ${username}`}
                    </Typography>
                    <CardDescription title={description}>
                        {description}
                    </CardDescription>
                    <CardInfo>
                        <TermsLabel>{cards.length} Cards</TermsLabel>
                        <SpacedContainer>
                            <Typography>Date Created</Typography>
                            <Typography>
                                {new Date(createdAt).toLocaleDateString()}
                            </Typography>
                        </SpacedContainer>
                        <SpacedContainer>
                            <Typography>Last Viewed</Typography>
                            <Typography>
                                {new Date(lastViewed).toLocaleDateString()}
                            </Typography>
                        </SpacedContainer>
                    </CardInfo>
                    <CardBottom>
                        <LabelChip
                            label={label ? label : 'No label selected'}
                            variant="outlined"
                            color={!label ? 'error' : undefined}
                        />
                        <IconButton
                            onClick={(e) => {
                                e.stopPropagation();
                                openActionsMenu(e);
                            }}
                            sx={{
                                background: actionsMenuOpen
                                    ? muiTheme.palette.action.selected
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
            />
        </>
    );
};

export default HomeStudySetCard;
