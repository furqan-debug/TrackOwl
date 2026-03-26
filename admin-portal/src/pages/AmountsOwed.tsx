import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Download, Filter, 
    BadgeDollarSign, MoreHorizontal, TrendingUp,
    ChevronDown, Calendar, Shield
} from 'lucide-react';
import { 
    PageHeader, Card, Button, StatusBadge, 
    LoadingState, EmptyState 
} from '../components/ui';
import clsx from 'clsx';

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
        <div className="space-y-10 max-w-full mx-auto animate-in fade-in duration-700">
            <PageHeader
                title="Amounts Owed"
                description="Monitor outstanding balances and pending member payouts with real-time calculations."
                actions={
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border p-1 rounded-xl shadow-inner">
                            {(['This Week', 'This Month', 'All Time'] as const).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRange(r)}
                                    className={clsx(
                                        "px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all font-mono",
                                        range === r ? "bg-surface-solid text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-primary"
                                    )}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                        <Button variant="secondary" className="p-3 rounded-xl group transition-all">
                            <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </Button>
                    </div>
                }
            />

            {/* Total Highlight */}
            <div className="bg-surface-solid border border-border rounded-[48px] p-12 text-text-primary mb-10 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.03] rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:bg-primary/[0.05] transition-colors duration-1000" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="text-center md:text-left space-y-4">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 shadow-sm">
                                <TrendingUp className="w-5 h-5 text-primary" strokeWidth={2.5} />
                            </div>
                            <p className="text-text-muted font-bold text-[10px] uppercase tracking-[0.4em] font-mono opacity-60">Total Outstanding Payouts</p>
                        </div>
                        <div className="flex items-baseline gap-4 justify-center md:justify-start">
                            <span className="text-8xl font-bold tracking-tighter text-text-primary leading-none italic">${totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="text-2xl font-bold text-text-muted/30 tracking-widest font-mono uppercase">USD</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-6 relative z-10 w-full md:w-auto">
                        <div className="bg-surface-subtle/50 border border-border px-8 py-6 rounded-[32px] flex-1 text-center group/card hover:bg-surface-subtle transition-all duration-300">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] mb-3 font-mono opacity-50">Members Owed</p>
                            <p className="text-4xl font-bold text-text-primary tracking-tighter font-mono italic group-hover:text-primary transition-colors">{data.length}</p>
                        </div>
                        <div className="bg-surface-subtle/50 border border-border px-8 py-6 rounded-[32px] flex-1 text-center group/card hover:bg-surface-subtle transition-all duration-300">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] mb-3 font-mono opacity-50">Avg. Payout</p>
                            <p className="text-4xl font-bold text-text-primary tracking-tighter font-mono italic group-hover:text-primary transition-colors">${(totalOwed / (data.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden p-0 border-border/60 shadow-xl">
                <div className="p-8 border-b border-border bg-surface-subtle/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                            <BadgeDollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.4em] font-mono opacity-80">Detail Breakdown</h3>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative group/select">
                            <div className="flex items-center gap-3 bg-surface-solid border border-border rounded-xl px-4 py-2.5 shadow-sm transition-all group-hover/select:border-primary/40 group-hover/select:shadow-md cursor-pointer">
                                <Filter className="w-4 h-4 text-primary" strokeWidth={3} />
                                <span className="text-[10px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono min-w-[140px] truncate text-center">Sort: Highest Amount</span>
                                <ChevronDown className="w-4 h-4 text-text-muted group-hover/select:text-primary transition-all" strokeWidth={3} />
                            </div>
                            <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                                <option>Highest Amount</option>
                                <option>Member Name</option>
                                <option>Pending Hours</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-subtle/20">
                                <th className="pl-12 pr-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border min-w-[320px]">Team Member</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border">Rate</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border">Hours Owed</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border">Last Activity</th>
                                <th className="pl-6 pr-12 py-8 text-[11px] font-bold text-primary uppercase tracking-[0.4em] font-mono border-b border-border text-right min-w-[180px] italic">Total Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-32">
                                        <LoadingState message="Recalculating payouts..." />
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32">
                                        <EmptyState 
                                            icon={<BadgeDollarSign className="w-12 h-12 text-text-muted/20" />}
                                            title="No outstanding balances" 
                                            description="All member payouts are currently up to date." 
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.member_id} className="hover:bg-primary/[0.01] transition-all group">
                                        <td className="pl-12 pr-6 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-surface-solid border border-border flex items-center justify-center font-bold text-text-primary text-sm shadow-sm transition-all group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary group-hover:text-white group-hover:border-primary/20">
                                                    {row.full_name.charAt(0)}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-base font-bold text-text-primary tracking-tighter group-hover:text-primary transition-colors italic">{row.full_name}</p>
                                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.15em] opacity-60 font-mono">Verified Active Member</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-subtle border border-border rounded-xl text-[10px] font-bold text-text-muted font-mono tracking-widest shadow-inner">
                                                <span className="text-text-primary font-bold">${row.pay_rate}</span>
                                                <span className="opacity-40">/HR</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-lg font-bold text-text-primary tracking-tighter font-mono italic">{row.totalHours}</span>
                                                <span className="text-[9px] text-text-muted font-bold uppercase tracking-[0.2em] font-mono opacity-50">Pending Hours</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono">
                                                <Calendar className="w-3 h-3 opacity-40" />
                                                {row.lastTracked}
                                            </div>
                                        </td>
                                        <td className="pl-6 pr-12 py-8 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-2xl font-bold text-emerald-600 tracking-tighter font-mono italic group-hover:scale-110 transition-transform origin-right">
                                                    ${row.amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <StatusBadge 
                                                        variant={row.totalHours > 40 ? "warning" : row.totalHours > 0 ? "success" : "default"}
                                                        className="scale-90 shadow-sm"
                                                    >
                                                        {row.totalHours}h
                                                    </StatusBadge>
                                                    <Button size="sm" variant="ghost" className="text-[9px] p-0 h-auto font-bold text-primary active:scale-95 group/pay">
                                                        Pay <MoreHorizontal className="w-3.5 h-3.5 ml-1.5 group-hover/pay:translate-x-1 transition-transform" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-10 bg-surface-subtle/40 border-t border-border flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-start gap-4 max-w-lg">
                        <div className="p-2 bg-primary/5 rounded-lg border border-primary/10 mt-1">
                            <Shield className="w-4 h-4 text-primary" strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] leading-relaxed font-mono opacity-60">
                            Values are derived from cumulative verified session durations and contractual pay rates. Actual disbursements may vary by local tax obligations and approved deductions.
                        </p>
                    </div>
                    <Button variant="primary" className="w-full md:w-auto px-10 py-4 scale-110 shadow-2xl shadow-primary/30 group">
                        Process Systematic Payouts
                        <TrendingUp className="w-4 h-4 ml-3 group-hover:translate-y-[-2px] transition-transform" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}
