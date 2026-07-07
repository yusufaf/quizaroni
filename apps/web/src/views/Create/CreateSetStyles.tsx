import { AddCircleOutline } from '@mui/icons-material';
import {
    Button,
    Card,
    IconButton,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import { styled } from '@mui/system';
import {
    BasePage,
    FlexColumn,
    SimpleFlexContainer,
    SpacedFlexContainer,
} from 'styles/AppStyles';

export const CreateSetPage = styled(BasePage)(({ theme }) => ({
    marginTop: '0',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2rem',
    // Fluid horizontal padding: tight on small screens, growing on wide ones to
    // keep a readable content width (replaces the fixed 20rem gutter).
    padding: '1rem',
    [theme.breakpoints.up('sm')]: {
        padding: '1.5rem 2rem',
    },
    [theme.breakpoints.up('md')]: {
        padding: '2rem 3rem',
    },
    [theme.breakpoints.up('lg')]: {
        padding: '2rem clamp(3rem, 10vw, 18rem)',
    },
}));

export const CreateSetPaper = styled(Paper)({});

export const HeaderContainer = styled('div')(({ theme }) => ({
    height: 'fit-content',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    display: 'grid',
    // Stack the form and the save/advanced controls on narrow screens; place
    // them side by side once there is room.
    gridTemplateColumns: '1fr',
    gap: '1.5rem',
    overflow: 'hidden',
    [theme.breakpoints.up('md')]: {
        gridTemplateColumns: '2fr 1fr',
        gap: '1rem',
    },
}));

export const HeaderLeft = styled(FlexColumn)({
    gap: '1.25rem',
    minWidth: 0,
});

export const BackToViewButton = styled(Button)({
    width: 'fit-content',
});

export const HeaderRight = styled(FlexColumn)({
    gap: '1rem',
    minWidth: 0,
});

export const CreateSetInputsContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    position: 'relative',
});

export const TitleInput = styled(TextField)({
    width: '100%',
    maxWidth: '40rem',
});

export const DescriptionInput = styled(TextField)(({ theme }) => ({
    width: '100%',
    maxWidth: '40rem',
    '& .MuiInputBase-input::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '& .MuiInputBase-input::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[500],
        borderRadius: '0.25rem',
    },
}));

export const LabelInputContainer = styled(SimpleFlexContainer)({
    gap: '1rem',
});

export const LabelInput = styled(TextField)({
    width: '18rem',
});

export const AdvancedSection = styled(FlexColumn)({});

export const BlankInputsContainer = styled(SimpleFlexContainer)({
    gap: '0.75rem',
});

export const BlankInputsField = styled(TextField)({
    width: '5rem',
});

export const LabelSelect = styled(Select)({
    width: '10rem',
});

export const LabelMenuItem = styled(MenuItem)({
    width: '10rem',
});

/* ==== Set Modification Buttons ==== */
export const SetModificationsContainer = styled(SimpleFlexContainer)({
    gap: '1.5rem',
    alignSelf: 'flex-end',
});

export const KeysToPressContainer = styled('div')({
    marginLeft: '1rem',
});

/* ==== New Card Styled Components ====  */
export const NewCard = styled(Card)({
    padding: '1.25rem 0 2rem 0',
    borderRadius: '0.75rem',
    overflow: 'unset',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
    transition: 'all 0.2s ease',
    boxShadow: '0 0.25rem 0.75rem rgba(255,160,0,0.15)',
    '&:hover': {
        boxShadow: '0 0.375rem 1rem rgba(255,160,0,0.25)',
    },
});

export const AddCardButton = styled(Button)({
    display: 'flex',
    gap: '0.5rem',
    fontWeight: 'bold',
    fontSize: '1rem',
});

export const AddCardIcon = styled(AddCircleOutline)({
    fontSize: '1.5rem',
});

export const NewCardInputs = styled(SpacedFlexContainer)({
    position: 'relative',
    marginTop: '1rem',
});

export const NewCardInputField = styled(TextField)(({ theme }) => ({
    width: '100%',
    '& .MuiInputBase-input::-webkit-scrollbar': {
        width: '0.5rem',
    },
    '& .MuiInputBase-input::-webkit-scrollbar-thumb': {
        background: theme.palette.grey[500],
        borderRadius: '0.25rem',
    },
}));

export const NewCardHeader = styled('div')({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
});

export const CenterActions = styled(SimpleFlexContainer)({
    position: 'relative',
    justifyContent: 'center',
    gap: '1rem',
});

export const RightActions = styled(SimpleFlexContainer)({});

export const BottomActions = styled(SimpleFlexContainer)({
    position: 'absolute',
    top: '100%',
    left: '47.5%',
});

export const AddCardBelowButton = styled(IconButton)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.background.paper,
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
    },
}));

export const NewCardLabel = styled(Typography)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

export const NewCardTerm = styled(FlexColumn)({
    flex: '1 1 0',
    gap: '0.5rem',
    minWidth: '0',
    overflow: 'hidden',
});

export const NewCardDefinition = styled(FlexColumn)({
    flex: '1 1 0',
    gap: '0.5rem',
    minWidth: '0',
    overflow: 'hidden',
});

export const NewCardRow = styled('div')(({ theme }) => ({
    display: 'flex',
    // Stack term and definition on narrow screens; side by side once there's
    // room. The divider follows: horizontal when stacked, vertical when not.
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '1.25rem',
    padding: '0 1.5rem',
    position: 'relative',
    '&::after': {
        content: '""',
        position: 'absolute',
        left: '1.5rem',
        right: '1.5rem',
        top: '50%',
        height: '1px',
        backgroundColor: theme.palette.divider,
        transform: 'translateY(-50%)',
    },
    [theme.breakpoints.up('sm')]: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '2rem',
        '&::after': {
            left: '50%',
            right: 'auto',
            top: '0',
            bottom: '0',
            width: '1px',
            height: 'auto',
            transform: 'translateX(-50%)',
        },
    },
}));

export const ExtraPickerContainer = styled(FlexColumn)(({ theme }) => ({
    background: theme.palette.background.paper,
    border: `0.125rem solid ${theme.palette.divider}`,
    display: 'flex',
    flexDirection: 'column',
}));

export const ExtraPickerButton = styled(IconButton)({
    height: 'fit-content',
});
