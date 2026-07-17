import { useState } from 'react';
import {
    Box,
    Typography,
    Checkbox,
    Button,
    FormControlLabel,
    CircularProgress,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Studyset } from 'shared/types';
import { SuggestedCard } from 'shared/ai/providers';
import { generateEmptyCard } from 'shared/utilities/createUtils';
import { useUpdateStudyset } from 'state/api/studysetsAPI';

type Props = {
    cards: SuggestedCard[];
    studyset: Studyset;
};

const SuggestedCards = ({ cards, studyset }: Props) => {
    const { t } = useTranslation('ai');
    const updateStudyset = useUpdateStudyset();
    const [selected, setSelected] = useState<boolean[]>(() =>
        cards.map(() => true)
    );
    const [added, setAdded] = useState(false);

    const toggle = (index: number) => {
        setSelected((prev) => prev.map((v, i) => (i === index ? !v : v)));
    };

    const selectedCount = selected.filter(Boolean).length;

    const handleAdd = async () => {
        const newCards = cards
            .filter((_, i) => selected[i])
            .map((c) => ({
                ...generateEmptyCard(),
                term: c.term,
                definition: c.definition,
            }));

        if (newCards.length === 0) return;

        try {
            await updateStudyset.mutateAsync({
                studysetUUID: studyset.studysetUUID,
                updates: { cards: [...studyset.cards, ...newCards] },
            });
            setAdded(true);
            toast.success(
                t('aiChat.suggestedCards.added', { count: newCards.length })
            );
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (cards.length === 0) return null;

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.5,
                mb: 1,
                bgcolor: 'background.paper',
            }}
        >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                {t('aiChat.suggestedCards.title')}
            </Typography>

            {cards.map((card, index) => (
                <FormControlLabel
                    key={index}
                    sx={{ alignItems: 'flex-start', display: 'flex', mb: 0.5 }}
                    control={
                        <Checkbox
                            size="small"
                            checked={selected[index]}
                            onChange={() => toggle(index)}
                            disabled={added}
                        />
                    }
                    label={
                        <Box>
                            <Typography variant="body2" fontWeight="bold">
                                {card.term}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {card.definition}
                            </Typography>
                        </Box>
                    }
                />
            ))}

            <Button
                variant="contained"
                size="small"
                startIcon={
                    updateStudyset.isPending ? (
                        <CircularProgress size={14} color="inherit" />
                    ) : (
                        <AddCircleOutline />
                    )
                }
                onClick={handleAdd}
                disabled={
                    added || selectedCount === 0 || updateStudyset.isPending
                }
                sx={{ mt: 1 }}
            >
                {added
                    ? t('aiChat.suggestedCards.addedShort')
                    : t('aiChat.actions.addToSet', { count: selectedCount })}
            </Button>
        </Box>
    );
};

export default SuggestedCards;
