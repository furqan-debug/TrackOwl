import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, TrendingUp, AlertCircle, Clock, Activity, MousePointer2 } from 'lucide-react';

interface MemberStats {
    id: string;
    name: string;
    totalMs: number;
    avgActivity: number;
    totalKeys: number;
    totalClicks: number;
}

export function Highlights() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<MemberStats[]>([]);

    // Default to this week
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    async function fetchData() {
        setLoading(true);

        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;

        // 1. Get all active members
        const { data: members } = await supabase.from('members').select('id, full_name').eq('status', 'Active');
        if (!members) {
            setLoading(false);
            return;
        }

        // 2. Get sessions for the day
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, user_id, started_at, ended_at')
            .gte('started_at', start)
            .lte('started_at', end)
            .not('ended_at', 'is', null);

        const sessionIds = (sessions || []).map(s => s.id);

        // 3. Get activity samples for those sessions
        let samples: any[] = [];
        if (sessionIds.length > 0) {
            const { data: acts } = await supabase
                .from('activity_samples')
                .select('session_id, activity_percent, key_presses, mouse_clicks')
                .in('session_id', sessionIds);
            if (acts) samples = acts;
        }

        // 4. Calculate member stats
        const memberStats: MemberStats[] = members.map(m => {
            const mSessions = (sessions || []).filter(s => s.user_id === m.id);
            const mSessionIds = new Set(mSessions.map(s => s.id));
            const mSamples = samples.filter(s => mSessionIds.has(s.session_id));

            // Time
            const totalMs = mSessions.reduce((acc, s) => {
                return acc + (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime());
            }, 0);

            // Averages and sums
            const totalKeys = mSamples.reduce((acc, s) => acc + (s.key_presses || 0), 0);
            const totalClicks = mSamples.reduce((acc, s) => acc + (s.mouse_clicks || 0), 0);

            const avgActivity = mSamples.length > 0
                ? mSamples.reduce((acc, s) => acc + (s.activity_percent || 0), 0) / mSamples.length
                : 0;

            return {
                id: m.id,
                name: m.full_name,
                totalMs,
                avgActivity,
                totalKeys,
                totalClicks
            };
        });

        // Filter out empty people
        setStats(memberStats.filter(m => m.totalMs > 0 || m.totalKeys > 0));
        setLoading(false);
    }

    const formatHours = (ms: number) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${h}h ${m}m`;
    };

    // Find winners
    const mostActive = [...stats].sort((a, b) => b.avgActivity - a.avgActivity)[0];
    const mostHours = [...stats].sort((a, b) => b.totalMs - a.totalMs)[0];
    const mostClicks = [...stats].sort((a, b) => (b.totalKeys + b.totalClicks) - (a.totalKeys + a.totalClicks))[0];

    // Anyone under 40% avg activity
    const lowActivity = stats.filter(s => s.avgActivity < 40 && s.totalMs > (1000 * 60 * 30)); // only count if worked > 30m

    return (
        <div className="p-8 max-w-[1200px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-8 relative z-20">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Team Highlights</h1>
                    <p className="text-slate-500">A quick executive summary of team performance.</p>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm bg-white hover:bg-slate-50 transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500">Calculating organization trends...</div>
            ) : stats.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                    No activity recorded for this date.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Most Active Widget */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Most Active</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Highest Avg Score</p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-2xl font-bold text-slate-900 truncate">
                                    {mostActive?.name || 'N/A'}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="text-emerald-600 font-semibold text-sm">
                                        {mostActive ? mostActive.avgActivity.toFixed(0) : 0}% Avg
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Most Hours Widget */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Most Hours</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Highest Time Tracked</p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-2xl font-bold text-slate-900 truncate">
                                    {mostHours?.name || 'N/A'}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="text-blue-600 font-semibold text-sm">
                                        {mostHours ? formatHours(mostHours.totalMs) : '0h 0m'} Tracked
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Typist/Clicker */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-purple-100/50 to-transparent rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800">Highest Output</h3>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Most Keystrokes & Clicks</p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-2xl font-bold text-slate-900 truncate">
                                    {mostClicks?.name || 'N/A'}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="text-purple-600 font-semibold text-sm">
                                        {mostClicks ? (mostClicks.totalKeys + mostClicks.totalClicks).toLocaleString() : 0} Actions
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Low Activity Warning */}
                    {lowActivity.length > 0 && (
                        <div className="bg-orange-50/50 border border-orange-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-orange-800">Attention Required</h3>
                            </div>
                            <p className="text-sm text-orange-700/80 mb-4">The following members tracked time today but fell below the 40% average activity threshold.</p>

                            <div className="grid gap-3">
                                {lowActivity.map(m => (
                                    <div key={m.id} className="flex items-center justify-between bg-white border border-orange-100 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="font-medium text-slate-800">{m.name}</div>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                {formatHours(m.totalMs)} tracked
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Activity className="w-3.5 h-3.5 text-orange-400" />
                                                <span className="font-semibold text-orange-600">{m.avgActivity.toFixed(0)}% Avg</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> {m.totalClicks}</span>
                                                <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> {m.totalKeys}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
