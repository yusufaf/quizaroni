import { useNavigate } from 'react-router-dom';
import { useHandleSignInCallback } from '@logto/react';
import { Box, Typography } from '@mui/material';

type Props = {};

// Completes the OIDC authorization-code exchange, then returns the user to
// where they started (or home, on first sign-in).
const Callback = (props: Props) => {
    const navigate = useNavigate();

    const { isLoading } = useHandleSignInCallback(() => {
        navigate('/');
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
