import { Favorite, FavoriteBorder, MoreHoriz } from '@mui/icons-material/';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material/';
import { useState } from 'react';
import { motion } from 'framer-motion';
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
import { useGetUser } from 'state/api/usersAPI';
import { formatDateUsingPreferred } from 'shared/utilities/general';
import { useStudySetsStore } from 'state/stores/studysets';
import { useUpdateStudyset } from 'state/api/studysetsAPI';

type Props = {
    studyset: Studyset;
};
const HomeStudySetCard = ({ studyset }: Props) => {
    const {
        cards,
        createdAt,
        title,
        description,
        labels,
        lastViewed,
        studysetUUID,
        username,
        favorited,
    } = studyset;

    const navigate = useNavigate();
    const { muiTheme } = useTheme();

    const { setSelectedStudySet } = useStudySetsStore();
    const { mutate: updateStudyset } = useUpdateStudyset();

    const {
        data: {
            user: {
                userUUID = '',
                metadata: { preferredDateFormat },
            },
        } = DEFAULT_USER_RESPONSE,
    } = useGetUser();

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

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateStudyset({
            studysetUUID,
            updates: {
                favorited: !favorited,
            },
        });
    };

    return (
        <>
            <HomeSetCard raised onClick={onCardClick}>
                <CardContent>
                    <SpacedContainer>
                        <CardTitle title={title} variant="h6">
                            <GhostLink to={`/view/${studysetUUID}`}>
                                {title || (
                                    <span style={{ opacity: 0.5 }}>
                                        Untitled Set
                                    </span>
                                )}
                            </GhostLink>
                        </CardTitle>
                        <Tooltip title={favorited ? 'Unfavorite' : 'Favorite'}>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <IconButton
                                    onClick={handleFavoriteClick}
                                    size="small"
                                    sx={{
                                        color: favorited
                                            ? muiTheme.palette.primary.main
                                            : undefined,
                                    }}
                                >
                                    {favorited ? (
                                        <Favorite />
                                    ) : (
                                        <FavoriteBorder />
                                    )}
                                </IconButton>
                            </motion.div>
                        </Tooltip>
                    </SpacedContainer>
                    <Typography variant="subtitle1">
                        {`Created by ${username}`}
                    </Typography>
                    <CardDescription title={description}>
                        {description}
                    </CardDescription>
                    <CardInfo>
                        <Chip
                            label={`${cards.length} Card${cards.length !== 1 ? 's' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                        <SpacedContainer>
                            <Typography>Created</Typography>
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
                        {labels.length === 0 ? (
                            <LabelChip
                                label="No labels"
                                variant="outlined"
                                color="error"
                                size="small"
                            />
                        ) : labels.length > 3 ? (
                            <>
                                {labels.slice(0, 3).map((label, idx) => (
                                    <LabelChip
                                        key={idx}
                                        label={label}
                                        variant="outlined"
                                        size="small"
                                    />
                                ))}
                                <Tooltip title={labels.slice(3).join(', ')}>
                                    <LabelChip
                                        label={`+${labels.length - 3}`}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Tooltip>
                            </>
                        ) : (
                            labels.map((label, idx) => (
                                <LabelChip
                                    key={idx}
                                    label={label}
                                    variant="outlined"
                                    size="small"
                                />
                            ))
                        )}
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
