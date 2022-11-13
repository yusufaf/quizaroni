import { useState } from "react";
import {
    Grid,
    TextField,
    Typography
} from '@mui/material/';
import { Edit } from '@mui/icons-material/';
import { styled } from "@mui/system";

// const StyledTextField = styled(TextField)({
//     borderBottom: 0,
//     "&:before": {
//         borderBottom: 0
//     },
//     ".Mui-disabled": {
//         borderBottom: 0,
//         opacity: 1,
//         "-webkit-text-fill-color": "rgb(0,0,0,1) !important",
//         "&:before": {
//             borderBottom: 0
//         }
//     }
// })

const FooterContainer = styled(Grid)({
    position: "fixed",
    bottom: "0",
    height: "4rem"
})


const Footer = props => {
    return (
        <footer>
            <FooterContainer container>
                <Grid item>

                </Grid>
                <Grid item>
                    
                </Grid>
                <Grid item>
                    
                </Grid>
            </FooterContainer>
        </footer>
    )
}


export default Footer;