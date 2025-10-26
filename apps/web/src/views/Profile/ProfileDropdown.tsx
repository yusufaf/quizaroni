import { Link } from 'react-router-dom';
import { Menu, MenuItem } from '@mui/material/';
import { useTheme } from 'theme/useTheme';
import { styled } from '@mui/system';
import { useGlobalStore } from 'state/stores/global';

const ProfileDropdown = (props) => {
    const { dropdownRef, showDropdown, onClose } = props;
    const { muiTheme } = useTheme();

    const { setDialogOpen } = useGlobalStore();

    const StyledProfileLink = styled(Link)({
        fontSize: '1.25rem',
        textDecoration: 'none',
        color: muiTheme.palette.text.primary,
    });

    const openFeedbackDialog = () => {
        setDialogOpen(true);
    };

    return (
        <Menu
            open={showDropdown}
            onClose={onClose}
            anchorEl={dropdownRef.current}
        >
            <MenuItem onClick={onClose}>
                <StyledProfileLink to="/profile">Profile</StyledProfileLink>
            </MenuItem>
            <MenuItem onClick={openFeedbackDialog}>Feedback</MenuItem>
        </Menu>
    );
};

export default ProfileDropdown;
