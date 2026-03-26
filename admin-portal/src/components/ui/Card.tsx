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
                'surface-solid rounded-2xl overflow-hidden relative group transition-all duration-300',
                !noPadding && 'p-6 md:p-8',
                className
            )}
        >
            {title && (
                <div className="flex items-center justify-between mb-6 border-b border-border pb-6 -mx-8 px-8">
                    <h2 className="text-sm font-bold text-text-primary tracking-tight uppercase font-mono">
                        {title}
                    </h2>
                    <div className="flex-1 h-px bg-border-subtle ml-4" aria-hidden />
                </div>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
