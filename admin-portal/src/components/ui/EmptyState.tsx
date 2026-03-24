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
            className={`flex flex-col items-center justify-center gap-4 text-center py-16 ${className}`}
        >
            <div className="w-16 h-16 rounded-[24px] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-2">
                {icon ?? <Inbox className="w-7 h-7" aria-hidden />}
            </div>
            <div className="space-y-1">
                <p className="text-base font-bold text-slate-900 leading-tight">{title || 'No Information Available'}</p>
                {description && (
                    <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">{description}</p>
                )}
            </div>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
