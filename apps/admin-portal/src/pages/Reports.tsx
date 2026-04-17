import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Monitor, Camera,
    Clock, Activity as ActivityIcon, Users,
    ChevronDown, Zap, Download, DollarSign,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    PageLayout, Card, StatMetric, Button,
    LoadingState, EmptyState
} from '../components/ui';
import clsx from 'clsx';
import {
    formatDuration,
    calculateActivityScore,
    getGroupingDateInTz,
    getEffectiveEnd,
    fetchAllActivitySamples
} from '../lib/dataUtils';

// Official Trackora Brand Palette
const BRAND_PRIMARY = '#4066D3';
const CHART_COLORS = [
    '#4066D3', // Brand Blue
    '#597EE8',
    '#7495FF',
    '#8FB3FF',
    '#A9D0FF'
];

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
    const [totalCosts, setTotalCosts] = useState(0);
    const [totalBilled, setTotalBilled] = useState(0);

    // Team & Member filtering
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('All');
    const [members, setMembers] = useState<{ id: string; auth_user_id?: string | null; email: string; full_name: string; pay_rate?: number; bill_rate?: number; timezone?: string }[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('All');
    const [tableData, setTableData] = useState<{
        dates: string[];
        rows: {
            memberId: string;
            fullName: string;
            dailyMins: Record<string, number>;
            totalMins: number;
            activityScore: number;
        }[];
    }>({ dates: [], rows: [] });


    useEffect(() => {
        fetchTeams();
        fetchMembers();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [range, selectedTeamId, selectedMemberId]);

    async function fetchTeams() {
        const { data } = await supabase.from('teams').select('id, name');
        if (data) setTeams(data);
    }

    async function fetchMembers() {
        const { data } = await supabase.from('members').select('id, auth_user_id, email, full_name, pay_rate, bill_rate, timezone').eq('status', 'Active');
        if (data) setMembers(data);
    }

    function getMemberSessionUserIds(member: { id: string; auth_user_id?: string | null }): string[] {
        return Array.from(new Set([member.id, member.auth_user_id].filter(Boolean) as string[]));
    }

    function getDateRange(): { start: string; end: string } {
        const now = new Date();
        const end = now.toISOString();
        let start: Date;
        if (range === 'Today') {
            start = new Date();
            start.setHours(0, 0, 0, 0);
        } else if (range === 'Last 7 Days') {
            start = new Date(now.getTime() - 7 * 86400000);
        } else {
            start = new Date(now.getTime() - 30 * 86400000);
        }
        return { start: start.toISOString(), end };
    }

    async function fetchReports() {
        setLoading(true);
        const { start, end } = getDateRange();

        const membersForLookup = members.length > 0
            ? members
            : (await supabase
                .from('members')
                .select('id, auth_user_id, email, full_name, pay_rate, bill_rate, timezone')
                .eq('status', 'Active')).data || [];

        const allMemberSessionUserIds = Array.from(
            new Set(
                membersForLookup.flatMap((m: any) => [m.id, m.auth_user_id].filter(Boolean) as string[])
            )
        );

        let filteredSessionUserIds: string[] = [];

        if (selectedMemberId !== 'All') {
            const selectedMember = membersForLookup.find(m => m.id === selectedMemberId);
            filteredSessionUserIds = selectedMember
                ? getMemberSessionUserIds(selectedMember)
                : [];
        } else if (selectedTeamId !== 'All') {
            const { data: tm } = await supabase.from('team_members').select('member_id').eq('team_id', selectedTeamId);
            const teamMemberIds = tm?.map(t => t.member_id) || [];

            if (teamMemberIds.length > 0) {
                const membersById = new Map(membersForLookup.map(m => [m.id, m]));
                filteredSessionUserIds = Array.from(
                    new Set(
                        teamMemberIds.flatMap(memberId => {
                            const member = membersById.get(memberId);
                            return member ? getMemberSessionUserIds(member) : [memberId];
                        })
                    )
                );
            }
        }

        if ((selectedMemberId !== 'All' || selectedTeamId !== 'All') && filteredSessionUserIds.length === 0) {
            setDailyActivity([]); setAppBreakdown([]);
            setTotalSessions(0); setScreenshotCount(0); setTotalMins(0);
            setAvgActivity(0); setTotalCosts(0); setTotalBilled(0);
            setLoading(false); return;
        }

        try {
            let sessionsQuery = supabase
                .from('sessions')
                .select('id, user_id, started_at, ended_at')
                .lt('started_at', end)
                .or(`ended_at.is.null,ended_at.gt.${start}`);

            const scopedUserIds = filteredSessionUserIds.length > 0 ? filteredSessionUserIds : allMemberSessionUserIds;
            if (scopedUserIds.length === 0) {
                setLoading(false); return;
            }
            sessionsQuery = sessionsQuery.in('user_id', scopedUserIds);

            const { data: sessionData } = await sessionsQuery;
            const filteredSessions = sessionData || [];
            if ((selectedMemberId !== 'All' || selectedTeamId !== 'All') && filteredSessions.length === 0) {
                setDailyActivity([]); setAppBreakdown([]); setLoading(false); return;
            }

            const activeSessionIds = filteredSessions.map(s => s.id);

            let ssQuery = supabase
                .from('screenshots')
                .select('id', { count: 'exact', head: true })
                .gte('recorded_at', start)
                .lte('recorded_at', end);

            if (activeSessionIds.length > 0) ssQuery = ssQuery.in('session_id', activeSessionIds);

            const [samples, { count: ssCount }] = await Promise.all([
                fetchAllActivitySamples(supabase, start, end, 'session_id, recorded_at, activity_percent, idle, app_name', { sessionIds: activeSessionIds.length > 0 ? activeSessionIds : undefined }),
                ssQuery,
            ]);

            const allSamples = samples || [];
            const activeSessionIdsSet = new Set(activeSessionIds);
            const inScopeSamples = allSamples.filter(s => activeSessionIdsSet.has(s.session_id));
            const productiveSamples = inScopeSamples.filter(s => s.idle !== true);

            const membersMap = new Map<string, any>();
            const memberTzs = new Map<string, string | undefined>();

            membersForLookup.forEach((m: any) => {
                membersMap.set(m.id, m);
                memberTzs.set(m.id, m.timezone);
                if (m.auth_user_id) {
                    membersMap.set(m.auth_user_id, m);
                    memberTzs.set(m.auth_user_id, m.timezone);
                }
            });

            const seen = new Set<string>();
            const dedupedSamples: any[] = [];
            [...inScopeSamples].sort((a, b) => (b.activity_percent ?? 0) - (a.activity_percent ?? 0)).forEach(s => {
                const sessionToUserId = new Map(filteredSessions.map(sess => [sess.id, sess.user_id]));
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;
                const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
                const key = `${uid}_${minute}`;
                if (seen.has(key)) return;
                seen.add(key);
                dedupedSamples.push(s);
            });

            const dailyMap: Record<string, { active: number; total_samples: number; total_minutes: number }> = {};
            let costs = 0;
            let billed = 0;

            dedupedSamples.forEach(s => {
                const sessionToUserId = new Map(filteredSessions.map(sess => [sess.id, sess.user_id]));
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;

                const day = getGroupingDateInTz(s.recorded_at, memberTzs.get(uid));
                if (!dailyMap[day]) dailyMap[day] = { active: 0, total_samples: 0, total_minutes: 0 };

                if (s.activity_percent && s.activity_percent > 0) dailyMap[day].active++;
                dailyMap[day].total_samples++;
                dailyMap[day].total_minutes++;

                const member = membersMap.get(uid);
                if (member) {
                    costs += (1 / 60) * (member.pay_rate || 0);
                    billed += (1 / 60) * (member.bill_rate || 0);
                }
            });

            setDailyActivity(
                Object.entries(dailyMap).sort().map(([date, v]) => ({
                    date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    activity: v.total_samples > 0 ? Math.round((v.active / v.total_samples) * 100) : 0,
                    minutes: Math.round(v.total_minutes),
                }))
            );

            const appMap: Record<string, number> = {};
            inScopeSamples.forEach(s => {
                const app = s.app_name || 'Unknown';
                appMap[app] = (appMap[app] || 0) + 1;
            });
            setAppBreakdown(
                Object.entries(appMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
            );

            let totalSessionMins = 0;
            filteredSessions.forEach(s => {
                const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
                totalSessionMins += (endMs - new Date(s.started_at).getTime()) / 60000;
            });

            setTotalSessions(filteredSessions.length);
            setScreenshotCount(ssCount || 0);
            setTotalMins(Math.max(dedupedSamples.length, Math.round(totalSessionMins)));
            setAvgActivity(calculateActivityScore(productiveSamples));
            setTotalCosts(costs);
            setTotalBilled(billed);
            // --- Build Weekly Table Data ---
            const dateList: string[] = [];
            let curr = new Date(start);
            const stop = new Date(end);
            while (curr <= stop) {
                dateList.push(curr.toISOString().split('T')[0]);
                curr.setDate(curr.getDate() + 1);
            }

            const memberRows: Record<string, any> = {};
            
            // Initialize rows for all active members (or filtered ones)
            membersForLookup.forEach(m => {
                // If member filter is active, only include that member
                if (selectedMemberId !== 'All' && m.id !== selectedMemberId) return;
                
                // If team filter is active, only include team members
                // (Note: filteredSessionUserIds already handles this scope if we use it)
                
                memberRows[m.id] = {
                    memberId: m.id,
                    fullName: m.full_name || m.email || 'Unknown',
                    dailyMins: {},
                    totalMins: 0,
                    activitySum: 0,
                    activitySamples: 0
                };
            });

            // Populate daily minutes and activity from samples
            dedupedSamples.forEach(s => {
                const sessionToUserId = new Map(filteredSessions.map(sess => [sess.id, sess.user_id]));
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;
                
                // Find which member record this uid corresponds to
                const member = membersMap.get(uid);
                if (!member || !memberRows[member.id]) return;

                const day = getGroupingDateInTz(s.recorded_at, memberTzs.get(uid));
                const row = memberRows[member.id];
                
                row.dailyMins[day] = (row.dailyMins[day] || 0) + 1;
                row.totalMins++;
                
                if (s.activity_percent !== undefined && s.activity_percent !== null && s.idle !== true) {
                    row.activitySum += s.activity_percent;
                    row.activitySamples++;
                }
            });

            const finalRows = Object.values(memberRows)
                .map((row: any) => ({
                    memberId: row.memberId,
                    fullName: row.fullName,
                    dailyMins: row.dailyMins,
                    totalMins: row.totalMins,
                    activityScore: row.activitySamples > 0 ? Math.round(row.activitySum / row.activitySamples) : 0
                }))
                .filter(row => row.totalMins > 0) // Only show users with activity
                .sort((a, b) => b.totalMins - a.totalMins);

            setTableData({ dates: dateList, rows: finalRows });

        } catch (err) {
            console.error("fetchReports error:", err);
        } finally {
            setLoading(false);
        }
    }


    return (
        <PageLayout
            maxWidth="7xl"
            title="Reports"
            description="View detailed reports on your team's activity and time spent."
            actions={
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
                        {RANGES.map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={clsx(
                                    "px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    range === r ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <FilterSelect
                            icon={<Users className="w-4 h-4" />}
                            label="Team"
                            value={selectedTeamId}
                            onChange={(val) => { setSelectedTeamId(val); setSelectedMemberId('All'); }}
                            options={[{ id: 'All', name: 'All Teams' }, ...teams]}
                        />
                        <FilterSelect
                            icon={<ActivityIcon className="w-4 h-4" />}
                            label="Member"
                            value={selectedMemberId}
                            onChange={(val) => { setSelectedMemberId(val); setSelectedTeamId('All'); }}
                            options={[{ id: 'All', name: 'All Members' }, ...members].map((m: any) => ({ id: m.id, name: m.full_name || m.email || m.name || 'Unknown' }))}
                        />
                        <Button
                            variant="secondary"
                            className="w-10 h-10 p-0 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-slate-400"
                            onClick={() => {/* export logic */ }}
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-10">
                
                {/* 1. Stats Architectural Ledger (Single Row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <StatMetric icon={<Clock className="w-5 h-5" />} label="Total Time" value={formatDuration(totalMins)} sub="Time worked" />
                    <StatMetric icon={<ActivityIcon className="w-5 h-5" />} label="Avg Activity" value={`${avgActivity}%`} sub="Team focus score" />
                    <StatMetric icon={<DollarSign className="w-5 h-5" />} label="Billable" value={`$${Math.round(totalBilled).toLocaleString()}`} sub="Billed to clients" />
                    <StatMetric icon={<Monitor className="w-5 h-5" />} label="Sessions" value={totalSessions.toString()} sub="Total sessions" />
                    <StatMetric icon={<Camera className="w-5 h-5" />} label="Screenshots" value={screenshotCount.toString()} sub="Capture proofs" />
                    <StatMetric icon={<DollarSign className="w-5 h-5" />} label="Cost" value={`$${Math.round(totalCosts).toLocaleString()}`} sub="Internal expense" />
                </div>

                {loading ? (
                    <div className="h-[600px] flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100">
                        <LoadingState message="Loading reports..." />
                    </div>
                ) : dailyActivity.length === 0 ? (
                    <div className="h-[600px] flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 italic">
                        <EmptyState title="No activity found" description="Try selecting a different team or date range." />
                    </div>
                ) : (
                    <>
                        {/* 2. Primary Charts: Activity Trend (70%) vs App Usage (30%) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            <div className="lg:col-span-8 h-full">
                                <Card className="p-8 h-full">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Activity Trend</h3>
                                        <TrendingUpIcon size={16} className="text-slate-300" />
                                    </div>
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dailyActivity} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={BRAND_PRIMARY} stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor={BRAND_PRIMARY} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: 'rgba(41,61,99,0.4)', fontSize: 10, fontWeight: 800 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: 'rgba(41,61,99,0.4)', fontSize: 10, fontWeight: 800 }}
                                                    unit="%"
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(80,110,248,0.1)', strokeWidth: 1 }} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="activity"
                                                    stroke={BRAND_PRIMARY}
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorActivity)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                            </div>

                            <div className="lg:col-span-4 space-y-8">
                                <Card className="p-8">
                                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-8">App & Browser Usage</h3>
                                    <div className="h-[220px] w-full relative mb-8">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={appBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {appBreakdown.map((_, i) => (
                                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-2xl font-black text-slate-900 leading-none">{appBreakdown.length}</span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2">Active Apps</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {appBreakdown.slice(0, 5).map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px] group-hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded shadow-sm border border-slate-100 uppercase tabular-nums">
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Insight / Velocity Score Card */}
                                <div className="bg-primary border border-primary p-8 rounded-2xl shadow-premium relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                                    <div className="relative z-10 space-y-6 text-white">
                                        <div className="flex items-center justify-between">
                                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                                                <Zap className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Insight</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Activity Score</h4>
                                            <div className="text-5xl font-black tracking-tighter tabular-nums">{avgActivity}%</div>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${avgActivity}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Secondary Chart: Daily Time Allocation (Full-width) */}
                        <Card className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Daily Time Allocation</h3>
                                <BarChart3 className="w-4 h-4 text-slate-300" />
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyActivity} barSize={40}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(41,61,99,0.4)', fontSize: 10, fontWeight: 800 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(41,61,99,0.4)', fontSize: 10, fontWeight: 800 }}
                                        />
                                        <Tooltip content={<CustomTooltip unit="min" />} cursor={{ fill: 'rgba(80,110,248,0.03)' }} />
                                        <Bar
                                            dataKey="minutes"
                                            fill={BRAND_PRIMARY}
                                            radius={[6, 6, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* 4. Weekly Timesheet Matrix (Premium Grid) */}
                        <Card className="overflow-hidden border-none shadow-premium-lg">
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                                <div>
                                    <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">Weekly Timesheet Matrix</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 font-bold tracking-tight uppercase opacity-60">Daily performance architecture per team member</p>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Real-time Sync</span>
                                </div>
                            </div>
                            <div className="overflow-hidden">
                                <table className="w-full text-left border-separate border-spacing-0 table-fixed">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 w-[180px]">Member</th>
                                            {tableData.dates.map(date => (
                                                <th key={date} className="py-4 px-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] text-center border-b border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 leading-none">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                        <span className="opacity-40 text-[8px] mt-0.5">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric' })}</span>
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="py-4 px-4 text-[9px] font-black text-slate-900 uppercase tracking-[0.15em] text-right border-b border-slate-100 bg-slate-50/30 w-[100px]">Total</th>
                                            <th className="py-4 px-4 text-[9px] font-black text-slate-900 uppercase tracking-[0.15em] text-right border-b border-slate-100 bg-slate-50/30 w-[100px]">Focus</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {tableData.rows.map((row) => (
                                            <tr key={row.memberId} className="group hover:bg-slate-50/20 transition-all">
                                                <td className="py-3 px-6 border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0 border border-slate-200/50 group-hover:border-primary/20 transition-all">
                                                            {row.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-primary transition-colors leading-none">{row.fullName}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest opacity-60 truncate mt-1">Active</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {tableData.dates.map(date => {
                                                    const mins = row.dailyMins[date] || 0;
                                                    return (
                                                        <td key={date} className="py-3 px-2 border-b border-slate-50 text-center">
                                                            {mins > 0 ? (
                                                                <span className="text-[11px] font-black text-slate-800 tabular-nums tracking-tighter">
                                                                    {formatDuration(mins).split(':')[0]}:{formatDuration(mins).split(':')[1]}
                                                                </span>
                                                            ) : (
                                                                <div className="w-1 h-1 rounded-full bg-slate-100 mx-auto" />
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3 px-4 text-right font-black text-slate-900 tabular-nums border-b border-slate-50 bg-slate-50/10">
                                                    <span className="text-[11px] tracking-tighter">{formatDuration(row.totalMins).split(':')[0]}:{formatDuration(row.totalMins).split(':')[1]}h</span>
                                                </td>
                                                <td className="py-3 px-4 text-right border-b border-slate-50 bg-slate-50/10">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-[9px] font-black text-slate-900 tabular-nums">{row.activityScore}%</span>
                                                        <div className="w-6 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${row.activityScore}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50/50">
                                            <td className="py-6 px-6 font-black text-[9px] uppercase tracking-[0.15em] text-slate-400 border-r border-slate-100/50">Team Total</td>
                                            {tableData.dates.map(date => {
                                                const dayTotal = tableData.rows.reduce((sum, r) => sum + (r.dailyMins[date] || 0), 0);
                                                return (
                                                    <td key={date} className="py-6 px-2 text-center">
                                                        {dayTotal > 0 ? (
                                                            <span className="text-[12px] font-black text-slate-900 tabular-nums tracking-tighter">
                                                                {Math.floor(dayTotal / 60)}h
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-200">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-6 px-4 text-right bg-slate-100/30">
                                                <span className="text-[13px] font-black text-slate-900 tabular-nums tracking-tighter">
                                                    {Math.floor(tableData.rows.reduce((sum, r) => sum + r.totalMins, 0) / 60)}h
                                                </span>
                                            </td>
                                            <td className="py-6 px-4 text-right bg-slate-100/30">
                                                <span className="text-[11px] font-black text-slate-900 tabular-nums tracking-tighter">
                                                    {tableData.rows.length > 0 ? Math.round(tableData.rows.reduce((sum, r) => sum + r.activityScore, 0) / tableData.rows.length) : 0}%
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                        </Card>
                    </>
                )}
            </div>
        </PageLayout>
    );
}

function FilterSelect({ icon, label, value, onChange, options }: { icon: React.ReactNode; label: string; value: string; onChange: (val: string) => void; options: { id: string; name: string }[] }) {
    const activeLabel = options.find(o => o.id === value)?.name || value;

    return (
        <div className="relative group">
            <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-2 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer shadow-sm group">
                <div className="text-slate-300 group-hover:text-primary transition-colors">{icon}</div>
                <div className="flex flex-col min-w-[120px]">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{label}</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">{activeLabel}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors ml-auto" />
            </div>

            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            >
                {options.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                ))}
            </select>
        </div>
    );
}

function CustomTooltip({ active, payload, label, unit }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-50">{label}</p>
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10 shadow-[0_0_12px_rgba(64,102,211,0.4)]" />
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">
                            {payload[0].value}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {unit === 'min' ? 'Mins Capture' : '% Activity'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
}

function TrendingUpIcon({ size, className }: { size?: number, className?: string }) {
    return <ArrowUpRight size={size} className={className} />;
}
