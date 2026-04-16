import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StatMetricProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    trend?: number;
    accent?: 'emerald' | 'amber' | 'rose' | 'primary';
    className?: string;
}

export function StatMetric({ icon, label, value, sub, trend, accent, className }: StatMetricProps) {
    return (
        <div className={clsx(
            "bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 group",
            className
        )}>
            <div className="flex items-center justify-between mb-4">
                <div className={clsx(
                    "p-2 rounded-lg transition-colors",
                    accent === 'emerald' && "bg-emerald-50 text-emerald-600",
                    accent === 'amber' && "bg-amber-50 text-amber-600",
                    accent === 'rose' && "bg-rose-50 text-rose-600",
                    accent === 'primary' && "bg-primary/5 text-primary",
                    !accent && "bg-slate-50 text-slate-500 group-hover:text-primary group-hover:bg-primary/5"
                )}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <span className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                        trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {trend >= 0 ? "+" : ""}{trend}%
                    </span>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
                {sub && <p className="text-[11px] text-slate-500 font-medium">{sub}</p>}
            </div>
        </div>
    );
}
