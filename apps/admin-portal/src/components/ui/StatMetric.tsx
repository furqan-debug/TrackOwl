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
            "glass-panel rounded-[12px] p-6 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between min-h-[180px]",
            isBrandGradient
                ? "bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5 border-primary/20 hover:border-accent/40 shadow-premium"
                : "hover:shadow-elevated hover:border-primary/20",
            "hover:-translate-y-1",
            className
        )}>
            {/* Background Glow Effect */}
            <div className={clsx(
                "absolute -right-4 -top-4 w-24 h-24 blur-[40px] opacity-10 transition-opacity group-hover:opacity-20",
                accent === 'emerald' && "bg-emerald-500",
                accent === 'amber' && "bg-amber-500",
                accent === 'rose' && "bg-rose-500",
                (accent === 'primary' || !accent) && "bg-primary"
            )} />

            {isBrandGradient && (
                <div className="absolute -right-4 -top-4 w-32 h-32 blur-[50px] opacity-20 bg-gradient-to-br from-primary to-accent transition-opacity group-hover:opacity-40 pointer-events-none" />
            )}

            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-shell-sm",
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
                        trend >= 0
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-error/10 text-error border-error/20"
                    )}>
                        <div className={clsx(
                            "w-1 h-1 rounded-full",
                            trend >= 0 ? "bg-success animate-pulse" : "bg-error"
                        )} />
                        {trend >= 0 ? "+" : ""}{trend}%
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