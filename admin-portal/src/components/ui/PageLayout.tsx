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
    /** Optional back button configuration */
    backButton?: {
        onClick: () => void | Promise<void>;
        label?: string;
    };
}

export function PageLayout({
    title,
    description,
    children,
    maxWidth = '7xl',
    actions,
    backButton,
}: PageLayoutProps) {
    const maxClass =
        maxWidth === '7xl' ? 'max-w-7xl' : maxWidth === '6xl' ? 'max-w-6xl' : '';

    return (
        <div className={clsx("p-6 md:p-10 mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-700", maxClass)}>
            {(title || actions) && (
                <div className="mb-6 md:mb-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            {backButton && (
                                <button
                                    onClick={backButton.onClick}
                                    className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest hover:text-primary transition-colors mb-4 group"
                                >
                                    <span className="p-1 rounded-md bg-surface-subtle border border-border group-hover:border-primary transition-colors">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                                        </svg>
                                    </span>
                                    {backButton.label || 'Back'}
                                </button>
                            )}
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
