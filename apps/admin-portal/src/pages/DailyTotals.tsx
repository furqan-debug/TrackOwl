import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Calendar, ChevronLeft, ChevronRight, 
    Users, Download, Filter, 
    Shield
} from 'lucide-react';
import { 
    PageHeader, Card, Button, StatusBadge, 
    LoadingState, EmptyState 
} from '../components/ui';
import clsx from 'clsx';
import { 
    getDayIndexInTz,
    fetchAllActivitySamples,
    getEffectiveEnd
} from '../lib/dataUtils';

interface DayTotal {
    member: string;
    totals: number[]; // 7 days (Mon-Sun)
    weeklyTotal: number;
}

export function DailyTotals() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DayTotal[]>([]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [allMembers, setAllMembers] = useState<{ id: string; full_name: string; timezone?: string; idle_limit?: number | null }[]>([]);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        const day = d.getDay() || 7; // Mon=1 ... Sun=7
        d.setDate(d.getDate() - day + 1 + i + (weekOffset * 7));
        return d;
    });

    useEffect(() => {
        fetchDailyTotals();
    }, [weekOffset, selectedMemberId]);

    async function fetchDailyTotals() {
        setLoading(true);
        try {
            const start = new Date(weekDates[0]);
            start.setHours(0, 0, 0, 0);
            const end = new Date(weekDates[6]);
            end.setHours(23, 59, 59, 999);

            // Fetch members
            const { data: members } = await supabase.from('members').select('id, full_name, timezone, idle_limit');
            if (members) {
                setAllMembers(members);
            }

            let sessQuery = supabase.from('sessions')
                .select('id, user_id, started_at, ended_at')
                .lt('started_at', end.toISOString())
                .or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`);
            
            if (selectedMemberId.toLowerCase() !== 'all') {
                sessQuery = sessQuery.eq('user_id', selectedMemberId);
            }
            
            const { data: sessions } = await sessQuery;

            // Fetch samples — filter by session IDs to avoid fetching org-wide data
            // when a specific member is selected (and to stay within pagination limits)
            const filteredSessionIds = (sessions || []).map((s: any) => s.id);
            // Fetch samples
            const samples = await fetchAllActivitySamples(
                supabase,
                start.toISOString(),
                end.toISOString(),
                'session_id, recorded_at, idle, activity_percent',
                filteredSessionIds.length > 0 ? { sessionIds: filteredSessionIds } : undefined
            );

            if (members && sessions) {
                const memberMap: Record<string, {name: string, tz: string | null}> = {};
                members.forEach(m => {
                    memberMap[m.id] = { name: m.full_name, tz: m.timezone };
                });

                const sessionToUserId = new Map();
                (sessions || []).forEach(s => sessionToUserId.set(s.id, s.user_id));

                // Deduplicate: 1 unique sample per user per minute
                const seen = new Set<string>();
                const dedupedSamples: any[] = [];
                const sortedSamples = [...(samples || [])].sort((a, b) => (b.activity_percent ?? 0) - (a.activity_percent ?? 0));

                sortedSamples.forEach((s: any) => {
                    const uid = sessionToUserId.get(s.session_id);
                    if (!uid || !memberMap[uid]) return;
                    const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
                    const key = `${uid}_${minute}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    dedupedSamples.push(s);
                });

                // Group samples by user to apply threshold logic
                const userSamples = new Map<string, any[]>();
                dedupedSamples.forEach(s => {
                    const uid = sessionToUserId.get(s.session_id);
                    if (!uid) return;
                    if (!userSamples.has(uid)) userSamples.set(uid, []);
                    userSamples.get(uid)!.push(s);
                });

                const stats: Record<string, number[]> = {};

                userSamples.forEach((samples, uid) => {
                    // Use the locally fetched members data (not stale state) for idle_limit
                    const limit = members?.find(m => m.id === uid)?.idle_limit ?? 10;
                    const sorted = samples.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                    
                    let currentBlock: any[] = [];
                    const productiveMinutes = new Set<string>();

                    for (let i = 0; i < sorted.length; i++) {
                        const s = sorted[i];
                        const prev = i > 0 ? sorted[i-1] : null;
                        const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
                        const isContiguous = prev && gapMs <= 125000;

                        if (s.idle && isContiguous) {
                            currentBlock.push(s);
                        } else if (s.idle && !prev) {
                            currentBlock = [s];
                        } else if (s.idle && !isContiguous) {
                            if (currentBlock.length < limit) {
                                currentBlock.forEach(b => productiveMinutes.add(b.recorded_at.substring(0, 16)));
                            }
                            currentBlock = [s];
                        } else {
                            productiveMinutes.add(s.recorded_at.substring(0, 16));
                            if (currentBlock.length < limit) {
                                currentBlock.forEach(b => productiveMinutes.add(b.recorded_at.substring(0, 16)));
                            }
                            currentBlock = [];
                        }
                    }
                    if (currentBlock.length < limit) {
                        currentBlock.forEach(b => productiveMinutes.add(b.recorded_at.substring(0, 16)));
                    }

                    if (productiveMinutes.size > 0) {
                        productiveMinutes.forEach(minuteStr => {
                            const s = sorted.find(samp => samp.recorded_at.startsWith(minuteStr));
                            if (s) {
                                const dayIdxRaw = getDayIndexInTz(s.recorded_at, memberMap[uid].tz);
                                const dayIdx = (dayIdxRaw + 6) % 7; 
                                stats[uid][dayIdx] += (1 / 60);
                            }
                        });
                    } else {
                        // FALLBACK: Use session durations if no samples exist for this user
                        const userSess = sessions.filter((s: any) => s.user_id === uid);
                        userSess.forEach((s: any) => {
                            const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
                            const startMs = new Date(s.started_at).getTime();
                            const durationHrs = (endMs - startMs) / (1000 * 60 * 60);
                            
                            const dayIdxRaw = getDayIndexInTz(s.started_at, memberMap[uid].tz);
                            const dayIdx = (dayIdxRaw + 6) % 7; 
                            stats[uid][dayIdx] += durationHrs;
                        });
                    }
                });

                const result: DayTotal[] = Object.entries(stats).map(([uid, totals]) => ({
                    member: memberMap[uid].name,
                    totals: totals.map(t => Math.round(t * 10) / 10),
                    weeklyTotal: Math.round(totals.reduce((a, b) => a + b, 0) * 10) / 10
                })).sort((a, b) => b.weeklyTotal - a.weeklyTotal);

                setData(result);
            }
        } catch (err) {
            console.error("Error fetching daily totals:", err);
        } finally {
            setLoading(false);
        }
    }

    const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="space-y-10 max-w-full mx-auto animate-in fade-in duration-700">
            <PageHeader
                title="Daily Totals"
                description="Monitor team-wide daily hour distribution and weekly aggregate performance."
                actions={
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group/select">
                            <div className="flex items-center gap-3 bg-surface-solid border border-border rounded-xl px-4 py-2.5 shadow-shell-sm transition-all group-hover/select:border-primary/40 group-hover/select:shadow-md cursor-pointer">
                                <Users className="w-4 h-4 text-primary" strokeWidth={3} />
                                <span className="text-[10px] font-bold text-text-primary tracking-[0.2em] font-mono min-w-[120px] truncate">
                                    {allMembers.find(m => m.id === selectedMemberId)?.full_name || 'Organization'}
                                </span>
                                <ChevronLeft className="w-4 h-4 text-text-muted group-hover/select:text-primary transition-all -rotate-90" strokeWidth={3} />
                            </div>
                            <select
                                value={selectedMemberId}
                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            >
                                <option value="all">Organization</option>
                                {allMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center bg-surface-subtle border border-border rounded-xl p-1 shadow-inner">
                            <button
                                onClick={() => setWeekOffset(o => o - 1)}
                                className="p-2 hover:bg-surface-solid border border-transparent hover:border-border rounded-lg text-text-muted hover:text-primary transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <span className="px-5 text-[10px] font-bold text-text-primary min-w-[160px] text-center font-mono italic">
                                {fmtDate(weekDates[0])} — {fmtDate(weekDates[6])}
                            </span>
                            <button
                                onClick={() => setWeekOffset(o => o + 1)}
                                className="p-2 hover:bg-surface-solid border border-transparent hover:border-border rounded-lg text-text-muted hover:text-primary transition-all active:scale-95"
                            >
                                <ChevronRight className="w-4 h-4" strokeWidth={3} />
                            </button>
                        </div>

                        <Button variant="primary" className="shadow-lg shadow-primary/20 group">
                            <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            Export
                        </Button>
                    </div>
                }
            />

            <Card className="overflow-hidden p-0 border-border/60">
                <div className="p-6 border-b border-border bg-surface-subtle/30 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-text-muted font-mono">{data.length} Members</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="text-[10px] font-bold text-text-muted font-mono">
                                {data.reduce((a, b) => a + b.weeklyTotal, 0).toFixed(1)} Hours Total
                            </span>
                        </div>
                    </div>
                    <button className="text-[10px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-2 tracking-[0.2em] font-mono group">
                        <Filter className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                        Sort Performance
                    </button>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-subtle/20">
                                <th className="pl-10 pr-6 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em] font-mono border-b border-border min-w-[280px]">Team Member</th>
                                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                                    <th key={day} className="px-4 py-6 text-[10px] font-bold text-text-muted tracking-[0.2em] font-mono border-b border-border text-center">
                                        <span className="block mb-1 text-text-primary tracking-[0.3em] italic">{day}</span>
                                        <span className="text-[9px] opacity-40 font-bold">{fmtDate(weekDates[i])}</span>
                                    </th>
                                ))}
                                <th className="px-10 py-6 text-[11px] font-bold text-primary tracking-[0.3em] font-mono border-b border-border text-right min-w-[140px] italic">Weekly Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-32">
                                        <LoadingState message="Recalculating daily totals..." />
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-32">
                                        <EmptyState 
                                            icon={<Calendar className="w-10 h-10 text-text-muted/20" />}
                                            title="No activity recorded" 
                                            description="Try selecting a different week or organization view." 
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, i) => (
                                    <tr key={i} className="hover:bg-primary/[0.01] transition-all group">
                                        <td className="pl-10 pr-6 py-6 font-mono">
                                            <div className="flex items-center gap-5">
                                                <div className="w-11 h-11 rounded-xl bg-surface-subtle border border-border flex items-center justify-center font-bold text-text-primary text-sm shadow-shell-sm transition-all group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20">
                                                    {row.member.charAt(0)}
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-sm font-bold text-text-primary tracking-tight block group-hover:text-primary transition-colors">{row.member}</span>
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-3 h-3 text-text-muted/40" />
                                                        <span className="text-[9px] text-text-muted font-bold tracking-[0.15em] italic">Full Access</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {row.totals.map((t, idx) => (
                                            <td key={idx} className="px-4 py-6 text-center">
                                                <div className={clsx(
                                                    "inline-flex items-center justify-center px-4 py-2 rounded-xl text-[10px] font-bold transition-all font-mono border",
                                                    t > 8 ? "bg-amber-500/10 text-amber-700 border-amber-500/20 shadow-shell-sm animate-pulse" :
                                                    t > 0 ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" :
                                                    "text-text-muted/20 border-transparent opacity-30"
                                                )}>
                                                    {t > 0 ? `${t.toFixed(1)}H` : '—'}
                                                </div>
                                            </td>
                                        ))}
                                        <td className="px-10 py-6 text-right">
                                            <StatusBadge 
                                                variant={row.weeklyTotal > 40 ? "warning" : row.weeklyTotal > 0 ? "success" : "default"}
                                                className="scale-110 shadow-shell-sm"
                                            >
                                                {row.weeklyTotal.toFixed(1)} Hours
                                            </StatusBadge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 border-t border-border bg-surface-subtle/40 flex justify-center">
                    <div className="flex items-center gap-10 text-[9px] font-bold text-text-muted tracking-[0.3em] font-mono italic opacity-60">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" /> Tracked
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" /> Overtime (8h+)
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-border" /> No activity
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
