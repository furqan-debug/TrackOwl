import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Activity, MousePointer2, Keyboard, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchAllActivitySamples, calculateActivityScore } from '../lib/dataUtils';

interface MemberPerformance {
    id: string;
    name: string;
    totalMs: number;
    avgActivity: number;
    totalKeys: number;
    totalClicks: number;
}

type SortField = 'name' | 'totalMs' | 'avgActivity' | 'totalKeys' | 'totalClicks';
type SortDirection = 'asc' | 'desc';

// Module-level cache
let perfCache: any = null;
let perfCacheKey: string | null = null;

export function Performance() {
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<MemberPerformance[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Sort state
    const [sortField, setSortField] = useState<SortField>('avgActivity');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Default to this week
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    async function fetchData(forceRefresh = false) {
        const cacheKey = selectedDate;
        if (!forceRefresh && perfCache && perfCacheKey === cacheKey) {
            setPerformanceData(perfCache.data);
            setLoading(false);
            return;
        }

        setLoading(true);

        const start = `${selectedDate}T00:00:00`;
        const end = `${selectedDate}T23:59:59`;

        // 1. Get all active members
        const { data: members } = await supabase.from('members')
            .select('id, full_name, email, idle_limit')
            .eq('organization_id', organizationId)
            .eq('status', 'Active')
            .order('full_name', { ascending: true });

        if (!members) {
            setLoading(false);
            return;
        }

        // 2. Get sessions for the day
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, user_id, started_at, ended_at')
            .eq('organization_id', organizationId)
            .gte('started_at', start)
            .lte('started_at', end)
            .not('ended_at', 'is', null);

        const sessionIds = (sessions || []).map(s => s.id);

        // 3. Get activity samples
        let samples: any[] = [];
        if (sessionIds.length > 0) {
            samples = await fetchAllActivitySamples(supabase, start, end, 'session_id, activity_percent, key_presses, mouse_clicks', {
                organizationId: organizationId ?? undefined,
                sessionIds
            });
        }

        // 4. Index data for fast lookup
        const sessionsByUser = new Map<string, any[]>();
        (sessions || []).forEach(s => {
            if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
            sessionsByUser.get(s.user_id)!.push(s);
        });

        const samplesBySession = new Map<string, any[]>();
        samples.forEach(s => {
            if (!samplesBySession.has(s.session_id)) samplesBySession.set(s.session_id, []);
            samplesBySession.get(s.session_id)!.push(s);
        });

        // 5. Calculate member stats
        const memberStats: MemberPerformance[] = members.map(m => {
            const mSessions = sessionsByUser.get(m.id) || [];
            const rawSamples: any[] = [];
            mSessions.forEach(sess => {
                const sessSamples = samplesBySession.get(sess.id);
                if (sessSamples) rawSamples.push(...sessSamples);
            });

            // Deduplicate samples by minute
            const seen = new Set();
            const mSamples: any[] = [];
            rawSamples.sort((a,b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()).forEach(s => {
                const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
                if (seen.has(minute)) return;
                seen.add(minute);
                mSamples.push(s);
            });

            const limit = m.idle_limit ?? 0;
            const productiveSamples: any[] = [];
            if (limit <= 1) {
                productiveSamples.push(...mSamples);
            } else {
                let currentBlock: any[] = [];
                for (let i = 0; i < mSamples.length; i++) {
                    const s = mSamples[i];
                    const prev = i > 0 ? mSamples[i-1] : null;
                    const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
                    const isContiguous = prev && gapMs <= 125000;

                    if (s.idle && isContiguous) {
                        currentBlock.push(s);
                    } else if (s.idle && !prev) {
                        currentBlock = [s];
                    } else if (s.idle && !isContiguous) {
                        if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                        currentBlock = [s];
                    } else {
                        productiveSamples.push(s);
                        if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                        currentBlock = [];
                    }
                }
                if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
            }

            // Sums
            const totalKeys = productiveSamples.reduce((acc, s) => acc + (s.key_presses || 0), 0);
            const totalClicks = productiveSamples.reduce((acc, s) => acc + (s.mouse_clicks || 0), 0);
            const avgActivity = calculateActivityScore(productiveSamples);

            // Time: Use productive samples as the source of truth for "active" time
            const totalMs = productiveSamples.length * 60000;

            return {
                id: m.id,
                name: m.full_name,
                totalMs,
                avgActivity,
                totalKeys,
                totalClicks
            };
        });

        // Filter out empty people unless we want to see everyone (for now, only those who tracked time)
        const filteredData = memberStats.filter(m => m.totalMs > 0 || m.totalKeys > 0);
        setPerformanceData(filteredData);
        setLoading(false);

        // Update cache
        perfCache = { data: filteredData };
        perfCacheKey = cacheKey;
    }

    const formatHours = (ms: number) => {
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${h}h ${m}m`;
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const filteredData = performanceData
        .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    return (
        <div className="p-8 max-w-[1200px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-8 relative z-20">
                <div>
                    <h1 className="text-4xl font-bold text-text-main tracking-tight mb-2">Performance</h1>
                    <p className="text-text-muted">Analyze and rank individual team productivity.</p>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-main shadow-shell-sm bg-surface hover:bg-surface-hover transition-colors"
                    />
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-surface border border-border rounded-xl shadow-shell-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-surface-hover/50 flex justify-between items-center">
                    <h2 className="font-semibold text-text-main">Team Rankings</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Find member..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-surface border border-border rounded-md pl-9 pr-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64"
                            />
                        </div>
                        <button
                            onClick={() => fetchData(true)}
                            className="p-2 hover:bg-surface-solid border border-border rounded-md text-text-muted hover:text-primary transition-all"
                            title="Refresh Data"
                        >
                            <RefreshCw className={loading ? "w-4 h-4 animate-spin text-primary" : "w-4 h-4"} />
                        </button>
                    </div>
                </div>

                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface-hover text-text-muted text-xs ">
                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1.5"><ArrowUpDown className="w-3 h-3" /> Member</div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('totalMs')}>
                                <div className="flex items-center justify-end gap-1.5"><ArrowUpDown className="w-3 h-3" /> Time Tracked</div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('avgActivity')}>
                                <div className="flex items-center justify-end gap-1.5"><ArrowUpDown className="w-3 h-3" /> Avg Activity</div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('totalClicks')}>
                                <div className="flex items-center justify-end gap-1.5"><ArrowUpDown className="w-3 h-3" /> Mouse Clicks</div>
                            </th>
                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-slate-700 transition-colors" onClick={() => handleSort('totalKeys')}>
                                <div className="flex items-center justify-end gap-1.5"><ArrowUpDown className="w-3 h-3" /> Keystrokes</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                                    Calculating team performance...
                                </td>
                            </tr>
                        ) : filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center">
                                            <Activity className="w-6 h-6 text-text-muted" />
                                        </div>
                                        <p>No performance data recorded for this date.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((m, i) => (
                                <tr key={m.id} className="hover:bg-surface-hover/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-main flex items-center justify-center text-text-muted font-bold text-xs shrink-0 ring-1 ring-slate-200">
                                                {i + 1}
                                            </div>
                                            <span className="font-semibold text-text-main">{m.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center justify-end gap-1.5 px-2.5 py-1 rounded bg-main text-text-main text-sm font-medium">
                                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                                            {formatHours(m.totalMs)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end justify-center">
                                            <span className={`text-sm font-bold ${m.avgActivity >= 75 ? 'text-emerald-500' :
                                                m.avgActivity >= 45 ? 'text-amber-500' :
                                                    'text-rose-500'
                                                }`}>
                                                {m.avgActivity.toFixed(0)}%
                                            </span>
                                            <div className="w-16 h-1 mt-1 bg-main rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${m.avgActivity >= 75 ? 'bg-emerald-500' :
                                                        m.avgActivity >= 45 ? 'bg-amber-500' :
                                                            'bg-rose-500'
                                                        }`}
                                                    style={{ width: `${m.avgActivity}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5 text-sm text-text-muted">
                                            <MousePointer2 className="w-3.5 h-3.5 text-text-muted" />
                                            {m.totalClicks.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5 text-sm text-text-muted">
                                            <Keyboard className="w-3.5 h-3.5 text-text-muted" />
                                            {m.totalKeys.toLocaleString()}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
