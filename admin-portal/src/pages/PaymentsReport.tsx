import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, ArrowUpRight, Search, Download, CheckCircle2, Clock, XCircle, MoreVertical, Calendar } from 'lucide-react';

interface Payment {
    id: string;
    member: string;
    amount: number;
    date: string;
    method: 'Bank Transfer' | 'PayPal' | 'Stripe' | 'Crypto';
    status: 'Completed' | 'Pending' | 'Failed';
    reference: string;
}

export function PaymentsReport() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Completed' | 'Pending' | 'Failed'>('All');

    useEffect(() => {
        fetchPayments();
    }, []);

    async function fetchPayments() {
        setLoading(true);
        const [{ data: payData }, { data: members }] = await Promise.all([
            supabase.from('payments').select('*').order('created_at', { ascending: false }),
            supabase.from('members').select('id, full_name')
        ]);

        if (payData && members) {
            const memberMap: Record<string, string> = {};
            members.forEach(m => {
                memberMap[m.id] = m.full_name;
            });

            const formatted: Payment[] = payData.map((p: any) => ({
                id: p.id,
                member: memberMap[p.member_id] || 'Unknown Member',
                amount: Number(p.amount),
                date: new Date(p.created_at).toLocaleDateString(),
                method: p.method as any,
                status: p.status as any,
                reference: p.reference || 'N/A'
            }));
            setPayments(formatted);
        }
        setLoading(false);
    }

    const filtered = payments.filter(p =>
        (filterStatus === 'All' || p.status === filterStatus) &&
        (p.member.toLowerCase().includes(searchTerm.toLowerCase()) || p.reference.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-200">
                            <CreditCard className="w-8 h-8 text-white" />
                        </div>
                        Payments History
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Tracking all payouts and transaction statuses.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {['All', 'Completed', 'Pending', 'Failed'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <PaymentStatCard label="Total Disbursed" value="$7,650.50" sub="Last 30 days" color="blue" />
                <PaymentStatCard label="Pending Payouts" value="$1,800.00" sub="Awaiting approval" color="amber" />
                <PaymentStatCard label="Success Rate" value="94.2%" sub="Across all methods" color="emerald" />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by member or reference..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                            <Calendar className="w-4 h-4" />
                            Date Range
                        </button>
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                            <Download className="w-4 h-4" />
                            Report
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="pl-10 pr-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method & Reference</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="pl-6 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/60">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">Loading payments...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">No payments found.</td>
                                </tr>
                            ) : (
                                filtered.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer">
                                        <td className="pl-10 pr-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm border border-slate-200 group-hover:bg-white group-hover:scale-110 transition-all">
                                                    {p.member.charAt(0)}
                                                </div>
                                                <span className="text-sm font-black text-slate-800 tracking-tighter">{p.member}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-600">{p.method}</span>
                                                <span className="text-[10px] text-slate-300 font-black tracking-widest uppercase">{p.reference}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-slate-500 font-bold uppercase">{p.date}</td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={p.status} />
                                        </td>
                                        <td className="pl-6 pr-10 py-5 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-sm font-black text-slate-800 tracking-tighter">
                                                    ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-lg transition-all">
                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PaymentStatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'blue' | 'amber' | 'emerald' }) {
    const bgMap = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600' };
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bgMap[color]}`}>
                <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
                <p className="text-[10px] font-bold text-slate-400/80">{sub}</p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: Payment['status'] }) {
    const styleMap = {
        Completed: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20 icon-emerald',
        Pending: 'bg-amber-50 text-amber-600 ring-amber-500/20 icon-amber',
        Failed: 'bg-rose-50 text-rose-600 ring-rose-500/20 icon-rose',
    };
    const IconMap = { Completed: CheckCircle2, Pending: Clock, Failed: XCircle };
    const Icon = IconMap[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ${styleMap[status]}`}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}
