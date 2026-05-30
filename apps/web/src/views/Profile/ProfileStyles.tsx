import {
    Button,
    Card,
    DialogActions,
    DialogContent,
    IconButton,
    Paper,
    Select,
    styled,
    Tab,
    Typography,
} from '@mui/material';
import { BasePage, FlexColumn } from 'styles/AppStyles';

export const ProfilePage = styled(BasePage)({
    display: 'grid',
    gridTemplateColumns: 'auto 2fr',
    gridTemplateRows: '1fr',
    padding: '1.5rem 3rem 7rem 3rem',
    gap: '3rem',
    minHeight: 'calc(100vh - 10rem)',
});

export const ProfileContainer = styled(FlexColumn)({
    alignItems: 'flex-start',
    gap: '1.25rem',
    borderRadius: '0.75rem',
    padding: '2rem',
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
    height: '100%',
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
    whiteSpace: 'nowrap',
});

//#region ProfileCard

//#endregion

export const StyledProfileCard = styled(Card)({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    borderRadius: '0.75rem',
    padding: '2rem',
});

export const ProfilePictureContainer = styled('div')({
    position: 'relative',
    display: 'flex',
    alignSelf: 'center',
    height: '10rem',
    width: '10rem',
});

export const ProfilePicture = styled('div')({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    background: 'grey',
    borderRadius: '50%',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'opacity 0.2s ease',
    '&:hover': {
        opacity: 0.9,
    },
});

export const ProfilePictureImage = styled('img')({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
});

export const UserInfoContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
});

export const UserInfoHeading = styled(Typography)({
    fontSize: '1.25rem',
    fontWeight: 'bold',
});

export const UploadImageButton = styled(IconButton)(({ theme }) => ({
    position: 'absolute',
    bottom: '0rem',
    right: '0rem',
    background: theme.palette.primary.main,
    color: '#fff',
    padding: '0.5rem',
    boxShadow: '0 0.125rem 0.25rem rgba(0,0,0,0.2)',
    '&:hover': {
        background: theme.palette.primary.dark,
    },
}));

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

//#region CustomizationTab
export const SimpleSelect = styled(Select)(({ theme }) => ({
    height: '2.5rem',
    width: '10rem',
}));
//#endregion
