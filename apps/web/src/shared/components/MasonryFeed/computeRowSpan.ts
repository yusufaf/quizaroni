// How many implicit grid rows a card of `height` needs. Spanning n rows covers
// n * rowUnit + (n - 1) * rowGap, so n = ceil((height + rowGap) / (rowUnit + rowGap)).
export const computeRowSpan = ({
    height,
    rowUnit,
    rowGap,
}: {
    height: number;
    rowUnit: number;
    rowGap: number;
}): number => {
    const step = rowUnit + rowGap;
    if (![height, rowUnit, rowGap].every(Number.isFinite) || step <= 0)
        return 1;
    return Math.max(1, Math.ceil((height + rowGap) / step));
};

// Track count of a resolved `grid-template-columns`. An unresolved value (one
// still containing `repeat(`, as jsdom reports it) counts as one column, so
// masonry stays off rather than guessing.
export const countGridColumns = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'none' || trimmed.includes('(')) return 1;
    return trimmed.split(/\s+/).length;
};
