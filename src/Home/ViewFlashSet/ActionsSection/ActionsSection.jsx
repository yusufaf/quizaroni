
import { FormControlLabel, IconButton, Menu, MenuItem, Switch, Typography } from '@mui/material/';
import { Download, EditNotifications, MenuOpen } from '@mui/icons-material/';
import { DISABLED, ENABLED } from "src/utilities/constants";
import { useTheme } from "src/theme/useTheme";

const ActionsSection = props => {
    const {
        controlAnchorRef,
        disableBackgroundColor,
        disableTextColor,
        handleDisableColorToggle,
        setShowControlMenu,
        setShowDownloadPopup,
        setShowNotificationsModal,
        setStudySetViewable,
        showControlMenu,
        studySetViewable,
    } = props;

    const { theme } = useTheme();

    const handleOpenControlMenu = () => {
        setShowControlMenu(true);
    }

    const handleCloseControlMenu = () => {
        setShowControlMenu(false);
    }

    return (
        <>
            <div style={{ marginTop: "1rem" }}>
                <IconButton
                    onClick={() => setShowDownloadPopup(true)}
                    sx={{
                        padding: "0.75rem"
                    }}
                >
                    <Download />
                </IconButton>
                <Typography
                    component="span"
                >
                    Download
                </Typography>
            </div>
            <div>
                <IconButton
                    onClick={() => setShowNotificationsModal(true)}
                    sx={{
                        padding: "0.75rem"
                    }}
                >
                    <EditNotifications />
                </IconButton>
                <Typography
                    component="span"
                >
                    Manage Notifications
                </Typography>
            </div>
            <div
                ref={controlAnchorRef}
            >
                <IconButton
                    onClick={handleOpenControlMenu}
                    sx={{
                        padding: "0.75rem"
                    }}
                >
                    <MenuOpen />
                </IconButton>

                <Typography
                    component="span"
                >
                    Control Menu
                </Typography>
            </div>
            <Menu
                open={showControlMenu}
                onClose={handleCloseControlMenu}
                anchorEl={controlAnchorRef.current}
            >
                <MenuItem>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={disableTextColor}
                                onChange={() => handleDisableColorToggle("TEXT")}
                            />
                        } label={
                            <Typography
                                sx={{
                                    color: disableTextColor ? theme.palette.error.main : theme.palette.success.main
                                }}
                            >
                                {`Text Color: ${disableTextColor ? DISABLED : ENABLED}`}
                            </Typography>
                        }
                    />
                </MenuItem>
                <MenuItem>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={disableBackgroundColor}
                                onChange={() => handleDisableColorToggle("BACKGROUND")}
                            />
                        }
                        label={
                            <Typography
                                sx={{
                                    color: disableBackgroundColor ? theme.palette.error.main : theme.palette.success.main
                                }}
                            >
                                {`Background Color: ${disableBackgroundColor ? DISABLED : ENABLED}`}
                            </Typography>
                        }
                    />
                </MenuItem>
                <MenuItem>
                    <FormControlLabel control={
                        <Switch
                            size="small"
                            checked={studySetViewable}
                            onChange={() => setStudySetViewable(!studySetViewable)}
                        />
                    } label={
                        <Typography
                            sx={{
                                color: studySetViewable ?  theme.palette.success.main : theme.palette.error.main
                            }}
                        >
                            {`Viewable: ${studySetViewable ? "Public" : "Private"}`}
                        </Typography>
                    }
                    />
                </MenuItem>
            </Menu>
        </>
    )
}

export default ActionsSection;