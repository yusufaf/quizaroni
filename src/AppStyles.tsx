import { styled } from "@mui/system";
import { Typography } from '@mui/material/';

export const SimpleFlexContainer = styled("div")({
    display: "flex",
    alignItems: "center",
})

export const SpacedFlexContainer = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
})

export const FlexColumn = styled("div")({
    display: "flex",
    flexDirection: "column",
})

export const BoldHeading = styled(Typography)({
    fontWeight: "bold"
})

export const BasePage = styled("main")({
    marginTop: "2rem",
})