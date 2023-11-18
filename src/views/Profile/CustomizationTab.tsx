import { Palette, LightMode, DarkMode } from "@mui/icons-material";
import { Typography, ToggleButtonGroup, ToggleButton } from "@mui/material";
import axios from "axios";
import { useState, useEffect } from "react";
import { setUserData } from "state/slices/globalSlice";
import { LIGHT, DARK } from "utilities/constants";
import { ActionHeader } from "./ProfileStyles";
import { useDispatch } from "react-redux";

type Props = {
  userData: any;
};

const CustomizationTab = (props: Props) => {
  const { userData } = props;

  const dispatch = useDispatch();
  const [defaultTheme, setDefaultTheme] = useState<string>(
    userData?.metadata?.defaultTheme ?? "dark"
  );

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
      const { uuid } = userData;
      /* Don't take any action if selected theme is the same */
      if (!uuid || newTheme === null || newTheme === defaultTheme) {
        return;
      }

      const themeUpdateResult = await axios.post(
        "/api/users/updateDefaultTheme",
        {
          uuid,
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

  return (
    <>
      <ActionHeader>
        <Palette />
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
    </>
  );
};

export default CustomizationTab;
