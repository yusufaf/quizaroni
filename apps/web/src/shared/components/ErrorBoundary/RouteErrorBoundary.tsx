import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import CrashFallback from './CrashFallback';

/**
 * Keeps the nav and toasts (including the PWA update toast) mounted when a
 * page crashes. `location.key` changes on every navigation, including to the
 * same path, so following any link clears the error.
 */
const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
    const { key } = useLocation();
    return (
        <ErrorBoundary fallback={<CrashFallback />} resetKey={key}>
            {children}
        </ErrorBoundary>
    );
};

export default RouteErrorBoundary;
