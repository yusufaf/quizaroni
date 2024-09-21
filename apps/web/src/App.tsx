import useMediaQuery from '@mui/material/useMediaQuery';
import { useEffect } from 'react';
import FeedbackDialog from 'components/FeedbackDialog/FeedbackDialog';
import Footer from 'views/Footer/Footer';
import NavBar from 'views/NavBar/NavBar';
import { useTheme } from 'theme/useTheme';
import { DARK, LIGHT } from 'utilities/constants';
import AppRoutes from './AppRoutes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GlobalConfirmDialog from 'components/GlobalConfirmDialog/GlobalConfirmDialog';
import ManageLabelsDialog from 'components/ManageLabelsDialog/ManageLabelsDialog';
import ConfirmationCodeDialog from 'components/ConfirmationCodeDialog/ConfirmationCodeDialog';
import { useAppSelector } from 'state/reduxHooks';
import { selectLabelsDialogProps } from 'state/slices/globalSlice';

const App = () => {
    const { setTheme, theme } = useTheme();
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const labelsDialogProps = useAppSelector(selectLabelsDialogProps);

    useEffect(() => {
        prefersDarkMode ? setTheme(DARK) : setTheme(LIGHT);
    }, [prefersDarkMode]);

    return (
        <>
            <NavBar />
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
