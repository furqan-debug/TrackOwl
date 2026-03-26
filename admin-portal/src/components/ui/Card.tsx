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
                'surface-solid rounded-[32px] overflow-hidden relative group transition-all duration-500 border border-border/60 shadow-sm hover:shadow-xl',
                !noPadding && 'p-8 md:p-10',
                className
            )}
        >
            {(title || actions) && (
                <div className="flex items-center justify-between mb-8 border-b border-border/40 pb-6 -mx-10 px-10">
                    <div className="space-y-1">
                        {title && (
                            <h2 className="text-[13px] font-bold text-text-primary tracking-[0.2em] uppercase font-mono italic">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-[10px] font-bold text-text-muted/40 uppercase tracking-widest font-mono">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {actions ? (
                        <div className="ml-6 flex items-center gap-4">{actions}</div>
                    ) : (
                        <div className="flex-1 h-px bg-border/20 ml-6" aria-hidden />
                    )}
                </div>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
