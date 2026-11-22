import CustomIconButton from 'components/CustomIconButton/CustomIconButton';
import { useTheme } from 'theme/useTheme';
import { StyledDarkModeIcon, StyledLightModeIcon } from './NavStyles';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {};

const DarkModeToggleButton = ({}: Props) => {
    const { t } = useTranslation('common');
    const { isDarkMode, toggleDarkMode } = useTheme();

    const tooltipTitle = useMemo(() => {
        return isDarkMode ? t('nav.switchToLight') : t('nav.switchToDark');
    }, [isDarkMode, t]);

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
