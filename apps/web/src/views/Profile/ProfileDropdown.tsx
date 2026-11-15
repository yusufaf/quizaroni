import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, MenuItem } from '@mui/material/';
import { isSelfHost } from 'shared/auth/backend';
import { useOptionalSession } from 'shared/auth/session/SessionProvider';
import { useTheme } from 'theme/useTheme';
import { styled } from '@mui/system';
import { useGlobalStore } from 'state/stores/global';

const ProfileDropdown = (props) => {
    const { dropdownRef, showDropdown, onClose } = props;
    const { muiTheme } = useTheme();

    const { setFeedbackDialogOpen } = useGlobalStore();
    const { t } = useTranslation('admin');
    const session = useOptionalSession();
    const isAdmin = isSelfHost() && session?.user?.role === 'admin';

    const StyledProfileLink = styled(Link)({
        textDecoration: 'none',
        color: muiTheme.palette.text.primary,
    });

    const openFeedbackDialog = () => {
        setFeedbackDialogOpen(true);
    };

    return (
        <Menu
            open={showDropdown}
            onClose={onClose}
            anchorEl={dropdownRef.current}
        >
            <MenuItem
                component={Link}
                to="/profile"
                onClick={onClose}
                sx={{
                    color: 'text.primary',
                    textDecoration: 'none',
                }}
            >
                Profile
            </MenuItem>
            {isAdmin && (
                <MenuItem
                    component={Link}
                    to="/admin"
                    onClick={onClose}
                    sx={{
                        color: 'text.primary',
                        textDecoration: 'none',
                    }}
                >
                    {t('menuItem')}
                </MenuItem>
            )}
            <MenuItem onClick={openFeedbackDialog}>Feedback</MenuItem>
        </Menu>
    );
};

export default ProfileDropdown;
