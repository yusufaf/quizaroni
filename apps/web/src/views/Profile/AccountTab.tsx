import { Person, RemoveCircleOutline, EmailRounded } from "@mui/icons-material";
import { Typography, TextField } from "@mui/material";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import {
    AccountViewContainer,
    ActionHeader,
    ActionSection,
    ActionSubmitButton,
    InfoChangeContainer,
} from "./ProfileStyles";
import { useState } from "react";
import {
    type UpdateUserAttributeOutput,
    updateUserAttribute,
} from "@aws-amplify/auth";
import { EMAIL_REGEX } from "utilities/constants";
import { useNavigate } from "react-router-dom";
import { User } from "lib/types";
import { useDispatch } from "react-redux";
import { setConfirmationCodeDialogProps } from "state/slices/globalSlice";
import ChangePasswordSection from "./ChangePasswordSection/ChangePasswordSection";

type Props = {
    userData: User;
};
const AccountTab = (props: Props) => {
    const { userData } = props;

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState<string>("");
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>("");
    const [oldPassword, setOldPassword] = useState<string>("");
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
                dispatch(
                    setConfirmationCodeDialogProps({
                        open: true,
                        actionType: "changeEmail",
                        canResend: false,
                        description: `To confirm you want to change the email associated with your account to ${newEmail}, we've sent a 6-digit confirmation code.`,
                        newEmail,
                        title: "Confirm Email Change",
                    })
                );

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
            <ChangePasswordSection />
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
                        helperText={
                            newEmail &&
                            !isNewEmailValid &&
                            "Please enter a valid email"
                        }
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
