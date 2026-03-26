import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Clock, Users, FolderOpen, CircleDollarSign,
    Camera, Zap,
    BarChart3, Globe
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { PageHeader, Card, KpiCard, EmptyState, LoadingState } from './ui';

interface DashStats {
    todayMinutes: number;
    weekMinutes: number;
    weekCost: number;
    activeMembers: number;
    activeProjects: number;
    screenshotCount: number;
}

interface ProjectStat {
    id: string;
    name: string;
    minutes: number;
    color: string;
}

interface DayBar {
    day: string;
    minutes: number;
}

const PROJECT_COLORS = ['#4f46e5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function effectiveEnd(startedAt: string, endedAt: string | null) {
    const startMs = new Date(startedAt).getTime();
    if (endedAt) return { endMs: new Date(endedAt).getTime(), isLive: false, isStale: false };

    const now = Date.now();
    if (now - startMs > STALE_THRESHOLD_MS) {
        return { endMs: startMs, isLive: false, isStale: true };
    }
    return { endMs: now, isLive: true, isStale: false };
}

function fmtTime(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m < 10 ? '0' : ''}${m}m` : `${m}m`;
}

export function Dashboard() {
    const [stats, setStats] = useState<DashStats>({
        todayMinutes: 0, weekMinutes: 0, weekCost: 0,
        activeMembers: 0, activeProjects: 0, screenshotCount: 0,
    });
    const [projects, setProjects] = useState<ProjectStat[]>([]);
    const [weekBars, setWeekBars] = useState<DayBar[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDashboard(); }, []);

    async function fetchDashboard() {
        try {
            setLoading(true);
            const now = new Date();
            const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
            const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);

            const [
                { data: rawSessions },
                { data: projectsData },
                { data: membersData },
                { count: ssCount },
            ] = await Promise.all([
                supabase.from('sessions').select('id, user_id, project_id, started_at, ended_at'),
                supabase.from('projects').select('id, name, color'),
                supabase.from('members').select('id, pay_rate'),
                supabase.from('screenshots').select('id', { count: 'exact', head: true }).gte('recorded_at', weekStart.toISOString()),
            ]);

            const todaySessions = (rawSessions || []).filter(s => new Date(s.started_at) >= todayStart);
            const weekSessions = (rawSessions || []).filter(s => new Date(s.started_at) >= weekStart);

            const todayMins = todaySessions.reduce((acc, s) => {
                const start = new Date(s.started_at).getTime();
                const { endMs } = effectiveEnd(s.started_at, s.ended_at);
                return acc + Math.max(0, Math.round((endMs - start) / 60000));
            }, 0);

            const memberRateMap: Record<string, number> = {};
            (membersData || []).forEach(m => { memberRateMap[m.id] = m.pay_rate ?? 0; });

            let weekMins = 0;
            let weekCost = 0;
            const projectMinMap: Record<string, number> = {};
            const dayMinMap: number[] = Array(7).fill(0);
            const uniqueMembers = new Set<string>();
            const uniqueProjects = new Set<string>();

            weekSessions.forEach(s => {
                const start = new Date(s.started_at).getTime();
                const { endMs } = effectiveEnd(s.started_at, s.ended_at);
                const mins = Math.max(0, Math.round((endMs - start) / 60000));

                weekMins += mins;

                if (s.user_id) {
                    uniqueMembers.add(s.user_id);
                    const rate = memberRateMap[s.user_id] ?? 0;
                    weekCost += (mins / 60) * rate;
                }

                if (s.project_id) {
                    uniqueProjects.add(s.project_id);
                    projectMinMap[s.project_id] = (projectMinMap[s.project_id] || 0) + mins;
                }

                const dayIdx = new Date(s.started_at).getDay();
                dayMinMap[dayIdx] += mins;
            });

            const projectMap: Record<string, string> = {};
            const projectColorMap: Record<string, string> = {};
            (projectsData || []).forEach((p, i) => {
                projectMap[p.id] = p.name;
                projectColorMap[p.id] = p.color || PROJECT_COLORS[i % PROJECT_COLORS.length];
            });

            const projectStats = Object.entries(projectMinMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, minutes], i) => ({
                    id,
                    name: projectMap[id] || 'Unknown',
                    minutes,
                    color: projectColorMap[id] || PROJECT_COLORS[i % PROJECT_COLORS.length],
                }));

            const bars = DAYS_SHORT.map((day, i) => ({
                day,
                minutes: dayMinMap[i] || 0,
            }));

            setStats({
                todayMinutes: todayMins,
                weekMinutes: weekMins,
                weekCost: Math.round(weekCost * 100) / 100,
                activeMembers: uniqueMembers.size,
                activeProjects: uniqueProjects.size,
                screenshotCount: ssCount || 0,
            });

            setProjects(projectStats);
            setWeekBars(bars);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const maxProjectMins = projects[0]?.minutes || 1;

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader 
                title="Dashboard" 
                description="System activity and resource distribution overview"
                icon={<BarChart3 className="w-8 h-8" />}
            />

            <div className="px-10">
                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <KpiCard icon={<Clock />} label="Today" value={loading ? '—' : fmtTime(stats.todayMinutes)} />
                <KpiCard icon={<BarChart3 />} label="Weekly Total" value={loading ? '—' : fmtTime(stats.weekMinutes)} />
                <KpiCard icon={<CircleDollarSign />} label="Weekly Cost" value={loading ? '—' : `$${stats.weekCost.toLocaleString()}`} />
                <KpiCard icon={<Users />} label="Members" value={loading ? '—' : stats.activeMembers.toString()} />
                <KpiCard icon={<Globe />} label="Projects" value={loading ? '—' : stats.activeProjects.toString()} />
                <KpiCard icon={<Camera />} label="Screenshots" value={loading ? '—' : stats.screenshotCount.toString()} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
                {/* Activity Trends */}
                <div className="lg:col-span-8">
                    <Card title="Activity Trends">
                        <div className="h-[320px] w-full mt-4">
                            {loading ? (
                                <LoadingState className="h-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weekBars} barSize={36}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(79, 70, 229, 0.03)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{payload[0].payload.day}</p>
                                                            <p className="text-lg font-bold text-slate-900">{fmtTime(payload[0].value as number)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="minutes" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Project Breakdown */}
                <div className="lg:col-span-4">
                    <Card title="Project Distribution">
                        <div className="mt-4 space-y-6">
                            {loading ? (
                                <LoadingState className="h-[320px]" />
                            ) : projects.length === 0 ? (
                                <EmptyState icon={<FolderOpen className="opacity-20" />} title="No data" description="No project activity yet" />
                            ) : (
                                projects.map(p => (
                                    <div key={p.id} className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                                <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">{p.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">{fmtTime(p.minutes)}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                style={{
                                                    width: `${(p.minutes / maxProjectMins) * 100}%`,
                                                    backgroundColor: p.color
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Recent Activity Table */}
            <Card title="Recent Activity" noPadding>
                <RecentSessionsRows />
            </Card>

            </div>
        </div>
    );
}

function RecentSessionsRows() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [memberMap, setMemberMap] = useState<Record<string, string>>({});
    const [projectMap, setProjectMap] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [{ data }, { data: mData }, { data: pData }] = await Promise.all([
                    supabase.from('sessions').select('*').order('started_at', { ascending: false }).limit(8),
                    supabase.from('members').select('id, full_name'),
                    supabase.from('projects').select('id, name, color'),
                ]);

                const mMap: Record<string, string> = {};
                (mData || []).forEach(m => { mMap[m.id] = m.full_name; });
                setMemberMap(mMap);

                const pMap: Record<string, any> = {};
                (pData || []).forEach(p => { pMap[p.id] = p; });
                setProjectMap(pMap);

                setSessions(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-20"><LoadingState /></div>;
    if (!sessions.length) return <div className="p-20"><EmptyState icon={<Zap />} title="No sessions" description="No activity recorded yet" /></div>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-sm font-semibold text-slate-700">Team Member</th>
                        <th className="px-8 py-5 text-sm font-semibold text-slate-700">Project</th>
                        <th className="px-8 py-5 text-sm font-semibold text-slate-700">Starting Time</th>
                        <th className="px-8 py-5 text-sm font-semibold text-slate-700">Duration</th>
                        <th className="px-8 py-5 text-sm font-semibold text-slate-700 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sessions.map(s => {
                        const { endMs, isLive, isStale } = effectiveEnd(s.started_at, s.ended_at);
                        const dur = Math.max(0, Math.round((endMs - new Date(s.started_at).getTime()) / 60000));
                        const mName = memberMap[s.user_id] || 'Unknown User';
                        const proj = projectMap[s.project_id];

                        return (
                            <tr key={s.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            {mName.charAt(0)}
                                        </div>
                                        <span className="font-semibold text-slate-800">{mName}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    {proj ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                                            <span className="text-slate-600 font-medium">{proj.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">No Project</span>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-slate-500 font-medium">
                                    {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-8 py-5 font-bold text-slate-700">
                                    {fmtTime(dur)}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    {isLive ? (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Active
                                        </span>
                                    ) : isStale ? (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100">
                                            Stale
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recorded</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
