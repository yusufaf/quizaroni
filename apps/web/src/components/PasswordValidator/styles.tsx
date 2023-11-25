import { Box, Paper, Typography } from "@mui/material";
import styled from "@emotion/styled";

export const PasswordPolicyBox = styled(Box)({
    position: "absolute",
    left: "25rem",
    top: "8rem",
    width: "23rem",
});

export const PasswordPolicyPaper = styled(Paper)({
    padding: "1rem",
    textAlign: "left",
});

export const RequirementText = styled(Typography)<{ isSatisfied: boolean }>(
    ({ isSatisfied, theme }) => ({
        color: isSatisfied ? theme.palette.success.main : theme.palette.error.main,
        transition: "color 0.2s ease",
    })
);
