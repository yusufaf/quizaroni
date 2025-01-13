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
import { useAppSelector } from 'state/reduxHooks';
import {
    selectLabelsDialogProps,
    selectLoadingActions,
} from 'state/slices/globalSlice';
import LoadingIndicator from 'shared/components/LoadingIndicator/LoadingIndicator';

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const labelsDialogProps = useAppSelector(selectLabelsDialogProps);
    const loadingActions = useAppSelector(selectLoadingActions);

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    return (
        <>
            <NavBar />
            {loadingActions.length > 0 && <LoadingIndicator />}
            <AppRoutes />
            <Footer />
            <FeedbackDialog />
            <ToastContainer theme={theme} />
            <GlobalConfirmDialog />
            {labelsDialogProps.open && (
                <ManageLabelsDialog labelsDialogProps={labelsDialogProps} />
            )}
            <ConfirmationCodeDialog />
        </>
    );
};

export default App;
