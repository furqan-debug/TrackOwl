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
    /** Alias for actions, used in Dashboard */
    headerAction?: ReactNode;
}

export function Card({
    children,
    title,
    subtitle,
    className,
    noPadding = false,
    actions,
    headerAction,
}: CardProps) {
    const finalActions = headerAction || actions;
    return (
        <div
            className={clsx(
                'bg-[var(--bg-surface)] rounded-shell-lg overflow-hidden relative group transition-all duration-300 border border-[var(--border-color)] shadow-soft',
                !noPadding && 'p-6 md:p-8',
                className
            )}
        >
            {(title || finalActions) && (
                <div className={clsx(
                    "flex items-center justify-between border-b border-[var(--border-color)]",
                    noPadding
                        ? "px-6 py-4 mb-4"
                        : "mb-6 pb-4"
                )}>
                    <div className="space-y-0.5">
                        {title && (
                            <h2 className="text-xs font-bold text-[var(--text-main)] ">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-[10px] font-medium text-[var(--text-muted)] opacity-60 ">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {finalActions ? (
                        <div className="ml-4 flex items-center gap-3">{finalActions}</div>
                    ) : (
                        <div className="flex-1 h-px bg-[var(--border-color)] ml-4 opacity-50" aria-hidden />
                    )}
                </div>
            )}
            <div className={clsx("relative z-10", noPadding && (title || actions) && "")}>
                {children}
            </div>
        </div>
    );
}
