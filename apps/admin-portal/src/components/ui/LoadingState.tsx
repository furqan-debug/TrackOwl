import type { ReactNode } from 'react';

export interface LoadingStateProps {
    /** Optional message (default: "Loading…") */
    message?: string;
    /** Optional custom content (e.g. skeleton) instead of message */
    children?: ReactNode;
    /** Min height (default: h-48) */
    className?: string;
}

export function LoadingState({
    message = 'Assembling operational data...',
    children,
    className = 'min-h-[12rem]',
}: LoadingStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-6 text-sm ${className}`}
        >
            {children ?? (
                <>
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin shadow-glow-primary" />
                        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-primary opacity-40 animate-[spin_1.5s_linear_infinite_reverse]" />
                    </div>
                    <span className="text-[11px] font-bold text-text-muted tracking-[0.2em] animate-pulse">
                        {message}
                    </span>
                </>
            )}
        </div>
    );
}
