import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect } from 'react';
import FeedbackDialog from 'shared/components/FeedbackDialog/FeedbackDialog';
import Footer from 'views/Footer/Footer';
import NavBar from 'views/NavBar/NavBar';
import { useTheme } from 'shared/theme/useTheme';
import { DARK, LIGHT } from 'shared/constants/index';
import AppRoutes from './AppRoutes';
import { GlobalSyncInitializer } from 'state/local';
import { GamificationSyncInitializer } from 'state/local/components/GamificationSyncInitializer';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GlobalConfirmDialog from 'shared/components/GlobalConfirmDialog/GlobalConfirmDialog';
import ManageLabelsDialog from 'shared/components/ManageLabelsDialog/ManageLabelsDialog';
import ConfirmationCodeDialog from 'shared/components/ConfirmationCodeDialog/ConfirmationCodeDialog';
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

const ShortcutLayer = () => {
    useGlobalKeyListener();
    const location = useLocation();
    const isStudyRoute = location.pathname.startsWith('/study/');
    return (
        <>
            {!isStudyRoute && <NavShortcuts />}
            <ShortcutHelpModal />
        </>
    );
};

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const { loadingActions } = useGlobalStore();

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

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
                </AppWrapper>
                <FeedbackDialog />
                <ToastContainer theme={theme} />
                <GlobalConfirmDialog />
                <ManageLabelsDialog />
                <ConfirmationCodeDialog />
                <ShortcutLayer />
            </ShortcutProvider>
        </QueryClientProvider>
    );
};

export default App;
