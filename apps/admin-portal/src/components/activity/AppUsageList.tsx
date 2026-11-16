import { Monitor } from 'lucide-react';
import { AppIcon } from '../ui/AppIcon';
import { EmptyState } from '../ui';

interface AppUsageListProps {
    samples: any[];
}

export function AppUsageList({ samples }: AppUsageListProps) {
    const list = groupByApp(samples);

    if (list.length === 0) {
        return (
            <div className="py-20 flex flex-col items-center justify-center">
                <EmptyState icon={<Monitor />} title="No data detected" />
            </div>
        );
    }

    return (
        <div className="divide-y divide-border h-full overflow-auto no-scrollbar">
            {list.map(({ app, count, percent }, i) => (
                <div key={i} className="flex items-center justify-between px-8 py-6 hover:bg-surface-hover transition-all duration-200 group">
                    <div className="flex items-center gap-4 min-w-0">
                        <AppIcon name={app} className="w-10 h-10 shadow-shell-sm shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black text-text-main leading-none truncate max-w-[180px] tracking-tight">
                                {app}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-text-muted font-bold leading-none">
                                    {count} samples
                                </span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span className="text-[10px] text-primary/60 font-black leading-none">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-xs font-black text-success leading-none tabular-nums">
                            {percent}%
                        </span>
                        <div className="w-16 sm:w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/80 dark:border-slate-700/80">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${percent}%`,
                                    minWidth: percent > 0 ? '6px' : '0px',
                                    background: 'var(--chart-gold, #001B4D)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function groupByApp(samples: any[]) {
    if (!samples || samples.length === 0) return [];

    const map: Record<string, number> = {};
    samples.forEach(s => {
        const app = s.app_name || 'System';
        map[app] = (map[app] || 0) + 1;
    });

    const total = samples.length;
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([app, count]) => ({
            app,
            count,
            percent: Math.round((count / total) * 100)
        }));
}
