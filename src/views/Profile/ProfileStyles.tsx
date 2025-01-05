import {
    Button,
    Card,
    DialogActions,
    DialogContent,
    IconButton,
    Paper,
    styled,
    Tab,
    Typography,
} from '@mui/material';
import { BasePage, FlexColumn } from 'styles/AppStyles';

export const ProfilePage = styled(BasePage)({
    display: 'grid',
    gridTemplateColumns: 'auto 2fr',
    padding: '0 2rem 2rem 2rem',
    gap: '4rem',
});

export const ProfileContainer = styled(FlexColumn)({
    alignItems: 'flex-start',
    gap: '1.25rem',
    borderRadius: '0.75rem',
    padding: '1.25rem',
});

export const ProfilePaper = styled(Paper)({});

export const InfoChangeContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});

export const PasswordFieldsContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});

export const AccountViewContainer = styled(FlexColumn)({
    alignItems: 'flex-start',
    gap: '1rem',
    width: '100%',
});

export const ActionSection = styled(FlexColumn)({
    gap: '0.5rem',
    width: '25%',
});

export const ActionHeader = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
});

export const ActionSubmitButton = styled(Button)({
    width: '50%',
});

/* Profile Card Styles */

export const StyledProfileCard = styled(Card)({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    borderRadius: '0.75rem',
    padding: '1.25rem',
});

export const ProfilePicture = styled('div')({
    position: 'relative',
    display: 'flex',
    alignSelf: 'center',
    height: '10rem',
    width: '10rem',
    background: 'grey',
    borderRadius: '50%',
});

export const UserInfoContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});

export const UserInfoHeading = styled(Typography)({
    fontSize: '1.25rem',
    fontWeight: 'bold',
});

export const UploadImageButton = styled(IconButton)({
    position: 'absolute',
    left: '9rem',
    cursor: 'pointer',
});

export const ProfileTab = styled(Tab)(({ theme }) => ({
    color: theme.palette.text.primary,
    fontSize: '1rem',
    fontWeight: 'bold',
    textTransform: 'none',
}));

export const ActionColumn = styled(FlexColumn)({
    gap: '1rem',
});

export const DeleteDialogContent = styled(DialogContent)({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});
