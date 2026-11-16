import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StatMetricProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    trend?: number;
    accent?: 'emerald' | 'amber' | 'rose' | 'primary' | 'brand-gradient';
    className?: string;
}

export function StatMetric({ icon, label, value, sub, trend, accent, className }: StatMetricProps) {
    const isBrandGradient = accent === 'brand-gradient';

    return (
        <div className={clsx(
            "bg-surface rounded-[16px] p-4 md:p-5 transition-all duration-200 group relative overflow-hidden flex flex-col justify-between min-h-[130px] md:min-h-[150px]",
            "border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow",
            className
        )}>

            <div className="flex items-center justify-between mb-3 relative z-10">
                <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-shell-sm",
                    accent === 'emerald' && "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20",
                    accent === 'amber' && "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20",
                    accent === 'rose' && "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20",
                    accent === 'primary' && "bg-primary/10 text-primary group-hover:bg-primary/20",
                    isBrandGradient && "stat-icon-brand",
                    !accent && "bg-surface-hover text-text-muted group-hover:bg-primary/5 group-hover:text-primary shadow-inner"
                )}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={clsx(
                        "text-[12px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-shell-sm border border-transparent",
                                                trend > 0
                            ? "bg-success/10 text-success border-success/20"
                            : trend < 0
                            ? "bg-error/10 text-error border-error/20"
                            : "bg-surface-hover text-text-muted border-border"
                    )}>
                        <div className={clsx(
                            "w-1 h-1 rounded-full",
                          trend > 0 ? "bg-success animate-pulse" : trend < 0 ? "bg-error" : "bg-text-muted"
                        )} />
                        {trend > 0 ? "+" : ""}{trend}%
                    </div>
                )}
            </div>

            <div className="space-y-1.5 relative z-10">
                <p className="text-[12px] font-bold stat-label uppercase tracking-[0.15em]">{label}</p>
                <div className={clsx(
                    "text-2xl font-bold transition-all duration-300 tracking-tight",
                    (isBrandGradient || accent === 'primary') ? "stat-value-brand" : "text-text-main group-hover:text-primary"
                )}>
                    {value}
                </div>
                {sub && <p className="text-[13px] font-medium stat-sublabel tracking-[0.1em]">{sub}</p>}
            </div>
        </div>
    );
}