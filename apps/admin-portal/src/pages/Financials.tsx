import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CircleDollarSign, TrendingUp, Clock, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import clsx from 'clsx';
import { PageLayout, Card, KpiCard, EmptyState, LoadingState } from '../components/ui';

interface MemberFinancial {
    member_id: string;
    full_name: string;
    pay_rate: number;
    bill_rate: number;
    totalMinutes: number;
    totalCost: number;
    sessions: number;
}



export function Financials() {
    const [members, setMembers] = useState<MemberFinancial[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<'This Week' | 'This Month' | 'All Time'>('This Month');

    useEffect(() => { fetchFinancials(); }, [range]);

    function getDateRange() {
        const now = new Date();
        if (range === 'This Week') {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            return { start: start.toISOString(), end: now.toISOString() };
        }
        if (range === 'This Month') {
            return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: now.toISOString() };
        }
        return { start: new Date(0).toISOString(), end: now.toISOString() };
    }

    async function fetchFinancials() {
        setLoading(true);
        const { start, end } = getDateRange();

        try {
            // Fetch members with real pay/bill rates from the members table (include auth_user_id for legacy session fallback)
            const [{ data: membersData, error: memberErr }, { data: sessions, error: sessionErr }] = await Promise.all([
                supabase.from('members').select('id, full_name, pay_rate, bill_rate, auth_user_id'),
                supabase.from('sessions')
                    .select('id, user_id, started_at, ended_at')
                    .gte('started_at', start)
                    .lte('started_at', end),
            ]);

            if (memberErr) throw memberErr;
            if (sessionErr) throw sessionErr;

            // Map sessions.user_id → member info (supporting both member.id and legacy member.auth_user_id)
            const memberMap: Record<string, { name: string; pay_rate: number; bill_rate: number }> = {};
            (membersData || []).forEach(m => {
                const info = { name: m.full_name, pay_rate: m.pay_rate ?? 0, bill_rate: m.bill_rate ?? 0 };
                memberMap[m.id] = info;
                if (m.auth_user_id) {
                    memberMap[m.auth_user_id] = info;
                }
            });

            const statsMap: Record<string, { minutes: number; sessions: number }> = {};
            (sessions || []).forEach(s => {
                const mid = s.user_id;
                if (!mid) return;
                if (!statsMap[mid]) statsMap[mid] = { minutes: 0, sessions: 0 };
                statsMap[mid].sessions++;
                const startMs = new Date(s.started_at).getTime();
                const endMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
                statsMap[mid].minutes += Math.max(0, Math.round((endMs - startMs) / 60000));
            });

            const result: MemberFinancial[] = Object.entries(statsMap).map(([uid, data]) => {
                // Find member data using the user_id from sessions
                const info = memberMap[uid];
                return {
                    member_id: uid,
                    full_name: info ? info.name : (uid.slice(0, 8) + '…'),
                    pay_rate: info ? info.pay_rate : 0,
                    bill_rate: info ? info.bill_rate : 0,
                    totalMinutes: data.minutes,
                    // calculate cost only if rate exists
                    totalCost: info ? Math.round((data.minutes / 60) * info.pay_rate * 100) / 100 : 0,
                    sessions: data.sessions,
                };
            }).sort((a, b) => b.totalCost - a.totalCost);

            setMembers(result);
        } catch (error) {
            console.error('Error fetching financials:', error);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    }

    const totals = members.reduce((acc, m) => ({
        cost: acc.cost + m.totalCost,
        minutes: acc.minutes + m.totalMinutes,
        sessions: acc.sessions + m.sessions,
    }), { cost: 0, minutes: 0, sessions: 0 });

    const fmtTime = (min: number) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    function exportCsv() {
        const rows = [
            ['Member', 'Pay Rate', 'Total Hours', 'Total Cost', 'Sessions'],
            ...members.map(m => [
                m.full_name,
                `$${m.pay_rate}/hr`,
                (m.totalMinutes / 60).toFixed(2),
                `$${m.totalCost}`,
                m.sessions,
            ]),
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `financials-${range.toLowerCase().replace(' ', '-')}.csv`;
        a.click();
    }

    return (
        <PageLayout
            title="Financials"
            description="Operational costs based on tracked hours and member rates."
            maxWidth="full"
            actions={
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 h-10 shrink-0">
                        {(['This Week', 'This Month', 'All Time'] as const).map(r => (
                            <button 
                                key={r} 
                                onClick={() => setRange(r)}
                                className={clsx(
                                    "px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all h-full",
                                    range === r ? "bg-white text-primary shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button onClick={exportCsv} className="flex items-center gap-2 px-5 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <KpiCard 
                    icon={<CircleDollarSign className="w-4 h-4 text-primary" />}
                    label="Total Pay Cost" 
                    value={`$${totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    sub={range} 
                    className="rounded-[24px] border-slate-200"
                />
                <KpiCard 
                    icon={<Clock className="w-4 h-4 text-primary" />}
                    label="Total Tracked" 
                    value={fmtTime(totals.minutes)} 
                    sub="Cumulative duration" 
                    className="rounded-[24px] border-slate-200"
                />
                <KpiCard 
                    icon={<TrendingUp className="w-4 h-4 text-primary" />}
                    label="Active Sessions" 
                    value={totals.sessions.toString()} 
                    sub="Recorded events" 
                    className="rounded-[24px] border-slate-200"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-20">
                <Card className="rounded-[24px] border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost allocation</h2>
                    </div>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[240px]"><LoadingState /></div>
                    ) : members.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center min-h-[240px]"><EmptyState title="No metrics" /></div>
                    ) : (
                        <div className="flex-1 min-h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={members.slice(0, 6)} layout="vertical" barSize={12} margin={{ left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="full_name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} width={80} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        formatter={(v?: number) => [`$${v ?? 0}`, 'Cost']}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                                        {members.slice(0, 6).map((_, i) => <Cell key={i} fill={i === 0 ? '#4066D3' : '#94a3b8'} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                <Card noPadding className="lg:col-span-4 rounded-[24px] border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/30">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial breakdown by member</h2>
                    </div>
                    {loading ? (
                        <div className="py-24"><LoadingState /></div>
                    ) : members.length === 0 ? (
                        <div className="py-24 text-center">
                            <EmptyState
                                icon={<CircleDollarSign className="w-8 h-8 text-slate-200" />}
                                title="No data recorded"
                                description="Member financial statistics will populate once sessions are logged."
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Team Member</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Pay Rate</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Duration</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Events</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((m, i) => (
                                        <tr key={m.member_id} className="hover:bg-slate-50/50 transition-colors group/row">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm transition-transform group-hover/row:scale-105"
                                                        style={{ backgroundColor: i === 0 ? '#4066D3' : '#94a3b8' }}>
                                                        {m.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-[13px] font-bold text-slate-900 tracking-tight">{m.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right text-[12px] font-bold text-slate-400 tabular-nums">
                                                {m.pay_rate > 0 ? `$${m.pay_rate.toFixed(2)}/h` : <span className="opacity-40">—</span>}
                                            </td>
                                            <td className="px-8 py-5 text-right text-[13px] font-bold text-slate-700 tabular-nums">{fmtTime(m.totalMinutes)}</td>
                                            <td className="px-8 py-5 text-right text-[12px] font-bold text-slate-400 tabular-nums">{m.sessions}</td>
                                            <td className="px-8 py-5 text-right">
                                                <span className="text-[14px] font-bold text-primary tabular-nums">${m.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </PageLayout>
    );
}
