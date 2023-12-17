import { styled } from "@mui/system";
import { DialogTitle, IconButton, Typography } from '@mui/material/';
import { Link } from "react-router-dom";
import { ChromePicker } from 'react-color';

export const SimpleFlexContainer = styled("div")({
    display: "flex",
    alignItems: "center",
})

export const BaselineFlexContainer = styled("div")({
    display: "flex",
    alignItems: "baseline",
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
    alignItems: "center",
})

export const RightAlignedCloseButton = styled(IconButton)(
    {
        marginLeft: "auto",
    }
)

export const StyledLink = styled(Link)(({ theme }) => ({
    color: theme.palette.primary.main,
    textDecoration: "none",
    transition: "0.2s ease",
    '&:hover': {
        color: theme.palette.primary.dark,
        textDecoration: "underline", 
    },
}));

export const StyledChromePicker = styled(ChromePicker)(({ theme }) => ({
    "&.chrome-picker": {
        background: `${theme.palette.background.paper} !important`,
    },
}));