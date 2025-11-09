import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CustomThemeProvider } from './shared/theme/ThemeProvider';
import { CssBaseline } from '@mui/material';

import './index.css';
import '@aws-amplify/ui-react/styles.css';
import App from './App';

import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import { Authenticator } from '@aws-amplify/ui-react';
Amplify.configure(awsExports);

const domElement = document.getElementById('root') as Element;
const root = createRoot(domElement);
root.render(
    <Authenticator.Provider>
        <BrowserRouter>
            <CustomThemeProvider>
                <CssBaseline />
                <App />
            </CustomThemeProvider>
        </BrowserRouter>
    </Authenticator.Provider>
);
