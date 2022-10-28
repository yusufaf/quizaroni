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

/*
.alert {
  position       : absolute;
  left           : 39vw;
  top            : 8vh;
  display        : flex;
  justify-content: center;
  align-items    : center;
  height         : 3rem;
  width          : 20rem;
}
*/