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
        <div className="space-y-10 animate-in fade-in duration-700">
            <PageHeader 
                title="System Overview" 
                description="Real-time telemetry and resource distribution analytics"
                icon={<BarChart3 className="w-10 h-10 text-primary" strokeWidth={2.5} />}
            />

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
                <KpiCard icon={<Clock />} label="Today" value={loading ? '—' : fmtTime(stats.todayMinutes)} />
                <KpiCard icon={<BarChart3 />} label="Weekly Total" value={loading ? '—' : fmtTime(stats.weekMinutes)} />
                <KpiCard icon={<CircleDollarSign />} label="Weekly Cost" value={loading ? '—' : `$${stats.weekCost.toLocaleString()}`} />
                <KpiCard icon={<Users />} label="Members" value={loading ? '—' : stats.activeMembers.toString()} />
                <KpiCard icon={<Globe />} label="Projects" value={loading ? '—' : stats.activeProjects.toString()} />
                <KpiCard icon={<Camera />} label="Screenshots" value={loading ? '—' : stats.screenshotCount.toString()} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Activity Trends */}
                <div className="lg:col-span-8">
                    <Card title="Productivity Trends" subtitle="Weekly engagement distribution">
                        <div className="h-[420px] w-full mt-8">
                            {loading ? (
                                <LoadingState className="h-full" />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={weekBars} barSize={42}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis
                                            dataKey="day"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(41,61,99,0.4)', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}
                                            dy={15}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(80, 110, 248, 0.03)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-surface-solid border border-border rounded-2xl px-5 py-4 shadow-2xl animate-in zoom-in-95 duration-200">
                                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mb-2 border-b border-border pb-2 italic opacity-60">{payload[0].payload.day}</p>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-2xl font-bold text-text-primary tracking-tighter italic">{fmtTime(payload[0].value as number)}</span>
                                                                <span className="text-[9px] font-bold text-primary uppercase tracking-widest font-mono">Telemetry</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="minutes" fill="url(#dashGradient)" radius={[12, 12, 0, 0]} animationDuration={2000} />
                                        <defs>
                                            <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#506ef8" />
                                                <stop offset="100%" stopColor="#818cf8" />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Project Breakdown */}
                <div className="lg:col-span-4">
                    <Card title="Allocation" subtitle="Top 5 project distributions">
                        <div className="mt-8 space-y-8">
                            {loading ? (
                                <LoadingState className="h-[420px]" />
                            ) : projects.length === 0 ? (
                                <EmptyState icon={<FolderOpen className="opacity-20" />} title="No data" description="No project activity yet" />
                            ) : (
                                projects.map(p => (
                                    <div key={p.id} className="group">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                                                <span className="text-sm font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors duration-300 uppercase font-mono italic">{p.name}</span>
                                            </div>
                                            <span className="text-[11px] font-bold text-text-muted bg-surface-subtle px-3 py-1.5 rounded-lg border border-border font-mono tracking-tighter">{fmtTime(p.minutes)}</span>
                                        </div>
                                        <div className="h-2.5 bg-surface-subtle rounded-full overflow-hidden border border-border p-[1px] shadow-inner">
                                            <div
                                                className="h-full rounded-full transition-all duration-[2000ms] ease-out shadow-sm"
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
            <Card title="Live Feed" subtitle="Latest system activity clusters" noPadding className="overflow-hidden">
                <RecentSessionsRows />
            </Card>

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

    if (loading) return <div className="p-32"><LoadingState /></div>;
    if (!sessions.length) return <div className="p-32"><EmptyState icon={<Zap />} title="No sessions" description="No activity recorded yet" /></div>;

    return (
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-surface-subtle/30 border-b border-border">
                        <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Team Member</th>
                        <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Project</th>
                        <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Starting Time</th>
                        <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Duration</th>
                        <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                    {sessions.map(s => {
                        const { endMs, isLive, isStale } = effectiveEnd(s.started_at, s.ended_at);
                        const dur = Math.max(0, Math.round((endMs - new Date(s.started_at).getTime()) / 60000));
                        const mName = memberMap[s.user_id] || 'Unknown User';
                        const proj = projectMap[s.project_id];

                        return (
                            <tr key={s.id} className="hover:bg-primary/[0.01] transition-all group duration-500">
                                <td className="px-10 py-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-text-primary font-bold text-[12px] group-hover:bg-primary group-hover:text-white group-hover:border-primary/20 transition-all duration-500 font-mono shadow-sm">
                                            {mName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-text-primary text-[15px] tracking-tight group-hover:text-primary transition-colors duration-500">{mName}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8">
                                    {proj ? (
                                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-surface-subtle border border-border rounded-xl shadow-sm">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: proj.color }} />
                                            <span className="text-text-primary font-bold text-[11px] uppercase font-mono italic tracking-tight">{proj.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-text-muted/30 italic font-mono text-[11px] uppercase tracking-widest">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-10 py-8 text-text-primary font-bold text-[13px] font-mono tracking-tighter opacity-70">
                                    {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-10 py-8 font-bold text-text-primary text-[14px] italic font-mono tracking-tighter">
                                    {fmtTime(dur)}
                                </td>
                                <td className="px-10 py-8 text-right">
                                    {isLive ? (
                                        <span className="inline-flex items-center gap-3 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 shadow-sm font-mono italic">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            Operational
                                        </span>
                                    ) : isStale ? (
                                        <span className="inline-flex items-center gap-3 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 bg-amber-500/10 border border-amber-500/20 shadow-sm font-mono italic">
                                            Stale
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted font-mono opacity-40">Archived</span>
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
