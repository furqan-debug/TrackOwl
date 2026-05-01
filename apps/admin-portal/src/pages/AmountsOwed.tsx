import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Download, Filter, 
    BadgeDollarSign, MoreHorizontal, TrendingUp,
    ChevronDown, Calendar, Shield
} from 'lucide-react';
import { 
    PageLayout, Card, Button, StatusBadge, 
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
            start.setHours(0, 0, 0, 0);
        } else if (range === 'This Month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            start = new Date(0);
        }

        const [{ data: members }, { data: sessions }] = await Promise.all([
            supabase.from('members').select('id, full_name, pay_rate'),
            supabase.from('sessions')
                .select('id, user_id, started_at')
                .gte('started_at', start.toISOString())
        ]);

        if (!members || !sessions) {
            setLoading(false);
            return;
        }

        // Build a map of session_id -> user_id for quick lookup
        const sessionToUser: Record<string, string> = {};
        const sessionIds: string[] = [];
        sessions.forEach((s: any) => {
            sessionToUser[s.id] = s.user_id;
            sessionIds.push(s.id);
        });

        // Fetch all activity samples for these sessions (paginated)
        let allSamples: any[] = [];
        if (sessionIds.length > 0) {
            const PAGE_SIZE = 1000;
            for (let page = 0; page < 100; page++) {
                const { data: samplesPage, error } = await supabase
                    .from('activity_samples')
                    .select('session_id, idle, recorded_at')
                    .in('session_id', sessionIds)
                    .gte('recorded_at', start.toISOString())
                    .order('recorded_at', { ascending: true })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

                if (error || !samplesPage || samplesPage.length === 0) break;
                allSamples.push(...samplesPage);
                if (samplesPage.length < PAGE_SIZE) break;
            }
        }

        // Deduplicate: 1 unique sample per user per minute
        const seen = new Set<string>();
        const dedupedSamples: any[] = [];
        allSamples.sort((a, b) => (a.recorded_at > b.recorded_at ? 1 : -1));
        allSamples.forEach(s => {
            const uid = sessionToUser[s.session_id];
            if (!uid) return;
            const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
            const key = `${uid}_${minute}`;
            if (seen.has(key)) return;
            seen.add(key);
            dedupedSamples.push({ ...s, user_id: uid });
        });

        // Calculate productive minutes per user: Total - Idle
        const userMins: Record<string, { productive: number; lastTracked: string }> = {};
        dedupedSamples.forEach(s => {
            const uid = s.user_id;
            if (!userMins[uid]) userMins[uid] = { productive: 0, lastTracked: s.recorded_at };
            // Only count as productive if not idle
            if (s.idle !== true) {
                userMins[uid].productive += 1;
            }
            if (s.recorded_at > userMins[uid].lastTracked) {
                userMins[uid].lastTracked = s.recorded_at;
            }
        });

        const memberMap: Record<string, { name: string; pay_rate: number }> = {};
        members.forEach(m => {
            memberMap[m.id] = { name: m.full_name, pay_rate: m.pay_rate ?? 0 };
        });

        const result: OwedRow[] = Object.entries(userMins)
            .filter(([uid]) => memberMap[uid])
            .map(([uid, stats]) => {
                const hours = stats.productive / 60;
                const payRate = memberMap[uid].pay_rate;
                return {
                    member_id: uid,
                    full_name: memberMap[uid].name,
                    pay_rate: payRate,
                    totalHours: Math.round(hours * 100) / 100,
                    amountOwed: Math.round(hours * payRate * 100) / 100,
                    lastTracked: new Date(stats.lastTracked).toLocaleDateString()
                };
            }).sort((a, b) => b.amountOwed - a.amountOwed);

        setData(result);
        setLoading(false);
    }

    const totalOwed = data.reduce((acc, row) => acc + row.amountOwed, 0);

    return (
        <PageLayout
            title="Payments Due"
            description="Review and manage outstanding payments for team members."
            actions={
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1 bg-surface-solid border border-border p-1 rounded-lg shadow-shell-sm">
                        {(['This Week', 'This Month', 'All Time'] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                    range === r ? "bg-primary text-white shadow-shell-sm" : "text-text-muted hover:text-text-primary"
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
        >

            {/* Total Highlight */}
            <div className="bg-surface-solid border border-border rounded-xl p-8 mb-10 shadow-shell-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <h3 className="text-xs font-semibold text-text-muted ">Total Payments Due</h3>
                        </div>
                        <div className="flex items-baseline gap-2 justify-center md:justify-start">
                            <span className="text-5xl font-bold text-text-primary">${totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="text-sm font-semibold text-text-muted/60 ">USD</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="bg-surface-subtle/50 border border-border px-6 py-4 rounded-lg flex-1 text-center">
                            <p className="text-[10px] font-semibold text-text-muted mb-1">Members</p>
                            <p className="text-2xl font-bold text-text-primary">{data.length}</p>
                        </div>
                        <div className="bg-surface-subtle/50 border border-border px-6 py-4 rounded-lg flex-1 text-center">
                            <p className="text-[10px] font-semibold text-text-muted mb-1">Avg. Payment</p>
                            <p className="text-2xl font-bold text-text-primary">${(totalOwed / (data.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden p-0 border-border/60 shadow-xl">
                <div className="p-6 border-b border-border bg-surface-subtle/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BadgeDollarSign className="w-5 h-5 text-text-muted" />
                        <h3 className="text-xs font-semibold text-text-primary ">Breakdown</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="flex items-center gap-2 bg-surface-solid border border-border rounded-lg px-3 py-1.5 shadow-shell-sm cursor-pointer">
                                <Filter className="w-3.5 h-3.5 text-text-muted" />
                                <span className="text-xs font-medium text-text-primary min-w-[120px] truncate pb-0.5">Sort: Highest Amount</span>
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
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
                                <th className="pl-6 pr-4 py-4 text-xs font-semibold text-text-muted border-b border-border min-w-[280px]">Member</th>
                                <th className="px-4 py-4 text-xs font-semibold text-text-muted border-b border-border">Rate</th>
                                <th className="px-4 py-4 text-xs font-semibold text-text-muted border-b border-border">Hours</th>
                                <th className="px-4 py-4 text-xs font-semibold text-text-muted border-b border-border">Last Tracked</th>
                                <th className="pl-4 pr-6 py-4 text-xs font-semibold text-text-muted border-b border-border text-right min-w-[160px]">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-text-muted">
                                        <LoadingState message="Calculating balances..." />
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20">
                                        <EmptyState 
                                            icon={<BadgeDollarSign className="w-12 h-12 text-text-muted/20" />}
                                            title="No payments due" 
                                            description="All member payouts are up to date." 
                                        />
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.member_id} className="hover:bg-surface-subtle transition-all group">
                                        <td className="pl-6 pr-4 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center font-bold text-text-primary text-sm shadow-shell-sm transition-all group-hover:bg-primary group-hover:text-white">
                                                    {row.full_name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-text-primary text-sm">{row.full_name}</span>
                                                    <span className="text-[10px] text-text-muted font-medium">Verified Member</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-subtle border border-border rounded-lg text-[10px] font-bold text-text-primary">
                                                ${row.pay_rate}
                                                <span className="text-text-muted font-medium">/hr</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-text-primary">{row.totalHours}</span>
                                                <span className="text-[10px] text-text-muted font-medium">Hours</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-text-muted">
                                                <Calendar className="w-3.5 h-3.5 opacity-60" />
                                                <span className="text-[11px] font-medium">{row.lastTracked}</span>
                                            </div>
                                        </td>
                                        <td className="pl-4 pr-6 py-4 text-right">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="font-bold text-emerald-500 text-lg">
                                                    ${row.amountOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge 
                                                        variant={row.totalHours > 40 ? "warning" : row.totalHours > 0 ? "success" : "default"}
                                                        className="px-2 py-0.5"
                                                    >
                                                        {row.totalHours}h
                                                    </StatusBadge>
                                                    <Button size="sm" variant="ghost" className="h-auto p-0 text-[10px] font-bold text-primary active:scale-95 group">
                                                        Pay <MoreHorizontal className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
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

                <div className="p-6 bg-surface-subtle/40 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-start gap-3 max-w-lg">
                        <Shield className="w-4 h-4 text-text-muted mt-0.5" />
                        <p className="text-[10px] font-medium text-text-muted leading-relaxed ">
                            Hours are calculated as <strong>Productive Time = Total Tracked − Idle Time</strong>. Idle minutes are excluded from pay calculations. Actual payouts may vary by tax obligations and approved deductions.
                        </p>
                    </div>
                    <Button variant="primary" className="w-full md:w-auto px-8 py-3 shadow-shell-sm hover:shadow-md">
                        Process Payments
                        <TrendingUp className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </Card>
        </PageLayout>
    );
}
