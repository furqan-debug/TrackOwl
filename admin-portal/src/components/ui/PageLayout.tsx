import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface PageLayoutProps {
    title?: string;
    description?: string;
    children: ReactNode;
    /** Max width: '7xl' (1280px) default, or 'full' for no max */
    maxWidth?: '7xl' | '6xl' | 'full';
    /** Optional actions (e.g. buttons) to show next to title on desktop */
    actions?: ReactNode;
}

export function PageLayout({
    title,
    description,
    children,
    maxWidth = '7xl',
    actions,
}: PageLayoutProps) {
    const maxClass =
        maxWidth === '7xl' ? 'max-w-7xl' : maxWidth === '6xl' ? 'max-w-6xl' : '';

    return (
        <div className={clsx("p-6 md:p-10 mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-700", maxClass)}>
            {(title || actions) && (
                <div className="mb-6 md:mb-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            {title && (
                                <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight mb-4 text-balance">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="text-sm font-medium text-text-muted max-w-2xl opacity-70 leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div className="flex items-center gap-4 shrink-0">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
