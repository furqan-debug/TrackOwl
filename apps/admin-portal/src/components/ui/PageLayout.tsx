import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface PageLayoutProps {
    title?: string;
    eyebrow?: string;
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
    eyebrow,
    description,
    children,
    maxWidth = '7xl',
    actions,
    backButton,
}: PageLayoutProps) {
    const maxClass =
        maxWidth === '7xl' ? 'max-w-7xl mx-auto' : maxWidth === '6xl' ? 'max-w-6xl mx-auto' : 'max-w-[1600px] mx-auto';

    return (
        <div className={clsx("p-6 md:px-10 md:py-12 w-full animate-in fade-in slide-in-from-top-4 duration-1000", maxClass)}>
            {(title || actions) && (
                <div className="mb-10 md:mb-16">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-4">
                            {backButton && (
                                <button
                                    onClick={backButton.onClick}
                                    className="flex items-center gap-3 text-[13px] font-bold text-[var(--text-muted)] hover:text-primary transition-all duration-300 group mb-2"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all shadow-shell-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 12H5M12 19l-7-7 7-7" />
                                        </svg>
                                    </div>
                                    {backButton.label || 'Go Back'}
                                </button>
                            )}
                            <div className="space-y-1">
                                {eyebrow && (
                                    <span className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-text-muted uppercase block">
                                        {eyebrow}
                                    </span>
                                )}
                                {title && (
                                    <h1 className="text-3xl md:text-4xl font-bold heading-gradient">
                                        {title}
                                    </h1>
                                )}
                                {description && (
                                    <p className="text-[14px] md:text-[16px] font-medium text-text-muted max-w-2xl leading-relaxed">
                                        {description}
                                    </p>
                                )}
                            </div>
                        </div>
                        {actions && (
                            <div className="flex items-center gap-4 shrink-0 pb-1">
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
