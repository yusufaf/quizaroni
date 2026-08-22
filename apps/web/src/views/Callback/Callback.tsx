import { useNavigate } from 'react-router-dom';
import { useHandleSignInCallback } from '@logto/react';
import { Box, Typography } from '@mui/material';
import { POST_SIGN_IN_REDIRECT_KEY } from 'shared/constants';

type Props = {};

// Completes the OIDC authorization-code exchange, then returns the user to
// where they started (the path Login.tsx stashed via POST_SIGN_IN_REDIRECT_KEY,
// see Login.tsx), or home on first sign-in / plain sign-up.
const Callback = (props: Props) => {
    const navigate = useNavigate();

    const { isLoading } = useHandleSignInCallback(() => {
        const from = sessionStorage.getItem(POST_SIGN_IN_REDIRECT_KEY);
        sessionStorage.removeItem(POST_SIGN_IN_REDIRECT_KEY);
        navigate(from ?? '/');
    });

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="80vh"
        >
            {isLoading && (
                <Typography variant="body1">Signing in...</Typography>
            )}
        </Box>
    );
};

export default Callback;
