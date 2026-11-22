import { Favorite, FavoriteBorder, MoreHoriz } from '@mui/icons-material/';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material/';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
    DEFAULT_USER_RESPONSE,
    DEFAULT_USER_DATA,
    TIME_FORMATS,
} from 'shared/constants';
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
    const { t } = useTranslation();
    const { muiTheme } = useTheme();

    const { setSelectedStudySet } = useStudySetsStore();
    const { mutate: updateStudyset } = useUpdateStudyset();

    const {
        data: {
            user: {
                userUUID = '',
                metadata: {
                    preferredDateFormat,
                    preferredTimeFormat,
                    showSeconds,
                } = DEFAULT_USER_DATA.metadata,
            } = {},
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

    const favoriteLabel = favorited ? t('home.unfavorite') : t('home.favorite');

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
                                        {t('home.untitledSet')}
                                    </span>
                                )}
                            </GhostLink>
                        </CardTitle>
                        <Tooltip title={favoriteLabel}>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <IconButton
                                    aria-label={favoriteLabel}
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
                    {username && (
                        <Typography variant="subtitle1">
                            {t('viewStudySet.createdBy', { username })}
                        </Typography>
                    )}
                    <CardDescription title={description}>
                        {description}
                    </CardDescription>
                    <CardInfo>
                        <Chip
                            label={t('home.cardCount', { count: cards.length })}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                        <SpacedContainer>
                            <Typography>{t('home.columns.created')}</Typography>
                            <Typography>
                                {formatDateUsingPreferred(
                                    createdAt,
                                    preferredDateFormat,
                                    preferredTimeFormat ??
                                        TIME_FORMATS.TWELVE_HOUR,
                                    showSeconds ?? false
                                )}
                            </Typography>
                        </SpacedContainer>
                        <SpacedContainer>
                            <Typography>
                                {t('home.columns.lastViewed')}
                            </Typography>
                            <Typography>
                                {formatDateUsingPreferred(
                                    lastViewed,
                                    preferredDateFormat,
                                    preferredTimeFormat ??
                                        TIME_FORMATS.TWELVE_HOUR,
                                    showSeconds ?? false
                                )}
                            </Typography>
                        </SpacedContainer>
                    </CardInfo>
                    <CardBottom>
                        {!labels || labels.length === 0 ? (
                            <LabelChip
                                label={t('home.noLabelsOnSet')}
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
                            aria-label={t('home.moreActions')}
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
