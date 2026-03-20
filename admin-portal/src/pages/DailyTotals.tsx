import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Download, Filter } from 'lucide-react';

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
    const [allMembers, setAllMembers] = useState<{ id: string; full_name: string }[]>([]);

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
        const start = new Date(weekDates[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(weekDates[6]);
        end.setHours(23, 59, 59, 999);

        let query = supabase.from('activity_samples')
            .select('recorded_at, sessions(user_id)')
            .gte('recorded_at', start.toISOString())
            .lte('recorded_at', end.toISOString());

        // If a single member is selected, we need to find their sessions first, 
        // because we can't easily filter by nested foreign key sessions.user_id in a single supabase query without an inner join.
        let sessionIdsFilter: string[] | null = null;
        if (selectedMemberId !== 'all') {
            const { data: userSessions } = await supabase.from('sessions').select('id').eq('user_id', selectedMemberId);
            if (!userSessions || userSessions.length === 0) {
                setData([]);
                setLoading(false);
                return;
            }
            sessionIdsFilter = userSessions.map(s => s.id);
            query = query.in('session_id', sessionIdsFilter);
        }

        const [{ data: members }, { data: samples }] = await Promise.all([
            supabase.from('members').select('id, full_name'),
            query
        ]);

        if (members && allMembers.length === 0) {
            setAllMembers(members);
        }

        if (members && samples) {
            const memberMap: Record<string, string> = {};
            members.forEach(m => {
                const key = m.id;
                memberMap[key] = m.full_name;
            });

            const stats: Record<string, number[]> = {};
            samples.forEach((s: any) => {
                const uid = s.sessions?.user_id;
                if (!uid || !memberMap[uid]) return;
                if (!stats[uid]) stats[uid] = Array(7).fill(0);

                const date = new Date(s.recorded_at);
                const dayIdx = (date.getDay() + 6) % 7; // Mon=0, Tue=1 ... Sun=6
                stats[uid][dayIdx]++;
            });

            const result: DayTotal[] = Object.entries(stats).map(([uid, totals]) => ({
                member: memberMap[uid],
                totals: totals.map(t => Math.round((t / 60) * 10) / 10), // convert samples to hours
                weeklyTotal: Math.round((totals.reduce((a, b) => a + b, 0) / 60) * 10) / 10
            })).sort((a, b) => b.weeklyTotal - a.weeklyTotal);

            setData(result);
        }
        setLoading(false);
    }

    const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-8 relative z-20">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2 flex items-center gap-3">
                        <Calendar className="w-7 h-7 text-blue-600" />
                        Daily Totals (Weekly)
                    </h1>
                    <p className="text-slate-500">View team-wide hours broken down by day.</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Member Filter */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer w-48 truncate"
                        >
                            <option value="all">Entire Organization</option>
                            <option disabled>──────────</option>
                            {allMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm items-center">
                        <button
                            onClick={() => setWeekOffset(o => o - 1)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 text-sm font-bold text-slate-700 min-w-[200px] text-center">
                            {fmtDate(weekDates[0])} — {fmtDate(weekDates[6])}
                        </span>
                        <button
                            onClick={() => setWeekOffset(o => o + 1)}
                            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-100">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500">
                            <Users className="w-3.5 h-3.5" />
                            {data.length} MEMBERS
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {data.reduce((a, b) => a + b.weeklyTotal, 0).toFixed(1)} HRS TOTAL
                        </div>
                    </div>
                    <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 uppercase tracking-widest">
                        <Filter className="w-3.5 h-3.5" />
                        Sort by Hours
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white sticky top-0 z-10">
                                <th className="pl-8 pr-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest min-w-[220px]">Team Member</th>
                                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                                    <th key={day} className="px-4 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                        <span className="block mb-1">{day}</span>
                                        <span className="text-[10px] text-slate-300 font-bold">{fmtDate(weekDates[i])}</span>
                                    </th>
                                ))}
                                <th className="px-8 py-5 text-[11px] font-bold text-indigo-600 uppercase tracking-widest text-right min-w-[120px]">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="w-8 h-8 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Recalculating totals...</span>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Calendar className="w-6 h-6 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No hours recorded for this week</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="pl-8 pr-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm">
                                                    {row.member.charAt(0)}
                                                </div>
                                                <span className="text-sm font-bold text-slate-800 tracking-tight">{row.member}</span>
                                            </div>
                                        </td>
                                        {row.totals.map((t, idx) => (
                                            <td key={idx} className="px-4 py-4 text-center">
                                                <div className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-bold transition-all ${t > 8 ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-500/20' :
                                                    t > 0 ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20' :
                                                        'text-slate-200 font-normal'
                                                    }`}>
                                                    {t > 0 ? `${t}h` : '—'}
                                                </div>
                                            </td>
                                        ))}
                                        <td className="px-8 py-4 text-right">
                                            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/50">
                                                {row.weeklyTotal.toFixed(1)}h
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-center">
                    <div className="flex items-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-600" /> Tracked
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" /> Overtime (8h+)
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-200" /> No activity
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
