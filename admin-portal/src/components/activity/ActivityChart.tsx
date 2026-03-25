import { Activity as ActivityIcon, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui';

interface ActivityChartProps {
    loading: boolean;
    samples: any[];
}

export function ActivityChart({ loading, samples }: ActivityChartProps) {
    const chartData = Array.from({ length: 24 }, (_, hour) => {
        const hourSamples = samples.filter(s => new Date(s.recorded_at).getHours() === hour);
        const avg = hourSamples.length
            ? Math.round(hourSamples.reduce((a, b) => a + b.activity_percent, 0) / hourSamples.length)
            : 0;
        return { hour: `${hour}:00`, activity: avg };
    });

    return (
        <Card title="Activity Timeline">
            {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            ) : samples.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                    <ActivityIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm font-medium">No activity data available</p>
                </div>
            ) : (
                <div className="h-[400px] w-full mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#506ef8" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#506ef8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(41, 61, 99, 0.05)" />
                            <XAxis
                                dataKey="hour"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#5c6b8a', fontSize: 10, fontWeight: 900 }}
                                dy={15}
                                interval={2}
                            />
                            <YAxis
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#5c6b8a', fontSize: 10, fontWeight: 900 }}
                                unit="%"
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(80, 110, 248, 0.1)', strokeWidth: 2 }} />
                            <Area
                                type="monotone"
                                dataKey="activity"
                                stroke="#506ef8"
                                strokeWidth={4}
                                fill="url(#actGrad)"
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-lg animate-in zoom-in-95 duration-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {payload[0].value}%
                    </span>
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">Activity Rate</span>
                </div>
            </div>
        );
    }
    return null;
}
