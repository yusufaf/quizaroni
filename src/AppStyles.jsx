import { styled } from "@mui/system";
import { Typography } from '@mui/material/';

export const SimpleFlexContainer = styled("div")({
    display: "flex",
    alignItems: "center",
})

export const BoldHeading = styled(Typography)({
    fontWeight: "bold"
})

export const BasePage = styled("main")({
    marginTop: "2rem",
})