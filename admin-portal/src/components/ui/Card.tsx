import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
    /** If true, card has no padding (for tables/charts that need full bleed) */
    noPadding?: boolean;
    actions?: ReactNode;
}

export function Card({
    children,
    title,
    subtitle,
    className,
    noPadding = false,
    actions,
}: CardProps) {
    return (
        <div
            className={clsx(
                'bg-white rounded-xl overflow-hidden relative group transition-all duration-300 border border-slate-200 shadow-sm',
                !noPadding && 'p-6 md:p-8',
                className
            )}
        >
            {(title || actions) && (
                <div className={clsx(
                    "flex items-center justify-between border-b border-slate-100",
                    noPadding
                        ? "px-6 py-4 mb-4"
                        : "mb-6 pb-4"
                )}>
                    <div className="space-y-0.5">
                        {title && (
                            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-[10px] font-medium text-text-muted opacity-60 uppercase tracking-widest">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {actions ? (
                        <div className="ml-4 flex items-center gap-3">{actions}</div>
                    ) : (
                        <div className="flex-1 h-px bg-slate-100 ml-4" aria-hidden />
                    )}
                </div>
            )}
            <div className={clsx("relative z-10", noPadding && (title || actions) && "")}>
                {children}
            </div>
        </div>
    );
}
