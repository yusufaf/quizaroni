import { styled } from "@mui/system";
import { DialogTitle, IconButton, Typography } from '@mui/material/';

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

export const BoldTypography = styled(Typography)({
    fontWeight: "bold"
})

export const BasePage = styled("main")({
    marginTop: "2rem",
})

export const FlexDialogTitle = styled(DialogTitle)({
    display: "flex",
})

export const RightAlignedCloseButton = styled(IconButton)(
    {
        marginLeft: "auto",
    }
)