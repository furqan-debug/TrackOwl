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
            title="Activity Metrics" 
            description={`${dateLabel.toUpperCase()} • Forensic analytics & operational telemetry`} 
            maxWidth="full" 
            actions={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <FilterSelect 
                        icon={<Users className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                        value={selectedMemberId}
                        onChange={setSelectedMemberId}
                        options={[{ id: 'all', name: 'ALL OPERATORS' }, ...members.map(m => ({ id: m.id, name: m.full_name.toUpperCase() }))]}
                    />
                    <div 
                        className="relative group/date" 
                        onClick={() => dateInputRef.current?.showPicker()}
                    >
                        <div className="flex items-center gap-3 bg-surface-solid border border-border rounded-2xl px-6 py-3.5 shadow-sm hover:border-primary transition-all group-hover/date:scale-[1.02] cursor-pointer">
                            <Calendar className="w-5 h-5 text-primary" strokeWidth={2.5} />
                            <span className="text-[11px] font-black text-text-primary tracking-widest font-mono italic uppercase min-w-[120px] text-center">{selectedDate.replace(/-/g, '.')}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 animate-in fade-in slide-in-from-top-6 duration-1000">
                <KpiCard icon={<Mouse className="w-7 h-7" strokeWidth={2.5} />} label="INPUT_CLICKS" value={totalClicks.toLocaleString()} />
                <KpiCard icon={<Keyboard className="w-7 h-7" strokeWidth={2.5} />} label="KEYSTROKES" value={totalKeys.toLocaleString()} />
                <KpiCard icon={<ActivityIcon className="w-7 h-7" strokeWidth={2.5} />} label="ACTIVE_MINUTES" value={activeTime.toString()} sub="Verified activity" />
                <KpiCard icon={<Zap className="w-7 h-7" strokeWidth={2.5} />} label="EFFICIENCY_RATE" value={`${avgActivity}%`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
                <Card className="lg:col-span-2 p-0 border-border bg-surface-solid shadow-2xl rounded-[48px] overflow-hidden">
                    <div className="px-10 py-8 border-b border-border bg-surface-subtle flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface-solid border border-border flex items-center justify-center text-primary shadow-sm">
                                <ActivityIcon className="w-6 h-6" strokeWidth={2.5} />
                            </div>
                            <h3 className="text-lg font-black text-text-primary tracking-tighter uppercase italic font-mono">Activity Flow Matrix</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-widest font-mono">Telemetry: Live</span>
                        </div>
                    </div>
                    <div className="p-10">
                        <ActivityChart loading={loading} samples={samples} />
                    </div>
                </Card>
                
                <Card className="lg:col-span-1 p-0 border-border bg-surface-solid shadow-2xl rounded-[48px] overflow-hidden">
                    <div className="px-10 py-8 border-b border-border bg-surface-subtle flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-solid border border-border flex items-center justify-center text-primary shadow-sm">
                            <Diamond className="w-6 h-6" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-lg font-black text-text-primary tracking-tighter uppercase italic font-mono">Environment Usage</h3>
                    </div>
                    <div className="p-0">
                        <AppUsageList samples={samples} />
                    </div>
                </Card>
            </div>

            <div className="mt-16">
                 <div className="flex items-center gap-5 mb-10 px-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                        <Monitor className="w-7 h-7" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase italic font-mono leading-none">Visual Archives</h2>
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] font-mono mt-2 opacity-50">Temporal capture sequence registry</p>
                    </div>
                </div>
                
                <ScreenshotGallery screenshots={screenshots} onSelectImage={setEnlarged} />
            </div>
            
            <ScreenshotLightbox enlarged={enlarged} setEnlarged={setEnlarged} />
        </PageLayout>
    );
}
