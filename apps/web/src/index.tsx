import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthProvider';
import { CustomThemeProvider } from './shared/theme/ThemeProvider';
import { CssBaseline } from '@mui/material';

// Initialize i18n before rendering
import './i18n';

import './index.css';
import App from './App';
import ErrorBoundary from './shared/components/ErrorBoundary/ErrorBoundary';
import CrashFallback from './shared/components/ErrorBoundary/CrashFallback';

const domElement = document.getElementById('root') as Element;
const root = createRoot(domElement);
root.render(
    <AuthProvider>
        <BrowserRouter>
            <CustomThemeProvider>
                <CssBaseline />
                <ErrorBoundary fallback={<CrashFallback />}>
                    <App />
                </ErrorBoundary>
            </CustomThemeProvider>
        </BrowserRouter>
    </AuthProvider>
);
