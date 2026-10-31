import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
    children: ReactNode;
    fallback: ReactNode;
    /** A change (e.g. the pathname) clears a caught error. */
    resetKey?: unknown;
};

type State = {
    error: Error | null;
};

/**
 * Without a boundary, one render error unmounts the whole app, including the
 * PWA update toast that would deliver the fix.
 */
class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(error, info.componentStack);
    }

    componentDidUpdate(prevProps: Props) {
        if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ error: null });
        }
    }

    render() {
        return this.state.error ? this.props.fallback : this.props.children;
    }
}

export default ErrorBoundary;
