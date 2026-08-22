import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LogtoProvider, type LogtoConfig } from '@logto/react';
import { CustomThemeProvider } from './shared/theme/ThemeProvider';
import { CssBaseline } from '@mui/material';

// Initialize i18n before rendering
import './i18n';

import './index.css';
import App from './App';

const logtoConfig: LogtoConfig = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
    appId: import.meta.env.VITE_LOGTO_APP_ID,
    // Requesting the API resource here means every access token issued to
    // this app carries an `aud` scoped to Quizaroni's API — never a token
    // usable against another project's API (see apiAuthorizer.ts).
    resources: [import.meta.env.VITE_LOGTO_API_RESOURCE],
};

const domElement = document.getElementById('root') as Element;
const root = createRoot(domElement);
root.render(
    <LogtoProvider config={logtoConfig}>
        <BrowserRouter>
            <CustomThemeProvider>
                <CssBaseline />
                <App />
            </CustomThemeProvider>
        </BrowserRouter>
    </LogtoProvider>
);
