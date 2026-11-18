import type { ReactNode } from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    /** Optional subtitle (e.g. "tracked sessions") */
    sub?: string;
    /** Optional trend percentage (e.g. 12 or -5) */
    trend?: number;
    /** Optional variant to override trend-based coloring */
    variant?: 'positive' | 'negative' | 'neutral';
    /** Loading state */
    loading?: boolean;
    /** Optional className */
    className?: string;
}

export function KpiCard({
    icon,
    label,
    value,
    sub,
    trend,
    variant,
    loading = false,
    className,
}: KpiCardProps) {
    const isPositive = trend !== undefined && trend >= 0;
    
    // Determine status from variant OR trend sign
    const effectiveVariant = variant || (trend === undefined ? 'neutral' : isPositive ? 'positive' : 'negative');
    
    const trendClass = effectiveVariant === 'positive'
        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40'
        : effectiveVariant === 'negative' 
            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40' 
            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50';

    return (
        <div className={clsx("bg-surface border border-border shadow-shell-sm rounded-[1.5rem] p-6 flex flex-col relative overflow-visible group transition-all duration-500 hover:shadow-xl hover:-translate-y-1", className)}>
            {/* Subtle premium glow effect behind icon */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-tr-[1.5rem] overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-100 mix-blend-multiply" />
            </div>
            
            <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-text-muted shrink-0 transition-all duration-500 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 shadow-shell-sm">
                    {icon}
                </div>
                {trend !== undefined && (
                    <span
                        className={clsx(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow-shell-sm transition-all duration-300',
                            trendClass,
                            'group-hover:scale-105'
                        )}
                    >
                        {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        ) : trend < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        ) : (
                            <Minus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                        )}
                        <span>{Math.abs(trend).toFixed(1)}%</span>
                    </span>
                )}
            </div>
            
            <div className="relative z-10 mt-auto">
                <p className="text-[11px] font-bold text-text-muted mb-1.5">
                    {label}
                </p>
                <h3 className="text-3xl font-extrabold text-text-main tracking-tight leading-none group-hover:text-primary transition-colors duration-300">
                    {loading ? '—' : value}
                </h3>
                {sub && (
                    <div className="flex items-center gap-1.5 mt-3">
                        <p className="text-[11px] font-semibold text-text-muted">{sub}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
