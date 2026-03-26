import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
    stats?: ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    icon,
    actions,
    stats,
    className,
}: PageHeaderProps) {
    return (
        <div className={clsx("px-10 py-10 border-b border-border bg-white/50 mb-10", className)}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-5">
                        {icon && (
                            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-sm text-primary">
                                {icon}
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2 text-balance">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider opacity-80 max-w-2xl">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {actions && (
                    <div className="flex items-center gap-4 shrink-0">
                        {actions}
                    </div>
                )}
            </div>

            {stats && (
                <div className="mt-10">
                    {stats}
                </div>
            )}
        </div>
    );
}
