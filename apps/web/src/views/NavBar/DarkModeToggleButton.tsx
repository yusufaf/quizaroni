import CustomIconButton from 'components/CustomIconButton/CustomIconButton';
import { useTheme } from 'theme/useTheme';
import { StyledDarkModeIcon, StyledLightModeIcon } from './NavStyles';
import { useMemo } from 'react';

type Props = {};

const DarkModeToggleButton = ({}: Props) => {
    const { isDarkMode, toggleDarkMode } = useTheme();

    const tooltipTitle = useMemo(() => {
        return isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    }, [isDarkMode]);

    return (
        <CustomIconButton
            iconButtonProps={{
                color: 'primary',
                icon: isDarkMode ? (
                    <StyledLightModeIcon />
                ) : (
                    <StyledDarkModeIcon />
                ),
                onClick: toggleDarkMode,
                sx: { display: 'flex' },
            }}
            tooltipProps={{
                title: tooltipTitle,
            }}
        />
    );
};

export default DarkModeToggleButton;
