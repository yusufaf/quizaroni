import { Paper, styled, Typography } from "@mui/material";

export const ProfilePaper = styled(Paper)({
    marginTop: "2rem"
})

export const InfoChangeContainer = styled("div")({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "2rem",
})

export const PasswordFieldsContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
})

/* Profile Card Styles */
export const UserInfoContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
})

export const UserInfoHeading = styled(Typography)({
    fontSize: "1.25rem",
    fontWeight: "bold"
})