import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CircleDollarSign, Download, Filter, BadgeDollarSign, MoreHorizontal } from 'lucide-react';

interface OwedRow {
    member_id: string;
    full_name: string;
    pay_rate: number;
    totalHours: number;
    amountOwed: number;
    lastTracked: string;
}

export function AmountsOwed() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OwedRow[]>([]);
    const [range, setRange] = useState<'This Week' | 'This Month' | 'All Time'>('This Month');

    useEffect(() => {
        fetchAmountsOwed();
    }, [range]);

    async function fetchAmountsOwed() {
        setLoading(true);
        const now = new Date();
        let start: Date;
        if (range === 'This Week') {
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
        } else if (range === 'This Month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            start = new Date(0);
        }

        const [{ data: members }, { data: sessions }] = await Promise.all([
            supabase.from('members').select('id, full_name, pay_rate'),
            supabase.from('sessions')
                .select('user_id, started_at, ended_at')
                .gte('started_at', start.toISOString())
        ]);

        if (members && sessions) {
            const memberMap: Record<string, { name: string; pay_rate: number }> = {};
            members.forEach(m => {
                const key = m.id;
                memberMap[key] = { name: m.full_name, pay_rate: m.pay_rate ?? 0 };
            });

            const owedMap: Record<string, { mins: number; last: string }> = {};
            sessions.forEach((s: any) => {
                const uid = s.user_id;
                if (!uid || !memberMap[uid]) return;

                if (!owedMap[uid]) owedMap[uid] = { mins: 0, last: s.started_at };

                const startMs = new Date(s.started_at).getTime();
                const endMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                const durationMins = Math.max(0, (endMs - startMs) / 60000);

                owedMap[uid].mins += durationMins;
                if (new Date(s.started_at) > new Date(owedMap[uid].last)) {
                    owedMap[uid].last = s.started_at;
                }
            });

            const result: OwedRow[] = Object.entries(owedMap).map(([uid, stats]) => {
                const hours = stats.mins / 60;
                const payRate = memberMap[uid].pay_rate;
                return {
                    member_id: uid,
                    full_name: memberMap[uid].name,
                    pay_rate: payRate,
                    totalHours: Math.round(hours * 100) / 100,
                    amountOwed: Math.round(hours * payRate * 100) / 100,
                    lastTracked: new Date(stats.last).toLocaleDateString()
                };
            }).sort((a, b) => b.amountOwed - a.amountOwed);

            setData(result);
        }
        setLoading(false);
    }

    const totalOwed = data.reduce((acc, row) => acc + row.amountOwed, 0);

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="bg-emerald-600 p-2 rounded-2xl shadow-lg shadow-emerald-200">
                            <CircleDollarSign className="w-8 h-8 text-white" />
                        </div>
                        Amounts Owed
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Real-time calculations of pending member payouts.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {(['This Week', 'This Month', 'All Time'] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${range === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-500 hover:text-slate-800 transition-colors shadow-sm">
                        <Download className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Total Highlight */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-10 text-white mb-10 shadow-2xl shadow-emerald-200 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50" />
                <div className="relative z-10 text-center md:text-left">
                    <p className="text-emerald-100 font-black text-xs uppercase tracking-widest mb-2 opacity-80">Total Outstanding Payouts</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black tracking-tighter">${totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-xl font-bold text-emerald-200/60 uppercase">USD</span>
                    </div>
                </div>
                <div className="flex gap-4 relative z-10 w-full md:w-auto">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 rounded-3xl flex-1 text-center">
                        <p className="text-[10px] font-black text-emerald-100/60 uppercase tracking-widest mb-1">Members Owed</p>
                        <p className="text-2xl font-black">{data.length}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 rounded-3xl flex-1 text-center">
                        <p className="text-[10px] font-black text-emerald-100/60 uppercase tracking-widest mb-1">Avg. Payout</p>
                        <p className="text-2xl font-black">${(totalOwed / (data.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Detail Breakdown</h3>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select className="pl-9 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-black text-slate-500 uppercase tracking-widest outline-none shadow-sm cursor-pointer">
                                <option>Sort: Highest Amount</option>
                                <option>Sort: Member Name</option>
                                <option>Sort: Pending Hours</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="pl-10 pr-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Team Member</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Rate</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Hours Owed</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Last Tracker Activity</th>
                                <th className="pl-6 pr-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Total Owed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Simulating payouts...</td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <BadgeDollarSign className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No outstanding balances found</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.member_id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="pl-10 pr-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-white text-sm shadow-md">
                                                    {row.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 tracking-tighter">{row.full_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Active Member</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                ${row.pay_rate}<span className="text-[10px] text-slate-400 font-bold">/HR</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-black text-slate-700 text-sm tracking-tight">
                                            {row.totalHours} <span className="text-xs text-slate-400">HRS</span>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-slate-500 font-bold uppercase">
                                            {row.lastTracked}
                                        </td>
                                        <td className="pl-6 pr-10 py-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-lg font-black text-emerald-600 tracking-tighter cursor-pointer hover:scale-105 transition-transform">
                                                    ${row.amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <button className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 hover:text-indigo-700 mt-1">
                                                    Pay Now <MoreHorizontal className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-sm text-center md:text-left leading-relaxed">
                        Values are estimated based on tracked hours and member pay rates. Actual payments may vary by tax and deductions.
                    </p>
                    <button className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                        Process All Payments
                    </button>
                </div>
            </div>
        </div>
    );
}
