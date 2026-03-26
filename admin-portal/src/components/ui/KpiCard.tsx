import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface KpiCardProps {
    icon: ReactNode;
    label: string;
    value: string;
    /** Optional subtitle (e.g. "tracked sessions") */
    sub?: string;
    /** Optional trend badge (e.g. "+12%") */
    trend?: string;
    /** Trend style: default (neutral), positive (green), negative (red) */
    trendVariant?: 'default' | 'positive' | 'negative';
    /** Loading state */
    loading?: boolean;
}

export function KpiCard({
    icon,
    label,
    value,
    sub,
    trend,
    trendVariant = 'default',
    loading = false,
}: KpiCardProps) {
    const trendClass =
        trendVariant === 'positive'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
            : trendVariant === 'negative'
              ? 'bg-rose-500/10 text-rose-600 border-rose-500/10'
              : 'bg-black/5 text-text-muted border-black/5';

    return (
        <div className="bg-surface-solid border border-border shadow-sm rounded-2xl p-6 flex flex-col relative overflow-hidden group transition-all duration-300 hover:shadow-md">
            <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0 transition-all duration-300 group-hover:bg-primary/10">
                    {icon}
                </div>
                {trend && (
                    <span
                        className={clsx(
                            'text-[10px] font-bold px-2 py-1 rounded-lg border transition-all duration-300 tracking-wider uppercase',
                            trendClass
                        )}
                    >
                        {trend}
                    </span>
                )}
            </div>
            
            <div className="relative z-10">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    {label}
                </p>
                <h3 className="text-3xl font-bold text-text-primary tracking-tight">
                    {loading ? '—' : value}
                </h3>
                {sub && (
                    <div className="flex items-center gap-1.5 mt-3">
                        <p className="text-[11px] font-medium text-text-muted">{sub}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
