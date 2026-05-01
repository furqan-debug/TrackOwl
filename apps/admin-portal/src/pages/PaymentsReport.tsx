import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, ArrowUpRight, Search, Download, MoreVertical, Calendar } from 'lucide-react';
import { PageHeader, Card, Button, StatusBadge } from '../components/ui';

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

    const totals = payments.reduce((acc, p) => {
        if (p.status === 'Completed') acc.disbursed += p.amount;
        if (p.status === 'Pending') acc.pending += p.amount;
        if (p.status === 'Failed') acc.failedCount++;
        if (p.status === 'Completed') acc.totalSuccess++;
        return acc;
    }, { disbursed: 0, pending: 0, failedCount: 0, totalSuccess: 0 });

    const totalAttempts = totals.totalSuccess + totals.failedCount;
    const successRate = totalAttempts > 0 ? (totals.totalSuccess / totalAttempts) * 100 : 100;

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader
                title="Payments History"
                description="Tracking all payouts and transaction statuses."
                icon={<CreditCard className="w-8 h-8 text-primary" />}
                actions={
                    <div className="flex items-center gap-4">
                        <div className="flex bg-surface-subtle border border-border rounded-xl p-1 shadow-inner">
                            {['All', 'Completed', 'Pending', 'Failed'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s as any)}
                                    className={`px-5 py-2 rounded-lg text-[10px] font-bold transition-all font-mono ${filterStatus === s ? 'bg-surface-solid text-primary shadow-shell-sm border border-border' : 'text-text-muted hover:text-text-primary'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                }
            />

            <div className="px-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <PaymentStatCard label="Total Disbursed" value={`$${totals.disbursed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} sub="Completed Payouts" color="primary" />
                    <PaymentStatCard label="Pending Payouts" value={`$${totals.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} sub="Awaiting Approval" color="amber" />
                    <PaymentStatCard label="Success Rate" value={`${successRate.toFixed(1)}%`} sub="Transaction Health" color="emerald" />
                </div>

                <Card noPadding title="Transaction Log" className="shadow-2xl overflow-hidden"
                    actions={
                        <div className="flex items-center gap-4">
                            <div className="relative border border-border bg-surface-solid rounded-xl flex items-center shadow-shell-sm w-full sm:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search by member or reference..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-transparent pl-11 pr-4 py-2.5 text-[10px] font-bold font-mono text-text-primary outline-none focus:border-primary/50 w-full"
                                />
                            </div>
                            <Button variant="secondary" leftIcon={<Calendar className="w-4 h-4" />} className="px-6 py-2.5 text-[10px] ">
                                Date Range
                            </Button>
                            <Button variant="primary" leftIcon={<Download className="w-4 h-4" />} className="px-6 py-2.5 text-[10px] ">
                                Report
                            </Button>
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-subtle/30 border-b border-border">
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono border-r border-border/10">Recipient</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono">Method & Reference</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono">Date</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono">Status</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-text-muted font-mono text-[11px] ">Loading payments...</td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-text-muted font-mono text-[11px] ">No payments found.</td>
                                    </tr>
                                ) : (
                                    filtered.map((p) => (
                                        <tr key={p.id} className="hover:bg-primary/[0.01] transition-all group cursor-pointer duration-500">
                                            <td className="px-10 py-6 border-r border-border/10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-surface-solid flex items-center justify-center font-bold text-text-primary text-sm border border-border group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all shadow-shell-sm">
                                                        {p.member.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-text-primary tracking-tighter italic">{p.member}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[12px] font-bold text-text-primary font-mono">{p.method}</span>
                                                    <span className="text-[10px] text-text-muted font-bold tracking-[0.2em] font-mono bg-surface-subtle border border-border px-2 py-0.5 rounded-md mt-1 w-fit">{p.reference}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6 text-[11px] text-text-muted font-bold font-mono">{p.date}</td>
                                            <td className="px-10 py-6">
                                                <PaymentStatusBadge status={p.status} />
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-5">
                                                    <span className="text-lg font-bold text-emerald-500 tracking-tighter italic font-mono">
                                                        ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                    <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-surface-subtle border border-transparent hover:border-border rounded-xl transition-all">
                                                        <MoreVertical className="w-4 h-4 text-text-muted" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

function PaymentStatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: 'primary' | 'amber' | 'emerald' }) {
    const bgMap = { primary: 'bg-primary/10 text-primary border-primary/20', amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20', emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
    return (
        <div className="bg-surface-solid p-6 rounded-[2rem] border border-border shadow-shell-sm flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${bgMap[color]}`}>
                <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-text-muted mb-1 font-mono">{label}</p>
                <p className="text-3xl font-bold text-text-primary tracking-tighter italic">{value}</p>
                <p className="text-[10px] font-bold text-text-muted/60 font-mono mt-1">{sub}</p>
            </div>
        </div>
    );
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
    const variantMap: Record<Payment['status'], any> = {
        Completed: 'success',
        Pending: 'warning',
        Failed: 'danger'
    };
    return <StatusBadge variant={variantMap[status]}>{status}</StatusBadge>;
}
