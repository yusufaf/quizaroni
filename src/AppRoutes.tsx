import { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from 'views/Home/Home';
import Landing from 'views/Landing/Landing';
// import Login from 'views/Login/Login';
// import Signup from 'views/Signup/Signup';
import CreateSet from 'views/Create/CreateSet';
// import ForgotPassword from 'views/ForgotPassword/ForgotPassword';
import Profile from 'views/Profile/Profile';
// import ConfirmEmail from 'views/ConfirmEmail/ConfirmEmail';
import ViewStudySet from 'views/ViewStudySet/ViewStudySet';
import Explore from 'views/Explore/Explore';
import NotFound from 'views/NotFound/NotFound';
import StudyMode from 'views/Study/StudyMode';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';

type RequireAuthProps = {
    children: ReactNode;
    authenticated: boolean;
};

const RequireAuth = ({ children, authenticated }: RequireAuthProps) => {
    return authenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
    const { authStatus } = useAuthenticator((context) => [context.authStatus]);
    const authenticated = authStatus === 'authenticated';

    const location = useLocation();

    const protectedRoutes = [
        { path: '/create', element: <CreateSet /> },
        { path: '/create/:id', element: <CreateSet /> },
        { path: '/profile', element: <Profile /> },
        { path: '/explore', element: <Explore /> },
        { path: '/view/:id', element: <ViewStudySet /> },
        { path: '/edit/:id', element: <CreateSet /> },
        { path: '/study/:studysetId/:mode', element: <StudyMode /> },
    ];

    // Determine initial state based on the current route
    const getInitialState = () => {
        const path = location.pathname.toLowerCase();
        switch (path) {
            case '/login':
                return 'signIn';
            case '/signup':
                return 'signUp';
            case '/forgotpassword':
                return 'forgotPassword';
            default:
                return undefined;
        }
    };

    const AuthenticatorRoute = () => {
        if (authenticated) {
            return <Navigate to="/" replace />;
        }

        const initialState = getInitialState();
        return <Authenticator initialState={initialState} />;
    };

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={authenticated ? <Home /> : <Landing />} />
            <Route path="/login" element={<AuthenticatorRoute />} />
            <Route path="/signUp" element={<AuthenticatorRoute />} />

            {/* <Route path="/signup" element={<Signup />} /> */}
            {/* <Route path="/forgotPassword" element={<ForgotPassword />} />
            <Route path="/confirmEmail" element={<ConfirmEmail />} /> */}

            {/* Protected Routes */}
            {protectedRoutes.map(({ path, element }) => (
                <Route
                    key={path}
                    path={path}
                    element={
                        <RequireAuth authenticated={authenticated}>
                            {element}
                        </RequireAuth>
                    }
                />
            ))}

            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
