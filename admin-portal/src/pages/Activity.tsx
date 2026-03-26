import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Mouse, Keyboard, Activity as ActivityIcon, Zap, Users, Calendar, Diamond, ChevronDown, Monitor } from 'lucide-react';
import { PageLayout, KpiCard, FilterSelect, Card } from '../components/ui';

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
    const dateInputRef = useRef<HTMLInputElement>(null);

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
    const dateLabel = isToday ? 'Live Timeline' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return (
        <PageLayout 
            title="Screen Captures" 
            description={`${dateLabel} • Review work session screenshots and input activity.`} 
            maxWidth="full" 
            actions={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <FilterSelect 
                        icon={<Users className="w-5 h-5 text-primary" />}
                        value={selectedMemberId}
                        onChange={setSelectedMemberId}
                        options={[{ id: 'all', name: 'All Members' }, ...members.map(m => ({ id: m.id, name: m.full_name }))]}
                    />
                    <div 
                        className="relative group/date" 
                        onClick={() => dateInputRef.current?.showPicker()}
                    >
                        <div className="flex items-center gap-3 bg-surface-solid border border-border rounded-xl px-5 py-2.5 shadow-sm hover:border-primary transition-all cursor-pointer">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-bold text-text-primary tracking-wider min-w-[100px] text-center">{selectedDate}</span>
                            <ChevronDown className="w-4 h-4 text-text-muted opacity-40 group-hover/date:translate-y-0.5 transition-transform" />
                        </div>
                        <input 
                            ref={dateInputRef}
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" 
                        />
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 animate-in fade-in duration-500">
                <KpiCard icon={<Mouse className="w-6 h-6" />} label="Mouse Clicks" value={totalClicks.toLocaleString()} />
                <KpiCard icon={<Keyboard className="w-6 h-6" />} label="Keyboard Usage" value={totalKeys.toLocaleString()} />
                <KpiCard icon={<ActivityIcon className="w-6 h-6" />} label="Active Time" value={`${activeTime} min`} />
                <KpiCard icon={<Zap className="w-6 h-6" />} label="Activity Rate" value={`${avgActivity}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <Card className="lg:col-span-2 p-0 border-border bg-surface-solid shadow-sm rounded-2xl overflow-hidden">
                    <div className="px-8 py-5 border-b border-border bg-surface-subtle flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-solid border border-border flex items-center justify-center text-primary shadow-sm">
                                <ActivityIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold text-text-primary tracking-tight">Activity Over Time</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Live Updates</span>
                        </div>
                    </div>
                    <div className="p-8">
                        <ActivityChart loading={loading} samples={samples} />
                    </div>
                </Card>
                
                <Card className="lg:col-span-1 p-0 border-border bg-surface-solid shadow-sm rounded-2xl overflow-hidden">
                    <div className="px-8 py-5 border-b border-border bg-surface-subtle flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-solid border border-border flex items-center justify-center text-primary shadow-sm">
                            <Diamond className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-text-primary tracking-tight">Usage Breakdown</h3>
                    </div>
                    <div className="p-0">
                        <AppUsageList samples={samples} />
                    </div>
                </Card>
            </div>

            <div className="mt-12">
                 <div className="flex items-center gap-4 mb-8 px-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg">
                        <Monitor className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Screenshot Gallery</h2>
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Visual history of work sessions</p>
                    </div>
                </div>
                
                <ScreenshotGallery screenshots={screenshots} onSelectImage={setEnlarged} />
            </div>
            
            <ScreenshotLightbox enlarged={enlarged} setEnlarged={setEnlarged} />
        </PageLayout>
    );
}
