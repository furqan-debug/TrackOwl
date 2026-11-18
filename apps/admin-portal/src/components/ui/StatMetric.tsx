import type { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow-shell-sm transition-colors",
                        trend > 0
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                            : trend < 0
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40"
                            : "bg-surface-hover text-text-muted border border-border"
                    )}>
                        {trend > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        ) : trend < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        ) : (
                            <Minus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        )}
                        <span>{trend > 0 ? "+" : ""}{trend}%</span>
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