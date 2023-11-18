import { Person, Password, RemoveCircleOutline } from "@mui/icons-material";
import { Typography, TextField, Button } from "@mui/material";
import PasswordToggle from "components/PasswordToggle/PasswordToggle";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import {
  ActionHeader,
  InfoChangeContainer,
  PasswordFieldsContainer,
} from "./ProfileStyles";
import { useState } from "react";

type Props = {};

const AccountTab = (props: Props) => {
  const {} = props;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState<string>("");
  const [enteredNewUsername, setEnteredNewUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [enteredConfirmPassword, setEnteredConfirmPassword] = useState("");

  const [newPasswordVisibility, setNewPasswordVisibility] = useState(false);

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

  return (
    <>
      <ActionHeader>
        <Person />
        <Typography variant="h6">Change Username</Typography>
      </ActionHeader>
      <InfoChangeContainer>
        <TextField
          variant="standard"
          label="Username"
          placeholder="Enter new password"
          value={enteredNewUsername}
          onChange={(e) => setEnteredNewUsername(e.target.value)}
          size="small"
        />
        <Button
          variant="contained"
          onClick={() => handleChangeUsername()}
          disabled={enteredNewUsername === ""}
        >
          Submit
        </Button>
      </InfoChangeContainer>

      <ActionHeader>
        <Password />
        <Typography variant="h6">Change Password</Typography>
      </ActionHeader>

      <InfoChangeContainer>
        <PasswordFieldsContainer>
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
                  setPasswordVisibility={setNewPasswordVisibility}
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
            onChange={(e) => setEnteredConfirmPassword(e.target.value)}
            // error={showErrorText.passInput}
            size="small"
            InputProps={{
              endAdornment: (
                <PasswordToggle
                  passwordVisibility={newPasswordVisibility}
                  setPasswordVisibility={setNewPasswordVisibility}
                />
              ),
            }}
          />
        </PasswordFieldsContainer>

        <Button
          variant="contained"
          onClick={() => handleChangePassword()}
          // disabled={
          //     newPassword === "" ||
          //     enteredConfirmPassword === "" ||
          //     showErrorText.confirmPassInput
          // }
        >
          Submit
        </Button>
      </InfoChangeContainer>

      <ActionHeader>
        <RemoveCircleOutline />
        <Typography variant="h6">Delete Account</Typography>
      </ActionHeader>
      <Button variant="outlined" color="error" onClick={handleShowDeleteDialog}>
        Delete Account
      </Button>
      <DeleteAccountDialog
        open={showDeleteDialog}
        handleClose={handleCloseDeleteDialog}
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
      />
    </>
  );
};

export default AccountTab;
