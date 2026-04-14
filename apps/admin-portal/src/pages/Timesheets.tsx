import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    ChevronLeft, ChevronRight,
    Users,
    ChevronDown,
    Calendar as CalendarIcon,
    Plus, Filter,
    Download,
    Layout as LayoutIcon
} from 'lucide-react';
import { LoadingState, Modal, EmptyState } from '../components/ui';
import clsx from 'clsx';
import {
    formatDuration,
    calculateActivityScore,
    getGroupingDateInTz,
    fetchAllActivitySamples
} from '../lib/dataUtils';

interface Session {
    id: string;
    user_id: string;
    project_id?: string;
    project_name?: string;
    started_at: string;
    ended_at: string | null;
    manual?: boolean;
    activity_percent?: number;
    idle_percent?: number;
    manual_percent?: number;
    duration_mins?: number;
    offline_mins?: number;
    user_name?: string;
    display_timezone?: string;
    is_active?: boolean;
}

interface DailyEntry {
    date: string;
    sessions: Session[];
    totalMinutes: number;
    activeMinutes: number;
    activityPercent: number;
}

interface MemberInfo {
    id: string;
    auth_user_id?: string;
    full_name: string;
    timezone?: string;
    idle_limit?: number | null;
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Timesheets() {
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'calendar'>('daily');
    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [activeTimezone, setActiveTimezone] = useState<string>('User Local');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('all');
    const [filterProjectId, setFilterProjectId] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showFilters, setShowFilters] = useState(false);
    const [showAddTime, setShowAddTime] = useState(false);

    // Add Time Form State
    const [addTimeData, setAddTimeData] = useState({
        projectId: '',
        userId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00'
    });

