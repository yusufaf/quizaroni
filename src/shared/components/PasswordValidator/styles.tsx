import { Paper, Typography } from '@mui/material';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';

export const PasswordPolicyContainer = styled(motion.div)({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
});

export const PasswordPolicyPaper = styled(Paper)({
    padding: '1rem',
    textAlign: 'left',
});

export const RequirementText = styled(Typography)<{ satisfied: string }>(
    ({ satisfied, theme }) => ({
        color:
            satisfied === 'true'
                ? theme.palette.success.main
                : theme.palette.error.main,
        transition: 'color 0.2s ease',
    })
);
