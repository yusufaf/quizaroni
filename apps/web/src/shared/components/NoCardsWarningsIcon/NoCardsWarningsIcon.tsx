import { ErrorOutlineRounded } from '@mui/icons-material';
import { Tooltip } from '@mui/material';

const NoCardsWarningsIcon = () => {
    return (
        <Tooltip
            title="If a studyset contains no cards for an extended period of time, it will be automatically deleted."
            placement="right"
        >
            <ErrorOutlineRounded fontSize="medium" color="error" />
        </Tooltip>
    );
};

export default NoCardsWarningsIcon;
