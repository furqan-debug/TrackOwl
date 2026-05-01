import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StatMetricProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    trend?: number;
    accent?: 'emerald' | 'amber' | 'rose' | 'primary' | 'brown-gradient';
    className?: string;
}

export function StatMetric({ icon, label, value, sub, trend, accent, className }: StatMetricProps) {
    const isBrownGradient = accent === 'brown-gradient';

    return (
        <div className={clsx(
            "glass-panel rounded-[24px] p-6 transition-all duration-500 group relative overflow-hidden",
            isBrownGradient 
                ? "bg-gradient-to-br from-primary/10 via-transparent to-dark-brown/20 border-primary/20 hover:border-primary/40" 
                : "hover:shadow-elevated hover:border-primary/20",
            "hover:-translate-y-1",
            className
        )}>
            {/* Background Glow Effect */}
            {!isBrownGradient && (
                <div className={clsx(
                    "absolute -right-4 -top-4 w-24 h-24 blur-[40px] opacity-10 transition-opacity group-hover:opacity-20",
                    accent === 'emerald' && "bg-emerald-500",
                    accent === 'amber' && "bg-amber-500",
                    accent === 'rose' && "bg-rose-500",
                    (accent === 'primary' || !accent) && "bg-primary"
                )} />
            )}
            {isBrownGradient && (
                <div className="absolute -right-4 -top-4 w-32 h-32 blur-[50px] opacity-15 bg-gradient-to-br from-primary to-dark-brown transition-opacity group-hover:opacity-30 pointer-events-none" />
            )}

            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                    accent === 'emerald' && "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20",
                    accent === 'amber' && "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20",
                    accent === 'rose' && "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20",
                    accent === 'primary' && "bg-primary/10 text-primary group-hover:bg-primary/20",
                    isBrownGradient && "bg-primary/10 text-primary group-hover:bg-primary/20 shadow-inner",
                    !accent && "bg-surface-hover text-text-muted group-hover:bg-primary/5 group-hover:text-primary shadow-inner"
                )}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={clsx(
                        "text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm border border-transparent",
                        trend >= 0 
                            ? (isBrownGradient ? "bg-primary/10 text-primary border-primary/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20") 
                            : (isBrownGradient ? "bg-primary/10 text-primary border-primary/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20")
                    )}>
                        <div className={clsx(
                            "w-1 h-1 rounded-full",
                            trend >= 0 ? (isBrownGradient ? "bg-primary animate-pulse" : "bg-emerald-500 animate-pulse") : (isBrownGradient ? "bg-primary" : "bg-rose-500")
                        )} />
                        {trend >= 0 ? "+" : ""}{trend}%
                    </div>
                )}
            </div>

            <div className="space-y-1.5 relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">{label}</p>
                <div className={clsx(
                    "text-3xl font-bold tracking-tighter transition-all duration-300",
                    (isBrownGradient || accent === 'primary') ? "text-gradient-premium" : "text-text-main group-hover:text-primary"
                )}>
                    {value}
                </div>
                {sub && <p className="text-[11px] font-medium tracking-tight text-text-muted opacity-70">{sub}</p>}
            </div>
        </div>
    );
}
