import { styled } from "@mui/system";
import { Typography } from '@mui/material/';

/*
TODO: For general styled components used across the app
*/
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