    const range = useMemo(() => {
        const start = new Date(selectedDate);
        const end = new Date(selectedDate);
        if (viewMode === 'daily') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        }
        return { start, end };
    }, [selectedDate, viewMode]);

    useEffect(() => { fetchMembers(); fetchProjects(); }, []);
    
    useEffect(() => { 
        fetchTimesheets(); 
    }, [range, selectedMember, filterProjectId, activeTimezone, members, projects]);

    async function fetchMembers() {
        const { data } = await supabase.from('members').select('id, auth_user_id, full_name, timezone, idle_limit').order('full_name');
        setMembers(data as MemberInfo[] || []);
    }

    async function fetchProjects() {
        const { data } = await supabase.from('projects').select('id, name').eq('status', 'Active').order('name');
        setProjects(data || []);
    }

    async function fetchTimesheets() {
        setLoading(true);
        try {
            const fetchStart = new Date(range.start.getTime() - 24 * 60 * 60 * 1000);
            const fetchEnd = new Date(range.end.getTime() + 24 * 60 * 60 * 1000);

            let query = supabase.from('sessions')
                .select('id, user_id, project_id, started_at, ended_at')
                .lt('started_at', fetchEnd.toISOString())
                .or(`ended_at.is.null,ended_at.gt.${fetchStart.toISOString()}`)
                .order('started_at', { ascending: true });

            if (selectedMember !== 'all' && selectedMember !== '') {
                const member = members.find(m => m.id === selectedMember);
                const userIds = Array.from(new Set([member?.id, member?.auth_user_id].filter(Boolean) as string[]));
                if (userIds.length > 0) {
                    query = query.in('user_id', userIds);
                }
            }
            if (filterProjectId !== 'all' && filterProjectId !== '') {
                query = query.eq('project_id', filterProjectId);
            }

            const { data: rawSessions, error: sessionErr } = await query;
            if (sessionErr) throw sessionErr;

            const sessions = (rawSessions || []).map((s: any) => ({
                ...s,
                project_name: projects.find(p => p.id === s.project_id)?.name || 'No Project'
            })) as Session[];

            const sessionIds = sessions.map((s: Session) => s.id);
            let activityData: any[] = [];
            
            if (sessionIds.length > 0) {
                try {
                    activityData = await fetchAllActivitySamples(
                        supabase, 
                        fetchStart.toISOString(), 
                        fetchEnd.toISOString(), 
                        'session_id, recorded_at, idle, activity_percent, is_offline',
                        { sessionIds }
                    );
                } catch (actErr) {
                    console.error('Activity fetch failed (non-blocking):', actErr);
                }
            }

            const dailyMap: Record<string, DailyEntry> = {};
            const numDays = viewMode === 'daily' ? 1 : 7;
            for (let i = 0; i < numDays; i++) {
                const d = new Date(range.start);
                d.setDate(range.start.getDate() + i);
                const key = getGroupingDateInTz(d, undefined);
                dailyMap[key] = { date: key, sessions: [], totalMinutes: 0, activeMinutes: 0, activityPercent: 0 };
            }

            const sessionSamplesMap: Record<string, any[]> = {};
            (activityData || []).forEach((a: any) => {
                if (!sessionSamplesMap[a.session_id]) sessionSamplesMap[a.session_id] = [];
                sessionSamplesMap[a.session_id].push(a);
            });

            sessions.forEach((s: Session) => {
                const member = members.find(m => m.id === s.user_id || m.auth_user_id === s.user_id);
                const tz = activeTimezone === 'User Local' ? (member?.timezone || undefined) : activeTimezone;
                const dayKey = getGroupingDateInTz(s.started_at, tz);
                const key = dailyMap[dayKey] ? dayKey : null;
                
                if (key) {
                    const samples = sessionSamplesMap[s.id] || [];
                    const score = calculateActivityScore(samples);
                    
                    // Improved duration calculation:
                    // If ended_at is null, check if the last sample is recent.
                    // If the last sample is > 10 mins ago, use the last sample's time as the effective end.
                    const lastSample = samples.length > 0 ? samples.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0] : null;
                    const lastSampleTime = lastSample ? new Date(lastSample.recorded_at).getTime() : new Date(s.started_at).getTime();
                    const nowMs = new Date().getTime();
                    
                    let effectiveEndMs = nowMs;
                    if (s.ended_at) {
                        effectiveEndMs = new Date(s.ended_at).getTime();
                    } else if (nowMs - lastSampleTime > 15 * 60000) {
                        // If no activity for 15 mins, don't assume it's still running
                        effectiveEndMs = lastSampleTime;
                    }

                    const durationMins = (effectiveEndMs - new Date(s.started_at).getTime()) / 60000;
                    const offlineMins = samples.filter(samp => samp.is_offline).length;
                    
                    const isTrulyActive = !s.ended_at && (nowMs - lastSampleTime < 15 * 60000);

                    dailyMap[key].sessions.push({
                        ...s,
                        activity_percent: score,
                        idle_percent: 100 - score,
                        manual_percent: 0,
                        duration_mins: Math.max(0, durationMins),
                        offline_mins: offlineMins,
                        user_name: member?.full_name || 'System User',
                        display_timezone: tz,
                        is_active: isTrulyActive // Add this to the session object
                    });
                }
            });

            const result = Object.values(dailyMap).map(d => {
                const totalMins = d.sessions.reduce((acc, s) => acc + (s.duration_mins || 0), 0);
                const avgActivity = d.sessions.length > 0
                    ? d.sessions.reduce((acc, s) => acc + (s.activity_percent || 0), 0) / d.sessions.length
                    : 0;
                return {
                    ...d,
                    totalMinutes: Math.round(totalMins),
                    activityPercent: Math.round(avgActivity)
                };
            });

            setEntries(result);
        } catch (error) {
            console.error('Error fetching timesheets:', error);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleManualAddTime() {
        if (!addTimeData.projectId || !addTimeData.userId) {
            alert('Please select both a project and a member.');
            return;
        }
        try {
            const startStr = `${addTimeData.date}T${addTimeData.startTime}:00`;
            const endStr = `${addTimeData.date}T${addTimeData.endTime}:00`;
            const { error } = await supabase.from('sessions').insert({
                project_id: addTimeData.projectId,
                user_id: addTimeData.userId,
                started_at: new Date(startStr).toISOString(),
                ended_at: new Date(endStr).toISOString(),
                manual: true
            });
            if (error) throw error;
            setShowAddTime(false);
            fetchTimesheets();
        } catch (err) {
            console.error('Failed to add manual time:', err);
            alert('Error adding manual time entry.');
        }
    }

    const navigateDate = (direction: number) => {
        const next = new Date(selectedDate);
        if (viewMode === 'daily') next.setDate(next.getDate() + direction);
        else next.setDate(next.getDate() + direction * 7);
        setSelectedDate(next);
    };

    const formatRangeLabel = () => {
        const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        if (viewMode === 'daily') return `${selectedDate.toLocaleDateString('en-US', opt)} - ${selectedDate.toLocaleDateString('en-US', opt)}`;
        return `${range.start.toLocaleDateString('en-US', opt)} - ${range.end.toLocaleDateString('en-US', opt)}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-white font-sans text-slate-900">
            <header className="px-8 py-6 flex items-center justify-between border-b border-slate-100">
                <h1 className="text-xl font-medium text-slate-500">View & edit timesheets</h1>
            </header>

            <div className="px-8 py-5 flex flex-wrap items-center justify-between gap-6 border-b border-slate-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm gap-1">
                        <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-slate-50 rounded-lg transition-all">
                             <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <div className="flex items-center gap-4 px-2 relative cursor-pointer hover:bg-slate-50 rounded transition-all group">
                             <span className="text-[11px] font-bold text-slate-700 tracking-tight">{formatRangeLabel()}</span>
                             <CalendarIcon className="w-4 h-4 text-primary" />
                             <input 
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                value={getGroupingDateInTz(selectedDate, undefined)}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setSelectedDate(new Date(e.target.value + 'T12:00:00'));
                                    }
                                }}
                             />
                        </div>
                        <button onClick={() => navigateDate(1)} className="p-2 hover:bg-slate-50 rounded-lg transition-all">
                             <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="relative group/tz">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-md transition-all uppercase tracking-widest">
                            {activeTimezone} <ChevronDown className="w-4 h-4 text-slate-400 group-hover/tz:rotate-180 transition-transform" />
                        </div>
                        <select 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={activeTimezone}
                            onChange={(e) => setActiveTimezone(e.target.value)}
                        >
                            <option value="User Local">User Local (Auto)</option>
                            <option value="UTC">UTC (Universal)</option>
                            {Array.from(new Set(members.map(m => m.timezone).filter(Boolean))).sort().map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 shadow-inner">
                    {(['daily', 'weekly', 'calendar'] as const).map(mode => (
                        <button 
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={clsx(
                                "px-8 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all",
                                viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm gap-3 min-w-[200px] group cursor-pointer hover:border-primary/30 transition-all relative">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 tracking-tight flex-1">
                            {selectedMember === 'all' ? 'All Members' : members.find((m: MemberInfo) => m.id === selectedMember)?.full_name || 'Unknown Member'}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                        <select className="absolute inset-0 opacity-0 cursor-pointer" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                            <option value="all">All Members</option>
                            {members.map((m: MemberInfo) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setShowFilters(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                        <Filter className="w-4 h-4" /> Filters
                    </button>
                    <button onClick={() => setShowAddTime(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                        <Plus className="w-4 h-4" /> Add time
                    </button>
                </div>
            </div>

            <div className="px-8 py-3 flex justify-end gap-3 bg-white/50">
                <button className="p-2 text-primary border border-slate-200 rounded-lg hover:bg-white shadow-sm transition-all"><LayoutIcon className="w-4 h-4" /></button>
                <button className="p-2 text-primary border border-slate-200 rounded-lg hover:bg-white shadow-sm transition-all"><Download className="w-4 h-4" /></button>
            </div>

            <main className="flex-1 overflow-y-auto px-8 py-8">
                {loading ? <div className="flex items-center justify-center h-64"><LoadingState /></div> : (
                    <div className="max-w-[1500px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {viewMode === 'daily' && <DailyView entries={entries} />}
                        {viewMode === 'weekly' && <WeeklyView entries={entries} onNavigate={(d) => { setSelectedDate(new Date(d + 'T12:00:00')); setViewMode('daily'); }} />}
                        {viewMode === 'calendar' && <CalendarView entries={entries} />}
                    </div>
                )}
            </main>

            <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} title="Advanced Filters">
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filter by Project</label>
                        <select className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all" value={filterProjectId} onChange={(e) => setFilterProjectId(e.target.value)}>
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showAddTime} onClose={() => setShowAddTime(false)} title="Add Manual Time">
                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Select Member</label>
                        <select className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all" value={addTimeData.userId} onChange={(e) => setAddTimeData({...addTimeData, userId: e.target.value})}>
                            <option value="">Select a member...</option>
                            {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Project</label>
                        <select className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all" value={addTimeData.projectId} onChange={(e) => setAddTimeData({...addTimeData, projectId: e.target.value})}>
                            <option value="">Select a project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
                        <input type="date" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all" value={addTimeData.date} onChange={(e) => setAddTimeData({...addTimeData, date: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Start Time</label>
                            <input type="time" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all" value={addTimeData.startTime} onChange={(e) => setAddTimeData({...addTimeData, startTime: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">End Time</label>
                            <input type="time" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-primary transition-all" value={addTimeData.endTime} onChange={(e) => setAddTimeData({...addTimeData, endTime: e.target.value})} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button onClick={handleManualAddTime} className="px-10 py-3 bg-primary text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Save Manual Entry</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function DailyView({ entries }: { entries: DailyEntry[] }) {
    const day = entries[0];
    if (!day || day.sessions.length === 0) return <div className="flex flex-col items-center justify-center h-64"><EmptyState title="No entries found for this date" /></div>;
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Total: {formatDuration(day.totalMinutes)}</h2>
            <div className="relative h-2 bg-slate-100 rounded-full my-12">
                <div className="absolute -top-6 left-0 w-full flex justify-between px-1 text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                    <span style={{ left: '25%' }} className="absolute">6am</span>
                    <span style={{ left: '50%' }} className="absolute">12pm</span>
                    <span style={{ left: '75%' }} className="absolute">6pm</span>
                </div>
                {day.sessions.map((s, i) => {
                    const d = new Date(s.started_at);
                    const formattedDate = new Date(d.toLocaleString('en-US', { timeZone: s.display_timezone }));
                    const left = ((formattedDate.getHours() * 60 + formattedDate.getMinutes()) / 1440) * 100;
                    const duration = s.duration_mins || 0;
                    const width = (duration / 1440) * 100;
                    return (
                        <div key={i} className="absolute inset-y-0 bg-emerald-500 rounded-full" style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }} />
                    );
                })}
            </div>
            <div className="bg-white border-t border-slate-50 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Project</th>
                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Activity</th>
                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Idle</th>
                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Manual</th>
                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Duration</th>
                            <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {day.sessions.map((s, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-slate-700">{s.project_name}</span>
                                        <span className="text-[11px] font-medium text-slate-400">{s.user_name}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[13px] font-bold text-slate-800">{s.activity_percent}%</span>
                                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${s.activity_percent}%` }} />
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center text-[13px] font-medium text-slate-400">{s.idle_percent}%</td>
                                <td className="p-4 text-center text-[13px] font-medium text-slate-400">0%</td>
                                <td className="p-4 text-center text-[14px] font-bold text-slate-800">{formatDuration(s.duration_mins || 0)}</td>
                                <td className="p-4 text-[12px] font-medium text-slate-500 italic">
                                    <div className="flex flex-col">
                                        <span>
                                            {new Date(s.started_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: s.display_timezone }).toLowerCase()} - 
                                            {s.ended_at ? 
                                                new Date(s.ended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: s.display_timezone }).toLowerCase() : 
                                                (s.is_active ? 'Active' : 'Unfinished')}
                                        </span>
                                        {s.offline_mins && s.offline_mins > 0 ? (
                                            <span className="text-[10px] text-slate-400 not-italic font-bold mt-1">
                                                ({s.offline_mins} minutes tracked offline)
                                            </span>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function WeeklyView({ entries, onNavigate }: { entries: DailyEntry[], onNavigate: (d: string) => void }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            {entries.map((day, i) => (
                <div key={i} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col items-center gap-4 hover:bg-white hover:shadow-xl transition-all cursor-pointer group" onClick={() => onNavigate(day.date)}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{DAYS_SHORT[new Date(day.date + 'T12:00:00').getDay()]}</span>
                    <span className="text-xl font-bold text-slate-800 group-hover:text-primary transition-colors">{new Date(day.date + 'T12:00:00').getDate()}</span>
                    <div className="flex flex-col items-center">
                        <span className="text-[13px] font-bold text-slate-600">{formatDuration(day.totalMinutes)}</span>
                        <span className="text-[10px] font-medium text-emerald-500">{day.activityPercent}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function CalendarView({ entries }: { entries: DailyEntry[] }) {
    return (
        <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {DAYS_SHORT.map(d => (
                <div key={d} className="bg-white p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{d}</div>
            ))}
            {entries.map((day, i) => (
                <div key={i} className="bg-white min-h-[120px] p-4 flex flex-col gap-2 hover:bg-slate-50 transition-all">
                    <span className="text-sm font-bold text-slate-400">{new Date(day.date + 'T12:00:00').getDate()}</span>
                    {day.totalMinutes > 0 && (
                        <div className="bg-emerald-500 text-white rounded-lg p-2 flex flex-col gap-1">
                            <span className="text-[11px] font-bold">{formatDuration(day.totalMinutes)}</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
