import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppWindow, Monitor, Users, Search, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

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
        <div className="p-8 max-w-[1200px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-8 relative z-20">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">App Usage</h1>
                    <p className="text-slate-500">Track which desktop applications are used during work hours.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Member Selector */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <select
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none w-48"
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
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm bg-white hover:bg-slate-50 transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Stats Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                        <Monitor className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">
                        {apps.length}
                    </div>
                    <div className="text-sm text-slate-500 font-medium">Distinct Apps Used</div>
                </div>

                {/* Donut Chart */}
                <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[250px] relative z-0">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Top Applications Breakdown</h3>

                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400">Loading data...</div>
                    ) : apps.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-slate-500">
                                <Monitor className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p>No app data recorded.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number | undefined) => [formatTime(value || 0), 'Time Spent']}
                                    />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-800">All Tracked Apps</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter apps..."
                            className="bg-white border border-slate-200 rounded-md pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
                        />
                    </div>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-medium">Application</th>
                            <th className="px-6 py-4 font-medium hidden sm:table-cell">Category</th>
                            <th className="px-6 py-4 font-medium text-right">Time Spent</th>
                            <th className="px-6 py-4 font-medium text-right">% of Activity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    Analyzing app usage...
                                </td>
                            </tr>
                        ) : apps.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                            <AppWindow className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p>No app activity recorded on this date.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            apps.map((app, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                                <AppWindow className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <span className="font-medium text-slate-800">{app.app}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden sm:table-cell text-sm">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold
                                            ${app.category === 'Development' ? 'bg-indigo-50 text-indigo-600' :
                                                app.category === 'Browser' ? 'bg-sky-50 text-sky-600' :
                                                    app.category === 'Communication' ? 'bg-emerald-50 text-emerald-600' :
                                                        app.category === 'Productivity' ? 'bg-amber-50 text-amber-600' :
                                                            app.category === 'Design' ? 'bg-fuchsia-50 text-fuchsia-600' :
                                                                'bg-slate-100 text-slate-500'}`}
                                        >
                                            {app.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-sm font-medium">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {formatTime(app.count)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${app.percent}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-slate-600 w-12 text-right">
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
        </div>
    );
}
