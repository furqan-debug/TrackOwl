import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Mouse, Keyboard, Activity as ActivityIcon, 
    Zap, Users, Calendar, 
    Monitor, Clock, 
    RefreshCw,
    ChevronLeft, ChevronRight,
    Search, Camera
} from 'lucide-react';
import { PageLayout, StatMetric, FilterSelect, LoadingState, ScreenshotModal } from '../components/ui';
import clsx from 'clsx';

import { AppUsageList } from '../components/activity/AppUsageList';
import { ScreenshotGallery } from '../components/activity/ScreenshotGallery';
import { TimelineGrid } from '../components/activity/TimelineGrid';
import { calculateActivityScore, calculateProductiveMinutes } from '../lib/dataUtils';

interface ActivitySample {
    id: number;
    session_id: string;
    recorded_at: string;
    mouse_clicks: number;
    key_presses: number;
    app_name: string;
    window_title: string;
    idle: boolean;
    activity_percent: number;
}

interface Screenshot {
    id: number;
    session_id: string;
    recorded_at: string;
    file_url: string;
}

interface MemberInfo {
    id: string;
    auth_user_id?: string | null;
    full_name: string;
    timezone?: string;
    keep_idle?: boolean;
    email?: string;
    avatar_url?: string;
}

function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function Activity() {
    const [samples, setSamples] = useState<ActivitySample[]>([]);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
    const [enlarged, setEnlarged] = useState<any | null>(null);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [sessionMinutes, setSessionMinutes] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        supabase.from('members').select('id, auth_user_id, full_name, timezone, keep_idle, email, avatar_url').eq('status', 'Active').then(({ data }) => {
            if (data) setMembers(data);
        });
    }, []);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const selectedMember = members.find(m => m.id === selectedMemberId);
            const start = new Date(`${selectedDate}T00:00:00`).toISOString();
            const end = new Date(`${selectedDate}T23:59:59.999`).toISOString();

            const memberUserIds = selectedMemberId.toLowerCase() !== 'all'
                ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean) as string[]))
                : [];

            if (selectedMemberId.toLowerCase() !== 'all' && memberUserIds.length === 0) {
                setSamples([]);
                setScreenshots([]);
                setSessionMinutes(0);
                return;
            }

            let sessionsQuery = supabase
                .from('sessions')
                .select('id, user_id, started_at, ended_at')
                .lt('started_at', end)
                .or(`ended_at.is.null,ended_at.gt.${start}`);

            if (memberUserIds.length > 0) {
                sessionsQuery = sessionsQuery.in('user_id', memberUserIds);
            }

            const { data: sessionRows } = await sessionsQuery;
            const sessions = sessionRows || [];
            const sessionIds = sessions.map(s => s.id);

            if (sessionIds.length === 0) {
                setSamples([]);
                setScreenshots([]);
                setSessionMinutes(0);
                return;
            }

            const [{ data: actData }, { data: ssData }] = await Promise.all([
                supabase.from('activity_samples').select('*').in('session_id', sessionIds).gte('recorded_at', start).lte('recorded_at', end).order('recorded_at', { ascending: true }),
                supabase.from('screenshots').select('*').in('session_id', sessionIds).gte('recorded_at', start).lte('recorded_at', end).order('recorded_at', { ascending: false }).limit(500)
            ]);

            const startMs = new Date(start).getTime();
            const endMs = new Date(end).getTime();
            const mins = sessions.reduce((acc, s) => {
                const sStart = new Date(s.started_at).getTime();
                const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                const overlap = Math.max(0, Math.min(sEnd, endMs) - Math.max(sStart, startMs));
                return acc + overlap / 60000;
            }, 0);

            setSamples(actData || []);
            setScreenshots(ssData || []);
            setSessionMinutes(mins);
        } catch (error) {
            console.error('Activity fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, selectedMemberId, members]);

    useEffect(() => {
        if (selectedMemberId !== 'all' && members.length === 0) return;
        fetchData(false);
    }, [fetchData, members, selectedMemberId]);

    // Data Processing
    const uniqueMinMap = new Map<string, ActivitySample>();
    samples.forEach((s: ActivitySample) => {
        const minKey = s.recorded_at.substring(0, 16);
        if (!uniqueMinMap.has(minKey)) {
            uniqueMinMap.set(minKey, s);
        } else {
            const existing = uniqueMinMap.get(minKey)!;
            if ((s.mouse_clicks + s.key_presses) > (existing.mouse_clicks + existing.key_presses)) {
                uniqueMinMap.set(minKey, s);
            }
        }
    });

    const uniqueSamples = Array.from(uniqueMinMap.values());
    const totalClicks = uniqueSamples.reduce((a, b) => a + b.mouse_clicks, 0);
    const totalKeys = uniqueSamples.reduce((a, b) => a + b.key_presses, 0);
    const avgActivity = calculateActivityScore(uniqueSamples);
    const productiveMinutes = uniqueSamples.length > 0 ? calculateProductiveMinutes(uniqueSamples) : Math.max(0, Math.round(sessionMinutes));

    const selectedMember = members.find(m => m.id === selectedMemberId);
    const isToday = selectedDate === formatLocalDate(new Date());

    const navigateDate = (dir: 'prev' | 'next') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'prev' ? -1 : 1));
        setSelectedDate(formatLocalDate(d));
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Screen Captures"
            description="Operational monitoring and visual work history review."
            actions={
                <div className="flex items-center gap-4">
                    <FilterSelect
                        icon={<Users className="w-4 h-4 text-primary" />}
                        value={selectedMemberId}
                        onChange={setSelectedMemberId}
                        options={[{ id: 'all', name: 'All Members' }, ...members.map(m => ({ id: m.id, name: m.full_name }))]}
                    />
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                        <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-slate-50 border-r border-slate-200 transition-colors">
                            <ChevronLeft className="w-4 h-4 text-slate-500" />
                        </button>
                        <div 
                            className="relative px-4 py-1.5 min-w-[150px] text-center cursor-pointer hover:bg-slate-50 transition-colors group/date flex items-center justify-center gap-2"
                            onClick={() => dateInputRef.current?.showPicker()}
                        >
                            <Calendar className="w-3 h-3 text-slate-400 group-hover/date:text-primary transition-colors" />
                            <span className="text-xs font-semibold text-slate-700">
                                {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <input 
                                ref={dateInputRef}
                                type="date" 
                                value={selectedDate}
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => navigateDate('next')} 
                            className="p-2 hover:bg-slate-50 border-l border-slate-200 transition-colors" 
                            disabled={isToday}
                        >
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-6 pb-20">
                
                {/* 📊 KPI Row: Standardized Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatMetric icon={<Mouse className="w-5 h-5" />} label="Clicks" value={totalClicks.toLocaleString()} sub="Mouse events" />
                    <StatMetric icon={<Keyboard className="w-5 h-5" />} label="Keystrokes" value={totalKeys.toLocaleString()} sub="Keyboard events" />
                    <StatMetric icon={<Clock className="w-5 h-5" />} label="Productive" value={`${productiveMinutes}m`} sub="Estimated billable" />
                    <StatMetric icon={<Zap className="w-5 h-5" />} label="Intensity" value={`${avgActivity}%`} sub="Avg activity score" />
                </div>

                {/* 🏗️ Main Layout: Structured 12-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* 🕒 Timeline & App Usage: Integrated Side-by-Side */}
                    <div className="lg:col-span-8">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                        <ActivityIcon className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Daily Micro-Activity</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">High</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Idle</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 flex-1 overflow-auto">
                                <TimelineGrid samples={uniqueSamples} targetTz={selectedMember?.timezone} />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0 bg-slate-50/50">
                                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                    <Monitor className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Application Usage</h3>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <AppUsageList samples={samples} />
                            </div>
                        </div>
                    </div>

                    {/* 📸 Screenshot Gallery: Full Width Container */}
                    <div className="lg:col-span-12 mt-4">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                        <Camera className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Capture Feed</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visually verifying {screenshots.length} instances of work</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input 
                                            type="text" 
                                            placeholder="Search window title..." 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64"
                                        />
                                    </div>
                                    <button onClick={() => fetchData(true)} className={clsx("p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-500 shadow-sm", refreshing && "animate-spin text-primary")}>
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-8 flex-1">
                                <ScreenshotGallery 
                                    screenshots={screenshots} 
                                    onSelectImage={(ss) => setEnlarged({
                                        id: ss.id,
                                        path: ss.file_url,
                                        recordedAt: ss.recorded_at,
                                        activityPercent: samples.find(samp => samp.recorded_at.substring(0, 16) === ss.recorded_at.substring(0, 16))?.activity_percent ?? 50
                                    })} 
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <ScreenshotModal 
                screenshot={enlarged} 
                onClose={() => setEnlarged(null)} 
            />
        </PageLayout>
    );
}
