import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
    Clock, Users, FolderOpen,
    Camera, TrendingUp, BarChart3,
    Monitor, Globe, RefreshCw,
    ChevronLeft, ChevronRight,
    MoreHorizontal,
    ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { PageLayout, EmptyState, LoadingState, StatMetric, ScreenshotModal, DatePicker } from './ui';
import { FeatureLockOverlay } from './access/FeatureLockOverlay';
import { SecureImage } from './ui/SecureImage';
import {
    getEffectiveEnd,
    formatDuration,
    fetchAllActivitySamples,
    getDailyActivityData
} from '../lib/dataUtils';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';

interface UserActivityRow {
    userId: string;
    fullName: string;
    avatarUrl?: string;
    activityScore: number;
    totalMinutes: number;
    screenshots: {
        id: string;
        path: string;
        recordedAt: string;
        activityPercent: number;
    }[];
}

interface OnlineMember {
    id: string;
    fullName: string;
    projectName: string;
    timeWorkedToday: number;
    status: 'working' | 'idle' | 'offline';
    lastActive: string;
    avatarUrl?: string;
    email?: string;
}

interface ProjectActivity {
    id: string;
    name: string;
    minutes: number;
    activityScore: number;
    color: string;
}

interface AppUsage {
    name: string;
    minutes: number;
    percent: number;
}

// Module-level cache to prevent re-fetching when switching sidebar tabs
let dashboardCache: any = null;
let dashboardCacheWeek: string | null = null;


