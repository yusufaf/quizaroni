import { lazy, ReactNode, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from 'views/Landing/Landing';
import LoadingIndicator from 'shared/components/LoadingIndicator/LoadingIndicator';
// import Login from 'views/Login/Login';
// import Signup from 'views/Signup/Signup';
// import ForgotPassword from 'views/ForgotPassword/ForgotPassword';
// import ConfirmEmail from 'views/ConfirmEmail/ConfirmEmail';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';

// Route-level code splitting: keep Landing eager (first paint for logged-out
// visitors); lazy-load everything else so heavy deps (jsPDF, data-grid,
// amplify, framer-motion, react-color, dicebear) stay out of the entry chunk.
const Home = lazy(() => import('views/Home/Home'));
const CreateSet = lazy(() => import('views/Create/CreateSet'));
const Profile = lazy(() => import('views/Profile/Profile'));
const ViewStudySet = lazy(() => import('views/ViewStudySet/ViewStudySet'));
const CombineSets = lazy(() => import('views/CombineSets/CombineSets'));
const Explore = lazy(() => import('views/Explore/Explore'));
const NotFound = lazy(() => import('views/NotFound/NotFound'));
const StudyMode = lazy(() => import('views/Study/StudyMode'));
const PublicStudySet = lazy(
    () => import('views/PublicStudySet/PublicStudySet')
);

type RequireAuthProps = {
    children: ReactNode;
    authenticated: boolean;
};

const RequireAuth = ({ children, authenticated }: RequireAuthProps) => {
    const location = useLocation();
    const from = location.pathname + location.search;
    return authenticated ? (
        <>{children}</>
    ) : (
        <Navigate to="/login" state={{ from }} replace />
    );
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
        { path: '/combine/:id', element: <CombineSets /> },
        { path: '/edit/:id', element: <CreateSet /> },
        { path: '/study/:studysetId/:mode', element: <StudyMode /> },
    ];

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
            const from = location.state?.from ?? '/';
            return <Navigate to={from} replace />;
        }

        const initialState = getInitialState();
        return <Authenticator initialState={initialState} />;
    };

    return (
        <Suspense fallback={<LoadingIndicator />}>
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/"
                    element={authenticated ? <Home /> : <Landing />}
                />
                <Route path="/login" element={<AuthenticatorRoute />} />
                <Route path="/signUp" element={<AuthenticatorRoute />} />

                {/* Study set view — full owner experience when authenticated,
                    read-only public page (via the no-auth endpoint) otherwise.
                    Keeping the same URL means existing share links keep working
                    for logged-out visitors and crawlers. */}
                <Route
                    path="/view/:id"
                    element={
                        authenticated ? <ViewStudySet /> : <PublicStudySet />
                    }
                />

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
        </Suspense>
    );
};

export default AppRoutes;
