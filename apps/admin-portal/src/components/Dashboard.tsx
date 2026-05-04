import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
    Clock, Users, FolderOpen,
    Camera, TrendingUp, BarChart3,
    Monitor, Globe, RefreshCw,
    ChevronLeft, ChevronRight,
    MoreHorizontal, Calendar as CalendarIcon,
    ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { PageLayout, EmptyState, LoadingState, StatMetric, ScreenshotModal } from './ui';
import { SecureImage } from './ui/SecureImage';
import {
    getEffectiveEnd,
    formatDuration,
    fetchAllActivitySamples
} from '../lib/dataUtils';
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
}
export function Dashboard() {
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [enlargedScreenshot, setEnlargedScreenshot] = useState<any | null>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

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
        totalScreenshots: 0
    });

    const [userActivity, setUserActivity] = useState<UserActivityRow[]>([]);
    const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
    const [projectActivity, setProjectActivity] = useState<ProjectActivity[]>([]);
    const [appUsage, setAppUsage] = useState<AppUsage[]>([]);

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

            const [
                { data: members },
                { data: projects },
                { data: sessions },
                { data: screenshots },
                activitySamples
            ] = await Promise.all([
                supabase.from('members').select('id, full_name, avatar_url, status, email, idle_limit').eq('organization_id', organizationId),
                supabase.from('projects').select('id, name, color').eq('organization_id', organizationId),
                supabase.from('sessions').select('id, user_id, project_id, started_at, ended_at').eq('organization_id', organizationId).gte('started_at', startIso).lte('started_at', endIso),
                supabase.from('screenshots').select('id, session_id, file_url, recorded_at').eq('organization_id', organizationId).gte('recorded_at', startIso).lte('recorded_at', endIso).order('recorded_at', { ascending: false }).limit(300),
                fetchAllActivitySamples(supabase, startIso, endIso, 'session_id, recorded_at, activity_percent, idle, app_name', { organizationId })
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
            const samplesByUser = new Map<string, any[]>();
            activitySamples.forEach(s => {
                const uid = sessionToUserMap[s.session_id];
                if (!uid) return;
                if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
                samplesByUser.get(uid)!.push(s);
            });

            const productiveSamples: any[] = [];
            samplesByUser.forEach((userSamps, uid) => {
                const limit = membersMap.get(uid)?.idle_limit ?? 0;
                if (limit <= 1) {
                    productiveSamples.push(...userSamps);
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
                            if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                            currentBlock = [s];
                        } else {
                            productiveSamples.push(s);
                            if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                            currentBlock = [];
                        }
                    }
                    if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                }
            });

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

            const finalStats = {
                totalProductiveMinutes: totalMins,
                avgActivityScore: activityCount > 0 ? Math.round(activitySum / activityCount) : 0,
                projectsWorked: projectsWorked.size,
                activeMembers: activeMemberIds.size,
                totalScreenshots: screenshots?.length || 0
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

            // Update Cache
            dashboardCache = {
                stats: finalStats,
                userActivity: finalUserActivity,
                onlineMembers: online,
                projectActivity: finalProjectActivity,
                appUsage: finalAppUsage
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
            title="Team Overview"
            description="Real-time visibility into team performance, project distribution, and active focus."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex items-center glass-panel p-1 rounded-2xl shadow-premium overflow-hidden border border-border">
                        <button
                            onClick={() => navigateWeek('prev')}
                            className="p-3 hover:bg-surface-hover text-text-muted hover:text-primary transition-all rounded-xl"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div
                            className="relative px-6 py-2 min-w-[220px] text-center cursor-pointer hover:bg-surface-hover/50 transition-all group/date rounded-xl"
                            onClick={() => dateInputRef.current?.showPicker()}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <CalendarIcon className="w-3.5 h-3.5 text-primary opacity-50" />
                                <span className="text-[11px] font-bold text-text-main ">
                                    {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <input
                                ref={dateInputRef}
                                type="date"
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                onChange={(e) => handleDateChange(e.target.value)}
                            />
                        </div>
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
            <div className="flex flex-col gap-8 pb-24">

                {/* 📊 KPI Architecture */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    <StatMetric
                        icon={<TrendingUp className="w-5 h-5" />}
                        label="Team Focus"
                        value={`${stats.avgActivityScore}%`}
                        sub="Avg activity score this week"
                        trend={3}
                        accent="brown-gradient"
                    />
                    <StatMetric
                        icon={<Clock className="w-5 h-5" />}
                        label="Productivity"
                        value={formatDuration(stats.totalProductiveMinutes)}
                        sub="Total hours tracked this week"
                        trend={5}
                        accent="brown-gradient"
                    />
                    <StatMetric
                        icon={<FolderOpen className="w-5 h-5" />}
                        label="Utilization"
                        value={stats.projectsWorked}
                        sub="Projects with active progress"
                        accent="brown-gradient"
                    />
                    <StatMetric
                        icon={<Users className="w-5 h-5" />}
                        label="Live Presence"
                        value={onlineMembers.filter(m => m.status !== 'offline').length}
                        sub="Members currently active"
                        accent="brown-gradient"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* 🖥️ Left Content: Activity Stream (70%) */}
                    <div className="lg:col-span-7 flex flex-col h-[820px]">
                        <div className="glass-panel rounded-[12px] overflow-hidden flex flex-col h-full shadow-premium border border-border">
                            <div className="px-10 py-8 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
                                <div>
                                    <h3 className="text-[14px] font-bold text-text-main tracking-tight mb-1">Visual Activity Stream</h3>
                                    <p className="text-[10px] font-bold text-text-muted ">Showing top 4 most active team members</p>
                                </div>
                                <button
                                    onClick={() => navigate('/dashboard/activity')}
                                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold hover:bg-primary transition-all duration-300 shadow-md flex items-center gap-2 group"
                                >
                                    Explore All <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border">
                                {userActivity.length === 0 ? (
                                    <EmptyState icon={<Camera />} title="No activity recorded yet" description="Tracking samples will appear here once the team starts working." className="py-32" />
                                ) : (
                                    userActivity.map((user) => (
                                        <div key={user.userId} className="p-10 space-y-8 hover:bg-surface-hover/30 transition-all group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-[18px] bg-surface border border-border shadow-sm flex items-center justify-center text-[15px] font-bold text-text-muted overflow-hidden shrink-0 group-hover:border-primary/30 transition-all duration-500">
                                                        {user.avatarUrl ? (
                                                            <SecureImage path={user.avatarUrl} bucket="avatars" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        ) : user.fullName.charAt(0)}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <p className={clsx(
                                                                "text-[16px] font-bold text-text-main tracking-tight",
                                                                user.fullName.includes('@') && "lowercase opacity-80"
                                                            )}>
                                                                {user.fullName.includes('@') ? user.fullName.toLowerCase() : toProperCase(user.fullName)}
                                                            </p>
                                                            <div className="px-2.5 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                                                                {formatDuration(user.totalMinutes)}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                            <span className="text-[10px] font-bold text-text-muted ">{user.activityScore}% Focus Level</span>
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
                                                                    "px-3 py-1.5 rounded-lg text-white text-[9px] font-bold backdrop-blur-md border border-white/10 shadow-lg",
                                                                    ss.activityPercent > 70 ? "bg-emerald-500/80" : ss.activityPercent > 30 ? "bg-amber-500/80" : "bg-rose-500/80"
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

                    {/* 👥 Right Content: Who's Online (30%) */}
                    <div className="lg:col-span-5 flex flex-col h-[820px]">
                        <div className="glass-panel rounded-[12px] shadow-premium overflow-hidden flex flex-col h-full border border-border">
                            <div className="px-8 py-8 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
                                <div>
                                    <h3 className="text-[14px] font-bold text-text-main tracking-tight mb-1">Live Directory</h3>
                                    <p className="text-[10px] font-bold text-text-muted ">Real-time status updates</p>
                                </div>
                                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[9px] font-bold text-emerald-500 ">Live</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-surface/90 backdrop-blur-md z-10">
                                        <tr className="border-b border-border">
                                            <th className="px-8 py-5 text-[10px] font-bold text-text-muted tracking-[0.2em]">Team Member</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-text-muted tracking-[0.2em] text-right">Performance</th>
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
                                                                member.status === 'working' ? "bg-emerald-500 shadow-emerald-500/20" : member.status === 'idle' ? "bg-amber-500 shadow-amber-500/20" : "bg-text-muted"
                                                            )} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={clsx(
                                                                "text-[14px] font-bold text-text-main leading-none tracking-tight truncate group-hover:text-primary transition-colors",
                                                                (!member.fullName || member.fullName.includes('@')) && "lowercase opacity-80"
                                                            )}>
                                                                {member.fullName ? toProperCase(member.fullName) : toEmailCase(member.email || '')}
                                                            </span>
                                                            <span className="text-[10px] text-text-muted font-bold tracking-tight mt-1.5 truncate max-w-[140px] opacity-70">
                                                                {member.projectName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[13px] font-bold text-text-main tabular-nums leading-none tracking-tight">
                                                            {formatDuration(member.timeWorkedToday)}
                                                        </span>
                                                        <span className={clsx(
                                                            "text-[9px] font-bold tracking-[0.15em] mt-2 px-2 py-0.5 rounded-md",
                                                            member.status === 'working' ? "text-emerald-500 bg-emerald-500/10" : member.status === 'idle' ? "text-amber-500 bg-amber-500/10" : "text-text-muted bg-surface-hover"
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
                                <h3 className="text-[14px] font-bold text-text-main tracking-tight mb-1">Time Distribution</h3>
                                <p className="text-[10px] font-bold text-text-muted ">Active hours per project</p>
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
                                            <span className="text-[10px] font-bold text-text-muted ">{proj.activityScore}% Focus</span>
                                        </div>
                                        <div className="h-2.5 bg-main/80 border border-border rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (proj.minutes / (stats.totalProductiveMinutes || 1)) * 100)}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full rounded-full relative group-hover:brightness-110 transition-all bg-primary"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                                            </motion.div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-text-muted tracking-tight">{formatDuration(proj.minutes)} tracked</span>
                                            <div className="px-2 py-1 rounded-lg bg-main text-[10px] font-bold text-text-main border border-border">
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
                                <h3 className="text-[14px] font-bold text-text-main tracking-tight mb-1">Application Ecosystem</h3>
                                <p className="text-[10px] font-bold text-text-muted ">Most utilized tools and platforms</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-main flex items-center justify-center text-text-muted border border-border">
                                <Monitor className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex-1 max-h-[300px] overflow-y-auto no-scrollbar divide-y divide-border">
                            {appUsage.length === 0 ? (
                                <EmptyState icon={<Monitor />} title="Awaiting application data" className="py-12" />
                            ) : (
                                appUsage.map((app, i) => (
                                    <div key={i} className="flex items-center justify-between px-10 py-5 hover:bg-surface-hover/50 transition-all duration-300 group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted shadow-sm shrink-0 group-hover:border-primary/20 transition-all duration-500">
                                                {(app.name.toLowerCase().includes('chrome') || app.name.toLowerCase().includes('browser')) ? (
                                                    <Globe className="w-5 h-5 text-sky-500 opacity-70 group-hover:opacity-100 transition-opacity" />
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
                                            <div className="text-[12px] font-bold text-text-main w-12 h-9 flex items-center justify-center bg-main border border-border rounded-xl group-hover:bg-primary/5 group-hover:border-primary/20 group-hover:text-primary transition-all tabular-nums">
                                                {Math.round(app.percent)}%
                                            </div>
                                        </div>
                                    </div>
                                )) // light theme
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ScreenshotModal
                screenshot={enlargedScreenshot}
                onClose={() => setEnlargedScreenshot(null)}
            />
        </PageLayout>
    );
}
