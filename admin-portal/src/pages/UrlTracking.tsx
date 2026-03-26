import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Globe, TrendingUp, Clock, Search, BarChart2, Users } from 'lucide-react';
import clsx from 'clsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { PageLayout, Card, FilterSelect } from '../components/ui';

interface DomainEntry {
    domain: string;
    count: number;
    percent: number;
    category: string;
}

interface MemberInfo {
    id: string;
    full_name: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

const CATEGORIES: Record<string, string> = {
    'github.com': 'Development', 'stackoverflow.com': 'Development', 'localhost': 'Development',
    'google.com': 'Search', 'bing.com': 'Search',
    'youtube.com': 'Media', 'netflix.com': 'Media',
    'slack.com': 'Communication', 'teams.microsoft.com': 'Communication', 'discord.com': 'Communication',
    'notion.so': 'Productivity', 'figma.com': 'Productivity', 'linear.app': 'Productivity',
    'twitter.com': 'Social', 'x.com': 'Social', 'linkedin.com': 'Social', 'facebook.com': 'Social',
};
function categorize(domain: string): string {
    const match = Object.keys(CATEGORIES).find(k => domain.includes(k));
    return match ? CATEGORIES[match]! : 'Other';
}

const RANGES = ['Today', 'Last 7 Days', 'Last 30 Days'] as const;
type Range = typeof RANGES[number];

export function UrlTracking() {
    const [domains, setDomains] = useState<DomainEntry[]>([]);
    const [hourlyData, setHourlyData] = useState<{ hour: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<Range>('Last 7 Days');
    const [search, setSearch] = useState('');
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

    useEffect(() => {
        supabase.from('members').select('id, full_name').eq('status', 'Active').then(({ data }) => {
            if (data) setMembers(data);
        });
    }, []);

    useEffect(() => { fetchDomains(); }, [range, selectedMemberId]);

    function getDateRange() {
        const end = new Date().toISOString();
        let start: string;
        if (range === 'Today') start = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        else if (range === 'Last 7 Days') start = new Date(Date.now() - 7 * 86400000).toISOString();
        else start = new Date(Date.now() - 30 * 86400000).toISOString();
        return { start, end };
    }

    async function fetchDomains() {
        setLoading(true);
        const { start, end } = getDateRange();

        let sessionIds: string[] | null = null;
        if (selectedMemberId !== 'all') {
            const { data: userSessions } = await supabase
                .from('sessions')
                .select('id')
                .eq('user_id', selectedMemberId);

            if (!userSessions || userSessions.length === 0) {
                setDomains([]);
                setHourlyData(Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 })));
                setLoading(false);
                return;
            }
            sessionIds = userSessions.map(s => s.id);
        }

        let query = supabase
            .from('activity_samples')
            .select('domain, recorded_at')
            .gte('recorded_at', start)
            .lte('recorded_at', end)
            .not('domain', 'is', null)
            .neq('domain', '');

        if (sessionIds && sessionIds.length > 0) {
            query = query.in('session_id', sessionIds);
        }

        const { data } = await query;

        const domainMap: Record<string, number> = {};
        const hourMap: Record<number, number> = {};

        (data || []).forEach(row => {
            if (!row.domain) return;
            domainMap[row.domain] = (domainMap[row.domain] || 0) + 1;
            const h = new Date(row.recorded_at).getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
        });

        const total = Object.values(domainMap).reduce((a, b) => a + b, 0) || 1;
        const sorted: DomainEntry[] = Object.entries(domainMap)
            .sort((a, b) => b[1] - a[1])
            .map(([domain, count]) => ({
                domain,
                count,
                percent: Math.round((count / total) * 100),
                category: categorize(domain),
            }));

