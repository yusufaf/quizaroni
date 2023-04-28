import { useTheme } from "theme/useTheme";
import macaroniDance from "resources/images/macaroni_dance.gif";
import { LOGIN_MESSAGES } from "utilities/constants";
import { Card, Typography } from "@mui/material/";

type Props = {
  page: string;
};

const LoginMessage = (props: Props) => {
  const { page } = props;

  const { isDarkMode, theme } = useTheme();

  const messageStyling = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-60%, -70%)",
    minWidth: "40rem",
    maxWidth: "40rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    padding: "1.25rem",
    textAlign: "center",
  };

  return (
    <Card sx={messageStyling} raised>
      <Typography variant="h5" style={{ fontWeight: "bold" }}>
        {LOGIN_MESSAGES[page]}
      </Typography>
      <img src={macaroniDance} alt="Macaroni dancing" />
    </Card>
  );
};

export default LoginMessage;
