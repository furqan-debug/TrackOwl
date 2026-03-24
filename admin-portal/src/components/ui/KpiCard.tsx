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
}

export function KpiCard({
    icon,
    label,
    value,
    sub,
    trend,
    trendVariant = 'default',
}: KpiCardProps) {
    const trendClass =
        trendVariant === 'positive'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10'
            : trendVariant === 'negative'
              ? 'bg-rose-500/10 text-rose-600 border-rose-500/10'
              : 'bg-black/5 text-text-muted border-black/5';

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0 shadow-sm transition-all duration-300 group-hover:bg-slate-100">
                    {icon}
                </div>
                {trend && (
                    <span
                        className={clsx(
                            'text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all duration-300',
                            trendClass
                        )}
                    >
                        {trend}
                    </span>
                )}
            </div>
            
            <div className="relative z-10">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 opacity-70">
                    {label}
                </p>
                <h3 className="text-4xl font-extrabold text-slate-950 tracking-tight leading-none">
                    {value}
                </h3>
                {sub && (
                    <div className="flex items-center gap-1.5 mt-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{sub}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