        setDomains(sorted);
        setHourlyData(Array.from({ length: 24 }, (_, h) => ({
            hour: `${h}:00`,
            count: hourMap[h] || 0,
        })));
        setLoading(false);
    }

    const filtered = domains.filter(d =>
        d.domain.toLowerCase().includes(search.toLowerCase())
    );

    // Category breakdown for pie
    const catMap: Record<string, number> = {};
    domains.forEach(d => { catMap[d.category] = (catMap[d.category] || 0) + d.count; });
    const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    const totalVisits = domains.reduce((a, b) => a + b.count, 0);
    const uniqueDomains = domains.length;
    const topCategory = pieData.sort((a, b) => b.value - a.value)[0]?.name || '—';

    return (
        <PageLayout
            title="URL Tracking" 
            description="Monitor web domains visited during active work sessions." 
            maxWidth="full"
            actions={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <FilterSelect 
                        icon={<Users className="w-5 h-5 text-primary" />}
                        value={selectedMemberId}
                        onChange={setSelectedMemberId}
                        options={[{ id: 'all', name: 'All Members' }, ...members.map(m => ({ id: m.id, name: m.full_name }))]}
                    />

                    <div className="flex bg-surface-subtle p-1 rounded-lg border border-border shrink-0">
                        {RANGES.map(r => (
                            <button 
                                key={r} 
                                onClick={() => setRange(r)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
                                    range === r ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            }
        >

            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in duration-500">
                <KpiCard icon={<Globe className="w-6 h-6" />} label="Total Visits" value={totalVisits.toLocaleString()} />
                <KpiCard icon={<TrendingUp className="w-6 h-6" />} label="Unique Domains" value={uniqueDomains.toString()} />
                <KpiCard icon={<Clock className="w-6 h-6" />} label="Top Category" value={topCategory} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Hourly activity */}
                <Card title="Traffic Over Time" className="lg:col-span-2 min-h-[300px] shadow-sm">
                    {loading ? <Skeleton /> : domains.length === 0 ? <EmptyChart /> : (
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData} barSize={12}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 'bold' }} interval={2} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        formatter={(v?: number) => [`${v ?? 0} visits`, 'Count']}
                                        contentStyle={{ backgroundColor: 'var(--color-surface-solid)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px -1px rgb(0 0 0 / 0.1)', textTransform: 'uppercase' }}
                                    />
                                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Category Pie */}
                <Card title="Categories" className="min-h-[300px] shadow-sm">
                    {loading ? <Skeleton /> : pieData.length === 0 ? <EmptyChart /> : (
                        <div className="h-[250px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v?: number) => [`${v ?? 0}`, 'Visits']} contentStyle={{ backgroundColor: 'var(--color-surface-solid)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px -1px rgb(0 0 0 / 0.1)', textTransform: 'uppercase' }} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-text-muted)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>
            </div>

            {/* Domain Table */}
            {/* Domain Table */}
            <Card noPadding title="Top Domains" className="shadow-sm overflow-hidden" 
                actions={
                    <div className="relative border border-border bg-surface-solid rounded-xl flex items-center">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input type="text" placeholder="Filter domains..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent pl-11 pr-4 py-2 text-[10px] font-bold uppercase tracking-wider text-text-primary outline-none focus:border-primary/50 w-64 h-full" />
                    </div>
                }
            >
                {loading ? (
                    <div className="px-8 py-10 text-center text-text-muted text-[10px] font-bold uppercase tracking-wider">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 flex flex-col items-center gap-4 text-text-muted">
                        <div className="w-12 h-12 bg-surface-subtle rounded-xl flex items-center justify-center border border-border">
                            <Globe className="w-6 h-6 text-text-muted opacity-50" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">No URL data found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-subtle/30 border-b border-border">
                                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Domain</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Category</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Visits</th>
                                    <th className="px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filtered.slice(0, 50).map((d) => (
                                    <tr key={d.domain} className="hover:bg-primary/[0.01] transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-surface-solid border border-border flex items-center justify-center shadow-sm shrink-0">
                                                    <img src={`https://www.google.com/s2/favicons?domain=${d.domain}&sz=16`}
                                                        alt="" className="w-4 h-4 rounded" onError={e => (e.currentTarget.style.display = 'none')} />
                                                </div>
                                                <span className="font-semibold text-text-primary text-sm tracking-tight group-hover:text-primary transition-colors">{d.domain}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border
                                                ${d.category === 'Development' ? 'bg-indigo-500/5 text-indigo-600 border-indigo-500/10' :
                                                    d.category === 'Search' ? 'bg-sky-500/5 text-sky-600 border-sky-500/10' :
                                                        d.category === 'Communication' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' :
                                                            d.category === 'Productivity' ? 'bg-amber-500/5 text-amber-600 border-amber-500/10' :
                                                                d.category === 'Social' ? 'bg-fuchsia-500/5 text-fuchsia-600 border-fuchsia-500/10' :
                                                                    d.category === 'Media' ? 'bg-rose-500/5 text-rose-600 border-rose-500/10' :
                                                                        'bg-surface-subtle text-text-muted border-border'}`}
                                            >
                                                {d.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-text-primary font-bold text-[12px]">{d.count.toLocaleString()}</td>
                                        <td className="px-8 py-4 w-44">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden border border-border p-[1px]">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${d.percent}%` }} />
                                                </div>
                                                <span className="text-[11px] font-bold text-text-primary w-10 text-right">{d.percent}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </PageLayout>
    );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-surface-solid border border-border rounded-2xl p-6 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex flex-col">
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function Skeleton() { 
    return <div className="h-64 flex items-center justify-center text-text-muted text-[10px] font-bold uppercase tracking-wider">Loading...</div>; 
}

function EmptyChart() {
    return (
        <div className="h-64 flex flex-col items-center justify-center text-text-muted gap-3">
            <div className="w-12 h-12 bg-surface-subtle border border-border rounded-xl flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-text-muted opacity-50" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">No data for this period</span>
        </div>
    );
}
