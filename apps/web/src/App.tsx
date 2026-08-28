import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect } from 'react';
import { useLogto } from '@logto/react';
import { setAccessTokenGetter } from 'state/api/awsAPI';
import FeedbackDialog from 'shared/components/FeedbackDialog/FeedbackDialog';
import Footer from 'views/Footer/Footer';
import NavBar from 'views/NavBar/NavBar';
import MobileBottomNav from 'views/NavBar/MobileBottomNav';
import { useTheme } from 'shared/theme/useTheme';
import { DARK, LIGHT } from 'shared/constants/index';
import AppRoutes from './AppRoutes';
import { GlobalSyncInitializer } from 'state/local';
import { GamificationSyncInitializer } from 'state/local/components/GamificationSyncInitializer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GlobalConfirmDialog from 'shared/components/GlobalConfirmDialog/GlobalConfirmDialog';
import ManageLabelsDialog from 'shared/components/ManageLabelsDialog/ManageLabelsDialog';
import { useGlobalStore } from 'state/stores/global';
import LoadingIndicator from 'shared/components/LoadingIndicator/LoadingIndicator';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from 'state/queryClient';
import { AppWrapper, MainContent } from 'styles/AppStyles';
import { useLocation } from 'react-router-dom';
import { ShortcutProvider } from 'shared/keyboard/ShortcutRegistry';
import { useGlobalKeyListener } from 'shared/keyboard/useGlobalKeyListener';
import { ShortcutHelpModal } from 'shared/keyboard/ShortcutHelpModal';
import { NavShortcuts } from 'shared/keyboard/NavShortcuts';
import { isStudyRoute } from 'shared/utilities/routes';
import PwaUpdateToast from 'shared/components/PwaUpdateToast/PwaUpdateToast';
import InstallAppPrompt from 'shared/components/InstallAppPrompt/InstallAppPrompt';

const ShortcutLayer = () => {
    useGlobalKeyListener();
    const location = useLocation();
    return (
        <>
            {!isStudyRoute(location.pathname) && <NavShortcuts />}
            <ShortcutHelpModal />
        </>
    );
};

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const { loadingActions } = useGlobalStore();
    const { getAccessToken, isAuthenticated } = useLogto();

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    // useLogto() only works inside a component's render tree, so awsAPI.ts
    // can't call it directly — wire the real getter here instead. This runs
    // during render, not in a useEffect: effects fire children-first, so a
    // child's query (e.g. useGetUser() on mount) could otherwise call
    // getCommonPostRequestProps() before this effect ever ran, sending an
    // unauthenticated request that 401s. React Query would retry and recover
    // on its own, but by then it's too late: some callers destructure the
    // errored response without a fallback, so the render throws before the
    // retry ever lands, and with no error boundary in the app that crash
    // takes down the whole tree.
    setAccessTokenGetter(async () => {
        if (!isAuthenticated) {
            return undefined;
        }
        return getAccessToken(import.meta.env.VITE_LOGTO_API_RESOURCE);
    });

    return (
        <QueryClientProvider client={queryClient}>
            <ShortcutProvider>
                <GlobalSyncInitializer enableSync={true} />
                <GamificationSyncInitializer />
                <AppWrapper>
                    <NavBar />
                    {loadingActions.length > 0 && <LoadingIndicator />}
                    <MainContent>
                        <AppRoutes />
                    </MainContent>
                    <Footer />
                    <MobileBottomNav />
                </AppWrapper>
                <FeedbackDialog />
                <ToastContainer theme={theme} />
                <PwaUpdateToast />
                <InstallAppPrompt />
                <GlobalConfirmDialog />
                <ManageLabelsDialog />
                <ShortcutLayer />
            </ShortcutProvider>
        </QueryClientProvider>
    );
};

export default App;
