import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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

interface DashStats {
    totalProductiveMinutes: number;
    avgActivityScore: number;
    projectsWorked: number;
    activeMembers: number;
    totalScreenshots: number;
}
export function Dashboard() {
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

    const fetchDashboardData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const startIso = weekStart.toISOString();
            const endIso = weekEnd.toISOString();
            const nowIso = new Date().toISOString();
            const todayStart = new Date();
            todayStart.setHours(0,0,0,0);
            const todayStartIso = todayStart.toISOString();

            const [
                { data: members },
                { data: projects },
                { data: sessions },
                { data: screenshots },
                activitySamples
            ] = await Promise.all([
                supabase.from('members').select('id, full_name, avatar_url, status, email'),
                supabase.from('projects').select('id, name, color'),
                supabase.from('sessions').select('*').gte('started_at', startIso).lte('started_at', endIso),
                supabase.from('screenshots').select('*').gte('recorded_at', startIso).lte('recorded_at', endIso).order('recorded_at', { ascending: false }),
                fetchAllActivitySamples(supabase, startIso, endIso, 'session_id, recorded_at, activity_percent, idle, app_name')
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

            activitySamples.forEach(sample => {
                const userId = sessionToUserMap[sample.session_id];
                const projectId = sessionToProjectMap[sample.session_id];
                if (!userId) return;

                const score = sample.activity_percent ?? (sample.idle ? 0 : 50);
                if (!sample.idle) totalMins++;
                activitySum += score;
                activityCount++;
                if (projectId) projectsWorked.add(projectId);
                activeMemberIds.add(userId);

                if (projectId) {
                    if (!projStats[projectId]) projStats[projectId] = { mins: 0, activitySum: 0, activityCount: 0 };
                    if (!sample.idle) projStats[projectId].mins++;
                    projStats[projectId].activitySum += score;
                    projStats[projectId].activityCount++;
                }

                if (sample.app_name) {
                    appStats[sample.app_name] = (appStats[sample.app_name] || 0) + 1;
                }
            });

            screenshots?.forEach(ss => {
                const userId = sessionToUserMap[ss.session_id];
                if (userId && userRows[userId]) {
                    // Limit to 3 screenshots per user
                    if (userRows[userId].screenshots.length < 3) {
                        userRows[userId].screenshots.push({
                            id: ss.id,
                            path: ss.file_url,
                            recordedAt: ss.recorded_at,
                            activityPercent: activitySamples.find(s => s.session_id === ss.session_id && Math.abs(new Date(s.recorded_at).getTime() - new Date(ss.recorded_at).getTime()) < 600000)?.activity_percent ?? 50
                        });
                    }
                }
            });

            Object.entries(userRows).forEach(([uId, row]) => {
                const userSamples = activitySamples.filter(s => sessionToUserMap[s.session_id] === uId);
                if (userSamples.length > 0) {
                    const sum = userSamples.reduce((acc, s) => acc + (s.activity_percent ?? (s.idle ? 0 : 50)), 0);
                    row.activityScore = Math.round(sum / userSamples.length);
                    // Each sample is approx 1 minute of work if not idle
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
                    const latestSample = activitySamples.filter(s => s.session_id === activeSession.id).sort((a,b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
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
            }).sort((a,b) => (a.status === 'offline' ? 1 : 0) - (b.status === 'offline' ? 1 : 0));

            setStats({
                totalProductiveMinutes: totalMins,
                avgActivityScore: activityCount > 0 ? Math.round(activitySum / activityCount) : 0,
                projectsWorked: projectsWorked.size,
                activeMembers: activeMemberIds.size,
                totalScreenshots: screenshots?.length || 0
            });

            setUserActivity(
                Object.values(userRows)
                    .filter(r => r.totalMinutes > 0 || r.screenshots.length > 0)
                    .sort((a, b) => b.totalMinutes - a.totalMinutes)
                    .slice(0, 4) // ONLY top 4 active users
            );
            setOnlineMembers(online);
            setProjectActivity(Object.entries(projStats).map(([id, p]) => ({ id, name: projectMap[id]?.name || 'Unknown', minutes: p.mins, activityScore: p.activityCount > 0 ? Math.round(p.activitySum / p.activityCount) : 0, color: projectMap[id]?.color || '#6366f1' })).sort((a,b) => b.minutes - a.minutes));
            
            const totalSamplesForApps = Object.values(appStats).reduce((a, b) => a + b, 0);
            setAppUsage(Object.entries(appStats).map(([name, count]) => ({ 
                name, 
                minutes: count, 
                percent: totalSamplesForApps > 0 ? (count / totalSamplesForApps) * 100 : 0 
            })).sort((a,b) => b.minutes - a.minutes).slice(0, 10));

        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [weekStart, weekEnd]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Team Overview"
            description="See what your team is working on right now and how they are spending their time."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <button onClick={() => navigateWeek('prev')} className="p-2.5 hover:bg-slate-50 border-r border-slate-100 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <div 
                            className="relative px-5 py-2 min-w-[200px] text-center cursor-pointer hover:bg-slate-50 transition-all group/date"
                            onClick={() => dateInputRef.current?.showPicker()}
                        >
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 group-hover/date:text-primary transition-colors" />
                            <input 
                                ref={dateInputRef}
                                type="date" 
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                onChange={(e) => handleDateChange(e.target.value)}
                            />
                        </div>
                        <button onClick={() => navigateWeek('next')} className="p-2.5 hover:bg-slate-50 border-l border-slate-100 transition-colors" disabled={weekEnd > new Date()}>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                    <button onClick={() => fetchDashboardData(true)} className={clsx("p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-400 transition-all text-slate-400", refreshing && "animate-spin text-primary")}>
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-8 pb-20">
                
                {/* 📊 KPI Architecture */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    <StatMetric icon={<TrendingUp className="w-5 h-5" />} label="Average Activity" value={`${stats.avgActivityScore}%`} sub="Overall team focus level" trend={3} />
                    <StatMetric icon={<Clock className="w-5 h-5" />} label="Total Time" value={formatDuration(stats.totalProductiveMinutes)} sub="Total hours worked this week" trend={5} />
                    <StatMetric icon={<FolderOpen className="w-5 h-5" />} label="Active Projects" value={stats.projectsWorked} sub="Total projects being worked on" />
                    <StatMetric 
                        icon={<Users className="w-5 h-5" />} 
                        label="Active People" 
                        value={onlineMembers.filter(m => m.status !== 'offline').length} 
                        sub="Currently online or working" 
                        accent="emerald"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* 🖥️ Left Content: Activity Stream (70%) */}
                    <div className="lg:col-span-8 flex flex-col">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[740px]">
                            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20 shrink-0">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Recent Screenshots</h3>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top 4 Active Users</span>
                                    <button 
                                        onClick={() => navigate('/dashboard/activity')}
                                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1.5"
                                    >
                                        View All <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-50">
                                {userActivity.length === 0 ? (
                                    <EmptyState icon={<Camera />} title="No recent activity" description="Waiting for the next update from your team." className="py-24" />
                                ) : (
                                    userActivity.map((user) => (
                                        <div key={user.userId} className="p-8 space-y-6 hover:bg-slate-50/10 transition-all group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-[13px] font-black text-white shadow-lg shadow-primary/10 overflow-hidden shrink-0 border-2 border-white">
                                                        {user.avatarUrl ? (
                                                            <SecureImage path={user.avatarUrl} bucket="avatars" className="w-full h-full object-cover" />
                                                        ) : user.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <p className={clsx(
                                                                "text-[14px] font-black text-slate-900 tracking-tight",
                                                                user.fullName.includes('@') && "variant-caps-small-caps lowercase"
                                                            )}>
                                                                {user.fullName.includes('@') ? user.fullName.toLowerCase() : toProperCase(user.fullName)}
                                                            </p>
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded uppercase tracking-widest">
                                                                {formatDuration(user.totalMinutes)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{user.activityScore}% Activity Focus</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {user.screenshots.slice(0, 3).map((ss) => (
                                                    <div key={ss.id} className="relative group/ss" onClick={() => setEnlargedScreenshot(ss)}>
                                                        <div className="aspect-video bg-slate-100 border border-slate-200 rounded-xl overflow-hidden relative cursor-zoom-in transition-all group-hover/ss:border-slate-900 shadow-sm">
                                                            <SecureImage path={ss.path} className="w-full h-full object-cover opacity-90 group-hover/ss:opacity-100 group-hover/ss:scale-105 transition-all duration-500" />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/ss:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/20">View</span>
                                                            </div>
                                                            <div className="absolute bottom-3 right-3">
                                                                <span className="px-2 py-1 rounded bg-slate-900/80 text-white text-[8px] font-black uppercase tracking-widest backdrop-blur-sm">
                                                                    {new Date(ss.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div className="absolute top-3 left-3">
                                                                <span className="px-2 py-1 rounded bg-primary text-white text-[8px] font-black uppercase tracking-widest backdrop-blur-sm border border-white/20">
                                                                    {ss.activityPercent}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Placeholder for empty screen spots to keep alignment */}
                                                {Array.from({ length: Math.max(0, 3 - user.screenshots.length) }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="aspect-video bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                                                        <Camera className="w-5 h-5 text-slate-200" />
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
                    <div className="lg:col-span-4 flex flex-col h-[740px]">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20 shrink-0">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Who's Online</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Activity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {onlineMembers.map((member) => (
                                            <tr key={member.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-400 uppercase shadow-sm group-hover:border-slate-300 transition-colors overflow-hidden">
                                                                {member.avatarUrl ? (
                                                                    <SecureImage path={member.avatarUrl} bucket="avatars" className="w-full h-full object-cover" />
                                                                ) : member.fullName.charAt(0)}
                                                            </div>
                                                            <div className={clsx(
                                                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm",
                                                                member.status === 'working' ? "bg-emerald-500" : member.status === 'idle' ? "bg-amber-500" : "bg-slate-300"
                                                            )} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={clsx(
                                                                "text-[12px] font-black text-slate-900 leading-none tracking-tight truncate",
                                                                (!member.fullName || member.fullName.includes('@')) && "variant-caps-small-caps lowercase"
                                                            )}>
                                                                {member.fullName ? toProperCase(member.fullName) : toEmailCase(member.email || '')}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-1.5 truncate max-w-[120px] uppercase">
                                                                {member.projectName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[11px] font-black text-slate-900 tabular-nums leading-none">
                                                            {formatDuration(member.timeWorkedToday)}
                                                        </span>
                                                        <span className={clsx(
                                                            "text-[8px] font-black uppercase tracking-widest mt-1.5",
                                                            member.status === 'working' ? "text-emerald-500" : member.status === 'idle' ? "text-amber-500" : "text-slate-300"
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
                            <div className="p-6 bg-slate-50/50 border-t border-slate-50 shrink-0">
                                <button 
                                    onClick={() => navigate('/dashboard/people')}
                                    className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                >
                                    Manage Team
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📊 Secondary Metrics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Project Velocity Chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Time by Project</h3>
                            <BarChart3 className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {projectActivity.length === 0 ? (
                                <div className="col-span-2"><EmptyState icon={<Camera />} title="Awaiting Data" /></div>
                            ) : (
                                projectActivity.map((proj) => (
                                    <div key={proj.id} className="space-y-3 group/bar">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{proj.name}</span>
                                            <span className="text-[9px] font-black text-slate-400">{proj.activityScore}% focus</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000" 
                                                style={{ 
                                                    width: `${Math.min(100, (proj.minutes / (stats.totalProductiveMinutes || 1)) * 100)}%`,
                                                    backgroundColor: proj.color
                                                }} 
                                            />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{formatDuration(proj.minutes)}</span>
                                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">{Math.round((proj.minutes / (stats.totalProductiveMinutes || 1)) * 100)}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* App ecosystem Ledger */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Most Used Apps</h3>
                            <Monitor className="w-4 h-4 text-slate-300" />
                        </div>
                        <div className="flex-1 max-h-[220px] overflow-y-auto no-scrollbar divide-y divide-slate-50">
                            {appUsage.length === 0 ? (
                                <EmptyState icon={<Monitor />} title="Awaiting data" className="py-8" />
                            ) : (
                                appUsage.map((app, i) => (
                                    <div key={i} className="flex items-center justify-between px-8 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                                {(app.name.toLowerCase().includes('chrome') || app.name.toLowerCase().includes('browser')) ? (
                                                    <Globe className="w-3.5 h-3.5 text-sky-500" />
                                                ) : (
                                                    <Monitor className="w-3.5 h-3.5" />
                                                )}
                                            </div>
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[150px]">{app.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{formatDuration(app.minutes)}</span>
                                            <div className="text-[10px] font-black text-slate-900 p-1.5 bg-slate-50 border border-slate-100 rounded-lg min-w-[36px] text-center">{Math.round(app.percent)}%</div>
                                        </div>
                                    </div>
                                ))
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
