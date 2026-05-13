import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Monitor, Camera,
    Clock, Activity as ActivityIcon, Users,
    DollarSign,
    BarChart3,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Calendar as CalendarIcon
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    PageLayout, StatMetric, FilterSelect,
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
import { useAuth } from '../context/AuthContext';

// Official TrackOwl Brand Palette
const BRAND_PRIMARY = 'var(--color-chart-main)';
const CHART_COLORS = [
    'var(--chart-pie-primary)',
    'var(--color-chart-highlight)',
    'var(--color-chart-secondary)',
    'var(--color-chart-4)',
    'var(--color-chart-5)'
];

const RANGES = ['Today', 'Yesterday', 'Last 7 Days', 'Last Week', 'Last 2 Weeks', 'This Month', 'Last Month', 'Custom'] as const;
type Range = typeof RANGES[number];

// Module-level cache to prevent re-fetching when switching tabs
let reportsCache: any = null;
let reportsCacheKey: string | null = null;

export function Reports() {
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
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
        const { data } = await supabase.from('teams').select('id, name').eq('organization_id', organizationId);
        if (data) setTeams(data);
    }

    async function fetchMembers() {
        const { data } = await supabase.from('members')
            .select('id, auth_user_id, email, full_name, pay_rate, bill_rate, timezone, idle_limit')
            .eq('organization_id', organizationId)
            .eq('status', 'Active')
            .order('full_name', { ascending: true });
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

    async function fetchReports(forceRefresh = false) {
        const { start, end } = getDateRange();
        const cacheKey = `${start}_${end}_${selectedTeamId}_${selectedMemberId}`;

        if (!forceRefresh && reportsCache && reportsCacheKey === cacheKey) {
            setDailyActivity(reportsCache.dailyActivity);
            setAppBreakdown(reportsCache.appBreakdown);
            setScreenshotCount(reportsCache.screenshotCount);
            setTotalSessions(reportsCache.totalSessions);
            setTotalMins(reportsCache.totalMins);
            setAvgActivity(reportsCache.avgActivity);
            setTotalCosts(reportsCache.totalCosts);
            setTotalBilled(reportsCache.totalBilled);
            setTableData(reportsCache.tableData);
            setLoading(false);
            return;
        }

        setLoading(true);

        const membersForLookup = members.length > 0
            ? members
            : (await supabase
                .from('members')
                .select('id, auth_user_id, email, full_name, pay_rate, bill_rate, timezone')
                .eq('organization_id', organizationId)
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
                .eq('organization_id', organizationId)
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
                fetchAllActivitySamples(supabase, start, end, 'session_id, recorded_at, activity_percent, idle, app_name', {
                    organizationId: organizationId ?? undefined,
                    sessionIds: activeSessionIds.length > 0 ? activeSessionIds : undefined
                }),
                ssQuery,
            ]);

            const allSamples = samples || [];
            const activeSessionIdsSet = new Set(activeSessionIds);
            const inScopeSamples = allSamples.filter(s => activeSessionIdsSet.has(s.session_id));

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

            const sessionToUserId = new Map(filteredSessions.map(sess => [sess.id, sess.user_id]));
            const seen = new Set<string>();
            const dedupedSamples: any[] = [];
            [...inScopeSamples].sort((a, b) => (b.activity_percent ?? 0) - (a.activity_percent ?? 0)).forEach(s => {
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;
                const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
                const key = `${uid}_${minute}`;
                if (seen.has(key)) return;
                seen.add(key);
                dedupedSamples.push(s);
            });

            const dailyMap: Record<string, { activitySum: number; total_samples: number; total_minutes: number }> = {};
            let costs = 0;
            let billed = 0;
            const productiveSamples: any[] = [];

            // Group deduped samples by user to apply idle threshold
            const samplesByUser = new Map<string, any[]>();
            dedupedSamples.forEach(s => {
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;
                if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
                samplesByUser.get(uid)!.push(s);
            });

            samplesByUser.forEach((userSamps, uid) => {
                const member = membersMap.get(uid);
                const limit = member?.idle_limit ?? 0;

                if (limit <= 1) {
                    productiveSamples.push(...userSamps);
                } else {
                    // Apply Hubstaff-style block logic: 
                    // samples in idle blocks >= limit are truly idle (ignored)
                    const sorted = userSamps.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                    let currentBlock: any[] = [];

                    for (let i = 0; i < sorted.length; i++) {
                        const s = sorted[i];
                        const prev = i > 0 ? sorted[i - 1] : null;
                        const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
                        const isContiguous = prev && gapMs <= 125000;

                        if (s.idle && isContiguous) {
                            currentBlock.push(s);
                        } else if (s.idle && !prev) {
                            currentBlock = [s];
                        } else if (s.idle && !isContiguous) {
                            if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                            currentBlock = [s];
                        } else {
                            productiveSamples.push(s); // Not idle
                            if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                            currentBlock = [];
                        }
                    }
                    if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                }
            });

            productiveSamples.forEach(s => {
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;

                const day = getGroupingDateInTz(s.recorded_at, memberTzs.get(uid));
                if (!dailyMap[day]) dailyMap[day] = { activitySum: 0, total_samples: 0, total_minutes: 0 };

                dailyMap[day].activitySum += (s.activity_percent || 0);
                dailyMap[day].total_samples++;
                dailyMap[day].total_minutes++;

                const member = membersMap.get(uid);
                if (member) {
                    costs += (1 / 60) * (member.pay_rate || 0);
                    billed += (1 / 60) * (member.bill_rate || 0);
                }
            });

            const dailyActivityList = Object.entries(dailyMap).sort().map(([date, v]) => ({
                date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                activity: v.total_samples > 0 ? Math.round(v.activitySum / v.total_samples) : 0,
                minutes: Math.round(v.total_minutes),
            }));
            setDailyActivity(dailyActivityList);

            const appMap: Record<string, number> = {};
            productiveSamples.forEach(s => {
                const app = s.app_name || 'Unknown';
                appMap[app] = (appMap[app] || 0) + 1;
            });
            const appBreakdownList = Object.entries(appMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
            setAppBreakdown(appBreakdownList);

            let totalSessionMins = 0;
            filteredSessions.forEach(s => {
                const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
                totalSessionMins += (endMs - new Date(s.started_at).getTime()) / 60000;
            });

            const calculatedTotalMins = Math.max(productiveSamples.length, Math.round(totalSessionMins));
            const calculatedAvgActivity = calculateActivityScore(productiveSamples);
            setTotalSessions(filteredSessions.length);
            setScreenshotCount(ssCount || 0);
            setTotalMins(calculatedTotalMins);
            setAvgActivity(calculatedAvgActivity);
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

                memberRows[m.id] = {
                    memberId: m.id,
                    fullName: m.full_name || m.email || 'Unknown',
                    dailyMins: {},
                    totalMins: 0,
                    activitySum: 0,
                    activitySamples: 0
                };
            });

            // Populate daily minutes and activity from productive samples
            productiveSamples.forEach(s => {
                const uid = sessionToUserId.get(s.session_id);
                if (!uid) return;

                const member = membersMap.get(uid);
                if (!member || !memberRows[member.id]) return;

                const day = getGroupingDateInTz(s.recorded_at, memberTzs.get(uid));
                const row = memberRows[member.id];

                row.dailyMins[day] = (row.dailyMins[day] || 0) + 1;
                row.totalMins++;

                if (s.activity_percent !== undefined && s.activity_percent !== null) {
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

            // Update cache
            reportsCache = {
                dailyActivity: dailyActivityList,
                appBreakdown: appBreakdownList,
                screenshotCount: ssCount || 0,
                totalSessions: filteredSessions.length,
                totalMins: calculatedTotalMins,
                avgActivity: calculatedAvgActivity,
                totalCosts: costs,
                totalBilled: billed,
                tableData: { dates: dateList, rows: finalRows }
            };
            reportsCacheKey = cacheKey;

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
            description="Detailed activity analytics and time distribution."
            actions={
                <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center bg-surface border border-border rounded-xl shadow-shell-sm shrink-0 h-10">
                        <button
                            onClick={() => shiftRange(-1)}
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-primary transition-all border-r border-border rounded-l-xl h-full"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="relative group min-w-[100px]">
                            <div
                                onClick={() => setShowRangeDropdown(!showRangeDropdown)}
                                className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-surface-hover transition-all h-full"
                            >
                                <CalendarIcon className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-[11px] font-bold text-text-main ">
                                    {new Date(getDateRange().start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    <span className="text-text-muted mx-2">—</span>
                                    {new Date(getDateRange().end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            {showRangeDropdown && (
                                <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-primary transition-all border-l border-border rounded-r-xl h-full"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => { setRange('Today'); setOffset(0); }}
                        className="px-4 py-2 bg-surface border border-border rounded-xl text-[11px] font-bold text-text-muted hover:text-primary hover:bg-surface-hover transition-all shadow-shell-sm h-10"
                    >
                        Today
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

                    <FilterSelect
                        label="Team"
                        icon={<Users className="w-3.5 h-3.5" />}
                        value={selectedTeamId}
                        onChange={(val) => { setSelectedTeamId(val); setSelectedMemberId('All'); }}
                        options={[{ id: 'All', name: 'All Teams' }, ...teams]}
                        className="h-10"
                    />
                    <FilterSelect
                        label="Member"
                        icon={<ActivityIcon className="w-3.5 h-3.5" />}
                        value={selectedMemberId}
                        onChange={(val) => { setSelectedMemberId(val); setSelectedTeamId('All'); }}
                        options={[{ id: 'All', name: 'All Members' }, ...members].map((m: any) => ({ id: m.id, name: m.full_name || m.email || m.name || 'Unknown' }))}
                        className="h-10"
                    />

                    <button
                        onClick={() => fetchReports(true)}
                        className={clsx(
                            "p-2.5 bg-surface border border-border rounded-xl text-text-muted hover:text-primary hover:bg-surface-hover transition-all shadow-shell-sm h-10",
                            loading && "animate-spin text-primary"
                        )}
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-8 pb-20">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 lg:gap-10">
                    <StatMetric icon={<Clock className="w-4 h-4" />} label="Time" value={formatDuration(totalMins)} sub="Worked" accent="brand-gradient" className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]" />
                    <StatMetric icon={<ActivityIcon className="w-4 h-4" />} label="Activity" value={`${avgActivity}%`} sub="Score" accent="brand-gradient" className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]" />
                    <StatMetric icon={<Monitor className="w-4 h-4" />} label="Sessions" value={totalSessions.toString()} sub="Total" accent="brand-gradient" className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]" />
                    <StatMetric icon={<Camera className="w-4 h-4" />} label="Captures" value={screenshotCount.toString()} sub="Proofs" accent="brand-gradient" className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]" />
                    <StatMetric icon={<DollarSign className="w-4 h-4" />} label="Billable" value={`$${Math.round(totalBilled).toLocaleString()}`} sub="Revenue" accent="brand-gradient" className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]" />
                    <StatMetric icon={<DollarSign className="w-4 h-4" />} label="Cost" value={`$${Math.round(totalCosts).toLocaleString()}`} sub="Expenses" accent="brand-gradient" className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]" />
                </div>

                {loading ? (
                    <div className="h-[400px] flex items-center justify-center bg-surface rounded-[24px] border border-border">
                        <LoadingState message="Loading..." />
                    </div>
                ) : dailyActivity.length === 0 ? (
                    <div className="h-[400px] flex items-center justify-center bg-surface rounded-[24px] border border-border italic">
                        <EmptyState title="No data found" description="Try adjusting filters." />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8">
                                <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border p-8 h-full">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-[14px] font-bold" style={{ color: 'var(--chart-gold)' }}>Activity Trend</h3>
                                        <TrendingUpIcon size={16} className="text-text-muted" />
                                    </div>
                                    <div className="h-[320px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dailyActivity} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={BRAND_PRIMARY} stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor={BRAND_PRIMARY} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                                <XAxis
                                                    dataKey="date"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: 'rgba(100,116,139,0.7)', fontSize: 10, fontWeight: 700 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    domain={[0, 100]}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: 'rgba(100,116,139,0.7)', fontSize: 10, fontWeight: 700 }}
                                                    unit="%"
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(64,102,211,0.1)', strokeWidth: 1 }} />
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
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-8">
                                <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border p-8 h-full">
                                    <h3 className="text-[14px] font-bold mb-8" style={{ color: 'var(--chart-gold)' }}>Top Apps</h3>
                                    <div className="h-[180px] w-full relative mb-8">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={appBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                    paddingAngle={4}
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
                                            <span className="text-xl font-bold text-text-main leading-none">{appBreakdown.length}</span>
                                            <span className="text-[8px] font-bold text-text-muted mt-1.5">Apps</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {appBreakdown.slice(0, 5).map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-hover transition-all group">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                    <span className="text-[11px] font-bold text-text-main truncate max-w-[120px] group-hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-text-muted tabular-nums">
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[14px] font-bold" style={{ color: 'var(--chart-gold)' }}>Time Allocation</h3>
                                <BarChart3 className="w-4 h-4 text-text-muted" />
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyActivity} barSize={32}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(100,116,139,0.7)', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(100,116,139,0.7)', fontSize: 10, fontWeight: 700 }}
                                        />
                                        <Tooltip content={<CustomTooltip unit="min" />} cursor={{ fill: 'rgba(64,102,211,0.02)' }} />
                                        <Bar
                                            dataKey="minutes"
                                            fill={BRAND_PRIMARY}
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border overflow-hidden">
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-surface shrink-0">
                                <div className="space-y-1">
                                    <h3 className="text-[16px] font-bold tracking-tight" style={{ color: 'var(--chart-gold)' }}>Timesheet Matrix</h3>
                                    <p className="text-[10px] font-bold text-text-muted ">Weekly performance distribution</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-surface-hover p-1 rounded-xl border border-border">
                                        <button
                                            onClick={() => {
                                                if (scrollRef.current) scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
                                            }}
                                            className="p-2 hover:bg-surface-hover hover:shadow-sm text-text-muted hover:text-slate-900 transition-all rounded-lg"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (scrollRef.current) scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
                                            }}
                                            className="p-2 hover:bg-surface-hover hover:shadow-sm text-text-muted hover:text-slate-900 transition-all rounded-lg"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {tableData.rows.slice(0, 4).map((r, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-main border-2 border-white flex items-center justify-center text-[10px] font-bold text-text-muted shadow-shell-sm">
                                                {r.fullName[0]}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div ref={scrollRef} className="overflow-x-auto custom-scrollbar">
                                <table className="w-full border-collapse min-w-max">
                                    <thead>
                                        <tr className="bg-surface-hover/50">
                                            <th className="sticky left-0 z-20 bg-surface-hover/90 backdrop-blur-md py-4 px-8 text-[11px] font-bold text-text-muted border-b border-border text-left w-[220px]">
                                                Member
                                            </th>
                                            {tableData.dates.map(date => (
                                                <th key={date} className="py-4 px-4 text-[10px] font-bold text-text-muted border-b border-border text-center w-[120px]">
                                                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </th>
                                            ))}
                                            <th className="py-4 px-6 text-[10px] font-bold border-b border-border text-right w-[100px]" style={{ color: 'var(--chart-gold)' }}>
                                                Total
                                            </th>
                                            <th className="py-4 px-6 text-[10px] font-bold border-b border-border text-right w-[100px]" style={{ color: 'var(--chart-gold)' }}>
                                                Score
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tableData.rows.map(row => (
                                            <tr key={row.memberId} className="group hover:bg-surface-hover/50 transition-all">
                                                <td className="sticky left-0 z-20 bg-surface group-hover:bg-slate-50/50 backdrop-blur-md py-4 px-8 border-r border-border">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-lg bg-main flex items-center justify-center text-[10px] font-bold text-text-muted ">
                                                            {row.fullName[0]}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-text-main tracking-tight">{row.fullName}</span>
                                                    </div>
                                                </td>
                                                {tableData.dates.map(date => (
                                                    <td key={date} className="py-4 px-4 text-[12px] font-medium text-text-muted text-center tabular-nums">
                                                        {row.dailyMins[date] ? formatDuration(row.dailyMins[date]) : <span className="text-text-muted">—</span>}
                                                    </td>
                                                ))}
                                                <td className="py-4 px-6 text-[12px] font-bold text-right tabular-nums" style={{ color: 'var(--chart-gold)' }}>
                                                    {formatDuration(row.totalMins)}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span className={clsx(
                                                        "text-[12px] font-bold tabular-nums",
                                                        row.activityScore > 70 ? "text-emerald-500" : row.activityScore > 40 ? "text-amber-500" : "text-rose-500"
                                                    )}>
                                                        {row.activityScore}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-surface-hover/50 border-t border-border">
                                            <td className="sticky left-0 z-20 bg-surface-hover/90 backdrop-blur-md py-6 px-8 text-[11px] font-bold text-text-main ">
                                                Totals
                                            </td>
                                            {tableData.dates.map(date => {
                                                const dayTotal = tableData.rows.reduce((sum, r) => sum + (r.dailyMins[date] || 0), 0);
                                                return (
                                                    <td key={date} className="py-6 px-4 text-[12px] font-bold text-center tabular-nums" style={{ color: 'var(--chart-gold)' }}>
                                                        {dayTotal > 0 ? formatDuration(dayTotal) : <span className="text-text-muted">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="py-6 px-6 text-right">
                                                <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--chart-gold)' }}>
                                                    {formatDuration(tableData.rows.reduce((sum, r) => sum + r.totalMins, 0))}
                                                </span>
                                            </td>
                                            <td className="py-6 px-6 text-right">
                                                <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--chart-gold)' }}>
                                                    {tableData.rows.length > 0 ? Math.round(tableData.rows.reduce((sum, r) => sum + r.activityScore, 0) / tableData.rows.length) : 0}%
                                                </span>
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



function CustomTooltip({ active, payload, label, unit }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 bg-surface/90 backdrop-blur-md rounded-2xl shadow-2xl border border-border min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[9px] font-black text-text-muted mb-3 pb-2 border-b border-slate-50">{label}</p>
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full ring-4 ring-[var(--chart-gold)]/10 shadow-[0_0_12px_rgba(197,138,42,0.4)]" style={{ backgroundColor: 'var(--chart-gold)' }} />
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-text-main tracking-tighter tabular-nums">
                            {payload[0].value}
                        </span>
                        <span className="text-[10px] font-black text-text-muted ">
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
        <div className="bg-surface border border-border rounded-2xl shadow-2xl flex p-1 overflow-hidden min-w-[850px]">
            <div className="flex-1 flex border-r border-border p-2 gap-4">
                <MonthView month={leftMonth} onPrev={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} onNext={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} onDateClick={handleDateClick} isSelected={isSelected} isInRange={isInRange} />
                <MonthView month={rightMonth} onPrev={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} onNext={() => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} onDateClick={handleDateClick} isSelected={isSelected} isInRange={isInRange} />
            </div>
            <div className="w-56 p-4 flex flex-col gap-2 bg-surface-hover/30">
                {RANGES.filter(r => r !== 'Custom').map(r => (
                    <button
                        key={r}
                        onClick={() => { setRange(r); setOffset(0); onCancel(); }}
                        className={clsx(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black transition-all border",
                            range === r ? "bg-surface border-border shadow-shell-sm" : "text-text-muted border-transparent hover:text-slate-900 hover:bg-surface-hover"
                        )}
                        style={range === r ? { color: 'var(--chart-gold)' } : {}}
                    >
                        {r}
                    </button>
                ))}
                <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
                    <button
                        disabled={!selStart || !selEnd}
                        onClick={() => selStart && selEnd && onApply(selStart, selEnd)}
                        className="w-full py-3 bg-[#4FC08D] hover:bg-[#3FA07D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-black rounded-xl transition-all"
                    >
                        Apply
                    </button>
                    <button
                        onClick={onCancel}
                        className="w-full py-3 bg-surface border border-border text-text-muted text-[12px] font-black rounded-xl hover:bg-surface-hover transition-all"
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
            <div className="p-4 rounded-xl flex items-center justify-between text-white mb-4" style={{ backgroundColor: 'var(--chart-gold)' }}>
                <button onClick={onPrev} className="hover:bg-surface-hover/20 p-1 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-[13px] font-black ">{monthName}</span>
                <button onClick={onNext} className="hover:bg-surface-hover/20 p-1 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                    <div key={d} className="py-2 text-[10px] font-black opacity-60" style={{ color: 'var(--chart-gold)' }}>{d}</div>
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
                                selected ? "text-white shadow-lg shadow-[var(--chart-gold)]/30" :
                                    inRange ? "bg-[var(--chart-gold)]/5" :
                                        "text-text-muted hover:bg-surface-hover"
                            )}
                            style={selected ? { backgroundColor: 'var(--chart-gold)' } : inRange ? { color: 'var(--chart-gold)' } : {}}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                <span className="text-[10px] font-bold text-text-muted ">
                    {month.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
            </div>
        </div>
    );
}

function TrendingUpIcon({ size, className }: { size?: number, className?: string }) {
    return <ArrowUpRight size={size} className={className} />;
}
