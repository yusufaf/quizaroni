import React, { useState, useEffect, useRef } from "react"
import { useTheme } from "../theme/useTheme";

import macaroniDance from "../resources/images/macaroni_dance.gif";
import * as messageStyles from './LoginMessage.module.css';
/*
    LoginMessage Component
*/
const LoginMessage = props => {
    const { page } = props;

    const { isDarkMode, theme } = useTheme();

    const messages = {
        "createSet": "Please login or create an account to start creating flash cards!",
        "login": "You're already logged in!",
        "signup": "Please log out of your account to create a new account!"
    }

    /* React-Router function for switching routes */
    // let navigate = useNavigate();
    return (
        <div className={messageStyles.container} style={{ color: theme.foreground, background: theme.background }}>
            <b>{messages[page]}</b>
            <img
                src={macaroniDance}
                alt="Macaroni dancing"
            />
        </div>
    );
}

export default LoginMessage;