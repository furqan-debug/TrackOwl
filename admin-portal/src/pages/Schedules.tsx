import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
    ChevronLeft, ChevronRight, 
    Activity, TrendingUp, ShieldCheck, 
    Calendar
} from 'lucide-react';
import { 
    PageHeader, Card, Button, 
    LoadingState, KpiCard
} from '../components/ui';
import clsx from 'clsx';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am – 8pm
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ActivityBlock {
    date: string; // YYYY-MM-DD
    hour: number;
    count: number; // samples in that hour
}

export function Schedules() {
    const [blocks, setBlocks] = useState<ActivityBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(0);

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    useEffect(() => {
        fetchSchedules();
    }, [weekOffset]);

    async function fetchSchedules() {
        setLoading(true);

        const { data } = await supabase
            .from('activity_samples')
            .select('recorded_at, idle')
            .gte('recorded_at', weekStart.toISOString())
            .lte('recorded_at', weekEnd.toISOString());

        const blockMap: Record<string, number> = {};
        (data || []).forEach(a => {
            if (a.idle) return;
            const d = new Date(a.recorded_at);
            const key = `${d.toISOString().split('T')[0]}_${d.getHours()}`;
            blockMap[key] = (blockMap[key] || 0) + 1;
        });

        const result: ActivityBlock[] = Object.entries(blockMap).map(([key, count]) => {
            const [date, hourStr] = key.split('_');
            return { date: date!, hour: parseInt(hourStr!), count };
        });

        setBlocks(result);
        setLoading(false);
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
    });

    function getBlock(date: string, hour: number): ActivityBlock | undefined {
        return blocks.find(b => b.date === date && b.hour === hour);
    }

    function blockOpacity(count: number): number {
        return Math.min(1, 0.2 + (count / 15) * 0.8);
    }

    const totalActiveHours = blocks.reduce((a, b) => a + b.count, 0);
    const peakDay = weekDays.length > 0 ? weekDays.reduce((best, d) => {
        const ds = d.toISOString().split('T')[0];
        const dayTotal = blocks.filter(b => b.date === ds).reduce((a, b) => a + b.count, 0);
        const bestTotal = blocks.filter(b => b.date === (best?.toISOString().split('T')[0] || '')).reduce((a, b) => a + b.count, 0);
        return dayTotal > bestTotal ? d : best;
    }, weekDays[0]!) : weekDays[0];

    const formatHeader = () =>
        `${weekStart.toLocaleString('en-US', { month: 'short' })} ${weekStart.getDate()} – ${weekEnd.toLocaleString('en-US', { month: 'short' })} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <PageHeader
                title="Personnel Schedules"
                description="Monitor team activity intensity and peak operational hours across the organizational timeline."
                actions={
                    <div className="flex items-center gap-6">
                        <div className="flex bg-surface-subtle border border-border p-1 rounded-2xl shadow-inner items-center">
                            <Button 
                                onClick={() => setWeekOffset(w => w - 1)}
                                variant="secondary"
                                size="sm"
                                className="p-2.5 rounded-xl hover:bg-surface-solid border-none"
                            >
                                <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                            </Button>
                            <div className="px-6 min-w-[220px] text-center">
                                <span className="text-[10px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono whitespace-nowrap">
                                    {formatHeader()}
                                </span>
                            </div>
                            <Button 
                                onClick={() => setWeekOffset(w => w + 1)}
                                variant="secondary"
                                size="sm"
                                className="p-2.5 rounded-xl hover:bg-surface-solid border-none"
                            >
                                <ChevronRight className="w-4 h-4" strokeWidth={3} />
                            </Button>
                        </div>
                        <Button
                            onClick={() => setWeekOffset(0)}
                            variant="primary"
                            className="px-8 py-3.5 shadow-lg font-mono text-[10px] tracking-widest"
                        >
                            PRESENT
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <KpiCard 
                    label="Total Activity" 
                    value={totalActiveHours.toLocaleString()} 
                    icon={<Activity className="w-5 h-5 text-indigo-500" strokeWidth={2.5} />} 
                    trend="+12%"
                    trendVariant="positive"
                    sub="Aggregate active samples"
                />
                <KpiCard 
                    label="Peak Day" 
                    value={peakDay ? DAYS_SHORT[peakDay.getDay()] + ', ' + peakDay.getDate() : '—'} 
                    icon={<TrendingUp className="w-5 h-5 text-violet-500" strokeWidth={2.5} />} 
                    sub="Maximum intensity period"
                />
                <KpiCard 
                    label="Active Span" 
                    value={`${new Set(blocks.map(b => b.hour)).size} hr`} 
                    icon={<ShieldCheck className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />} 
                    sub="Daily temporal coverage"
                />
            </div>

            {/* Heatmap Section */}
            <Card className="p-0 overflow-hidden border-border/60 shadow-xl">
                <div className="p-8 border-b border-border bg-surface-subtle/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary tracking-tight mb-1 uppercase font-mono italic">Efficiency Heatmap</h2>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-60">Distribution of operational velocity</p>
                    </div>
                    <div className="flex items-center gap-6 bg-surface-solid border border-border rounded-2xl px-6 py-3.5 shadow-sm">
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono italic opacity-60">Intensity:</span>
                        <div className="flex items-center gap-1.5">
                            {[0.2, 0.4, 0.6, 0.8, 1].map(o => (
                                <div 
                                    key={o} 
                                    className="w-3.5 h-3.5 rounded-sm bg-primary shadow-sm transition-all hover:scale-125 cursor-help" 
                                    style={{ opacity: o }} 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar p-8">
                    {loading ? (
                        <div className="h-[500px] flex items-center justify-center">
                            <LoadingState message="Synchronizing registry analytics..." />
                        </div>
                    ) : (
                        <table className="w-full border-separate border-spacing-2">
                            <thead>
                                <tr>
                                    <th className="w-32 pb-6 text-right pr-6 text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono italic opacity-40">Timeline</th>
                                    {weekDays.map((d, i) => {
                                        const isToday = d.toDateString() === today.toDateString();
                                        return (
                                            <th key={i} className="pb-6">
                                                <div className={clsx(
                                                    "flex flex-col items-center p-4 rounded-2xl transition-all duration-700 border",
                                                    isToday 
                                                        ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105 -translate-y-0.5" 
                                                        : "bg-surface-subtle border-border hover:bg-surface-solid"
                                                )}>
                                                    <span className={clsx(
                                                        "text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5",
                                                        isToday ? "text-white/70" : "text-text-muted"
                                                    )}>
                                                        {DAYS_SHORT[d.getDay()]}
                                                    </span>
                                                    <span className="text-xl font-bold tracking-tighter italic font-mono">
                                                        {d.getDate()}
                                                    </span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {HOURS.map(hour => (
                                    <tr key={hour} className="group/row">
                                        <td className="py-3 text-right pr-6 font-mono text-[11px] font-bold text-text-muted group-hover/row:text-primary transition-all duration-500 uppercase tracking-tighter italic">
                                            {hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`}
                                        </td>
                                        {weekDays.map((d, di) => {
                                            const dateStr = d.toISOString().split('T')[0];
                                            const block = getBlock(dateStr!, hour);
                                            return (
                                                <td key={di} className="p-0">
                                                    {block ? (
                                                        <div
                                                            title={`${block.count} active samples at ${hour}:00`}
                                                            className="h-14 w-full rounded-xl bg-primary border border-primary/20 transition-all duration-700 hover:scale-[1.05] hover:rotate-1 hover:shadow-xl hover:shadow-primary/20 cursor-pointer group/cell relative"
                                                            style={{
                                                                opacity: blockOpacity(block.count),
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all duration-500 bg-primary rounded-xl shadow-inner ring-1 ring-white/10">
                                                                <span className="text-[11px] font-mono font-bold text-white italic">{block.count}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-14 w-full rounded-xl bg-surface-subtle/40 border border-border/20 group-hover/row:border-border/40 group-hover/row:bg-surface-subtle/60 transition-all duration-500" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                <div className="p-8 bg-surface-subtle/20 border-t border-border flex items-center justify-between">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-50 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Historical activity depth analyzed for performance patterns.
                    </p>
                </div>
            </Card>
        </div>
    );
}
