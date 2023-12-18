import {
    Person,
    Password,
    RemoveCircleOutline,
    EmailRounded,
} from "@mui/icons-material";
import { Typography, TextField, Button } from "@mui/material";
import PasswordToggle from "components/PasswordToggle/PasswordToggle";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import {
    AccountViewContainer,
    ActionHeader,
    ActionSection,
    ActionSubmitButton,
    InfoChangeContainer,
    PasswordFieldsContainer,
} from "./ProfileStyles";
import { useState } from "react";
import {
    UpdateUserAttributeOutput,
    updateUserAttribute,
} from "@aws-amplify/auth";
import { EMAIL_REGEX } from "utilities/constants";
import { useNavigate } from "react-router-dom";
import { User } from "lib/types";

type Props = {
    userData: User;
};
const AccountTab = (props: Props) => {
    const { userData } = props;

    const navigate = useNavigate();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState<string>("");
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [enteredConfirmPassword, setEnteredConfirmPassword] = useState("");

    const [newPasswordVisibility, setNewPasswordVisibility] = useState(false);
    const [newEmail, setNewEmail] = useState<string>("");

    const isNewEmailValid = EMAIL_REGEX.test(newEmail);

    const checkIfInputMatches = (event) => {
        // let updatedErrorText = { ...showErrorText };
        // updatedErrorText[event.target.name] =
        // event.target.value !== newPassword;
        // setShowErrorText(updatedErrorText);
    };

    const handleDeleteAccount = async () => {
        // TODO
    };

    /**
     * Change username for authenticated user
     */
    const handleChangeUsername = async () => {
        // TODO
    };

    /**
     * Change user password if signed up with email / password
     */
    const handleChangePassword = () => {
        // TODO
    };

    const handleShowDeleteDialog = () => {
        setShowDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setShowDeleteDialog(false);
    };

    const handleUpdateUserAttribute = async (
        attributeKey: string,
        value: string
    ) => {
        try {
            const output = await updateUserAttribute({
                userAttribute: {
                    attributeKey,
                    value,
                },
            });
            handleUpdateUserAttributeNextSteps(output);
        } catch (error) {
            console.log(error);
        }
    };

    const handleUpdateUserAttributeNextSteps = (
        output: UpdateUserAttributeOutput
    ) => {
        const { nextStep } = output;

        switch (nextStep.updateAttributeStep) {
            case "CONFIRM_ATTRIBUTE_WITH_CODE":
                const codeDeliveryDetails = nextStep.codeDeliveryDetails;
                console.log(
                    `Confirmation code was sent to ${codeDeliveryDetails?.deliveryMedium}.`
                );
                // Collect the confirmation code from the user and pass to confirmUserAttribute.

                navigate("/confirmEmail", {
                    state: {
                        actionType: "changeEmail",
                        canResend: false,
                        newEmail,
                    }
                })

                break;
            case "DONE":
                console.log(`attribute was successfully updated.`);
                break;
        }
    };

    const handleChangeEmail = async () => {
        handleUpdateUserAttribute("email", newEmail);
        setNewEmail("");
    };

    return (
        <AccountViewContainer>
            <ActionSection>
                <ActionHeader>
                    <Person />
                    <Typography variant="h6">Change Username</Typography>
                </ActionHeader>
                <InfoChangeContainer>
                    <TextField
                        variant="standard"
                        label="Username"
                        placeholder="Enter new username"
                        value={enteredNewUsername}
                        onChange={(e) => setEnteredNewUsername(e.target.value)}
                        size="small"
                    />
                    <ActionSubmitButton
                        variant="contained"
                        onClick={() => handleChangeUsername()}
                        disabled={enteredNewUsername === ""}
                    >
                        Submit
                    </ActionSubmitButton>
                </InfoChangeContainer>
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <Password />
                    <Typography variant="h6">Change Password</Typography>
                </ActionHeader>
                <InfoChangeContainer>
                    <TextField
                        variant="standard"
                        placeholder="Enter new password"
                        label="Password"
                        type={newPasswordVisibility ? "text" : "password"}
                        value={newPassword}
                        name="passInput"
                        onChange={(e) => setNewPassword(e.target.value)}
                        // error={showErrorText.passInput}
                        size="small"
                        InputProps={{
                            endAdornment: (
                                <PasswordToggle
                                    passwordVisibility={newPasswordVisibility}
                                    setPasswordVisibility={
                                        setNewPasswordVisibility
                                    }
                                />
                            ),
                        }}
                    />
                    <TextField
                        variant="standard"
                        placeholder="Confirm new password"
                        label="Confirm Password"
                        type={newPasswordVisibility ? "text" : "password"}
                        value={newPassword}
                        name="passInput"
                        onChange={(e) =>
                            setEnteredConfirmPassword(e.target.value)
                        }
                        // error={showErrorText.passInput}
                        size="small"
                        InputProps={{
                            endAdornment: (
                                <PasswordToggle
                                    passwordVisibility={newPasswordVisibility}
                                    setPasswordVisibility={
                                        setNewPasswordVisibility
                                    }
                                />
                            ),
                        }}
                    />
                    <ActionSubmitButton
                        variant="contained"
                        onClick={() => handleChangePassword()}
                        // disabled={
                        //     newPassword === "" ||
                        //     enteredConfirmPassword === "" ||
                        //     showErrorText.confirmPassInput
                        // }
                    >
                        Submit
                    </ActionSubmitButton>
                </InfoChangeContainer>
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <EmailRounded />
                    <Typography variant="h6">Change Email</Typography>
                </ActionHeader>
                <InfoChangeContainer>
                    <TextField
                        variant="standard"
                        label="New Email"
                        placeholder="Enter new email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required={true}
                        error={Boolean(newEmail) && !isNewEmailValid}
                        helperText={newEmail && !isNewEmailValid && "Please enter a valid email"}
                    />
                    <ActionSubmitButton
                        variant="contained"
                        onClick={handleChangeEmail}
                        disabled={!newEmail || !isNewEmailValid}
                    >
                        Submit
                    </ActionSubmitButton>
                </InfoChangeContainer>
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <RemoveCircleOutline />
                    <Typography variant="h6">Delete Account</Typography>
                </ActionHeader>
                <ActionSubmitButton
                    variant="outlined"
                    color="error"
                    onClick={handleShowDeleteDialog}
                    fullWidth
                >
                    Delete Account
                </ActionSubmitButton>
                <DeleteAccountDialog
                    open={showDeleteDialog}
                    handleClose={handleCloseDeleteDialog}
                    deletePassword={deletePassword}
                    setDeletePassword={setDeletePassword}
                />
            </ActionSection>
        </AccountViewContainer>
    );
};

export default AccountTab;
