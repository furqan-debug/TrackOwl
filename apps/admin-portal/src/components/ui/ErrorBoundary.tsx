import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    recovering: boolean;
}

// Errors that mean "the code this tab is holding is stale", not "the code is
// wrong". A deploy replaces the hashed chunk files, so a tab left open asks
// for a chunk that no longer exists. A dev-server restart or a branch switch
// leaves the module graph half-swapped, which surfaces as React's internal
// dispatcher being null — hence the `useContext` of null. In every one of
// these cases the page is one reload away from being correct.
const RECOVERABLE = [
    /failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /importing a module script failed/i,
    /chunkloaderror/i,
    /loading chunk \S+ failed/i,
    /loading css chunk/i,
    // React's dispatcher is null, so any hook call blows up on the same shape.
    /cannot read propert(y|ies) of null \(reading '(use[A-Z]\w*|__\w+)'\)/i,
    /null is not an object \(evaluating '\w*\.use[A-Z]/i,
    // A chunk URL that now resolves to index.html instead of JavaScript.
    /unexpected token '<'/i,
];

// One automatic reload, then stop. If the page comes straight back with
// another error the reload plainly did not help, so it is a real bug and the
// user gets the card instead of an endless refresh loop.
const RELOAD_MARK = 'errorBoundary:autoReloadedAt';
const RELOAD_COOLDOWN_MS = 15_000;

function isRecoverable(error: Error): boolean {
    const text = `${error.name}: ${error.message}`;
    return RECOVERABLE.some((pattern) => pattern.test(text));
}

function reloadedRecently(): boolean {
    try {
        const at = Number(sessionStorage.getItem(RELOAD_MARK) ?? 0);
        return at > 0 && Date.now() - at < RELOAD_COOLDOWN_MS;
    } catch {
        // Private mode or blocked storage. Without a marker we cannot tell a
        // first failure from a loop, so we never auto-reload.
        return true;
    }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
        error: null,
        recovering: false,
    };

    public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Unhandled application error:', error, errorInfo);

        if (!isRecoverable(error) || reloadedRecently()) return;

        try {
            sessionStorage.setItem(RELOAD_MARK, String(Date.now()));
        } catch {
            return;
        }

        // Reload rather than route away, so the user lands back on the same
        // page with the data refetched from scratch.
        this.setState({ recovering: true });
        window.location.reload();
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleReset = () => {
        this.setState({ hasError: false, error: null, recovering: false });
    };

    public render() {
        if (this.state.recovering) {
            return (
                <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center p-6">
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Refreshing this page…
                    </div>
                </div>
            );
        }

        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-8 text-center shadow-xl">
                        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                        <p className="text-sm text-[var(--text-muted)] mb-6">
                            An unexpected error occurred while rendering this page. You can try refreshing the page or navigating back.
                        </p>
                        {this.state.error && (
                            <div className="mb-6 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-left text-xs font-mono text-red-400 overflow-auto max-h-32">
                                {this.state.error.message}
                            </div>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="secondary"
                                onClick={this.handleReset}
                                className="text-xs"
                            >
                                Try Again
                            </Button>
                            <Button
                                variant="primary"
                                onClick={this.handleReload}
                                className="flex items-center gap-2 text-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
