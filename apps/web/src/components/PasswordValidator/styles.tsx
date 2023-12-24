import { Paper, Typography } from "@mui/material";
import styled from "@emotion/styled";

export const PasswordPolicyContainer = styled("div")({
    position: "absolute",
    left: "25rem",
    top: "8rem",
    width: "23rem",
});

export const PasswordPolicyPaper = styled(Paper)({
    padding: "1rem",
    textAlign: "left",
});

export const RequirementText = styled(Typography)<{ isSatisfied: string }>(
    ({ isSatisfied, theme }) => ({
        color: isSatisfied === "true" ? theme.palette.success.main : theme.palette.error.main,
        transition: "color 0.2s ease",
    })
);
