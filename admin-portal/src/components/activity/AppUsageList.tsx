import { Monitor } from 'lucide-react';
import { Card } from '../ui';

interface AppUsageListProps {
    samples: any[];
}

export function AppUsageList({ samples }: AppUsageListProps) {
    const list = groupByApp(samples);

    return (
        <Card title="App Usage">
            <div className="space-y-6 mt-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {list.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-24">
                        <Monitor className="w-10 h-10 mb-4 opacity-50" />
                        <p className="text-sm font-medium">No stats recorded</p>
                    </div>
                ) : (
                    list.map(({ app, percent }) => (
                        <div key={app} className="group cursor-default">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px] leading-tight">{app || 'System'}</span>
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md transition-colors">
                                    {percent}%
                                </span>
                            </div>
                            <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden w-full p-[1px]">
                                <div 
                                    className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-[1500ms] ease-out shadow-sm shadow-primary/10"
                                    style={{ width: `${percent}%` }} 
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}

function groupByApp(samples: any[]) {
    const map: Record<string, number> = {};
    samples.forEach(s => { const app = s.app_name || 'System'; map[app] = (map[app] || 0) + 1; });
    const total = samples.length;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([app, count]) => ({ app, count, percent: Math.round((count / total) * 100) }));
}
