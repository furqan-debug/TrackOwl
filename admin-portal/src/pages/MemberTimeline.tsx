import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Mouse, Keyboard, Globe, Camera, Search, User } from 'lucide-react';

interface MemberInfo {
    id: string;
    full_name: string;
    email: string;
}

interface TimelineEvent {
    type: 'session_start' | 'session_end' | 'activity' | 'screenshot';
    id: string | number;
    timestamp: string;
    data: any;
}

export function MemberTimeline() {
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<MemberInfo | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);

    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [enlargedScreenshot, setEnlargedScreenshot] = useState<string | null>(null);

    // Initial member load
    useEffect(() => {
        supabase.from('members').select('id, full_name, email').order('full_name')
            .then(({ data }) => setMembers(data || []));
    }, []);

    // Fetch timeline when member or date changes
    useEffect(() => {
        if (selectedMember) fetchTimeline();
        else setTimeline([]);
    }, [selectedMember, selectedDate]);

    async function fetchTimeline() {
        setLoading(true);
        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;

        // 1. Get ALL sessions for the user
        const { data: userSessions } = await supabase.from('sessions')
            .select('*')
            .eq('user_id', selectedMember!.id);

        if (!userSessions || userSessions.length === 0) {
            setTimeline([]);
            setLoading(false);
            return;
        }

        const sessionIds = userSessions.map(s => s.id);

        // 2. Fetch all related events using session IDs inside the date range
        const [
            { data: activities },
            { data: screenshots }
        ] = await Promise.all([
            supabase.from('activity_samples')
                .select('*')
                .in('session_id', sessionIds)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .order('recorded_at'),
            supabase.from('screenshots')
                .select('*')
                .in('session_id', sessionIds)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .order('recorded_at')
        ]);

        const events: TimelineEvent[] = [];

        // Build active sessions Set to know which sessions to add bounds for
        const activeDbSessionIds = new Set([
            ...(activities || []).map(a => a.session_id),
            ...(screenshots || []).map(s => s.session_id)
        ]);

        const todaySessions = userSessions.filter(s => {
            const startedToday = s.started_at >= start && s.started_at <= end;
            const endedToday = s.ended_at && s.ended_at >= start && s.ended_at <= end;
            return startedToday || endedToday || activeDbSessionIds.has(s.id);
        });

        if (todaySessions.length === 0 && (!activities || activities.length === 0) && (!screenshots || screenshots.length === 0)) {
            setTimeline([]);
            setLoading(false);
            return;
        }

        // Build session bounds
        todaySessions.forEach(s => {
            // Only add start node if it actually started today
            if (s.started_at >= start && s.started_at <= end) {
                events.push({ type: 'session_start', id: `start-${s.id}`, timestamp: s.started_at, data: s });
            }
            // Only add end node if it actually ended today
            if (s.ended_at && s.ended_at >= start && s.ended_at <= end) {
                events.push({ type: 'session_end', id: `end-${s.id}`, timestamp: s.ended_at, data: s });
            }
        });

        // Add activities
        (activities || []).forEach(a => {
            events.push({ type: 'activity', id: `act-${a.id}`, timestamp: a.recorded_at, data: a });
        });

        // Add screenshots
        (screenshots || []).forEach(ss => {
            events.push({ type: 'screenshot', id: `ss-${ss.id}`, timestamp: ss.recorded_at, data: ss });
        });

        // Sort everything chronologically
        events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setTimeline(events);
        setLoading(false);
    }

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1200px] mx-auto w-full flex flex-col md:flex-row gap-8">
            {/* Left Col: Search & Selection */}
            <div className="w-full md:w-80 shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-8">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Find Member</h2>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search name or email..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1 -mr-1">
                        {filteredMembers.map(m => (
                            <button key={m.id} onClick={() => { setSelectedMember(m); setSearchQuery(''); }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${selectedMember?.id === m.id ? 'bg-blue-50 border border-blue-100 ring-1 ring-blue-500 shadow-sm' : 'hover:bg-slate-50 border border-transparent'
                                    }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedMember?.id === m.id ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                    {m.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-sm font-medium truncate ${selectedMember?.id === m.id ? 'text-blue-900' : 'text-slate-700'}`}>
                                        {m.full_name}
                                    </div>
                                    <div className="text-xs text-slate-400 truncate">{m.email}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Col: Timeline */}
            <div className="flex-1">
                {!selectedMember ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                            <User className="w-8 h-8 text-slate-300" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-700 mb-1">No Member Selected</h2>
                        <p className="text-slate-500 text-sm max-w-sm">Search and select a member from the left sidebar to view their detailed activity timeline.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Header Details */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl font-bold">
                                    {selectedMember.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-slate-900">{selectedMember.full_name}</h1>
                                    <p className="text-sm text-slate-500">{selectedMember.email}</p>
                                </div>
                            </div>
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                className="border border-slate-200 bg-white rounded-lg px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                        </div>

                        {/* Feed */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">Activity Feed</h2>

                            {loading ? (
                                <div className="text-center text-sm text-slate-400 py-12">Loading timeline...</div>
                            ) : timeline.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-600 font-medium">No activity found</p>
                                    <p className="text-slate-400 text-sm mt-1">This member didn't track any time on this date.</p>
                                </div>
                            ) : (
                                <div className="relative pl-6 space-y-8 before:content-[''] before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-slate-200">
                                    {timeline.map((event, idx) => (
                                        <TimelineNode key={event.id + '-' + idx} event={event} onImageClick={setEnlargedScreenshot} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {enlargedScreenshot && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setEnlargedScreenshot(null)}>
                    <div className="max-w-5xl w-full" onClick={e => e.stopPropagation()}>
                        <img src={enlargedScreenshot} alt="Screenshot Fullsize" className="w-full object-contain rounded-xl shadow-2xl" />
                        <p className="text-white/60 text-sm text-center mt-4">Click anywhere outside the image to close</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function TimelineNode({ event, onImageClick }: { event: TimelineEvent, onImageClick: (url: string) => void }) {
    const timeStr = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (event.type === 'session_start') {
        return (
            <div className="relative">
                <div className="absolute -left-6 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center ring-4 ring-white -translate-x-1/2">
                    <Clock className="w-3 h-3 text-blue-600" />
                </div>
                <div className="text-sm">
                    <span className="font-semibold text-slate-800">{timeStr}</span>
                    <span className="text-slate-500 ml-3">Started tracking session</span>
                </div>
            </div>
        );
    }

    if (event.type === 'session_end') {
        return (
            <div className="relative">
                <div className="absolute -left-6 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center ring-4 ring-white -translate-x-1/2">
                    <Clock className="w-3 h-3 text-slate-400" />
                </div>
                <div className="text-sm">
                    <span className="font-semibold text-slate-800">{timeStr}</span>
                    <span className="text-slate-500 ml-3">Ended tracking session</span>
                </div>
            </div>
        );
    }

    if (event.type === 'screenshot') {
        return (
            <div className="relative">
                <div className="absolute -left-6 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center ring-4 ring-white -translate-x-1/2">
                    <Camera className="w-3 h-3 text-purple-600" />
                </div>
                <div>
                    <div className="text-sm mb-2">
                        <span className="font-semibold text-slate-800">{timeStr}</span>
                        <span className="text-slate-500 ml-3">Captured screenshot</span>
                    </div>
                    <button onClick={() => onImageClick(event.data.file_url)} className="block relative w-full max-w-md aspect-video rounded-xl overflow-hidden border border-slate-200 group">
                        <img src={event.data.file_url} alt="Screenshot Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </button>
                </div>
            </div>
        );
    }

    if (event.type === 'activity') {
        const d = event.data;
        return (
            <div className="relative">
                <div className="absolute -left-6 w-2.5 h-2.5 bg-slate-300 rounded-full ring-4 ring-white -translate-x-1/2 mt-1.5" />
                <div className="text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-slate-50 rounded-lg p-3 w-full max-w-xl border border-slate-100">
                    <span className="font-medium text-slate-600 shrink-0">{timeStr}</span>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className="flex gap-2 shrink-0">
                            {d.mouse_clicks > 0 && <span className="flex items-center text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shadow-sm"><Mouse className="w-3 h-3 mr-1" />{d.mouse_clicks}</span>}
                            {d.key_presses > 0 && <span className="flex items-center text-xs bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shadow-sm"><Keyboard className="w-3 h-3 mr-1" />{d.key_presses}</span>}
                        </div>
                        <div className="flex flex-col min-w-0">
                            {d.domain && <span className="text-slate-700 font-medium truncate flex items-center gap-1.5"><Globe className="w-3 h-3 text-slate-400" />{d.domain}</span>}
                            {d.app_name && <span className="text-slate-500 text-xs truncate">[{d.app_name}] {d.window_title}</span>}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
