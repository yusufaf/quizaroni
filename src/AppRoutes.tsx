import { Routes, Route } from "react-router-dom";
// TODO: Index files?
import Home from "./Home/Home";
import Login from "./Login/Login";
import Signup from "./Signup/Signup";
import CreateSet from "./CreateSet/CreateSet";
import ForgotPassword from "./ForgotPassword/ForgotPassword";
import Profile from "./Profile/Profile";
import ConfirmEmail from "./ConfirmEmail/ConfirmEmail";


type Props = {};

const AppRoutes = (props: Props) => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route
                path="/login"
                element={
                    <Login
            
                    />
                }
            />
            <Route
                path="/signup"
                element={
                    <Signup
                    />
                }
            />
            <Route
                path="/create"
                element={<CreateSet  />}
            />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route
                path="/profile"
                element={
                    <Profile
                     
                    />
                }
            />
            <Route path="/explore" element={<></>} />
            {/* TODO: Route for view / editing flashsets */}
            <Route path="/view/:id" />

            {/* <Route path="*" element={<NotFound />} /> */}
            <Route path="/confirmEmail" element={<ConfirmEmail />} />
        </Routes>
    );
};

export default AppRoutes;
