import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mouse, Keyboard, Activity as ActivityIcon, Zap, Users, Calendar } from 'lucide-react';
import { PageLayout, KpiCard, FilterSelect } from '../components/ui';

import { ActivityChart } from '../components/activity/ActivityChart';
import { AppUsageList } from '../components/activity/AppUsageList';
import { ScreenshotGallery } from '../components/activity/ScreenshotGallery';
import { ScreenshotLightbox } from '../components/activity/ScreenshotLightbox';

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
    full_name: string;
}

export function Activity() {
    const [samples, setSamples] = useState<ActivitySample[]>([]);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);
    const [enlarged, setEnlarged] = useState<Screenshot | null>(null);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

    useEffect(() => {
        supabase.from('members').select('id, full_name').eq('status', 'Active').then(({ data }) => {
            if (data) setMembers(data);
        });
    }, []);

    useEffect(() => { fetchData(); }, [selectedDate, selectedMemberId]);

    async function fetchData() {
        setLoading(true);
        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;

        let sessionIds: string[] | null = null;
        if (selectedMemberId !== 'all') {
            const { data: userSessions } = await supabase
                .from('sessions')
                .select('id')
                .eq('user_id', selectedMemberId);

            if (!userSessions || userSessions.length === 0) {
                setSamples([]);
                setScreenshots([]);
                setLoading(false);
                return;
            }
            sessionIds = userSessions.map(s => s.id);
        }

        let actQuery = supabase.from('activity_samples').select('*').gte('recorded_at', start).lte('recorded_at', end).order('recorded_at', { ascending: true });
        let ssQuery = supabase.from('screenshots').select('*').gte('recorded_at', start).lte('recorded_at', end).order('recorded_at', { ascending: false }).limit(24);

        if (sessionIds && sessionIds.length > 0) {
            actQuery = actQuery.in('session_id', sessionIds);
            ssQuery = ssQuery.in('session_id', sessionIds);
        }

        const [{ data: actData }, { data: ssData }] = await Promise.all([actQuery, ssQuery]);

        setSamples(actData || []);
        setScreenshots(ssData || []);
        setLoading(false);
    }

    const totalClicks = samples.reduce((a, b) => a + b.mouse_clicks, 0);
    const totalKeys = samples.reduce((a, b) => a + b.key_presses, 0);
    const avgActivity = samples.length ? Math.round(samples.reduce((a, b) => a + b.activity_percent, 0) / samples.length) : 0;
    const activeTime = samples.filter(s => !s.idle).length;

    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const dateLabel = isToday ? 'Current Timeline' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return (
        <PageLayout 
            title="Activity Report" 
            description={`${dateLabel} • Comprehensive activity analysis & app usage`} 
            maxWidth="full" 
            actions={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <FilterSelect 
                        icon={<Users className="w-4 h-4" />}
                        value={selectedMemberId}
                        onChange={setSelectedMemberId}
                        options={[{ id: 'all', name: 'All Members' }, ...members.map(m => ({ id: m.id, name: m.full_name }))]}
                    />
                    <div className="relative group/date">
                        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm hover:border-primary/50 cursor-pointer transition-colors">
                            <Calendar className="w-4 h-4 text-primary" strokeWidth={2.5} />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[100px] text-center">{selectedDate}</span>
                        </div>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        />
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                <KpiCard icon={<Mouse className="w-6 h-6" />} label="Mouse Clicks" value={totalClicks.toLocaleString()} />
                <KpiCard icon={<Keyboard className="w-6 h-6" />} label="Keyboard Hits" value={totalKeys.toLocaleString()} />
                <KpiCard icon={<ActivityIcon className="w-6 h-6" />} label="Active Time" value={activeTime.toString()} sub="Minutes of activity" />
                <KpiCard icon={<Zap className="w-6 h-6" />} label="Activity Rate" value={`${avgActivity}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">
                <div className="lg:col-span-2">
                    <ActivityChart loading={loading} samples={samples} />
                </div>
                <div className="lg:col-span-1">
                    <AppUsageList samples={samples} />
                </div>
            </div>

            <ScreenshotGallery screenshots={screenshots} onSelectImage={setEnlarged} />
            <ScreenshotLightbox enlarged={enlarged} setEnlarged={setEnlarged} />
        </PageLayout>
    );
}

