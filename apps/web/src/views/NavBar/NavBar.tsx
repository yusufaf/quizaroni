import { Create, Logout as LogoutIcon } from "@mui/icons-material";
import {
    AppBar,
    IconButton,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material/";
import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    selectAuthenticated,
    setAuthenticated,
} from "state/slices/globalSlice";
import ProfileDropdown from "views/Profile/ProfileDropdown";
import { useTheme } from "theme/useTheme";
import { ROUTES } from "utilities/constants";
import NavDrawer from "./NavDrawer";
import {
    AuthenticationButton,
    LoginButtonsContainer,
    NavItemsContainer,
    NavLinksContainer,
    NavRightActions,
    ProfileIconContainer,
    StyledAccountIcon,
    StyledNavLink,
} from "./NavStyles";
import { signOut } from "aws-amplify/auth";
import { BoldButton } from "common/AppStyles";
import DarkModeToggleButton from "./DarkModeToggleButton";
import { createStudyset } from "api/awsAPI";

type Props = {};

const NavBar = (props: Props) => {
    const { isDarkMode, toggleDarkMode, muiTheme } = useTheme();

    // TODO: Verify that a medium breakpoint works to handle mobile cases, can always add more breakpoints
    const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);

    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const activeLinkStyle = ({ isActive }) => ({
        borderBottom: isActive ? "0.2rem solid orange" : "none",
        color: `${muiTheme.palette.text.primary}`,
    });

    const handleLogout = async () => {
        try {
            const result = await signOut();
            console.log("Sign-In Result = ", result);

            dispatch(setAuthenticated(false));
        } catch (error) {
            console.log("error signing out: ", error);
        }
    };

    const displayDropdown = () => {
        setShowDropdown(true);
    };

    const closeDropdown = () => {
        setShowDropdown(false);
    };

    // TODO: Switch to RTK query after
    const handleCreateStudyset = async () => {
        const { studyset } = await createStudyset();
        navigate(`/create/${studyset.studysetUUID}`)
    }

    return (
        <AppBar position="static" color="inherit">
            <Toolbar>
                {/*
                    TODO: Revisit what to do with logo 
                    <AppLogo
                        src={QuizaroniLogo}
                        alt="Quizaroni logo"
                    /> */}
                <Typography color="primary" variant="h4">
                    Quizaroni
                </Typography>
                {isMobile && <NavDrawer />}
                {!isMobile && (
                    <NavItemsContainer>
                        <NavLinksContainer>
                            <StyledNavLink to="/" style={activeLinkStyle}>
                                Home
                            </StyledNavLink>
                            <StyledNavLink
                                to="/explore"
                                style={activeLinkStyle}
                            >
                                Explore
                            </StyledNavLink>
                            <BoldButton
                                variant="contained"
                                onClick={handleCreateStudyset}
                                size="large"
                                startIcon={<Create />}
                            >
                                Create Study Set
                            </BoldButton>
                        </NavLinksContainer>
                        <NavRightActions>
                            {authenticated ? (
                                <>
                                    <AuthenticationButton
                                        variant="text"
                                        onClick={() => handleLogout()}
                                        startIcon={<LogoutIcon />}
                                    >
                                        Logout
                                    </AuthenticationButton>
                                </>
                            ) : (
                                <LoginButtonsContainer>
                                    <AuthenticationButton
                                        variant="outlined"
                                        onClick={() => navigate(ROUTES.LOGIN)}
                                    >
                                        Log in
                                    </AuthenticationButton>
                                    <AuthenticationButton
                                        variant="contained"
                                        onClick={() => navigate(ROUTES.SIGNUP)}
                                    >
                                        Sign up
                                    </AuthenticationButton>
                                </LoginButtonsContainer>
                            )}
                            <DarkModeToggleButton />
                            {authenticated && (
                                <>
                                    <ProfileIconContainer
                                        onClick={displayDropdown}
                                        ref={dropdownRef}
                                    >
                                        <StyledAccountIcon />
                                    </ProfileIconContainer>
                                    <ProfileDropdown
                                        showDropdown={showDropdown}
                                        dropdownRef={dropdownRef}
                                        onClose={closeDropdown}
                                    />
                                </>
                            )}
                        </NavRightActions>
                    </NavItemsContainer>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default NavBar;
