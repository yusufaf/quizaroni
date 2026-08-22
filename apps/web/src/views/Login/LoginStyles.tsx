import { styled } from '@mui/system';
import { Box, Typography } from '@mui/material';

export const LoginPageContainer = styled(Box)({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '4rem',
});

export const LoginContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '0.25rem',
    padding: '1.25rem',
    textAlign: 'center',
    fontSize: '1rem',
    position: 'relative',
});

export const LoginTitle = styled(Typography)({
    fontWeight: 'bold',
    alignSelf: 'flex-start',
});
