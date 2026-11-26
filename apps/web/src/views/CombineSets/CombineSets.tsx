import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    IconButton,
    Typography,
    CircularProgress,
    TextField,
    InputAdornment,
    FormControlLabel,
    Switch,
    Paper,
} from '@mui/material';
import { Add, Remove, ArrowBack, MergeType, Search } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useGetAllStudysets, useCreateStudyset } from 'state/api/studysetsAPI';
import { Studyset } from 'shared/types';
import {
    CombineSetsContainer,
    CombineSetsHeader,
    ColumnContainer,
    SetItem,
    ScrollableList,
} from './styles';
import useBrowserTitle from 'hooks/useBrowserTitle';
import { BoldTypography, SpacedFlexContainer } from 'styles/AppStyles';
import { randomUUID } from 'shared/utilities/uuid';

const CombineSets = () => {
    const { id: baseSetUUID = '' } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    useBrowserTitle(t('combineSets.pageTitle'));

    const { data: studysetsResponse } = useGetAllStudysets();
    const allSets = studysetsResponse?.studysets ?? [];

    const { mutateAsync: createStudyset } = useCreateStudyset();

    const [combinedSets, setCombinedSets] = useState<Studyset[]>([]);
    const [availableSets, setAvailableSets] = useState<Studyset[]>([]);
    const [isCombining, setIsCombining] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [customTitle, setCustomTitle] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [shuffleCards, setShuffleCards] = useState(false);
    const [keepCategories, setKeepCategories] = useState(true);
    const [keepImportant, setKeepImportant] = useState(true);

    const defaultTitle =
        combinedSets.length > 0
            ? t('combineSets.defaultTitleFromSets', {
                  titles: combinedSets.map((s) => s.title).join(' + '),
              })
            : t('combineSets.defaultTitle');
    const defaultDescription =
        combinedSets.length > 0
            ? t('combineSets.defaultDescription', {
                  titles: combinedSets.map((s) => s.title).join(', '),
              })
            : '';

    const filteredAvailableSets = availableSets.filter((set) =>
        set.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (allSets.length > 0) {
            const baseSet = allSets.find((s) => s.studysetUUID === baseSetUUID);
            if (baseSet) {
                setCombinedSets([baseSet]);
                setAvailableSets(allSets.filter((s) => s !== baseSet));
            } else {
                setAvailableSets(allSets);
            }
        }
    }, [allSets, baseSetUUID]);

    const handleAdd = (set: Studyset) => {
        setCombinedSets([...combinedSets, set]);
        setAvailableSets(
            availableSets.filter((s) => s.studysetUUID !== set.studysetUUID)
        );
    };

    const handleRemove = (set: Studyset) => {
        setAvailableSets([set, ...availableSets]);
        setCombinedSets(
            combinedSets.filter((s) => s.studysetUUID !== set.studysetUUID)
        );
    };

    const handleGo = async () => {
        if (combinedSets.length < 2) return;
        setIsCombining(true);
        try {
            const newUUID = randomUUID();

            let allCards: any[] = [];
            combinedSets.forEach((set) => {
                if (set.cards) {
                    allCards = [...allCards, ...set.cards];
                }
            });

            if (shuffleCards) {
                for (let i = allCards.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
                }
            }

            const cleanedCards = allCards.map((c) => {
                const { cardUUID, categories, important, ...rest } = c;
                return {
                    ...rest,
                    categories: keepCategories ? categories || [] : [],
                    important: keepImportant ? important || false : false,
                    cardUUID: randomUUID(),
                    studysetUUID: newUUID,
                };
            });

            const finalTitle = customTitle.trim() || defaultTitle;
            const finalDescription =
                customDescription.trim() || defaultDescription;
            const combinedLabels = keepCategories
                ? Array.from(
                      new Set(combinedSets.flatMap((s) => s.labels || []))
                  )
                : [];
            const baseMetadata = combinedSets[0]?.metadata || {};

            // One request, so a failure can't leave an empty set behind (#223).
            const res = await createStudyset({
                studysetUUID: newUUID,
                title: finalTitle.substring(0, 100),
                cards: cleanedCards,
                description: finalDescription,
                labels: combinedLabels,
                metadata: baseMetadata,
            });
            if (res?.studyset?.studysetUUID !== newUUID) {
                throw new Error('Combine: create returned a different set');
            }
            navigate(`/view/${newUUID}`);
        } catch (e) {
            console.error(e);
            toast.error(t('combineSets.failed'), {
                position: toast.POSITION.BOTTOM_LEFT,
                toastId: 'combineSets:failed',
            });
            setIsCombining(false);
        }
    };

    const totalCards = combinedSets.reduce(
        (sum, set) => sum + (set.cards?.length || 0),
        0
    );

    return (
        <CombineSetsContainer>
            <CombineSetsHeader>
                <SpacedFlexContainer>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                        }}
                    >
                        <IconButton
                            onClick={() => navigate(-1)}
                            color="primary"
                            aria-label={t('combineSets.goBack')}
                        >
                            <ArrowBack />
                        </IconButton>
                        <Box>
                            <BoldTypography variant="h4">
                                {t('combineSets.title')}
                            </BoldTypography>
                            <Typography
                                variant="subtitle1"
                                color="text.secondary"
                            >
                                {t('combineSets.summary', {
                                    sets: t('combineSets.setCount', {
                                        count: combinedSets.length,
                                    }),
                                    cards: t('combineSets.cardCount', {
                                        count: totalCards,
                                    }),
                                })}
                            </Typography>
                        </Box>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleGo}
                        disabled={combinedSets.length < 2 || isCombining}
                        startIcon={
                            isCombining ? (
                                <CircularProgress size={20} />
                            ) : (
                                <MergeType />
                            )
                        }
                    >
                        {t('combineSets.combineAndGo')}
                    </Button>
                </SpacedFlexContainer>
            </CombineSetsHeader>

            <Box
                sx={{
                    display: 'flex',
                    gap: '2rem',
                    mt: '2rem',
                    flexDirection: { xs: 'column', md: 'row' },
                }}
            >
                <ColumnContainer>
                    <BoldTypography variant="h6" sx={{ mb: 2 }}>
                        {t('combineSets.currentlyCombining')}
                    </BoldTypography>
                    <ScrollableList>
                        {combinedSets.map((set) => (
                            <SetItem key={set.studysetUUID} elevation={2}>
                                <Box>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {t('combineSets.cardCount', {
                                            count: set.cards?.length || 0,
                                        })}
                                    </Typography>
                                    <BoldTypography variant="body1">
                                        {set.title}
                                    </BoldTypography>
                                </Box>
                                <IconButton
                                    onClick={() => handleRemove(set)}
                                    aria-label={t('combineSets.removeSet', {
                                        title: set.title,
                                    })}
                                    disabled={
                                        combinedSets.length === 1 &&
                                        set.studysetUUID === baseSetUUID
                                    }
                                >
                                    <Remove />
                                </IconButton>
                            </SetItem>
                        ))}
                    </ScrollableList>

                    <BoldTypography variant="h6" sx={{ mb: 1, mt: 2 }}>
                        {t('combineSets.combineOptions')}
                    </BoldTypography>
                    <Paper
                        sx={{
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                        }}
                        elevation={2}
                    >
                        <TextField
                            label={t('combineSets.titleLabel')}
                            fullWidth
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder={defaultTitle}
                            variant="outlined"
                        />
                        <TextField
                            label={t('labels.description')}
                            fullWidth
                            multiline
                            rows={2}
                            value={customDescription}
                            onChange={(e) =>
                                setCustomDescription(e.target.value)
                            }
                            placeholder={defaultDescription}
                            variant="outlined"
                        />
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={shuffleCards}
                                        onChange={(e) =>
                                            setShuffleCards(e.target.checked)
                                        }
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body1">
                                        {t('combineSets.shuffleCards')}
                                    </Typography>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={keepCategories}
                                        onChange={(e) =>
                                            setKeepCategories(e.target.checked)
                                        }
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body1">
                                        {t('combineSets.keepCategories')}
                                    </Typography>
                                }
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={keepImportant}
                                        onChange={(e) =>
                                            setKeepImportant(e.target.checked)
                                        }
                                        color="primary"
                                    />
                                }
                                label={
                                    <Typography variant="body1">
                                        {t('combineSets.keepImportant')}
                                    </Typography>
                                }
                            />
                        </Box>
                    </Paper>
                </ColumnContainer>

                <ColumnContainer>
                    <SpacedFlexContainer sx={{ mb: 2 }}>
                        <BoldTypography variant="h6">
                            {t('combineSets.yourSets')}
                        </BoldTypography>
                        <Typography variant="body2" color="text.secondary">
                            {t('combineSets.setCount', {
                                count: filteredAvailableSets.length,
                            })}
                        </Typography>
                    </SpacedFlexContainer>

                    <TextField
                        fullWidth
                        size="small"
                        placeholder={t('combineSets.searchPlaceholder')}
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ mb: 2 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />

                    <ScrollableList>
                        {filteredAvailableSets.length === 0 ? (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ p: 2, textAlign: 'center' }}
                            >
                                {t('combineSets.noMatches', { searchTerm })}
                            </Typography>
                        ) : (
                            filteredAvailableSets.map((set) => (
                                <SetItem key={set.studysetUUID} elevation={2}>
                                    <Box>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {t('combineSets.cardCount', {
                                                count: set.cards?.length || 0,
                                            })}
                                        </Typography>
                                        <BoldTypography variant="body1">
                                            {set.title}
                                        </BoldTypography>
                                    </Box>
                                    <IconButton
                                        onClick={() => handleAdd(set)}
                                        color="primary"
                                        aria-label={t('combineSets.addSet', {
                                            title: set.title,
                                        })}
                                    >
                                        <Add />
                                    </IconButton>
                                </SetItem>
                            ))
                        )}
                    </ScrollableList>
                </ColumnContainer>
            </Box>
        </CombineSetsContainer>
    );
};

export default CombineSets;
