import {
    Box,
    Checkbox,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material/';
import { Card } from 'shared/types';
import { useTranslation } from 'react-i18next';

// Cap the rendered rows so a large .apkg import (thousands of notes) can't
// stall the DOM with one row per card. Every card past the cap stays
// selected and is still imported — only the *preview* is truncated.
export const PREVIEW_ROW_LIMIT = 200;

type Props = {
    cards: Card[];
    selected: boolean[];
    duplicateFlags: boolean[];
    onToggle: (index: number) => void;
    onToggleAll: (next: boolean) => void;
};

const ImportPreviewTable = ({
    cards,
    selected,
    duplicateFlags,
    onToggle,
    onToggleAll,
}: Props) => {
    const { t } = useTranslation();
    const visibleCards = cards.slice(0, PREVIEW_ROW_LIMIT);
    const selectedCount = selected.filter(Boolean).length;
    const allSelected = selectedCount === cards.length && cards.length > 0;
    const someSelected = selectedCount > 0 && !allSelected;

    return (
        <Box>
            <TableContainer
                sx={{
                    maxHeight: '20rem',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '0.25rem',
                }}
            >
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    onChange={(e) =>
                                        onToggleAll(e.target.checked)
                                    }
                                    inputProps={{
                                        'aria-label': t(
                                            'create.previewSelectAll'
                                        ),
                                    }}
                                />
                            </TableCell>
                            <TableCell>{t('create.previewColTerm')}</TableCell>
                            <TableCell>
                                {t('create.previewColDefinition')}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleCards.map((card, index) => (
                            <TableRow
                                key={card.cardUUID ?? index}
                                hover
                                selected={selected[index]}
                            >
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={selected[index] ?? false}
                                        onChange={() => onToggle(index)}
                                    />
                                </TableCell>
                                <TableCell
                                    sx={{
                                        maxWidth: '12rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={card.term}
                                >
                                    {card.term}
                                    {duplicateFlags[index] && (
                                        <Chip
                                            label={t('create.previewDuplicate')}
                                            size="small"
                                            variant="outlined"
                                            sx={{ ml: '0.5rem' }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        maxWidth: '20rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    title={card.definition}
                                >
                                    {card.definition}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {cards.length > PREVIEW_ROW_LIMIT && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: '0.5rem' }}
                >
                    {t('create.previewTruncated', {
                        count: PREVIEW_ROW_LIMIT,
                        total: cards.length,
                    })}
                </Typography>
            )}
        </Box>
    );
};

export default ImportPreviewTable;
