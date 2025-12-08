import {
    IconButton,
    IconButtonProps,
    Tooltip,
    TooltipProps,
} from '@mui/material';
import { forwardRef } from 'react';

type CustomIconButtonProps = {
    iconButtonProps: IconButtonProps & {
        icon: React.ReactNode;
    };
    tooltipProps: Omit<TooltipProps, 'children'>;
};

const CustomIconButton = forwardRef<HTMLButtonElement, CustomIconButtonProps>(
    ({ iconButtonProps, tooltipProps }, ref) => {
        const { color, onClick, icon, sx: iconSx } = iconButtonProps;
        const { title, placement } = tooltipProps;

        return (
            <Tooltip title={title} placement={placement}>
                <IconButton
                    color={color}
                    onClick={onClick}
                    sx={iconSx}
                    ref={ref}
                >
                    {icon}
                </IconButton>
            </Tooltip>
        );
    }
);

CustomIconButton.displayName = 'CustomIconButton';

export default CustomIconButton;
