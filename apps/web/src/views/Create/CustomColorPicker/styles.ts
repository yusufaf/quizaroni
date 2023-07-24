import styled from "@emotion/styled";
import { BasePage, FlexColumn, SpacedFlexContainer, SimpleFlexContainer } from "common/AppStyles";

export const ColorPickerContainer = styled("div")({
    display: "flex",
    flexDirection: "row",
    position: "absolute",
    bottom: "2.5rem",
})

export const ExtraPickerContainer = styled(FlexColumn)(({ theme }) => ({
    background: theme.palette.background.paper,
    border: `0.125rem solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column"
}));
