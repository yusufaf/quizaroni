import {
  Palette,
  LightMode,
  DarkMode,
  Label,
  Launch,
} from "@mui/icons-material";
import {
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "@mui/material";
import axios from "axios";
import { useState, useEffect } from "react";
import {
  selectNamedColorsDialogProps,
  setNamedColorsDialogProps,
  setUserData,
} from "state/slices/globalSlice";
import { LIGHT, DARK } from "utilities/constants";
import { ActionColumn, ActionHeader } from "./ProfileStyles";
import { useDispatch, useSelector } from "react-redux";
import ManageLabelsDialog from "views/ViewStudySet/ManageLabelsDialog/ManageLabelsDialog";
import NamedColorsDialog from "components/NamedColorsDialog/NamedColorsDialog";
import { User } from "lib/types";

type Props = {
  userData: User;
};

const CustomizationTab = (props: Props) => {
  const { userData } = props;

  const dispatch = useDispatch();

  const { uuid: userUUID = "", labels = [] } = userData;
  const namedColorsDialogProps = useSelector(selectNamedColorsDialogProps);
  const [defaultTheme, setDefaultTheme] = useState<string>(
    userData?.metadata?.defaultTheme ?? "dark"
  );
  const [labelsDialogOpen, setLabelsDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (userData?.metadata?.defaultTheme) {
      setDefaultTheme(userData.metadata.defaultTheme);
    }
  }, []);

  /**
   * Update user's selected default theme
   */
  const handleDefaultTheme = async (event, newTheme) => {
    try {
      /* Don't take any action if selected theme is the same */
      if (!userUUID || newTheme === null || newTheme === defaultTheme) {
        return;
      }

      const themeUpdateResult = await axios.post(
        "/api/users/updateDefaultTheme",
        {
          uuid: userUUID,
          newTheme,
        }
      );
      console.log({ themeUpdateResult });

      setDefaultTheme(newTheme);

      const newUserData = {
        ...userData,
        metadata: {
          ...userData.metadata,
          defaultTheme: newTheme,
        },
      };
      console.log({ newUserData });
      dispatch(setUserData(newUserData));
    } catch (error) {
      console.error("Error updating default theme");
    }
  };

  const openNamedColorsDialog = () => {
    dispatch(
      setNamedColorsDialogProps({
        open: true,
      })
    );
  }

  const closeLabelsDialog = () => {
    setLabelsDialogOpen(false);
  }

  return (
    <>
      <ActionColumn>
        <ActionHeader>
          <DarkMode />
          <Typography variant="h6">Default Theme</Typography>
        </ActionHeader>
        <ToggleButtonGroup
          aria-label="Set default theme"
          exclusive
          onChange={handleDefaultTheme}
          value={defaultTheme}
        >
          <ToggleButton value={LIGHT} title="Switch default to Light mode">
            <LightMode />
          </ToggleButton>
          <ToggleButton value={DARK} title="Switch default to Dark mode">
            <DarkMode />
          </ToggleButton>
        </ToggleButtonGroup>
      </ActionColumn>
      <ActionColumn>
        <ActionHeader>
          <Label />
          <Typography variant="h6">Labels</Typography>
        </ActionHeader>
        <Button
          variant="outlined"
          startIcon={<Launch />}
          onClick={() => setLabelsDialogOpen(true)}
        >
          Manage Labels
        </Button>
        <ManageLabelsDialog
          labels={labels}
          open={labelsDialogOpen}
          onClose={closeLabelsDialog}
          userUUID={userUUID}
        />
      </ActionColumn>
      <ActionColumn>
        <ActionHeader>
          <Palette />
          <Typography variant="h6">Named Colors</Typography>
        </ActionHeader>
        <Button
          variant="outlined"
          startIcon={<Launch />}
          onClick={openNamedColorsDialog}
        >
          Manage Named Colors
        </Button>
        {namedColorsDialogProps.open && <NamedColorsDialog />}
      </ActionColumn>
    </>
  );
};

export default CustomizationTab;
