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
        <div className={clsx("p-6 md:px-10 md:py-10 w-full animate-in fade-in slide-in-from-top-4 duration-700", maxClass)}>
            {(title || actions) && (
                <div className="mb-10 md:mb-12">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            {backButton && (
                                <button
                                    onClick={backButton.onClick}
                                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors mb-6 group"
                                >
                                    <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 group-hover:border-primary transition-colors">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                                        </svg>
                                    </span>
                                    {backButton.label || 'Project Backtrack'}
                                </button>
                            )}
                            {title && (
                                <h1 className="text-3xl md:text-[42px] font-black text-slate-900 tracking-tighter uppercase leading-[0.85] mb-2">
                                    {title}
                                </h1>
                            )}
                            {description && (
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] max-w-2xl leading-relaxed opacity-80">
                                    {description}
                                </p>
                            )}
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
