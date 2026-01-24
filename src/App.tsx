import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect } from 'react';
import FeedbackDialog from 'shared/components/FeedbackDialog/FeedbackDialog';
import Footer from 'views/Footer/Footer';
import NavBar from 'views/NavBar/NavBar';
import { useTheme } from 'shared/theme/useTheme';
import { DARK, LIGHT } from 'shared/constants/index';
import AppRoutes from './AppRoutes';
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

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const { loadingActions } = useGlobalStore();

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    return (
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
    );
};

export default App;
