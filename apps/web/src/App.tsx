import useMediaQuery from '@mui/material/useMediaQuery';
import { lazy, Suspense, useEffect } from 'react';
import { useLogto } from '@logto/react';
import { setAccessTokenGetter } from 'state/api/awsAPI';
import Footer from 'views/Footer/Footer';
import NavBar from 'views/NavBar/NavBar';
import MobileBottomNav from 'views/NavBar/MobileBottomNav';
import { useTheme } from 'shared/theme/useTheme';
import { DARK, LIGHT } from 'shared/constants/index';
import AppRoutes from './AppRoutes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
import MountOnFirstOpen from 'shared/components/MountOnFirstOpen/MountOnFirstOpen';

// The sync engine and gamification store pull in the local database (Dexie),
// which the landing page doesn't need for its first paint.
const GlobalSyncInitializer = lazy(() =>
    import('state/local/components/GlobalSyncInitializer').then((m) => ({
        default: m.GlobalSyncInitializer,
    }))
);
const GamificationSyncInitializer = lazy(() =>
    import('state/local/components/GamificationSyncInitializer').then((m) => ({
        default: m.GamificationSyncInitializer,
    }))
);

// Out of the entry chunk: the landing page never opens these.
const FeedbackDialog = lazy(
    () => import('shared/components/FeedbackDialog/FeedbackDialog')
);
const GlobalConfirmDialog = lazy(
    () => import('shared/components/GlobalConfirmDialog/GlobalConfirmDialog')
);
const ManageLabelsDialog = lazy(
    () => import('shared/components/ManageLabelsDialog/ManageLabelsDialog')
);

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

    const {
        loadingActions,
        feedbackDialogOpen,
        confirmDialogProps,
        labelsDialogProps,
    } = useGlobalStore();
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
                <Suspense fallback={null}>
                    <GlobalSyncInitializer enableSync={true} />
                    <GamificationSyncInitializer />
                </Suspense>
                <AppWrapper>
                    <NavBar />
                    {loadingActions.length > 0 && <LoadingIndicator />}
                    <MainContent>
                        <AppRoutes />
                    </MainContent>
                    <Footer />
                    <MobileBottomNav />
                </AppWrapper>
                <MountOnFirstOpen open={feedbackDialogOpen}>
                    <FeedbackDialog />
                </MountOnFirstOpen>
                <ToastContainer theme={theme} />
                <PwaUpdateToast />
                <InstallAppPrompt />
                <MountOnFirstOpen open={!!confirmDialogProps?.open}>
                    <GlobalConfirmDialog />
                </MountOnFirstOpen>
                <MountOnFirstOpen open={!!labelsDialogProps?.open}>
                    <ManageLabelsDialog />
                </MountOnFirstOpen>
                <ShortcutLayer />
            </ShortcutProvider>
        </QueryClientProvider>
    );
};

export default App;
