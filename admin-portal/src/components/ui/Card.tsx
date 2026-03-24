import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps {
    children: ReactNode;
    title?: string;
    className?: string;
    /** If true, card has no padding (for tables/charts that need full bleed) */
    noPadding?: boolean;
}

export function Card({
    children,
    title,
    className,
    noPadding = false,
}: CardProps) {
    return (
        <div
            className={clsx(
                'bg-white border border-slate-200 rounded-[32px] overflow-hidden relative group transition-all duration-300 hover:shadow-lg',
                !noPadding && 'p-8 md:p-10',
                className
            )}
        >
            {title && (
                <div className="flex items-center justify-between mb-8 px-8 md:px-10">
                    <h2 className="text-[17px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {title}
                    </h2>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-6" aria-hidden />
                </div>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
