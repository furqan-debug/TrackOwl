import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Monitor, Camera,
    Clock, Activity as ActivityIcon, Users,
    ChevronDown, Zap, Download, DollarSign,
    BarChart3,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon
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

const RANGES = ['Today', 'Yesterday', 'Last 7 Days', 'Last Week', 'Last 2 Weeks', 'This Month', 'Last Month', 'Custom'] as const;
type Range = typeof RANGES[number];

export function Reports() {
    const [range, setRange] = useState<Range>('Last 7 Days');
    const [offset, setOffset] = useState(0); // offset in days
    const [showRangeDropdown, setShowRangeDropdown] = useState(false);
    const [customStart, setCustomStart] = useState<Date | null>(null);
    const [customEnd, setCustomEnd] = useState<Date | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
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
    }, [range, offset, selectedTeamId, selectedMemberId]);

    function shiftRange(direction: number) {
        let days = 0;
        if (range === 'Today' || range === 'Yesterday') days = 1;
        else if (range === 'Last 7 Days' || range === 'Last Week') days = 7;
        else if (range === 'Last 2 Weeks') days = 14;
        else if (range === 'This Month' || range === 'Last Month') days = 30;

        setOffset(prev => prev + (direction * days));
    }

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
        if (range === 'Custom' && customStart && customEnd) {
            const s = new Date(customStart); s.setHours(0, 0, 0, 0);
            const e = new Date(customEnd); e.setHours(23, 59, 59, 999);
            return { start: s.toISOString(), end: e.toISOString() };
        }

        const now = new Date();
        now.setDate(now.getDate() + offset);

        let start = new Date(now);
        let end = new Date(now);

        if (range === 'Today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'Yesterday') {
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'Last 7 Days') {
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'Last Week') {
            const day = start.getDay();
            const diff = day === 0 ? 6 : day - 1; // distance to Monday
            start.setDate(start.getDate() - diff - 7);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'Last 2 Weeks') {
            start.setDate(start.getDate() - 13);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'This Month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'Last Month') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            end.setHours(23, 59, 59, 999);
        }

        return { start: start.toISOString(), end: end.toISOString() };
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
            // --- Build Weekly Table Data (Aligned to Monday) ---
            const dateList: string[] = [];
            let curr = new Date(start);
            curr.setHours(12, 0, 0, 0); // Force middle of day to avoid timezone flip-flops
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
                <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm relative shrink-0 h-[46px]">
                        <button
                            onClick={() => shiftRange(-1)}
                            className="p-3 hover:bg-slate-50 text-slate-400 hover:text-primary transition-all border-r border-slate-100 rounded-l-xl h-full"
                            title="Previous period"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="relative group min-w-[100px]">
                            <div
                                onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                                className="flex items-center gap-3 px-6 py-2 cursor-pointer hover:bg-slate-50 transition-all h-full"
                            >
                                <CalendarIcon className="w-4 h-4 text-primary opacity-60" />
                                <span className="text-[11px] font-black text-slate-800 tabular-nums uppercase tracking-widest">
                                    {new Date(getDateRange().start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    <span className="text-slate-300 mx-3">—</span>
                                    {new Date(getDateRange().end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            {showRangeDropdown && (
                                <div className="absolute top-full left-0 mt-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <DateRangePicker
                                        range={range}
                                        setRange={setRange}
                                        setOffset={setOffset}
                                        onApply={(s: Date, e: Date) => {
                                            setCustomStart(s);
                                            setCustomEnd(e);
                                            setRange('Custom');
                                            setShowRangeDropdown(false);
                                        }}
                                        onCancel={() => setShowRangeDropdown(false)}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => shiftRange(1)}
                            className="p-3 hover:bg-slate-50 text-slate-400 hover:text-primary transition-all border-l border-slate-100 rounded-r-xl h-full"
                            title="Next period"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => { setRange('Today'); setOffset(0); }}
                        className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:text-primary hover:border-primary/30 transition-all shadow-sm uppercase tracking-widest shrink-0 h-[46px]"
                    >
                        Today
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-2 shrink-0" />

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
                </div>
            }
        >
            <div className="flex flex-col gap-10">

                {/* 1. Stats Architectural Ledger (Single Row) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <StatMetric icon={<Clock className="w-5 h-5" />} label="Total Time" value={formatDuration(totalMins)} sub="Time worked" accent="primary" />
                    <StatMetric icon={<ActivityIcon className="w-5 h-5" />} label="Avg Activity" value={`${avgActivity}%`} sub="Team focus score" accent="emerald" />
                    <StatMetric icon={<DollarSign className="w-5 h-5" />} label="Billable" value={`$${Math.round(totalBilled).toLocaleString()}`} sub="Billed to clients" accent="amber" />
                    <StatMetric icon={<Monitor className="w-5 h-5" />} label="Sessions" value={totalSessions.toString()} sub="Total sessions" accent="primary" />
                    <StatMetric icon={<Camera className="w-5 h-5" />} label="Screenshots" value={screenshotCount.toString()} sub="Capture proofs" accent="rose" />
                    <StatMetric icon={<DollarSign className="w-5 h-5" />} label="Cost" value={`$${Math.round(totalCosts).toLocaleString()}`} sub="Internal expense" accent="rose" />
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
                                    <div className="space-y-1.5">
                                        {appBreakdown.slice(0, 6).map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group cursor-default">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-2 ring-white" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[140px] group-hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 bg-white px-2.5 py-1 rounded-lg shadow-sm border border-slate-100 uppercase tabular-nums">
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Insight / Velocity Score Card */}
                                <div className="bg-primary border border-primary p-8 rounded-2xl shadow-premium relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/4 translate-x-1/4 blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
                                    <div className="relative z-10 space-y-6 text-white">
                                        <div className="flex items-center justify-between">
                                            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md ring-1 ring-white/30">
                                                <Zap className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Focus Insight</span>
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.1em] opacity-60 mb-2">Aggregate Velocity</h4>
                                            <div className="flex items-baseline gap-2">
                                                <div className="text-6xl font-black tracking-tighter tabular-nums drop-shadow-sm">{avgActivity}%</div>
                                                <div className="text-[12px] font-black opacity-60 uppercase tracking-widest">Score</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                                                <span>Intensity</span>
                                                <span>Goal: 85%</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                                                <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${avgActivity}%` }} />
                                            </div>
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

                        <div className="mt-12 bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                            <div className="px-10 py-10 border-b border-slate-50 flex items-center justify-between bg-white relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-full translate-y-0" />
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[16px] font-black text-slate-900 tracking-tight">Weekly Timesheet Matrix</h3>
                                        <div className="bg-primary/5 text-primary text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-primary/10">Architecture</div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em] opacity-70">Deep-dive into individual and team temporal performance</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                        <button
                                            onClick={() => {
                                                if (scrollRef.current) scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
                                            }}
                                            className="p-2.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all group"
                                        >
                                            <ChevronLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (scrollRef.current) scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
                                            }}
                                            className="p-2.5 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-primary transition-all group"
                                        >
                                            <ChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                    <div className="flex -space-x-2.5">
                                        {tableData.rows.slice(0, 4).map((r, i) => (
                                            <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[11px] font-black text-slate-700 uppercase shadow-sm ring-1 ring-slate-100">
                                                {r.fullName[0]}
                                            </div>
                                        ))}
                                        {tableData.rows.length > 4 && (
                                            <div className="w-10 h-10 rounded-full bg-primary border-2 border-white flex items-center justify-center text-[11px] font-black text-white uppercase shadow-lg shadow-primary/20">
                                                +{tableData.rows.length - 4}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div ref={scrollRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                <table className="w-full border-collapse min-w-max">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="sticky left-0 z-20 bg-slate-50/90 backdrop-blur-md py-6 px-10 text-[11px] font-black text-primary uppercase tracking-widest border-b border-slate-100 text-left w-[250px] min-w-[250px]">
                                                Member
                                            </th>
                                            {tableData.dates.map(date => (
                                                <th key={date} className="py-6 px-4 text-[11px] font-bold text-slate-800 border-b border-slate-100 text-center w-[140px] min-w-[140px]">
                                                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                </th>
                                            ))}
                                            <th className="py-6 px-8 text-[11px] font-black text-slate-900 border-b border-slate-100 text-right w-[120px] min-w-[120px] uppercase tracking-widest">
                                                Total
                                            </th>
                                            <th className="py-6 px-8 text-[11px] font-black text-slate-900 border-b border-slate-100 text-right w-[120px] min-w-[120px] uppercase tracking-widest">
                                                Activity
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {tableData.rows.map(row => (
                                            <tr key={row.memberId} className="group hover:bg-slate-50/40 transition-all duration-300">
                                                <td className="sticky left-0 z-20 bg-white group-hover:bg-[#FDFDFF] backdrop-blur-md py-6 px-10 border-r border-slate-50 shadow-[8px_0_15px_-8px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase ring-2 ring-white group-hover:ring-primary/20 transition-all">
                                                            {row.fullName[0]}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-slate-900 tracking-tight">{row.fullName}</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Architectural Member</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {tableData.dates.map(date => (
                                                    <td key={date} className="py-5 px-4 text-[12px] font-medium text-slate-600 text-center tabular-nums">
                                                        {row.dailyMins[date] ? formatDuration(row.dailyMins[date]) : <span className="text-slate-200">—</span>}
                                                    </td>
                                                ))}
                                                <td className="py-5 px-8 text-[12px] font-bold text-slate-900 text-right tabular-nums">
                                                    {formatDuration(row.totalMins)}
                                                </td>
                                                <td className="py-5 px-8 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={clsx(
                                                            "text-[12px] font-bold tabular-nums",
                                                            row.activityScore > 70 ? "text-emerald-600" : row.activityScore > 40 ? "text-amber-600" : "text-rose-600"
                                                        )}>
                                                            {row.activityScore}%
                                                        </span>
                                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={clsx(
                                                                    "h-full rounded-full transition-all duration-500",
                                                                    row.activityScore > 70 ? "bg-emerald-500" : row.activityScore > 40 ? "bg-amber-500" : "bg-rose-500"
                                                                )}
                                                                style={{ width: `${row.activityScore}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-slate-50/40 border-t-2 border-slate-100">
                                            <td className="sticky left-0 z-20 bg-slate-50/95 backdrop-blur-md py-8 px-10 text-[12px] font-black text-slate-900 uppercase tracking-[0.2em]">
                                                Temporal Totals
                                            </td>
                                            {tableData.dates.map(date => {
                                                const dayTotal = tableData.rows.reduce((sum, r) => sum + (r.dailyMins[date] || 0), 0);
                                                return (
                                                    <td key={date} className="py-8 px-4 text-[13px] font-black text-primary text-center tabular-nums">
                                                        {dayTotal > 0 ? formatDuration(dayTotal) : <span className="text-slate-300">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-8 px-8 bg-primary/5">
                                                <div className="text-right">
                                                    <span className="text-[14px] font-black text-primary tabular-nums drop-shadow-sm">
                                                        {formatDuration(tableData.rows.reduce((sum, r) => sum + r.totalMins, 0))}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-8 px-8 bg-primary/5">
                                                <div className="text-right">
                                                    <span className="text-[14px] font-black text-primary tabular-nums drop-shadow-sm">
                                                        {tableData.rows.length > 0 ? Math.round(tableData.rows.reduce((sum, r) => sum + r.activityScore, 0) / tableData.rows.length) : 0}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

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
            <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-2.5 h-[46px] hover:border-primary hover:bg-primary/5 transition-all cursor-pointer shadow-sm group">
                <div className="text-slate-400 group-hover:text-primary transition-colors shrink-0">{icon}</div>
                <div className="flex items-center gap-2 min-w-[160px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
                    <span className="text-slate-200 mx-1">|</span>
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-primary transition-colors">{activeLabel}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all group-hover:translate-y-0.5 ml-auto" />
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

function DateRangePicker({ range, setRange, setOffset, onApply, onCancel }: any) {
    const [leftMonth, setLeftMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selStart, setSelStart] = useState<Date | null>(null);
    const [selEnd, setSelEnd] = useState<Date | null>(null);

    const rightMonth = new Date(leftMonth);
    rightMonth.setMonth(rightMonth.getMonth() + 1);

    const handleDateClick = (d: Date) => {
        if (!selStart || (selStart && selEnd)) {
            setSelStart(d);
            setSelEnd(null);
        } else {
            if (d < selStart) {
                setSelEnd(selStart);
                setSelStart(d);
            } else {
                setSelEnd(d);
            }
        }
    };

    const isSelected = (d: Date) => {
        if (!selStart) return false;
        if (selStart.getTime() === d.getTime()) return true;
        if (selEnd && selEnd.getTime() === d.getTime()) return true;
        return false;
    };

    const isInRange = (d: Date) => {
        if (!selStart || !selEnd) return false;
        return d > selStart && d < selEnd;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl flex p-1 overflow-hidden min-w-[850px]">
            <div className="flex-1 flex border-r border-slate-100 p-2 gap-4">
                <MonthView month={leftMonth} onPrev={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} onNext={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} onDateClick={handleDateClick} isSelected={isSelected} isInRange={isInRange} />
                <MonthView month={rightMonth} onPrev={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} onNext={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} onDateClick={handleDateClick} isSelected={isSelected} isInRange={isInRange} />
            </div>
            <div className="w-56 p-4 flex flex-col gap-2 bg-slate-50/30">
                {RANGES.filter(r => r !== 'Custom').map(r => (
                    <button
                        key={r}
                        onClick={() => { setRange(r); setOffset(0); onCancel(); }}
                        className={clsx(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                            range === r ? "bg-white border-slate-200 text-primary shadow-sm" : "text-slate-400 border-transparent hover:text-slate-900 hover:bg-white"
                        )}
                    >
                        {r}
                    </button>
                ))}
                <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <button
                        disabled={!selStart || !selEnd}
                        onClick={() => selStart && selEnd && onApply(selStart, selEnd)}
                        className="w-full py-3 bg-[#4FC08D] hover:bg-[#3FA07D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                        Apply
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 bg-white border border-slate-200 text-slate-600 text-[12px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function MonthView({ month, onPrev, onNext, onDateClick, isSelected, isInRange }: any) {
    const year = month.getFullYear();
    const monthIdx = month.getMonth();
    const firstDay = new Date(year, monthIdx, 1).getDay();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

    // Adjust for Monday start: (day + 6) % 7
    const adjustedStart = (firstDay + 6) % 7;

    const days = [];
    for (let i = 0; i < adjustedStart; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, monthIdx, i));

    const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return (
        <div className="flex-1 min-w-[300px]">
            <div className="bg-primary p-4 rounded-xl flex items-center justify-between text-white mb-4">
                <button onClick={onPrev} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-[13px] font-black uppercase tracking-widest">{monthName}</span>
                <button onClick={onNext} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                    <div key={d} className="py-2 text-[10px] font-black text-primary/60 uppercase tracking-widest">{d}</div>
                ))}
                {days.map((d, i) => {
                    if (!d) return <div key={i} className="py-3" />;
                    const selected = isSelected(d);
                    const inRange = isInRange(d);

                    return (
                        <button
                            key={i}
                            onClick={() => onDateClick(d)}
                            className={clsx(
                                "py-3 text-[12px] font-medium transition-all rounded-lg relative z-10",
                                selected ? "bg-primary text-white shadow-lg shadow-primary/30" :
                                    inRange ? "bg-primary/5 text-primary" :
                                        "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {month.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
            </div>
        </div>
    );
}

function TrendingUpIcon({ size, className }: { size?: number, className?: string }) {
    return <ArrowUpRight size={size} className={className} />;
}
