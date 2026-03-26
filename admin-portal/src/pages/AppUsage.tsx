import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppWindow, Monitor, Users, Search, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { PageHeader, Card } from '../components/ui';

interface AppEntry {
    app: string;
    count: number;
    percent: number;
    category: string;
}

interface MemberInfo {
    id: string;
    full_name: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

// Very rudimentary categorizer based on common keywords
function categorizeApp(appName: string) {
    const l = appName.toLowerCase();
    if (l.includes('code') || l.includes('studio') || l.includes('intellij')) return 'Development';
    if (l.includes('chrome') || l.includes('edge') || l.includes('firefox') || l.includes('safari')) return 'Browser';
    if (l.includes('slack') || l.includes('teams') || l.includes('discord') || l.includes('zoom')) return 'Communication';
    if (l.includes('word') || l.includes('excel') || l.includes('powerpoint') || l.includes('office')) return 'Productivity';
    if (l.includes('figma') || l.includes('photoshop') || l.includes('illustrator')) return 'Design';
    return 'Uncategorized';
}

export function AppUsage() {
    const [loading, setLoading] = useState(true);
    const [apps, setApps] = useState<AppEntry[]>([]);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

    // Provide a simple date string matching today in local time
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    useEffect(() => {
        // Fetch active members list
        supabase.from('members').select('id, full_name').eq('status', 'Active').then(({ data }) => {
            if (data) setMembers(data);
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedDate, selectedMemberId]);

    async function fetchData() {
        setLoading(true);

        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;

        let sessionIds: string[] | null = null;

        // If a specific member is selected, we first need to grab their sessions
        // because activity_samples is keyed by session_id, not user_id directly.
        if (selectedMemberId !== 'all') {
            const { data: userSessions } = await supabase
                .from('sessions')
                .select('id')
                .eq('user_id', selectedMemberId);

            if (!userSessions || userSessions.length === 0) {
                setApps([]);
                setLoading(false);
                return;
            }
            sessionIds = userSessions.map(s => s.id);
        }

        try {
            // Query activity samples for the day
            let query = supabase
                .from('activity_samples')
                .select('app_name')
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .not('app_name', 'is', null)
                .not('app_name', 'eq', '');

            if (sessionIds && sessionIds.length > 0) {
                query = query.in('session_id', sessionIds);
            }

            const { data: samples, error } = await query;

            if (error || !samples) {
                console.error("fetchData app usage query error:", error);
                setApps([]);
                return;
            }

            const appCounts: Record<string, number> = {};
            let totalValuableSamples = 0;

            samples.forEach(s => {
                const name = s.app_name?.trim() || 'Unknown';
                // Exclude noise
                if (name === 'Unknown' || name === '' || name.toLowerCase() === 'program manager') return;

                appCounts[name] = (appCounts[name] || 0) + 1;
                totalValuableSamples++;
            });

            // Convert to array and calculate percentages
            const appArray: AppEntry[] = Object.entries(appCounts)
                .map(([app, count]) => ({
                    app,
                    count,
                    percent: totalValuableSamples > 0 ? (count / totalValuableSamples) * 100 : 0,
                    category: categorizeApp(app)
                }))
                .sort((a, b) => b.count - a.count);

            setApps(appArray);
        } catch (err) {
            console.error("fetchData unhandled error:", err);
            setApps([]);
        } finally {
            setLoading(false);
        }
    }

    const formatTime = (sampleCount: number) => {
        // Assuming ~1 sample per 10 minutes
        const minutes = sampleCount * 10;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // Calculate chart data (Top 5 + Other)
    const getChartData = () => {
        if (apps.length <= 5) return apps.map(d => ({ name: d.app, value: d.count }));

        const top5 = apps.slice(0, 5).map(d => ({ name: d.app, value: d.count }));
        const otherCount = apps.slice(5).reduce((acc, curr) => acc + curr.count, 0);

        return [...top5, { name: 'Other', value: otherCount }];
    };

    const chartData = getChartData();

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader 
                title="App Usage" 
                description="Track which desktop applications are used during work hours"
                icon={<AppWindow className="w-8 h-8 text-primary" />}
                actions={
                    <div className="flex items-center gap-4">
                        {/* Member Selector */}
                        <div className="flex items-center gap-2 bg-surface-solid border border-border rounded-lg px-3 py-2 shadow-sm font-mono text-[11px] uppercase tracking-widest">
                            <Users className="w-4 h-4 text-text-muted" />
                            <select
                                className="bg-transparent font-bold text-text-primary outline-none w-48"
                                value={selectedMemberId}
                                onChange={(e) => setSelectedMemberId(e.target.value)}
                            >
                                <option value="all">Entire Organization</option>
                                <option disabled>──────────</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Selector */}
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2 border border-border rounded-lg text-[11px] font-bold text-text-primary shadow-sm bg-surface-solid hover:bg-surface-subtle transition-colors uppercase tracking-widest font-mono cursor-pointer"
                        />
                    </div>
                }
            />

            <div className="px-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* Stats Card */}
                    <div className="bg-surface-solid border border-border rounded-2xl p-8 shadow-sm flex flex-col justify-center animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                            <Monitor className="w-6 h-6" strokeWidth={2} />
                        </div>
                        <div className="text-4xl font-black text-text-primary mb-2 font-mono italic tracking-tighter">
                            {apps.length}
                        </div>
                        <div className="text-[11px] text-text-muted font-bold uppercase tracking-widest font-mono">Distinct Apps Used</div>
                    </div>

                    {/* Donut Chart */}
                    <Card title="Top Applications Breakdown" className="col-span-2 min-h-[300px] shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted font-mono text-[11px] uppercase tracking-widest">Loading data...</div>
                        ) : apps.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-text-muted">
                                    <Monitor className="w-8 h-8 text-border mx-auto mb-3" />
                                    <p className="font-mono text-[11px] uppercase tracking-widest">No app data recorded</p>
                                </div>
                            </div>
                    ) : (
                        <div className="h-[220px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'var(--color-surface-solid)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px -1px rgb(0 0 0 / 0.1)', fontFamily: 'monospace', textTransform: 'uppercase' }}
                                        formatter={(value: number | undefined) => [formatTime(value || 0), 'Time Spent']}
                                    />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        wrapperStyle={{ fontSize: '11px', paddingLeft: '20px', fontWeight: 'bold', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    </Card>
                </div>

                {/* Detailed Table */}
                <Card noPadding title="All Tracked Apps" className="overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-1200"
                    actions={
                        <div className="relative">
                            <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filter apps..."
                                className="bg-surface-solid border border-border rounded-xl pl-11 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest font-mono text-text-primary outline-none focus:border-primary/50 w-64 shadow-sm"
                            />
                        </div>
                    }    
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-subtle/30 border-b border-border">
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Application</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono hidden sm:table-cell">Category</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-right">Time Spent</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-right">% of Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-12 text-center text-text-muted font-mono text-[11px] tracking-widest uppercase">
                                            Analyzing app usage...
                                        </td>
                                    </tr>
                                ) : apps.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-16 text-center text-text-muted">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-14 h-14 bg-surface-subtle rounded-2xl flex items-center justify-center border border-border">
                                                    <AppWindow className="w-6 h-6 text-text-muted opacity-50" />
                                                </div>
                                                <p className="text-[11px] font-mono font-bold uppercase tracking-widest opacity-80">No app activity recorded on this date.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    apps.map((app, i) => (
                                        <tr key={i} className="hover:bg-primary/[0.01] transition-all group duration-500">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center shrink-0 shadow-sm group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                                        <AppWindow className="w-4 h-4 text-primary" strokeWidth={2.5} />
                                                    </div>
                                                    <span className="font-bold text-text-primary text-[14px] font-mono tracking-tight group-hover:text-primary transition-colors">{app.app}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 hidden sm:table-cell">
                                                <span className={`inline-flex px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest font-mono border
                                                    ${app.category === 'Development' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                                                        app.category === 'Browser' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                                                            app.category === 'Communication' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                                app.category === 'Productivity' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                                                    app.category === 'Design' ? 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20' :
                                                                        'bg-surface-subtle text-text-muted border-border'}`}
                                                >
                                                    {app.category}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle border border-border shadow-sm">
                                                    <Clock className="w-3.5 h-3.5 text-text-muted" />
                                                    <span className="font-bold text-text-primary text-[11px] font-mono tracking-wider">{formatTime(app.count)}</span>
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right w-48">
                                                <div className="flex items-center justify-end gap-4">
                                                    <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden border border-border p-[1px] shadow-inner">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all duration-[2000ms] shadow-sm"
                                                            style={{ width: `${app.percent}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-text-primary font-mono w-12 text-right">
                                                        {app.percent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
