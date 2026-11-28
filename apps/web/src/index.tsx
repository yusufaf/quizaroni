import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './shared/auth/session/SessionProvider';
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
    <SessionProvider>
        <BrowserRouter>
            <CustomThemeProvider>
                <CssBaseline enableColorScheme />
                <ErrorBoundary fallback={<CrashFallback />}>
                    <App />
                </ErrorBoundary>
            </CustomThemeProvider>
        </BrowserRouter>
    </SessionProvider>
);
