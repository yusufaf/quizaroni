import { Tooltip, Typography } from '@mui/material';
import {
    FooterPaper,
    StyledFooter,
    FooterLeft,
    FooterRight,
    SocialIconButton,
} from './styles';
import { GitHub, LinkedIn } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <StyledFooter>
            <FooterPaper elevation={1}>
                <FooterLeft>
                    <Typography variant="body2">
                        {t('footer.copyright')}
                    </Typography>
                </FooterLeft>
                <FooterRight>
                    <Typography variant="body2" sx={{ mr: 1 }}>
                        {t('footer.socials')}
                    </Typography>
                    <Tooltip title="GitHub">
                        <SocialIconButton
                            href="https://github.com/yusufaf"
                            target="_blank"
                            aria-label="GitHub"
                        >
                            <GitHub />
                        </SocialIconButton>
                    </Tooltip>
                    <Tooltip title="LinkedIn">
                        <SocialIconButton
                            href="https://www.linkedin.com/in/yusuf-afzal/"
                            target="_blank"
                            aria-label="LinkedIn"
                        >
                            <LinkedIn />
                        </SocialIconButton>
                    </Tooltip>
                </FooterRight>
            </FooterPaper>
        </StyledFooter>
    );
};

export default Footer;
