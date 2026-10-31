import { Component, type ReactNode } from 'react';

type Props = {
    children: ReactNode;
    fallback: ReactNode;
    /** A change (e.g. the location key) clears a caught error. */
    resetKey?: unknown;
};

type State = {
    error: Error | null;
};

/**
 * Without a boundary, one render error unmounts the whole app, including the
 * PWA update toast that would deliver the fix. React itself logs what it
 * catches, with the component stack.
 */
class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
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
