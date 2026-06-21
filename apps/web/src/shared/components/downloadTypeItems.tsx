import { MenuItem } from '@mui/material';
import { DOWNLOAD_FILE_TITLES, DOWNLOAD_FILE_TYPES } from 'shared/constants';

/**
 * Shared <MenuItem> options for download-format <Select>s.
 * Used by both DownloadSetModal and the Profile CustomizationTab.
 */
export const downloadTypeItems = Object.values(DOWNLOAD_FILE_TYPES).map(
    (value, index) => (
        <MenuItem
            key={index}
            value={value}
            title={
                DOWNLOAD_FILE_TITLES[value as keyof typeof DOWNLOAD_FILE_TITLES]
            }
        >
            {value}
        </MenuItem>
    )
);
