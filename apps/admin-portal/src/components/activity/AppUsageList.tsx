import { Monitor, Globe } from 'lucide-react';
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
                <div key={i} className="flex items-center justify-between px-8 py-5 hover:bg-surface-hover transition-all duration-200 group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-main border border-border flex items-center justify-center text-text-muted group-hover:bg-surface group-hover:border-primary/20 group-hover:text-primary transition-all shadow-shell-sm">
                            {(app.toLowerCase().includes('chrome') || app.toLowerCase().includes('browser')) ? (
                                <Globe className="w-5 h-5 text-sky-500" />
                            ) : (
                                <Monitor className="w-5 h-5" />
                            )}
                        </div>
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
                    <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-black text-success leading-none">
                            {percent}%
                        </span>
                        <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
                            <div
                                className="h-full transition-all duration-1000"
                                style={{ width: `${percent}%`, background: 'linear-gradient(90deg, var(--chart-gold-secondary) 0%, var(--chart-gold) 0%)' }}
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
