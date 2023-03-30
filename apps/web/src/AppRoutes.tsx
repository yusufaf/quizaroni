import { Routes, Route } from 'react-router-dom';
// TODO: Index files?
import Home from './Home/Home';
import Login from './Login/Login';
import Signup from './Signup/Signup';
import CreateSet from './CreateSet/CreateSet';
import ForgotPassword from './ForgotPassword/ForgotPassword';
import Profile from './Profile/Profile';

interface Props {
  userAuthState: boolean;
  setUserAuthState: (state: boolean) => void;
}

const AppRoutes: React.FC<Props> = ({ userAuthState, setUserAuthState }) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home userAuthState={userAuthState} />
        }
      />
      <Route
        path="/login"
        element={
          <Login userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
        }
      />
      <Route
        path='/signup'
        element={
          <Signup userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
        }
      />
      <Route
        path="/create"
        element={
          <CreateSet userAuthState={userAuthState} />
        }
      />
      <Route
        path="/forgot"
        element={
          <ForgotPassword />
        }
      />
      <Route
        path="/profile"
        element={
          <Profile userAuthState={userAuthState} setUserAuthState={setUserAuthState} />
        }
      />
      <Route
        path="/explore"
        element={
          <></>
        }
      />
      {/* TODO: Route for view / editing flashsets */}
      <Route
        path="/view/:id"
      />

      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
};

export default AppRoutes;
