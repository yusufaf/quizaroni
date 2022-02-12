import { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Alert, AlertTitle } from '@mui/material/';
import { useTheme } from "../theme/useTheme";
import * as appStyles from "../App.module.css";
import * as loginStyles from "../Login/Login.module.css";
import * as forgotPassStyles from "./ForgotPassword.module.css";
import * as C from "../utilities/constants";

/*
    Forgot Password Component
*/
const ForgotPassword = props => {
    const { isDarkMode, theme } = useTheme();
    const auth = getAuth();

    const [enteredEmail, setEnteredEmail] = useState("");

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
    })

    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    /* Function to handle sending the password reset email; user doesn't need to be signed in */
    const sendPasswordReset = () => {
        sendPasswordResetEmail(auth, enteredEmail)
            .then(() => {
                console.log("Password reset email successfully sent!");
                setShowAlert(true);
                setAlertType(C.SUCCESS);
                setTimeout(() => {
                    setShowAlert(false);
                }, 500);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.log(`Couldn't send password reset email. Error ${errorCode} = ${errorMessage}`);
            });
    }

    return (
        <>
            <div className={forgotPassStyles.forgotContainer} style={{ color: theme.foreground, background: theme.background }}>
                <div className={appStyles.title}>
                    Reset your password
                </div>

                <div className={forgotPassStyles.info}>
                    Please enter your account's email below. We will send an email with instructions and a link to reset your password.
                </div>

                <input
                    className={
                        showErrorText.emailInput ? `${loginStyles.input} ${loginStyles.error} ${isDarkMode && loginStyles.dark}`
                            : `${loginStyles.input} ${isDarkMode && loginStyles.dark}`}
                    name="emailInput"
                    placeholder="Enter your email address"
                    onBlur={e => checkIfInputEmpty(e)}
                    onChange={e => setEnteredEmail(e.target.value)}
                />

                {showErrorText.emailInput &&
                    <span className={forgotPassStyles.emailError}>
                        An email is required.
                    </span>
                }

                {/* Submit Button */}
                <div
                    className={enteredEmail === "" ? `${forgotPassStyles.submit} ${forgotPassStyles.disabled}` : `${forgotPassStyles.submit}`}
                    onClick={() => sendPasswordReset()}
                >
                    <b>Submit</b>
                </div>

            </div>

            {showAlert &&
                <Alert
                    className={appStyles.alert}
                    severity={alertType}
                >
                    <AlertTitle>
                        <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                    </AlertTitle>
                    {alertType === C.SUCCESS ? "Email sent, please check your email!" : "Couldn't send an email to that address"}
                </Alert>
            }
        </>
    );
}

export default ForgotPassword;