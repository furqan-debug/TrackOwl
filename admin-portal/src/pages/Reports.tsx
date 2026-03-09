import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, Monitor, Camera, Download, Calendar, Clock, Activity as ActivityIcon, Users } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const RANGES = ['Today', 'Last 7 Days', 'Last 30 Days'] as const;
type Range = typeof RANGES[number];

export function Reports() {
    const [range, setRange] = useState<Range>('Last 7 Days');
    const [loading, setLoading] = useState(true);
    const [dailyActivity, setDailyActivity] = useState<{ date: string; activity: number; minutes: number }[]>([]);
    const [appBreakdown, setAppBreakdown] = useState<{ name: string; value: number }[]>([]);
    const [screenshotCount, setScreenshotCount] = useState(0);
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalMins, setTotalMins] = useState(0);
    const [avgActivity, setAvgActivity] = useState(0);

    // Team filtering
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('All');

    useEffect(() => {
        fetchTeams();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [range, selectedTeamId]);

    async function fetchTeams() {
        const { data } = await supabase.from('teams').select('id, name');
        if (data) setTeams(data);
    }

    function getDateRange(): { start: string; end: string } {
        const now = new Date();
        const end = now.toISOString();
        let start: Date;
        if (range === 'Today') {
            start = new Date(now.setHours(0, 0, 0, 0));
        } else if (range === 'Last 7 Days') {
            start = new Date(Date.now() - 7 * 86400000);
        } else {
            start = new Date(Date.now() - 30 * 86400000);
        }
        return { start: start.toISOString(), end };
    }

    async function fetchReports() {
        setLoading(true);
        const { start, end } = getDateRange();

        let emails: string[] = [];
        if (selectedTeamId !== 'All') {
            const { data: tm } = await supabase.from('team_members').select('member_id').eq('team_id', selectedTeamId);
            const memberIds = tm?.map(t => t.member_id) || [];
            if (memberIds.length > 0) {
                const { data: m } = await supabase.from('members').select('email').in('id', memberIds);
                emails = m?.map(x => x.email) || [];
            }

            // If no members in team, we can skip or show empty
            if (emails.length === 0) {
                setDailyActivity([]);
                setAppBreakdown([]);
                setTotalSessions(0);
                setScreenshotCount(0);
                setTotalMins(0);
                setAvgActivity(0);
                setLoading(false);
                return;
            }
        }

        // Base queries
        let samplesQuery = supabase.from('activity_samples').select('*').gte('recorded_at', start).lte('recorded_at', end);
        let sessionsQuery = supabase.from('sessions').select('id, user_id').gte('started_at', start).lte('started_at', end);
        let ssQuery = supabase.from('screenshots').select('id', { count: 'exact', head: true }).gte('recorded_at', start).lte('recorded_at', end);

        if (emails.length > 0) {
            samplesQuery = samplesQuery.in('user_id', emails);
            sessionsQuery = sessionsQuery.in('user_id', emails);
            ssQuery = ssQuery.in('user_id', emails);
        }

        try {
            const [{ data: samples }, { data: sessions }, { count: ssCount }] = await Promise.all([
                samplesQuery,
                sessionsQuery,
                ssQuery,
            ]);

            const allSamples = samples || [];

            // Daily activity data
            const dailyMap: Record<string, { total: number; active: number }> = {};
            allSamples.forEach(s => {
                const day = s.recorded_at.split('T')[0];
                if (!dailyMap[day]) dailyMap[day] = { total: 0, active: 0 };
                dailyMap[day].total++;
                if (!s.idle) dailyMap[day].active++;
            });
            setDailyActivity(Object.entries(dailyMap).sort().map(([date, v]) => ({
                date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                activity: v.total > 0 ? Math.round((v.active / v.total) * 100) : 0,
                minutes: v.total,
            })));

            // App breakdown
            const appMap: Record<string, number> = {};
            allSamples.forEach(s => {
                const app = s.app_name || 'Unknown';
                appMap[app] = (appMap[app] || 0) + 1;
            });
            setAppBreakdown(
                Object.entries(appMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
            );

            // Totals
            setTotalSessions((sessions || []).length);
            setScreenshotCount(ssCount || 0);
            setTotalMins(allSamples.length);
            setAvgActivity(
                allSamples.length > 0
                    ? Math.round(allSamples.reduce((a, b) => a + b.activity_percent, 0) / allSamples.length)
                    : 0
            );
        } catch (err) {
            console.error("fetchReports unhandled error:", err);
            setDailyActivity([]);
            setAppBreakdown([]);
            setTotalSessions(0);
            setScreenshotCount(0);
            setTotalMins(0);
            setAvgActivity(0);
        } finally {
            setLoading(false);
        }
    }

    const fmtHours = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto w-full fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Analytics</h2>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Time & Activity</h1>
                    <p className="text-slate-500 mt-1 font-medium">Detailed tracking insights and productivity metrics.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Team Filter */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                        >
                            <option value="All">All Teams</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {RANGES.map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${range === r
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <div className="h-10 w-px bg-slate-200 mx-1 hidden md:block" />

                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <ModernKpiCard
                    icon={<Clock className="w-6 h-6 text-indigo-600" />}
                    label="Total Tracked"
                    value={fmtHours(totalMins)}
                    sub="Cumulative time"
                    trend="+12%"
                    color="indigo"
                />
                <ModernKpiCard
                    icon={<ActivityIcon className="w-6 h-6 text-emerald-600" />}
                    label="Avg Activity"
                    value={`${avgActivity}%`}
                    sub="Productive work"
                    trend="+4%"
                    color="emerald"
                />
                <ModernKpiCard
                    icon={<Monitor className="w-6 h-6 text-purple-600" />}
                    label="Active Sessions"
                    value={totalSessions.toString()}
                    sub="Unique starts"
                    trend="+2"
                    color="purple"
                />
                <ModernKpiCard
                    icon={<Camera className="w-6 h-6 text-orange-600" />}
                    label="Proof of Work"
                    value={screenshotCount.toString()}
                    sub="Screenshots"
                    trend="+45"
                    color="orange"
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-400 font-medium animate-pulse">Aggregating analytics...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Area Chart: Activity Trend */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Activity Trend</h3>
                                    <p className="text-sm text-slate-500 font-medium tracking-tight">Daily productivity percentage</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                                    <Calendar className="w-3.5 h-3.5" />
                                    BY DAY
                                </div>
                            </div>

                            {dailyActivity.length === 0 ? (
                                <EmptyState />
                            ) : (
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dailyActivity}>
                                            <defs>
                                                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                                unit="%"
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="activity"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorActivity)"
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Bar Chart: Minutes per Day */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Work Volume</h3>
                                    <p className="text-sm text-slate-500 font-medium tracking-tight">Total minutes tracked daily</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                    Minutes per day
                                </div>
                            </div>

                            {dailyActivity.length === 0 ? <EmptyState /> : (
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dailyActivity} barSize={40}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                            />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip unit="min" />} />
                                            <Bar
                                                dataKey="minutes"
                                                fill="#f59e0b"
                                                radius={[8, 8, 8, 8]}
                                                animationDuration={1500}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-8">
                        {/* Pie Chart: App Usage */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm h-full flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-slate-800">App Ecosystem</h3>
                                <p className="text-sm text-slate-500 font-medium tracking-tight">Usage distribution by application</p>
                            </div>

                            {appBreakdown.length === 0 ? <EmptyState /> : (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <div className="h-[300px] w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={appBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={110}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    animationDuration={1500}
                                                >
                                                    {appBreakdown.map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-black text-slate-800">{appBreakdown.length}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Apps</span>
                                        </div>
                                    </div>

                                    <div className="w-full mt-6 space-y-3">
                                        {appBreakdown.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between group cursor-default">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                    <span className="text-xs font-bold text-slate-600 truncate max-w-[140px] tracking-tight">{item.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded transition-colors group-hover:bg-slate-100 uppercase">
                                                    {item.value} samples
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Productivity Score (Decorative/Calculated Metric) */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-200">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded backdrop-blur-md tracking-widest uppercase">
                                    Real-time
                                </span>
                            </div>
                            <h4 className="text-white/80 font-bold uppercase tracking-widest text-[10px] mb-1">Productivity Score</h4>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-5xl font-black tracking-tighter">{avgActivity}</span>
                                <span className="text-xl font-bold text-white/60">/ 100</span>
                            </div>
                            <p className="text-sm font-medium text-white/70 leading-relaxed mb-6">
                                {selectedTeamId === 'All' ? 'Your team is' : 'This team is'} currently operating at an optimal activity level. Great job!
                            </p>
                            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-1000"
                                    style={{ width: `${avgActivity}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ModernKpiCard({ icon, label, value, sub, trend, color }: { icon: React.ReactNode; label: string; value: string; sub: string; trend?: string; color: string }) {
    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
        emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
        purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
        orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
    };

    return (
        <div className="group bg-white rounded-[1.5rem] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-default">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${colorClasses[color]}`}>
                    {icon}
                </div>
                {trend && (
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/10">
                            {trend}
                        </span>
                    </div>
                )}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400/80 uppercase mt-1 tracking-tight">{sub}</p>
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label, unit }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl glass-effect">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                    <p className="text-lg font-black text-white tracking-tighter">
                        {payload[0].value}{unit === 'min' ? ' min' : '%'}
                    </p>
                </div>
            </div>
        );
    }
    return null;
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-[250px] gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No data available</p>
        </div>
    );
}
