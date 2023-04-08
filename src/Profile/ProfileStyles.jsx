import { Card, IconButton, Paper, styled, Typography } from "@mui/material";
import { BasePage } from "src/AppStyles";

export const ProfilePage = styled(BasePage)({
    display: "grid",
    gridTemplateColumns: "auto 2fr",
    padding: "0 2rem 2rem 2rem",
    gap: "4rem"
})

export const ProfileContainer = styled("div")({
    display: "flex",
    alignItems: "flex-start",
    flexDirection: "column",
    gap: "1.25rem",
    borderRadius: "0.75rem",
    padding: "1.25rem",
})

export const ProfilePaper = styled(Paper)({
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

export const ActionHeader = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
})

/* Profile Card Styles */

export const StyledProfileCard = styled(Card)({
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    borderRadius: "0.75rem",
    padding: "1.25rem",
})

export const ProfilePicture = styled("div")({
    position: "relative",
    display: "flex",
    alignSelf: "center",
    height: "10rem",
    width: "10rem",
    background: "grey",
    borderRadius: "50%",
})

export const UserInfoContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
})

export const UserInfoHeading = styled(Typography)({
    fontSize: "1.25rem",
    fontWeight: "bold"
})

export const UploadImageButton = styled(IconButton)({
    position: "absolute",
    left: "9rem",
    cursor: "pointer",
})
