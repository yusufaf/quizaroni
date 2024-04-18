import CustomIconButton from "components/CustomIconButton/CustomIconButton";
import { useTheme } from "theme/useTheme";
import { StyledDarkModeIcon, StyledLightModeIcon } from "./NavStyles";

type Props = {};

const DarkModeToggleButton = ({}: Props) => {
    const { isDarkMode, toggleDarkMode } = useTheme();

    return (
        <CustomIconButton
            iconButtonProps={{
                color: "primary",
                icon: isDarkMode ? (
                    <StyledLightModeIcon />
                ) : (
                    <StyledDarkModeIcon />
                ),
                onClick: toggleDarkMode,
                sx: {display: "flex"}
            }}
            tooltipProps={{
                title: "Toggle dark mode",
            }}
        />
    );
};

export default DarkModeToggleButton;
