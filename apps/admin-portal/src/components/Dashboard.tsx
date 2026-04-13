import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Clock, Users, FolderOpen, 
    Camera, TrendingUp, BarChart3, 
    Monitor, Globe, RefreshCw,
    ChevronLeft, ChevronRight,
    MoreHorizontal, Calendar as CalendarIcon
} from 'lucide-react';
import clsx from 'clsx';
import { PageLayout, EmptyState, LoadingState, StatusBadge, StatMetric, ScreenshotModal } from './ui';
import { SecureImage } from './ui/SecureImage';
import { 
    getEffectiveEnd,
    formatDuration,
    fetchAllActivitySamples
} from '../lib/dataUtils';

// ============================================================================
// Types
// ============================================================================

interface UserActivityRow {
    userId: string;
    fullName: string;
    avatarUrl?: string;
    activityScore: number;
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

// ============================================================================
// Dashboard Main Component
// ============================================================================

export function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [enlargedScreenshot, setEnlargedScreenshot] = useState<any | null>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    
    // Date Range (Weekly) - Mon to Sun
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
                    if (userRows[userId].screenshots.length < 15) {
                        userRows[userId].screenshots.push({
                            id: ss.id,
                            path: ss.file_url,
                            recordedAt: ss.recorded_at,
                            activityPercent: activitySamples.find(s => s.session_id === ss.session_id && Math.abs(new Date(s.recorded_at).getTime() - new Date(ss.recorded_at).getTime()) < 600000)?.activity_percent ?? 50
                        });
                    }
                }
            });

            Object.keys(userRows).forEach(uId => {
                const userSamples = activitySamples.filter(s => sessionToUserMap[s.session_id] === uId);
                if (userSamples.length > 0) {
                    const sum = userSamples.reduce((acc, s) => acc + (s.activity_percent ?? (s.idle ? 0 : 50)), 0);
                    userRows[uId].activityScore = Math.round(sum / userSamples.length);
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
                return { id: m.id, fullName: m.full_name, email: m.email, projectName: activeSession ? (projectMap[activeSession.project_id]?.name || 'Unknown Project') : 'None', timeWorkedToday: dailyMins, status, lastActive: activeSession ? activeSession.started_at : m.id };
            }).sort((a,b) => (a.status === 'offline' ? 1 : 0) - (b.status === 'offline' ? 1 : 0));

            setStats({
                totalProductiveMinutes: totalMins,
                avgActivityScore: activityCount > 0 ? Math.round(activitySum / activityCount) : 0,
                projectsWorked: projectsWorked.size,
                activeMembers: activeMemberIds.size,
                totalScreenshots: screenshots?.length || 0
            });

            setUserActivity(Object.values(userRows).filter(r => r.screenshots.length > 0 || r.activityScore > 0));
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
            title="Dashboard Overview"
            description="Operational monitoring and team productivity summary."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                        <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-slate-50 border-r border-slate-200 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <div 
                            className="relative px-4 py-1.5 min-w-[180px] text-center cursor-pointer hover:bg-slate-50 transition-colors group/date"
                            onClick={() => dateInputRef.current?.showPicker()}
                        >
                            <span className="text-xs font-semibold text-slate-700">
                                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <CalendarIcon className="w-3 h-3 text-primary absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/date:opacity-100 transition-opacity" />
                            <input 
                                ref={dateInputRef}
                                type="date" 
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                onChange={(e) => handleDateChange(e.target.value)}
                            />
                        </div>
                        <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-slate-50 border-l border-slate-200 transition-colors" disabled={weekEnd > new Date()}>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                    <button onClick={() => fetchDashboardData(true)} className={clsx("p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-500", refreshing && "animate-spin text-primary")}>
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-6 pb-12">
                
                {/* 📊 KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatMetric icon={<TrendingUp className="w-5 h-5" />} label="Avg Activity" value={`${stats.avgActivityScore}%`} sub="Overall team engagement" trend={3} />
                    <StatMetric icon={<Clock className="w-5 h-5" />} label="Time Tracked" value={formatDuration(stats.totalProductiveMinutes)} sub="Billable productive hours" trend={5} />
                    <StatMetric icon={<FolderOpen className="w-5 h-5" />} label="Active Projects" value={stats.projectsWorked} sub="Resources this period" />
                    <StatMetric icon={<Users className="w-5 h-5" />} label="Active Members" value={stats.activeMembers} sub="Personnel contributing" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* 🖥️ Left Content */}
                    <div className="xl:col-span-8 space-y-6">
                        
                        {/* Recent Activity Table-Grid */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
                                <button className="text-xs font-semibold text-primary hover:underline">View All</button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {userActivity.length === 0 ? (
                                    <EmptyState icon={<Camera />} title="No recent activity" description="Tracking data will appear here." className="py-20" />
                                ) : (
                                    userActivity.map((user) => (
                                        <div key={user.userId} className="p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-200 uppercase">
                                                        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-lg" /> : user.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 leading-none">{user.fullName}</p>
                                                        <p className="text-[10px] font-semibold text-primary uppercase mt-1 tracking-wider">{user.activityScore}% Activity Score</p>
                                                    </div>
                                                </div>
                                                <MoreHorizontal className="w-4 h-4 text-slate-300" />
                                            </div>
                                            <div className="flex gap-4 overflow-x-auto no-scrollbar py-1">
                                                {user.screenshots.map((ss) => (
                                                    <div 
                                                        key={ss.id} 
                                                        className="relative group flex-shrink-0"
                                                        onClick={() => setEnlargedScreenshot(ss)}
                                                    >
                                                        <div className="w-44 aspect-video bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative group-hover:border-primary transition-colors cursor-zoom-in">
                                                            <SecureImage path={ss.path} className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
                                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <p className="text-[9px] font-bold text-white uppercase tracking-tighter">
                                                                    {new Date(ss.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Who's Online Table */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">Who's Online</h3>
                                <StatusBadge variant="success">Live</StatusBadge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Member</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Project</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Today</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {onlineMembers.map((member) => (
                                            <tr key={member.id} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                                                            {member.fullName.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700 leading-tight">{member.fullName}</span>
                                                            <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{member.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {member.projectName !== 'None' ? (
                                                        <div className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded w-fit">
                                                            {member.projectName}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase italic">Standby</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-700 text-[11px]">
                                                    {formatDuration(member.timeWorkedToday)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className={clsx(
                                                        "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-widest shadow-sm",
                                                        member.status === 'working' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                                        member.status === 'idle' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                    )}>
                                                        <div className={clsx("w-1.5 h-1.5 rounded-full", member.status === 'working' ? "bg-emerald-500 animate-pulse" : member.status === 'idle' ? "bg-amber-500" : "bg-slate-300")} />
                                                        {member.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 📊 Right Sidebar */}
                    <div className="xl:col-span-4 space-y-6">
                        
                        {/* Project Velocity */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center justify-between">
                                Project Velocity
                                <BarChart3 className="w-4 h-4 text-slate-300" />
                            </h3>
                            <div className="space-y-6">
                                {projectActivity.length === 0 ? (
                                    <EmptyState icon={<Camera />} title="No data" />
                                ) : (
                                    projectActivity.map((proj) => (
                                        <div key={proj.id} className="space-y-2">
                                            <div className="flex items-center justify-between text-[11px] font-bold">
                                                <span className="text-slate-700 tracking-tight">{proj.name}</span>
                                                <span className="text-slate-400">{proj.activityScore}%</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-1000" 
                                                    style={{ 
                                                        width: `${Math.min(100, (proj.minutes / stats.totalProductiveMinutes) * 100)}%`,
                                                        backgroundColor: proj.color
                                                    }} 
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span>{formatDuration(proj.minutes)}</span>
                                                <span>{Math.round((proj.minutes / stats.totalProductiveMinutes) * 100)}%</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* App Ecosystem */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800">Top Ecosystem Tools</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {appUsage.length === 0 ? (
                                    <EmptyState icon={<Monitor />} title="No data" />
                                ) : (
                                    appUsage.map((app, i) => (
                                        <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                                    {(app.name.toLowerCase().includes('chrome') || app.name.toLowerCase().includes('browser')) ? (
                                                        <Globe className="w-4 h-4 text-sky-500" />
                                                    ) : (
                                                        <Monitor className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 leading-none">{app.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium mt-1">{formatDuration(app.minutes)}</span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-900">{Math.round(app.percent)}%</span>
                                        </div>
                                    ))
                                )}
                            </div>
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
