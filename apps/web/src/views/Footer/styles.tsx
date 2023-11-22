import { Paper } from "@mui/material";
import { styled } from "@mui/system";

export const StyledFooter = styled("footer")(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    bottom: "0",
    height: "4rem",
    width: "100%",
    marginTop: "auto",
}));

export const FooterPaper = styled(Paper)({
    display: "flex",
    width: "100%",
    padding: "1rem 2rem 0 2rem",
})
