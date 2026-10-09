import type { ReactNode } from 'react';
import clsx from 'clsx';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
    variant?: StatusVariant;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * The text tones are set per theme. The 700 weights are chosen against a white
 * card and carry 5.5:1 there, but only 3.1:1 on a dark one — a dark green on a
 * dark ground. The 300/400 weights take over in dark mode, where emerald-400
 * measures 8.8:1 against the same card.
 */
const variantClasses: Record<StatusVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    default: 'bg-slate-500/10 text-text-muted border-slate-500/20',
};

export function StatusBadge({ variant = 'default', icon, children, className }: StatusBadgeProps) {
    return (
        <span className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-bold font-mono",
            variantClasses[variant],
            className
        )}>
            {icon && <span className="shrink-0 opacity-80">{icon}</span>}
            {children}
        </span>
    );
}
