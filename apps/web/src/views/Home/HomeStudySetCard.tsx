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
import { useNavigate } from 'react-router-dom';
import { Studyset } from 'shared/types';
import { GhostLink } from 'styles/AppStyles';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import { useGetUserQuery } from 'state/api/usersAPI';
import { formatDateUsingPreferred } from 'shared/utilities/general';
import { useStudySetsStore } from 'state/stores/studysets';

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

    const navigate = useNavigate();
    const { muiTheme } = useTheme();

    const { setSelectedStudySet } = useStudySetsStore();

    const {
        data: {
            user: {
                userUUID = '',
                metadata: { preferredDateFormat },
            },
        } = DEFAULT_USER_RESPONSE,
    } = useGetUserQuery();

    const [actionsMenuOpen, setActionsMenuOpen] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const onCardClick = () => {
        setSelectedStudySet(studyset);
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
                                {formatDateUsingPreferred(
                                    createdAt,
                                    preferredDateFormat
                                )}
                            </Typography>
                        </SpacedContainer>
                        <SpacedContainer>
                            <Typography>Last Viewed</Typography>
                            <Typography>
                                {formatDateUsingPreferred(
                                    lastViewed,
                                    preferredDateFormat
                                )}
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
