import { useState } from "react";
import { IconButton } from "@mui/material/";
import { FooterPaper, StyledFooter } from "./styles";
import { GitHub, LinkedIn } from "@mui/icons-material";
import { BoldTypography, FlexColumn } from "common/AppStyles";

type Props = {};
const Footer = (_props: Props) => {
    return (
        <StyledFooter>
            <FooterPaper elevation={0.5}>
                <FlexColumn style={{alignItems: "flex-start", marginLeft: "auto"}}>
                    <BoldTypography>
                        Socials
                    </BoldTypography>
                    <IconButton
                        href="https://github.com/yusufaf"
                        target="_blank"
                    >
                        <GitHub />
                    </IconButton>
                    <IconButton
                        href="https://www.linkedin.com/in/yusuf-afzal/"
                        target="_blank"
                    >
                        <LinkedIn />
                    </IconButton>
                </FlexColumn>
            </FooterPaper>
        </StyledFooter>
    );
};

export default Footer;
