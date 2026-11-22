import {
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    PopoverPosition,
    PopoverReference,
} from '@mui/material/';
import {
    ContentCopy as CopyIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Favorite,
    FavoriteBorder,
    OpenInNewRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Studyset } from 'shared/types';
import { STUDYSET_CONFIRM_DIALOGS } from 'shared/constants';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import { useGlobalStore } from 'state/stores/global';

type Props = {
    studyset: Studyset | null;
    open: boolean;
    onClose: () => void;
    anchorEl: any;
    anchorReference?: PopoverReference;
    anchorPosition?: PopoverPosition;
    slotProps?: any;
};

const SetActionsMenu = ({
    studyset,
    open,
    onClose,
    anchorEl,
    anchorReference,
    anchorPosition,
    slotProps,
}: Props) => {
    const { favorited = false, studysetUUID = '' } = studyset ?? {};

    const { mutate: updateStudyset } = useUpdateStudyset();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { showConfirmDialog } = useGlobalStore();

    const handleConfirmAction = (
        e: React.MouseEvent<HTMLLIElement, MouseEvent>,
        action: string
    ) => {
        e.stopPropagation();

        if (!studyset) {
            return;
        }

        showConfirmDialog({
            type: action,
            studysets: [studyset],
        });
    };

    const handleFavoriteAction = () => {
        updateStudyset({
            studysetUUID,
            updates: {
                favorited: !favorited,
            },
        });
    };

    const handleViewInNewTab = () => {
        // Doesn't seem like opening in new tab is possible with the useNavigate hook
        window.open(`${window.location.origin}/view/${studysetUUID}`);
    };

    const handleEditInNewTab = () => {
        // Doesn't seem like opening in new tab is possible with the useNavigate hook
        window.open(`${window.location.origin}/edit/${studysetUUID}`);
    };

    return (
        <Menu
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            anchorReference={anchorReference}
            anchorPosition={anchorPosition}
            slotProps={slotProps}
        >
            <MenuItem onClick={() => navigate(`/edit/${studysetUUID}`)}>
                <ListItemIcon>
                    <EditIcon />
                </ListItemIcon>
                <ListItemText>{t('buttons.edit')}</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={(e) =>
                    handleConfirmAction(e, STUDYSET_CONFIRM_DIALOGS.DUPLICATE)
                }
            >
                <ListItemIcon>
                    <CopyIcon />
                </ListItemIcon>
                <ListItemText>{t('buttons.duplicate')}</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={(e) =>
                    handleConfirmAction(e, STUDYSET_CONFIRM_DIALOGS.DELETE)
                }
            >
                <ListItemIcon>
                    <DeleteIcon color="error" />
                </ListItemIcon>
                <ListItemText>{t('buttons.delete')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleFavoriteAction}>
                <ListItemIcon>
                    {favorited ? (
                        <Favorite color="primary" />
                    ) : (
                        <FavoriteBorder />
                    )}
                </ListItemIcon>
                <ListItemText>
                    {favorited ? t('home.unfavorite') : t('home.favorite')}
                </ListItemText>
            </MenuItem>
            <MenuItem onClick={handleViewInNewTab}>
                <ListItemIcon>
                    <OpenInNewRounded />
                </ListItemIcon>
                <ListItemText>{t('home.viewInNewTab')}</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleEditInNewTab}>
                <ListItemIcon>
                    <OpenInNewRounded />
                </ListItemIcon>
                <ListItemText>{t('home.editInNewTab')}</ListItemText>
            </MenuItem>
        </Menu>
    );
};

export default SetActionsMenu;
