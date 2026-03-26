import type { ReactNode } from 'react';
import clsx from 'clsx';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface StatusBadgeProps {
    variant?: StatusVariant;
    children: ReactNode;
    className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    default: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

export function StatusBadge({ variant = 'default', children, className }: StatusBadgeProps) {
    return (
        <span className={clsx(
            "inline-flex items-center px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest font-mono",
            variantClasses[variant],
            className
        )}>
            {children}
        </span>
    );
}
