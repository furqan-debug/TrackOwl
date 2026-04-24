import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
    /** Icon to show (default: Inbox) */
    icon?: ReactNode;
    title: string;
    description?: string;
    /** Optional action (e.g. button or link) */
    action?: ReactNode;
    /** Min height to reserve (e.g. h-48, h-64) */
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center gap-6 text-center py-20 px-6 ${className}`}
        >
            <div className="relative">
                {/* Subtle background glow */}
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full scale-150 opacity-50" />
                <div className="relative w-20 h-20 rounded-[28px] bg-white border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm">
                    {icon ?? <Inbox className="w-8 h-8 opacity-40" aria-hidden />}
                </div>
            </div>
            <div className="space-y-2 relative z-10">
                <p className="text-lg font-bold text-slate-900 tracking-tight leading-none">{title || 'Data Unavailable'}</p>
                {description && (
                    <p className="text-[13px] text-slate-500 max-w-sm mx-auto font-medium leading-relaxed opacity-80">{description}</p>
                )}
            </div>
            {action && <div className="mt-4 relative z-10">{action}</div>}
        </div>
    );
}
