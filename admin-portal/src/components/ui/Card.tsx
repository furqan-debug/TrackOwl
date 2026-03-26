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
                'bg-surface-solid rounded-xl overflow-hidden relative group transition-all duration-300 border border-border shadow-sm',
                !noPadding && 'p-6 md:p-8',
                className
            )}
        >
            {(title || actions) && (
                <div className="flex items-center justify-between mb-6 border-b border-border/10 pb-4">
                    <div className="space-y-1">
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
                        <div className="flex-1 h-px bg-border/5 ml-4" aria-hidden />
                    )}
                </div>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
