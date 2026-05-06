import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    ChevronLeft, ChevronRight,
    Users,
    Calendar as CalendarIcon,
    Plus, Filter,
    Download,
    Layout as LayoutIcon,
    Clock, FolderOpen
} from 'lucide-react';
import { LoadingState, Modal, EmptyState, FilterSelect } from '../components/ui';
import clsx from 'clsx';
import {
    formatDuration,
    calculateActivityScore,
    getGroupingDateInTz,
    fetchAllActivitySamples
} from '../lib/dataUtils';
import { useAuth } from '../context/AuthContext';

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

// Module-level cache
let timesheetsCache: any = null;
let timesheetsCacheKey: string | null = null;

export function Timesheets() {
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'calendar'>('daily');
    const [entries, setEntries] = useState<DailyEntry[]>([]);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [activeTimezone, setActiveTimezone] = useState<string>('User Local');
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedMember, setSelectedMember] = useState<string>('all');
    const [filterProjectId, setFilterProjectId] = useState<string>('all');

    const toProperCase = (str: string) => {
        if (!str) return '';
        if (str.includes('@')) return str.toLowerCase();
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

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

    useEffect(() => {
        if (organizationId) {
            fetchMembers();
            fetchProjects();
        }
    }, [organizationId]);

    useEffect(() => {
        if (organizationId) {
            fetchTimesheets();
        }
    }, [range, selectedMember, filterProjectId, activeTimezone, members, projects, organizationId]);

    async function fetchMembers() {
        const { data } = await supabase.from('members')
            .select('id, auth_user_id, full_name, timezone, idle_limit')
            .eq('organization_id', organizationId)
            .order('full_name');
        setMembers(data as MemberInfo[] || []);
    }

    async function fetchProjects() {
        const { data } = await supabase.from('projects')
            .select('id, name')
            .eq('organization_id', organizationId)
            .eq('status', 'Active')
            .order('name');
        setProjects(data || []);
    }

    async function fetchTimesheets(forceRefresh = false) {
        const cacheKey = `${range.start.toISOString()}_${range.end.toISOString()}_${selectedMember}_${filterProjectId}_${activeTimezone}`;
        if (!forceRefresh && timesheetsCache && timesheetsCacheKey === cacheKey) {
            setEntries(timesheetsCache.entries);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const fetchStart = new Date(range.start.getTime() - 24 * 60 * 60 * 1000);
            const fetchEnd = new Date(range.end.getTime() + 24 * 60 * 60 * 1000);

            let query = supabase.from('sessions')
                .select('id, user_id, project_id, started_at, ended_at')
                .eq('organization_id', organizationId)
                .lt('started_at', fetchEnd.toISOString())
                .or(`ended_at.is.null,ended_at.gt.${fetchStart.toISOString()}`)
                .order('started_at', { ascending: false });

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

            const projectMap = new Map(projects.map(p => [p.id, p.name]));
            const memberMap = new Map();
            members.forEach(m => {
                memberMap.set(m.id, m);
                if (m.auth_user_id) memberMap.set(m.auth_user_id, m);
            });

            const sessions = (rawSessions || []).map((s: any) => ({
                ...s,
                project_name: projectMap.get(s.project_id) || 'No Project'
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
                        {
                            organizationId: organizationId ?? undefined,
                            sessionIds
                        }
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
                const member = memberMap.get(s.user_id);
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

            // Update cache
            timesheetsCache = { entries: result };
            timesheetsCacheKey = cacheKey;
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
        <div className="flex flex-col min-h-screen bg-surface font-sans text-text-main">
            <header className="px-8 py-6 flex items-center justify-between border-b border-border shrink-0">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold heading-gradient tracking-tight font-heading">Timesheets</h1>
                    <p className="text-[14px] font-bold text-text-muted tracking-tight">Verify and refine team temporal records</p>
                </div>
            </header>

            <div className="px-8 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 sticky top-0 bg-surface/80 backdrop-blur-md z-30">
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-surface border border-border rounded-2xl p-1 shadow-shell-sm h-12">
                        <button onClick={() => navigateDate(-1)} className="p-3 hover:bg-surface-hover rounded-xl transition-all text-text-muted hover:text-primary">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4 px-4 relative cursor-pointer hover:bg-surface-hover rounded-xl transition-all h-full">
                            <span className="text-[13px] font-bold text-text-main tabular-nums">{formatRangeLabel()}</span>
                            <CalendarIcon className="w-4 h-4 text-text-muted" />
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
                        <button onClick={() => navigateDate(1)} className="p-3 hover:bg-surface-hover rounded-xl transition-all text-text-muted hover:text-primary">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="h-12 min-w-[240px]">
                        <FilterSelect
                            icon={<Clock className="w-4 h-4" />}
                            value={activeTimezone}
                            onChange={setActiveTimezone}
                            options={[
                                { id: 'User Local', name: 'User Local (Auto)' },
                                { id: 'UTC', name: 'UTC (Universal)' },
                                ...Array.from(new Set(members.map(m => m.timezone).filter(Boolean))).sort().map(tz => ({ id: tz as string, name: tz as string }))
                            ]}
                        />
                    </div>
                </div>

                <div className="flex bg-main/50 p-1.5 rounded-2xl border border-border/50 h-12 shrink-0">
                    {(['daily', 'weekly', 'calendar'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={clsx(
                                "px-8 rounded-xl text-[12px] font-bold transition-all h-full",
                                viewMode === mode ? "bg-surface text-primary shadow-shell-sm ring-1 ring-slate-200/50" : "text-text-muted hover:text-slate-600"
                            )}
                        >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-12 min-w-[220px]">
                        <FilterSelect
                            icon={<Users className="w-4 h-4" />}
                            value={selectedMember}
                            onChange={setSelectedMember}
                            options={[
                                { id: 'all', name: 'All Members' },
                                ...members.map((m: MemberInfo) => ({ id: m.id, name: m.full_name }))
                            ]}
                        />
                    </div>

                    <button onClick={() => setShowFilters(true)} className="flex items-center gap-3 px-6 h-12 bg-surface border border-border text-text-muted rounded-2xl text-[13px] font-bold shadow-shell-sm hover:bg-surface-hover transition-all">
                        <Filter className="w-4 h-4" /> Filter
                    </button>

                    <button onClick={() => setShowAddTime(true)} className="flex items-center gap-3 px-8 h-12 bg-primary text-white rounded-2xl text-[13px] font-bold shadow-shell-sm hover:bg-primary/90 transition-all">
                        <Plus className="w-5 h-5" /> Add time
                    </button>
                </div>
            </div>

            <div className="px-8 py-2 flex justify-end gap-2 bg-surface-hover/30 border-b border-slate-50 shrink-0">
                <button className="p-2 text-text-muted border border-border rounded-lg hover:bg-surface-hover hover:text-primary transition-all"><LayoutIcon className="w-3.5 h-3.5" /></button>
                <button className="p-2 text-text-muted border border-border rounded-lg hover:bg-surface-hover hover:text-primary transition-all"><Download className="w-3.5 h-3.5" /></button>
            </div>

            <main className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                {loading ? <div className="flex items-center justify-center h-64"><LoadingState /></div> : (
                    <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-1 duration-400">
                        {viewMode === 'daily' && <DailyView entries={entries} selectedMember={selectedMember} toProperCase={toProperCase} />}
                        {viewMode === 'weekly' && <WeeklyView entries={entries} onNavigate={(d) => { setSelectedDate(new Date(d + 'T12:00:00')); setViewMode('daily'); }} />}
                        {viewMode === 'calendar' && <CalendarView entries={entries} />}
                    </div>
                )}
            </main>

            <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filters">
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted ">Project Scope</label>
                        <div className="h-11">
                            <FilterSelect
                                icon={<FolderOpen className="w-3.5 h-3.5" />}
                                value={filterProjectId}
                                onChange={setFilterProjectId}
                                options={[
                                    { id: 'all', name: 'All Projects' },
                                    ...projects.map(p => ({ id: p.id, name: p.name }))
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showAddTime} onClose={() => setShowAddTime(false)} title="Manual Time Entry">
                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted ">Team Member</label>
                        <div className="h-11">
                            <FilterSelect
                                icon={<Users className="w-3.5 h-3.5" />}
                                value={addTimeData.userId}
                                onChange={(val) => setAddTimeData({ ...addTimeData, userId: val })}
                                options={[
                                    { id: '', name: 'Select member...' },
                                    ...members.map(m => ({ id: m.id, name: m.full_name }))
                                ]}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted ">Project</label>
                        <div className="h-11">
                            <FilterSelect
                                icon={<FolderOpen className="w-3.5 h-3.5" />}
                                value={addTimeData.projectId}
                                onChange={(val) => setAddTimeData({ ...addTimeData, projectId: val })}
                                options={[
                                    { id: '', name: 'Select project...' },
                                    ...projects.map(p => ({ id: p.id, name: p.name }))
                                ]}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted ">Date</label>
                        <input type="date" className="w-full h-11 bg-surface-hover border border-border rounded-xl px-4 text-[11px] font-bold text-text-main outline-none focus:border-primary transition-all" value={addTimeData.date} onChange={(e) => setAddTimeData({ ...addTimeData, date: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted ">Start</label>
                            <input type="time" className="w-full h-11 bg-surface-hover border border-border rounded-xl px-4 text-[11px] font-bold text-text-main outline-none focus:border-primary transition-all" value={addTimeData.startTime} onChange={(e) => setAddTimeData({ ...addTimeData, startTime: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-text-muted ">End</label>
                            <input type="time" className="w-full h-11 bg-surface-hover border border-border rounded-xl px-4 text-[11px] font-bold text-text-main outline-none focus:border-primary transition-all" value={addTimeData.endTime} onChange={(e) => setAddTimeData({ ...addTimeData, endTime: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button onClick={handleManualAddTime} className="px-8 h-11 bg-primary text-white rounded-xl text-[11px] font-bold shadow-shell-sm hover:bg-primary/90 transition-all">Submit Entry</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function DailyView({ entries, selectedMember, toProperCase }: {
    entries: DailyEntry[],
    selectedMember: string,
    toProperCase: (s: string) => string
}) {
    const day = entries[0];

    const displayRows = useMemo(() => {
        if (!day) return [];

        const userMap: Record<string, any> = {};

        day.sessions.forEach(s => {
            const userId = s.user_id;

            // For Single User view, return individual sessions
            if (selectedMember !== 'all') {
                return;
            }

            // For All Members view, aggregate by user
            if (!userMap[userId]) {
                userMap[userId] = {
                    ...s,
                    min_start: s.started_at,
                    max_end: s.ended_at,
                    total_duration: 0,
                    weighted_activity: 0,
                    weighted_idle: 0,
                    weighted_manual: 0,
                    offline_mins: 0,
                    is_active: false,
                    isAggregated: true
                };
            }
            const row = userMap[userId];
            const dur = s.duration_mins || 0;
            row.total_duration += dur;
            row.weighted_activity += (s.activity_percent || 0) * dur;
            row.weighted_idle += (s.idle_percent || 0) * dur;
            row.weighted_manual += (s.manual_percent || 0) * dur;
            row.offline_mins += (s.offline_mins || 0);

            if (new Date(s.started_at) < new Date(row.min_start)) row.min_start = s.started_at;

            if (s.is_active) {
                row.is_active = true;
            } else if (s.ended_at && (!row.max_end || new Date(s.ended_at) > new Date(row.max_end))) {
                row.max_end = s.ended_at;
            }

            if (row.project_id !== s.project_id) row.project_name = 'Multiple Projects';
        });

        if (selectedMember !== 'all') return day.sessions;

        return Object.values(userMap)
            .map(row => ({
                ...row,
                activity_percent: row.total_duration > 0 ? Math.round(row.weighted_activity / row.total_duration) : 0,
                idle_percent: row.total_duration > 0 ? Math.round(row.weighted_idle / row.total_duration) : 0,
                manual_percent: row.total_duration > 0 ? Math.round(row.weighted_manual / row.total_duration) : 0,
                duration_mins: row.total_duration
            }));
    }, [day, selectedMember]);

    if (!day) return <div className="flex flex-col items-center justify-center h-64"><EmptyState title="No entries found" /></div>;

    const renderTimeDisplay = (s: any) => {
        const startTime = s.isAggregated ? s.min_start : s.started_at;
        const endTime = s.isAggregated ? s.max_end : s.ended_at;
        const active = s.is_active;

        const start = new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: s.display_timezone }).toLowerCase();

        if (active) return `${start} – Now`;

        const end = endTime ?
            new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: s.display_timezone }).toLowerCase() :
            '...';

        return `${start} – ${end}`;
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-bold text-text-main tabular-nums tracking-tight">{formatDuration(day.totalMinutes)}</span>
                    <span className="text-[13px] font-bold text-text-muted tracking-wide uppercase opacity-60">Total tracked today</span>
                </div>
            </div>

            <div className="relative h-2.5 bg-black/[0.03] dark:bg-white/[0.05] rounded-full my-12 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.03]">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <span className="absolute w-px h-full bg-black/[0.05] dark:bg-white/[0.05] left-1/4" />
                    <span className="absolute w-px h-full bg-black/[0.05] dark:bg-white/[0.05] left-1/2" />
                    <span className="absolute w-px h-full bg-black/[0.05] dark:bg-white/[0.05] left-3/4" />
                </div>
                {day.sessions.map((s, i) => {
                    const d = new Date(s.started_at);
                    const formattedDate = new Date(d.toLocaleString('en-US', { timeZone: s.display_timezone }));
                    const left = ((formattedDate.getHours() * 60 + formattedDate.getMinutes()) / 1440) * 100;
                    const duration = s.duration_mins || 0;
                    const width = (duration / 1440) * 100;
                    return (
                        <div key={i} className="absolute inset-y-0 bg-primary rounded-full z-10 shadow-sm transition-all" style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }} />
                    );
                })}
            </div>

            <div className="bg-surface rounded-[24px] border border-border shadow-shell-sm overflow-hidden">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-surface-hover/30">
                            <th className="py-6 px-10 text-[11px] font-bold text-text-muted border-b border-border uppercase tracking-widest">Scope & Member</th>
                            <th className="py-6 px-6 text-[11px] font-bold text-text-muted border-b border-border text-center uppercase tracking-widest">Score</th>
                            <th className="py-6 px-6 text-[11px] font-bold text-text-muted border-b border-border text-center uppercase tracking-widest">Idle</th>
                            <th className="py-6 px-6 text-[11px] font-bold text-text-muted border-b border-border text-center uppercase tracking-widest">Duration</th>
                            <th className="py-6 px-10 text-[11px] font-bold text-text-muted border-b border-border text-right uppercase tracking-widest">Window</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayRows.map((s, idx) => (
                            <tr key={idx} className="group hover:bg-surface-hover/50 transition-all">
                                <td className="py-8 px-10">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[16px] font-bold text-text-main tracking-tight">{s.project_name}</span>
                                        <span className="text-[14px] font-bold text-text-muted group-hover:text-primary transition-colors">
                                            {s.user_name ? toProperCase(s.user_name) : 'Unknown'}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-8 px-6 text-center">
                                    <div className="flex flex-col items-center gap-2.5">
                                        <span className="text-[15px] font-bold text-text-main tabular-nums">{s.activity_percent}%</span>
                                        <div className="w-14 h-1.5 bg-main rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.activity_percent}%` }} />
                                        </div>
                                    </div>
                                </td>
                                <td className="py-8 px-6 text-center text-[15px] font-bold text-text-muted tabular-nums">{s.idle_percent}%</td>
                                <td className="py-8 px-6 text-center text-[18px] font-bold text-text-main tabular-nums">{formatDuration(s.duration_mins || 0)}</td>
                                <td className="py-8 px-10 text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[14px] font-bold text-text-muted tabular-nums">
                                            {renderTimeDisplay(s)}
                                        </span>
                                        {s.offline_mins > 0 && (
                                            <span className="text-[11px] text-primary font-bold tracking-tight bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                                                +{s.offline_mins}m offline
                                            </span>
                                        )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6">
            {entries.map((day, i) => (
                <div key={i} className="bg-surface border border-border rounded-[24px] p-6 flex flex-col items-center gap-4 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/40 transition-all cursor-pointer group" onClick={() => onNavigate(day.date)}>
                    <span className="text-[10px] font-bold text-text-muted ">{DAYS_SHORT[new Date(day.date + 'T12:00:00').getDay()]}</span>
                    <span className="text-2xl font-bold text-text-main group-hover:text-primary transition-colors tabular-nums">{new Date(day.date + 'T12:00:00').getDate()}</span>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-bold text-text-main tabular-nums">{formatDuration(day.totalMinutes)}</span>
                        {day.totalMinutes > 0 && (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg">{day.activityPercent}%</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CalendarView({ entries }: { entries: DailyEntry[] }) {
    return (
        <div className="bg-surface border border-border rounded-[24px] overflow-hidden shadow-shell-sm">
            <div className="grid grid-cols-7 border-b border-border">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="bg-surface-hover/50 p-4 text-[10px] font-bold text-text-muted text-center">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-main">
                {entries.map((day, i) => (
                    <div key={i} className="bg-surface min-h-[140px] p-4 flex flex-col gap-3 hover:bg-surface-hover transition-all group">
                        <span className="text-[11px] font-bold text-text-muted group-hover:text-slate-900 transition-colors">{new Date(day.date + 'T12:00:00').getDate()}</span>
                        {day.totalMinutes > 0 && (
                            <div className="bg-primary/5 border border-primary/10 text-primary rounded-xl p-3 flex flex-col gap-1.5 shadow-shell-sm">
                                <span className="text-[12px] font-bold tabular-nums">{formatDuration(day.totalMinutes)}</span>
                                <div className="w-full h-1 bg-primary/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${day.activityPercent}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
