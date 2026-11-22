import { useState } from 'react';
import { Popover, Typography } from '@mui/material/';
import { useTranslation } from 'react-i18next';
import { CategoryChip } from './styles';

type Props = {
    categories: string[];
};

const CategoriesPopover = ({ categories = [] }: Props) => {
    const { t } = useTranslation();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <CategoryChip
                aria-owns={open ? 'mouse-over-popover' : undefined}
                aria-haspopup="true"
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
                label={t('viewStudySet.viewCategories', {
                    count: categories.length,
                })}
                variant="outlined"
            />
            <Popover
                id="mouse-over-popover"
                sx={{
                    pointerEvents: 'none',
                    maxWidth: '70rem',
                }}
                open={open}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                <Typography sx={{ p: 2, borderRadius: '0.25rem' }}>
                    {categories.map((category) => category).join(', ')}
                </Typography>
            </Popover>
        </>
    );
};

export default CategoriesPopover;