interface DashStats {
    totalProductiveMinutes: number;
    avgActivityScore: number;
    projectsWorked: number;
    activeMembers: number;
    totalScreenshots: number;
    trendFocus: number;
    trendProductivity: number;
}
export function Dashboard() {
    const { profile, isPremium } = useAuth();
    const organizationId = profile?.organization_id;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [enlargedScreenshot, setEnlargedScreenshot] = useState<any | null>(null);

    const toProperCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const toEmailCase = (str: string) => {
        if (!str) return '';
        return str.toLowerCase();
    };

    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const [stats, setStats] = useState<DashStats>({
        totalProductiveMinutes: 0,
        avgActivityScore: 0,
        projectsWorked: 0,
        activeMembers: 0,
        totalScreenshots: 0,
        trendFocus: 0,
        trendProductivity: 0
    });

    const [userActivity, setUserActivity] = useState<UserActivityRow[]>([]);
    const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
    const [projectActivity, setProjectActivity] = useState<ProjectActivity[]>([]);
    const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    const weekEnd = useMemo(() => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 6);
        d.setHours(23, 59, 59, 999);
        return d;
    }, [weekStart]);

    const navigateWeek = (direction: 'prev' | 'next') => {
        const next = new Date(weekStart);
        next.setDate(weekStart.getDate() + (direction === 'prev' ? -7 : 7));
        setWeekStart(next);
    };

    const handleDateChange = (dateStr: string) => {
        if (!dateStr) return;
        const d = new Date(dateStr);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        setWeekStart(d);
    };

    const fetchDashboardData = useCallback(async (forceRefresh = false, isSilent = false) => {
        if (!organizationId) return;
        const startIso = weekStart.toISOString();
        const endIso = weekEnd.toISOString();

        if (!forceRefresh && dashboardCache && dashboardCacheWeek === startIso) {
            setStats(dashboardCache.stats);
            setUserActivity(dashboardCache.userActivity);
            setOnlineMembers(dashboardCache.onlineMembers);
            setProjectActivity(dashboardCache.projectActivity);
            setAppUsage(dashboardCache.appUsage);
            setLoading(false);
            return;
        }

        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const nowIso = new Date().toISOString();
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStartIso = todayStart.toISOString();

            const prevWeekStart = new Date(weekStart);
            prevWeekStart.setDate(prevWeekStart.getDate() - 7);
            const prevWeekStartIso = prevWeekStart.toISOString();

            const prevWeekEnd = new Date(weekEnd);
            prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
            const prevWeekEndIso = prevWeekEnd.toISOString();

            const [
                { data: members },
                { data: projects },
                { data: sessions },
                { data: screenshots },
                activitySamples,
                { data: prevSessions },
                prevActivitySamples
            ] = await Promise.all([
                supabase.from('members').select('id, full_name, avatar_url, status, email, idle_limit').eq('organization_id', organizationId),
                supabase.from('projects').select('id, name, color').eq('organization_id', organizationId),
                supabase.from('sessions').select('id, user_id, project_id, started_at, ended_at').eq('organization_id', organizationId).gte('started_at', startIso).lte('started_at', endIso),
                supabase.from('screenshots').select('id, session_id, file_url, recorded_at').eq('organization_id', organizationId).gte('recorded_at', startIso).lte('recorded_at', endIso).order('recorded_at', { ascending: false }).limit(300),
                fetchAllActivitySamples(supabase, startIso, endIso, 'session_id, recorded_at, activity_percent, idle, app_name', { organizationId }),
                supabase.from('sessions').select('id, user_id').eq('organization_id', organizationId).gte('started_at', prevWeekStartIso).lte('started_at', prevWeekEndIso),
                fetchAllActivitySamples(supabase, prevWeekStartIso, prevWeekEndIso, 'session_id, recorded_at, activity_percent, idle', { organizationId })
            ]);

            if (!members || !projects || !sessions) return;

            const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
            const sessionToUserMap = Object.fromEntries(sessions.map(s => [s.id, s.user_id]));
            const sessionToProjectMap = Object.fromEntries(sessions.map(s => [s.id, s.project_id]));

            let totalMins = 0;
            let activitySum = 0;
            let activityCount = 0;
            const projectsWorked = new Set<string>();
            const activeMemberIds = new Set<string>();

            const userRows: Record<string, UserActivityRow> = {};
            const projStats: Record<string, { mins: number, activitySum: number, activityCount: number }> = {};
            const appStats: Record<string, number> = {};

            members.forEach(m => {
                userRows[m.id] = {
                    userId: m.id,
                    fullName: m.full_name,
                    avatarUrl: m.avatar_url,
                    activityScore: 0,
                    totalMinutes: 0,
                    screenshots: []
                };
            });

            const membersMap = new Map(members.map(m => [m.id, m]));

            const getProductiveSamples = (samples: any[], sessionMap: Record<string, string>, memMap: Map<string, any>) => {
                const samplesByUser = new Map<string, any[]>();
                samples.forEach(s => {
                    const uid = sessionMap[s.session_id];
                    if (!uid) return;
                    if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
                    samplesByUser.get(uid)!.push(s);
                });

                const result: any[] = [];
                samplesByUser.forEach((userSamps, uid) => {
                    const limit = memMap.get(uid)?.idle_limit ?? 0;
                    if (limit <= 1) {
                        result.push(...userSamps);
                    } else {
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
                                if (currentBlock.length < limit) result.push(...currentBlock);
                                currentBlock = [s];
                            } else {
                                result.push(s);
                                if (currentBlock.length < limit) result.push(...currentBlock);
                                currentBlock = [];
                            }
                        }
                        if (currentBlock.length < limit) result.push(...currentBlock);
                    }
                });
                return result;
            };

            const productiveSamples = getProductiveSamples(activitySamples, sessionToUserMap, membersMap);

            productiveSamples.forEach(sample => {
                const userId = sessionToUserMap[sample.session_id];
                const projectId = sessionToProjectMap[sample.session_id];
                if (!userId) return;

                const score = sample.activity_percent ?? 50;
                totalMins++;
                activitySum += score;
                activityCount++;
                if (projectId) projectsWorked.add(projectId);
                activeMemberIds.add(userId);

                if (projectId) {
                    if (!projStats[projectId]) projStats[projectId] = { mins: 0, activitySum: 0, activityCount: 0 };
                    projStats[projectId].mins++;
                    projStats[projectId].activitySum += score;
                    projStats[projectId].activityCount++;
                }

                if (sample.app_name) {
                    appStats[sample.app_name] = (appStats[sample.app_name] || 0) + 1;
                }
            });

            // 2. Pre-index samples for faster lookup
            const samplesBySession = new Map<string, any[]>();
            activitySamples.forEach(s => {
                if (!samplesBySession.has(s.session_id)) samplesBySession.set(s.session_id, []);
                samplesBySession.get(s.session_id)!.push(s);
            });

            screenshots?.forEach(ss => {
                const userId = sessionToUserMap[ss.session_id];
                if (userId && userRows[userId]) {
                    // Limit to 3 screenshots per user
                    if (userRows[userId].screenshots.length < 3) {
                        const sessSamples = samplesBySession.get(ss.session_id) || [];
                        const ssTime = new Date(ss.recorded_at).getTime();

                        // Find activity percent for this screenshot (within 10m window)
                        const activityPercent = sessSamples.find(s => Math.abs(new Date(s.recorded_at).getTime() - ssTime) < 600000)?.activity_percent ?? 50;

                        userRows[userId].screenshots.push({
                            id: ss.id,
                            path: ss.file_url,
                            recordedAt: ss.recorded_at,
                            activityPercent: activityPercent
                        });
                    }
                }
            });

            // Index sessions by user for fast lookup
            const sessionsByUser = new Map<string, any[]>();
            sessions.forEach(s => {
                if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
                sessionsByUser.get(s.user_id)!.push(s);
            });

            Object.entries(userRows).forEach(([uId, row]) => {
                const userSessions = sessionsByUser.get(uId) || [];
                const userSessionIds = userSessions.map(s => s.id);
                const userSamples: any[] = [];
                userSessionIds.forEach(sid => {
                    const sessSamples = samplesBySession.get(sid);
                    if (sessSamples) userSamples.push(...sessSamples);
                });

                if (userSamples.length > 0) {
                    const sum = userSamples.reduce((acc, s) => acc + (s.activity_percent ?? (s.idle ? 0 : 50)), 0);
                    row.activityScore = Math.round(sum / userSamples.length);
                    row.totalMinutes = userSamples.filter(s => !s.idle).length;
                }
            });

            const online: OnlineMember[] = members.map(m => {
                const activeSession = sessions.find(s => s.user_id === m.id && (!s.ended_at || s.ended_at > nowIso));
                const todaySessions = sessions.filter(s => s.user_id === m.id && s.started_at >= todayStartIso);
                let dailyMins = 0;
                todaySessions.forEach(s => {
                    const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
                    dailyMins += (endMs - new Date(s.started_at).getTime()) / 60000;
                });
                let status: 'working' | 'idle' | 'offline' = 'offline';
                if (activeSession) {
                    const latestSample = activitySamples.filter(s => s.session_id === activeSession.id).sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
                    status = (latestSample && !latestSample.idle) ? 'working' : 'idle';
                }
                return {
                    id: m.id,
                    fullName: m.full_name,
                    email: m.email,
                    avatarUrl: m.avatar_url,
                    projectName: activeSession ? (projectMap[activeSession.project_id]?.name || 'Unknown Project') : 'None',
                    timeWorkedToday: dailyMins,
                    status,
                    lastActive: activeSession ? activeSession.started_at : m.id
                };
            }).sort((a, b) => (a.status === 'offline' ? 1 : 0) - (b.status === 'offline' ? 1 : 0));

            let prevTotalMins = 0;
            let prevActivitySum = 0;
            let prevActivityCount = 0;

            if (prevSessions && prevActivitySamples) {
                const prevSessionToUserMap = Object.fromEntries(prevSessions.map((s: any) => [s.id, s.user_id]));
                const prevProductiveSamples = getProductiveSamples(prevActivitySamples, prevSessionToUserMap, membersMap);

                prevProductiveSamples.forEach(sample => {
                    prevTotalMins++;
                    prevActivitySum += sample.activity_percent ?? 50;
                    prevActivityCount++;
                });
            }

            const currAvgScore = activityCount > 0 ? Math.round(activitySum / activityCount) : 0;
            const prevAvgScore = prevActivityCount > 0 ? Math.round(prevActivitySum / prevActivityCount) : 0;
            const trendFocus = prevAvgScore > 0 ? currAvgScore - prevAvgScore : (currAvgScore > 0 ? currAvgScore : 0);

            const trendProductivity = prevTotalMins > 0 ? Math.round(((totalMins - prevTotalMins) / prevTotalMins) * 100) : (totalMins > 0 ? 100 : 0);

            const finalStats = {
                totalProductiveMinutes: totalMins,
                avgActivityScore: currAvgScore,
                projectsWorked: projectsWorked.size,
                activeMembers: activeMemberIds.size,
                totalScreenshots: screenshots?.length || 0,
                trendFocus,
                trendProductivity
            };

            const finalUserActivity = Object.values(userRows)
                .filter(r => r.totalMinutes > 0 || r.screenshots.length > 0)
                .sort((a, b) => b.totalMinutes - a.totalMinutes)
                .slice(0, 4);

            const finalProjectActivity = Object.entries(projStats)
                .map(([id, p]) => ({ id, name: projectMap[id]?.name || 'Unknown', minutes: p.mins, activityScore: p.activityCount > 0 ? Math.round(p.activitySum / p.activityCount) : 0, color: projectMap[id]?.color || 'var(--color-chart-main)' }))
                .sort((a, b) => b.minutes - a.minutes);

            const totalSamplesForApps = Object.values(appStats).reduce((a, b) => a + b, 0);
            const finalAppUsage = Object.entries(appStats)
                .map(([name, count]) => ({
                    name,
                    minutes: count,
                    percent: totalSamplesForApps > 0 ? (count / totalSamplesForApps) * 100 : 0
                }))
                .sort((a, b) => b.minutes - a.minutes).slice(0, 10);

            // Update State
            setStats(finalStats);
            setUserActivity(finalUserActivity);
            setOnlineMembers(online);
            setProjectActivity(finalProjectActivity);
            setAppUsage(finalAppUsage);

            // Chart Data Transformation
            const dailyData = getDailyActivityData(productiveSamples, weekStart, weekEnd);
            setChartData(dailyData);

            // Update Cache
            dashboardCache = {
                stats: finalStats,
                userActivity: finalUserActivity,
                onlineMembers: online,
                projectActivity: finalProjectActivity,
                appUsage: finalAppUsage,
                chartData: dailyData
            };
            dashboardCacheWeek = startIso;

        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [weekStart, weekEnd]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-surface"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            eyebrow="WORKSPACE ANALYTICS & INSIGHTS"
            title="Team Overview"
            description="Building the future of global work. Strategic leadership for the modern enterprise."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex items-center glass-panel p-1 rounded-2xl shadow-premium border border-border">
                        <button
                            onClick={() => navigateWeek('prev')}
                            className="p-3 hover:bg-surface-hover text-text-muted hover:text-primary transition-all rounded-xl"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <DatePicker
                            value={`${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`}
                            displayValue={`${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            onChange={(val) => handleDateChange(val)}
                            className="min-w-[240px]"
                            label="Viewing Week"
                        />
                        <button
                            onClick={() => navigateWeek('next')}
                            className="p-3 hover:bg-surface-hover text-text-muted hover:text-primary transition-all rounded-xl disabled:opacity-30 disabled:hover:bg-transparent"
                            disabled={weekEnd > new Date()}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => fetchDashboardData(true, true)}
                        className={clsx(
                            "w-12 h-12 flex items-center justify-center glass-panel rounded-2xl transition-all duration-300 border border-border",
                            refreshing ? "text-primary shadow-glow-primary border-primary/20" : "text-text-muted hover:text-text-main"
                        )}
                    >
                        <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-12 pb-32">

                {/* 📊 KPI Architecture */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    <StatMetric
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Team Focus"
                        value={`${stats.avgActivityScore}%`}
                        sub="Avg activity score this week"
                        trend={stats.trendFocus}
                        accent="brand-gradient"
                        className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]"
                    />
                    <StatMetric
                        icon={<Clock className="w-5 h-5" />}
                        label="Productivity"
                        value={formatDuration(stats.totalProductiveMinutes)}
                        sub="Total hours tracked this week"
                        trend={stats.trendProductivity}
                        accent="brand-gradient"
                        className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]"
                    />
                    <StatMetric
                        icon={<FolderOpen className="w-5 h-5" />}
                        label="Utilization"
                        value={stats.projectsWorked}
                        sub="Projects with active progress"
                        accent="brand-gradient"
                        className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]"
                    />
                    <StatMetric
                        icon={<Users className="w-5 h-5" />}
                        label="Live Presence"
                        value={onlineMembers.filter(m => m.status !== 'offline').length}
                        sub="Members currently active"
                        accent="brand-gradient"
                        className="[&_[class*='text-accent']]:!text-[var(--chart-gold)]"
                    />
                </div>

                {/* 📈 Analytics Row (Line & Donut Charts) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
                    {/* Line Chart: Time Tracked Over Time */}
                    <div className="lg:col-span-8 bg-surface rounded-2xl shadow-premium border border-border flex flex-col min-h-[420px]">
                        <div className="px-8 py-6 border-b border-border flex items-center justify-between relative z-20">
                            <div>
                                <h3 className="text-[16px] font-bold text-text-main mb-1 tracking-[0.05em]">Time Tracked Over Time</h3>
                                <p className="text-[12px] font-medium text-text-muted tracking-[0.1em]">Daily productivity trends for this week</p>
                            </div>
                        </div>
                        <div className="flex-1 p-8 pt-4 relative">
                            {chartData.every(d => d.hours === 0) ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <EmptyState
                                        icon={<BarChart3 className="w-8 h-8 text-text-muted/20" />}
                                        title="No activity recorded"
                                        description="Data will appear here once team members start tracking time."
                                    />
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="chartGold" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--chart-gold)" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="var(--chart-gold)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                                            tickFormatter={(val) => `${val}h`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-premium)', fontSize: '12px' }}
                                            itemStyle={{ color: 'var(--chart-gold)', fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="hours"
                                            stroke="var(--chart-gold)"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#chartGold)"
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Donut Chart: Time Distribution */}
                    <div className="lg:col-span-4 bg-surface rounded-2xl shadow-premium border border-border overflow-hidden flex flex-col min-h-[420px]">
                        <div className="px-8 py-6 border-b border-border">
                            <h3 className="text-[16px] font-bold text-text-main mb-1 tracking-[0.05em]">Time Distribution</h3>
                            <p className="text-[12px] font-medium text-text-muted tracking-[0.1em]">Breakdown by project</p>
                        </div>
                        <div className="flex-1 flex flex-col p-8 items-center justify-center relative min-h-[300px]">
                            {projectActivity.length === 0 ? (
                                <EmptyState
                                    icon={<FolderOpen className="w-8 h-8 text-text-muted/20" />}
                                    title="No projects detected"
                                    description="Assign time to projects to see distribution metrics."
                                />
                            ) : (
                                <>
                                    <div className="w-full h-64 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={projectActivity}
                                                    innerRadius={70}
                                                    outerRadius={95}
                                                    paddingAngle={8}
                                                    dataKey="minutes"
                                                >
                                                    {projectActivity.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={[
                                                            'var(--chart-pie-primary)',
                                                            'var(--chart-gold-secondary)',
                                                            'var(--chart-gold-light)',
                                                            'var(--chart-gold-soft)',
                                                            'var(--chart-gold-muted)'
                                                        ][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[28px] font-black text-text-main tracking-tight leading-none">
                                                {formatDuration(stats.totalProductiveMinutes).split(' ')[0]}
                                            </span>
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Hours</span>
                                        </div>
                                    </div>

                                    <div className="w-full space-y-3 mt-6">
                                        {projectActivity.slice(0, 3).map((proj, index) => (
                                            <div key={proj.id} className="flex items-center justify-between group cursor-default">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full" style={{
                                                        backgroundColor: [
                                                            'var(--chart-pie-primary)',
                                                            'var(--chart-gold-secondary)',
                                                            'var(--chart-gold-light)',
                                                            'var(--chart-gold-soft)',
                                                            'var(--chart-gold-muted)'
                                                        ][index % 5]
                                                    }} />
                                                    <span className="text-[13px] font-bold text-text-main group-hover:text-primary transition-colors">{proj.name}</span>
                                                </div>
                                                <span className="text-[12px] font-black text-text-muted tabular-nums">{formatDuration(proj.minutes)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* 🖥️ Left Content: Activity Stream (70%) */}
                    <div className="lg:col-span-7 flex flex-col h-[780px]">
                        <div className="bg-surface rounded-2xl overflow-hidden flex flex-col h-full shadow-premium border border-border">
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-[22px] font-bold mb-2 tracking-[0.05em]" style={{ color: 'var(--chart-gold)' }}>Visual Activity Stream</h3>
                                    <p className="text-[14px] font-medium text-text-muted tracking-[0.1em]">Showing top 4 most active team members</p>
                                </div>
                                <button
                                    onClick={() => navigate('/dashboard/activity')}
                                    className="px-6 py-3 rounded-xl bg-primary text-white text-[12px] font-bold hover:brightness-110 transition-all duration-300 shadow-md flex items-center gap-2 group"
                                >
                                    Explore All <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </button>
                            </div>

                            {/* Wrap overlay + scrollable content together so overlay is fixed relative to visible area */}
                            <div className="flex-1 relative overflow-hidden">
                                {!isPremium && (
                                    <FeatureLockOverlay
                                        title="Activity Monitoring"
                                        description="Upgrade to Premium to unlock screenshots and detailed activity stream."
                                    />
                                )}
                                <div className="h-full overflow-y-auto no-scrollbar divide-y divide-border">
                                    {userActivity.length === 0 ? (
                                        <EmptyState icon={<Camera />} title="No activity recorded yet" description="Tracking samples will appear here once the team starts working." className="py-32" />
                                    ) : (
                                        userActivity.map((user) => (
                                            <div key={user.userId} className="p-8 space-y-6 hover:bg-surface-hover transition-all group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-main border border-border shadow-sm flex items-center justify-center text-[14px] font-bold text-text-muted overflow-hidden shrink-0 group-hover:border-primary/30 transition-all duration-500">
                                                            {user.avatarUrl ? (
                                                                <SecureImage path={user.avatarUrl} bucket="avatars" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                            ) : user.fullName.charAt(0)}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-4">
                                                                <p className={clsx(
                                                                    "text-[18px] font-bold text-text-main tracking-tight",
                                                                    user.fullName.includes('@') && "lowercase opacity-80"
                                                                )}>
                                                                    {user.fullName.includes('@') ? user.fullName.toLowerCase() : toProperCase(user.fullName)}
                                                                </p>
                                                                <div className="px-3 py-1 bg-primary/5 text-primary text-[12px] font-bold rounded-lg border border-primary/10">
                                                                    {formatDuration(user.totalMinutes)}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                                <span className="text-[13px] font-bold text-success ">{user.activityScore}% Focus Level</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button className="w-10 h-10 flex items-center justify-center rounded-xl text-text-muted hover:text-text-main hover:bg-surface hover:shadow-sm transition-all"><MoreHorizontal className="w-5 h-5" /></button>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6">
                                                    {user.screenshots.slice(0, 3).map((ss) => (
                                                        <div key={ss.id} className="relative group/ss" onClick={() => setEnlargedScreenshot(ss)}>
                                                            <div className="aspect-video bg-slate-100 border border-slate-100 rounded-[20px] overflow-hidden relative cursor-zoom-in transition-all duration-500 group-hover/ss:border-primary/40 group-hover/ss:shadow-elevated shadow-sm">
                                                                <SecureImage path={ss.path} className="w-full h-full object-cover opacity-95 group-hover/ss:opacity-100 group-hover/ss:scale-105 transition-all duration-700" />

                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/ss:opacity-100 transition-opacity duration-300" />

                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/ss:opacity-100 transition-all duration-300 scale-90 group-hover/ss:scale-100">
                                                                    <div className="px-4 py-2 rounded-xl glass-panel text-[11px] font-bold text-slate-900 shadow-xl border-white/40">Inspect</div>
                                                                </div>

                                                                <div className="absolute bottom-3 right-3 translate-y-1 group-hover/ss:translate-y-0 transition-transform duration-300">
                                                                    <span className="px-3 py-1.5 rounded-lg bg-black/60 text-white text-[9px] font-bold backdrop-blur-md border border-white/10">
                                                                        {new Date(ss.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div className="absolute top-3 left-3 -translate-y-1 group-hover/ss:translate-y-0 transition-transform duration-300">
                                                                    <span className={clsx(
                                                                        "px-4 py-2 rounded-lg text-white text-[11px] font-bold backdrop-blur-md border border-white/10 shadow-lg",
                                                                        ss.activityPercent > 70 ? "bg-success/80" : ss.activityPercent > 30 ? "bg-warning/80" : "bg-error/80"
                                                                    )}>
                                                                        {ss.activityPercent}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Placeholder for empty screen spots to keep alignment */}
                                                    {Array.from({ length: Math.max(0, 3 - user.screenshots.length) }).map((_, i) => (
                                                        <div key={`empty-${i}`} className="aspect-video bg-main/50 border-2 border-dashed border-border rounded-[20px] flex flex-col items-center justify-center gap-3 opacity-60">
                                                            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shadow-sm text-text-muted">
                                                                <Camera className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-text-muted ">Awaiting Capture</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 👥 Right Content: Who's Online (30%) */}
                    <div className="lg:col-span-5 flex flex-col h-[780px]">
                        <div className="bg-surface rounded-2xl shadow-premium overflow-hidden flex flex-col h-full border border-border">
                            <div className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="text-[18px] font-bold tracking-tight mb-2 tracking-[0.05em]" style={{ color: 'var(--chart-gold)' }}>Live Directory</h3>
                                    <p className="text-[13px] font-bold text-text-muted tracking-[0.1em]">Real-time status updates</p>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                                    <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[11px] font-bold text-success tracking-[0.1em]">Live Now</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-8 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em]">Team Member</th>
                                            <th className="px-8 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em] text-right">Performance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {onlineMembers.map((member) => (
                                            <tr key={member.id} className="hover:bg-surface-hover/50 transition-all duration-300 group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative shrink-0">
                                                            <div className="w-11 h-11 rounded-2xl bg-surface border border-border flex items-center justify-center text-[12px] font-bold text-text-muted shadow-sm group-hover:border-primary/30 transition-all duration-500 overflow-hidden ring-4 ring-transparent group-hover:ring-primary/5">
                                                                {member.avatarUrl ? (
                                                                    <SecureImage path={member.avatarUrl} bucket="avatars" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                ) : member.fullName.charAt(0)}
                                                            </div>
                                                            <div className={clsx(
                                                                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-surface shadow-md",
                                                                member.status === 'working' ? "bg-success shadow-success/20" : member.status === 'idle' ? "bg-warning shadow-warning/20" : "bg-text-muted"
                                                            )} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={clsx(
                                                                "text-[15px] font-bold text-text-main leading-none tracking-tight truncate group-hover:text-primary transition-colors tracking-[0.05em]",
                                                                (!member.fullName || member.fullName.includes('@')) && "lowercase opacity-80"
                                                            )}>
                                                                {member.fullName ? toProperCase(member.fullName) : toEmailCase(member.email || '')}
                                                            </span>
                                                            <span className="text-[12px] text-text-muted font-bold tracking-tight mt-2 truncate max-w-[140px] opacity-70 tracking-[0.1em]">
                                                                {member.projectName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[15px] font-bold text-text-main tabular-nums leading-none tracking-tight">
                                                            {formatDuration(member.timeWorkedToday)}
                                                        </span>
                                                        <span className={clsx(
                                                            "text-[11px] font-bold tracking-[0.15em] mt-2.5 px-3 py-1 rounded-lg",
                                                            member.status === 'working' ? "text-success bg-success/10" : member.status === 'idle' ? "text-warning bg-warning/10" : "text-text-muted bg-surface-hover"
                                                        )}>
                                                            {member.status}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-8 bg-main/30 border-t border-border shrink-0">
                                <button
                                    onClick={() => navigate('/dashboard/people')}
                                    className="w-full py-4 bg-surface border border-border rounded-2xl text-[11px] font-bold text-text-muted hover:bg-primary hover:text-white hover:border-primary hover:shadow-glow-primary transition-all duration-300 shadow-sm"
                                >
                                    Manage Workspace Team
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📊 Secondary Metrics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Project Velocity Chart */}
                    <div className="glass-panel rounded-[12px] shadow-premium p-10 border border-border">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-[14px] font-bold tracking-tight mb-1 tracking-[0.05em]" style={{ color: 'var(--chart-gold)' }}>Time Distribution</h3>
                                <p className="text-[10px] font-bold text-text-muted tracking-[0.1em] ">Active hours per project</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-main flex items-center justify-center text-text-muted border border-border">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                            {projectActivity.length === 0 ? (
                                <div className="col-span-2 py-10 opacity-50"><EmptyState icon={<Camera />} title="Awaiting distribution data" /></div>
                            ) : (
                                projectActivity.map((proj) => (
                                    <div key={proj.id} className="space-y-4 group/bar">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-text-main tracking-tight group-hover:text-primary transition-colors">{proj.name}</span>
                                            <span className="text-[10px] font-bold text-success ">{proj.activityScore}% Focus</span>
                                        </div>
                                        <div className="h-2 bg-main/80 border border-border rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (proj.minutes / (stats.totalProductiveMinutes || 1)) * 100)}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full rounded-full relative group-hover:brightness-110 transition-all"
                                                style={{ background: 'linear-gradient(90deg, var(--chart-gold-secondary) 0%, var(--gold-vibrant) 100%)' }}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent mix-blend-overlay" />
                                            </motion.div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-text-muted tracking-tight">{formatDuration(proj.minutes)} tracked</span>
                                            <div className="px-2 py-1 rounded-lg bg-success/10 text-[10px] font-bold text-success border border-success/20">
                                                {Math.round((proj.minutes / (stats.totalProductiveMinutes || 1)) * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* App ecosystem Ledger */}
                    <div className="glass-panel rounded-[12px] shadow-premium overflow-hidden flex flex-col border border-border">
                        <div className="px-10 py-8 border-b border-border bg-surface/50 flex items-center justify-between">
                            <div>
                                <h3 className="text-[14px] font-bold tracking-tight mb-1 tracking-[0.05em]" style={{ color: 'var(--chart-gold)' }}>Application Ecosystem</h3>
                                <p className="text-[10px] font-bold text-text-muted  tracking-[0.1em]">Most utilized tools and platforms</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-main flex items-center justify-center text-text-muted border border-border">
                                <Monitor className="w-5 h-5" />
                            </div>
                        </div>
                        {/* Wrap overlay + scrollable list in a non-scrolling relative container */}
                        <div className="flex-1 relative overflow-hidden max-h-[300px]">
                            {!isPremium && (
                                <FeatureLockOverlay
                                    title="App Tracking"
                                    description="Upgrade to Premium to see exactly which tools and applications your team is using."
                                />
                            )}
                            <div className="h-full overflow-y-auto no-scrollbar divide-y divide-border">
                                {appUsage.length === 0 ? (
                                    <EmptyState icon={<Monitor />} title="Awaiting application data" className="py-12" />
                                ) : (
                                    appUsage.map((app, i) => (
                                        <div key={i} className="flex items-center justify-between px-10 py-5 hover:bg-surface-hover/50 transition-all duration-300 group">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted shadow-sm shrink-0 group-hover:border-primary/20 transition-all duration-500">
                                                    {(app.name.toLowerCase().includes('chrome') || app.name.toLowerCase().includes('browser')) ? (
                                                        <Globe className="w-5 h-5 text-info opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <Monitor className="w-5 h-5 opacity-40 group-hover:opacity-80 transition-opacity" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[13px] font-bold text-text-main tracking-tight truncate group-hover:text-primary transition-colors">{app.name}</span>
                                                    <span className="text-[9px] text-text-muted font-bold mt-1 opacity-60">System Process</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="text-[11px] text-text-muted font-bold tracking-tight">{formatDuration(app.minutes)}</span>
                                                <div className="text-[12px] font-bold text-success w-12 h-9 flex items-center justify-center bg-success/10 border border-success/20 rounded-xl group-hover:bg-success/20 transition-all tabular-nums">
                                                    {Math.round(app.percent)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {enlargedScreenshot && (
                <ScreenshotModal
                    screenshots={[enlargedScreenshot]}
                    currentIndex={0}
                    onClose={() => setEnlargedScreenshot(null)}
                    onNavigate={() => { }}
                />
            )}
        </PageLayout>
    );
}
