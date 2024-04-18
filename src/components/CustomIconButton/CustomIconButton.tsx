import {
    IconButton,
    IconButtonProps,
    Tooltip,
    TooltipProps,
} from "@mui/material";

type CustomIconButtonProps = {
    iconButtonProps: IconButtonProps & {
        icon: React.ReactNode;
    };
    tooltipProps: Omit<TooltipProps, "children">;
};

const CustomIconButton = ({
    iconButtonProps,
    tooltipProps,
}: CustomIconButtonProps) => {
    const { color, onClick, icon, sx: iconSx } = iconButtonProps;
    const { title, placement } = tooltipProps;

    return (
        <Tooltip title={title} placement={placement}>
            <IconButton color={color} onClick={onClick} sx={iconSx}>
                {icon}
            </IconButton>
        </Tooltip>
    );
};

export default CustomIconButton;