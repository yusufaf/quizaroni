import React, { useState, useEffect, useRef } from "react"
import { useTheme } from "../theme/useTheme";

import macaroniDance from "../resources/images/macaroni_dance.gif";
import * as messageStyles from './LoginMessage.module.css';
import { LOGIN_MESSAGES } from "../utilities/constants";

const LoginMessage = props => {
    const { page } = props;

    const { isDarkMode, theme } = useTheme();

    return (
        <div className={messageStyles.container} style={{ color: theme.foreground, background: theme.background }}>
            <b>{LOGIN_MESSAGES[page]}</b>
            <img
                src={macaroniDance}
                alt="Macaroni dancing"
            />
        </div>
    );
}

export default LoginMessage;