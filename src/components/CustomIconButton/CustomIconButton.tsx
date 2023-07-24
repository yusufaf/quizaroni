import { IconButton, IconButtonProps, Tooltip, TooltipProps } from '@mui/material';

type CustomIconButtonProps = IconButtonProps & Omit<TooltipProps, "children"> & {
    icon: React.ReactNode;
};

const CustomIconButton = (props: CustomIconButtonProps) => {
    const {
        title,
        placement,
        color,
        onClick,
        icon,
    } = props;
  
    return (
    <Tooltip title={title} placement={placement}>
      <IconButton color={color} onClick={onClick}>
        {icon}
      </IconButton>
    </Tooltip>
  );
};

export default CustomIconButton;
