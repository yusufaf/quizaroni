import { Routes, Route } from "react-router-dom";
import Home from "views/Home/Home";
import Login from "views/Login/Login";
import Signup from "views/Signup/Signup";
import CreateSet from "views/Create/CreateSet";
import ForgotPassword from "views/ForgotPassword/ForgotPassword";
import Profile from "views/Profile/Profile";
import ConfirmEmail from "views/ConfirmEmail/ConfirmEmail";
import ViewFlashSet from "views/Home/ViewFlashSet/ViewFlashSet";

type Props = {};

const AppRoutes = (props: Props) => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/create" element={<CreateSet />} />
            <Route path="/forgotPassword" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/explore" element={<></>} />
            {/* TODO: Route for view / editing flashsets */}
            <Route path="/view/:id" element={<ViewFlashSet />} />
            <Route path="/edit/:id" element={<CreateSet type="Edit" />} />

            {/* <Route path="*" element={<NotFound />} /> */}
            <Route path="/confirmEmail" element={<ConfirmEmail />} />
        </Routes>
    );
};

export default AppRoutes;
