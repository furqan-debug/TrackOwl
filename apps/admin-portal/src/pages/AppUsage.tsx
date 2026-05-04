import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllActivitySamples } from '../lib/dataUtils';
import { useAuth } from '../context/AuthContext';
import { 
    AppWindow, Monitor, Users, Search, 
    Clock, Calendar, ChevronLeft, 
    ChevronRight, RefreshCw, Filter,
    PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { PageLayout, StatMetric, LoadingState, EmptyState, FilterSelect } from '../components/ui';
import clsx from 'clsx';

interface AppEntry {
    app: string;
    count: number;
    percent: number;
    category: string;
}

interface MemberInfo {
    id: string;
    auth_user_id?: string | null;
    full_name: string;
    email?: string;
    idle_limit?: number | null;
}

const COLORS = ['var(--color-chart-main)', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'];

function categorizeApp(appName: string) {
    const l = appName.toLowerCase();
    if (l.includes('code') || l.includes('studio') || l.includes('intellij')) return 'Dev';
    if (l.includes('chrome') || l.includes('edge') || l.includes('firefox') || l.includes('safari')) return 'Web';
    if (l.includes('slack') || l.includes('teams') || l.includes('discord') || l.includes('zoom')) return 'Chat';
    if (l.includes('word') || l.includes('excel') || l.includes('powerpoint') || l.includes('office')) return 'Ops';
    if (l.includes('figma') || l.includes('photoshop') || l.includes('illustrator')) return 'Art';
    return 'Misc';
}

function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Module-level cache
let appUsageCache: any = null;
let appUsageCacheKey: string | null = null;

export function AppUsage() {
    const { profile } = useAuth();
    const organizationId = profile?.organization_id;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [apps, setApps] = useState<AppEntry[]>([]);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));

    useEffect(() => {
        if (!organizationId) return;
        supabase.from('members')
            .select('id, auth_user_id, full_name, email, idle_limit')
            .eq('organization_id', organizationId)
            .eq('status', 'Active')
            .order('full_name', { ascending: true })
            .then(({ data }) => {
                if (data) setMembers(data);
            });
    }, [organizationId]);

    const fetchData = useCallback(async (isSilent = false, forceRefresh = false) => {
        const cacheKey = `${selectedDate}_${selectedMemberId}`;
        if (!forceRefresh && appUsageCache && appUsageCacheKey === cacheKey) {
            setApps(appUsageCache.apps);
            setLoading(false);
            return;
        }

        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        const start = new Date(`${selectedDate}T00:00:00`).toISOString();
        const end = new Date(`${selectedDate}T23:59:59.999`).toISOString();

        try {
            const selectedMember = members.find(m => m.id === selectedMemberId);
            const scopedUserIds = selectedMemberId.toLowerCase() !== 'all'
                ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean) as string[]))
                : [];

            let sessionsQuery = supabase.from('sessions').select('id, user_id').eq('organization_id', organizationId).lt('started_at', end).or(`ended_at.is.null,ended_at.gt.${start}`);
            if (scopedUserIds.length > 0) sessionsQuery = sessionsQuery.in('user_id', scopedUserIds);

            const { data: userSessions } = await sessionsQuery;
            const sessionIds = userSessions?.map(s => s.id) || [];

            if (sessionIds.length === 0) {
                setApps([]);
                return;
            }

            const samples = await fetchAllActivitySamples(supabase, start, end, 'session_id, app_name, recorded_at, idle', {
                organizationId: organizationId ?? undefined,
                sessionIds: sessionIds.length > 0 ? sessionIds : undefined
            });

            if (!samples) return;

            const membersMap = new Map(members.map(m => [m.id, m]));
            const samplesByUser = new Map<string, any[]>();
            samples.forEach(s => {
                const uid = userSessions?.find(sess => sess.id === s.session_id)?.user_id;
                if (!uid) return;
                if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
                samplesByUser.get(uid)!.push(s);
            });

            const appCounts: Record<string, number> = {};
            let total = 0;

            const productiveSamples: any[] = [];
            samplesByUser.forEach((userSamps, uid) => {
                const limit = membersMap.get(uid)?.idle_limit ?? 0;
                if (limit <= 1) {
                    productiveSamples.push(...userSamps);
                } else {
                    const sorted = userSamps.sort((a,b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                    let currentBlock: any[] = [];
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
            });

            productiveSamples.forEach(s => {
                const name = s.app_name?.trim();
                if (!name || name.toLowerCase() === 'program manager') return;
                appCounts[name] = (appCounts[name] || 0) + 1;
                total++;
            });

            const appArray = Object.entries(appCounts).map(([app, count]) => ({
                app,
                count,
                percent: total > 0 ? (count / total) * 100 : 0,
                category: categorizeApp(app)
            })).sort((a, b) => b.count - a.count);

            setApps(appArray);

            // Update cache
            appUsageCache = { apps: appArray };
            appUsageCacheKey = cacheKey;
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedDate, selectedMemberId, members]);

    useEffect(() => {
        if (selectedMemberId !== 'all' && members.length === 0) return;
        fetchData();
    }, [fetchData, members, selectedMemberId]);

    const formatTime = (sampleCount: number) => {
        // App estimation based on 10s check (approx 6 samples per min)
        // Adjusting for project's recording frequency (~1 sample per min in samples)
        const minutes = sampleCount;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const navigateDate = (dir: 'prev' | 'next') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (dir === 'prev' ? -1 : 1));
        setSelectedDate(formatLocalDate(d));
    };

    const chartData = useMemo(() => {
        const top = apps.slice(0, 5).map(d => ({ name: d.app, value: d.count }));
        if (apps.length > 5) {
            const other = apps.slice(5).reduce((a, b) => a + b.count, 0);
            top.push({ name: 'Other Content', value: other });
        }
        return top;
    }, [apps]);

    const filteredApps = apps.filter(a => a.app.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="h-screen flex items-center justify-center bg-surface"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="App Usage"
            description="See which apps and websites your team is using while tracking time."
            actions={
                <div className="flex items-center gap-4">
                    <div className="h-10 min-w-[200px]">
                        <FilterSelect
                            icon={<Users className="w-3.5 h-3.5" />}
                            value={selectedMemberId}
                            onChange={setSelectedMemberId}
                            options={[
                                { id: 'all', name: 'Every Member' },
                                ...members.map(m => ({ id: m.id, name: m.full_name }))
                            ]}
                        />
                    </div>

                    <div className="flex items-center bg-surface border border-border rounded-lg shadow-shell-sm overflow-hidden">
                        <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-surface-hover border-r border-border transition-colors">
                            <ChevronLeft className="w-4 h-4 text-text-muted" />
                        </button>
                        <div 
                            className="relative px-6 py-1.5 min-w-[160px] text-center cursor-pointer hover:bg-surface-hover transition-colors group/date flex items-center justify-center gap-2"
                            onClick={() => dateInputRef.current?.showPicker()}
                        >
                            <Calendar className="w-3 h-3 text-text-muted group-hover/date:text-primary transition-colors" />
                            <span className="text-xs font-black text-text-main leading-none">
                                {selectedDate === formatLocalDate(new Date()) ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <input 
                                ref={dateInputRef}
                                type="date" 
                                value={selectedDate}
                                className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <button onClick={() => navigateDate('next')} className="p-2 hover:bg-surface-hover border-l border-border transition-colors" disabled={selectedDate >= formatLocalDate(new Date())}>
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                        </button>
                    </div>

                    <button
                        onClick={() => fetchData(false, true)}
                        className={clsx(
                            "p-2.5 bg-surface border border-border rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-all shadow-shell-sm h-10",
                            loading && "animate-spin text-primary"
                        )}
                        title="Refresh Data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-6 pb-20">
                
                {/* 📊 KPI & Pulse */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    
                    <div className="xl:col-span-4 grid grid-cols-1 gap-6">
                        <StatMetric icon={<Monitor className="w-5 h-5" />} label="Total Apps" value={apps.length} sub="Unique tools used today" />
                        <StatMetric icon={<Clock className="w-5 h-5" />} label="Usage Time" value={formatTime(apps.reduce((a,b) => a+b.count, 0))} sub="Total tracked software time" />
                    </div>

                    <div className="xl:col-span-8 bg-surface border border-border rounded-xl shadow-shell-sm p-8 relative overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                    <PieChartIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-text-main tracking-tight">App Distribution</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="text-[10px] font-bold text-text-muted ">Weighted by Time</span>
                            </div>
                        </div>

                        <div className="flex-1 min-h-[220px]">
                            {apps.length === 0 ? <EmptyState icon={<AppWindow />} title="No data" /> : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                                            {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '800' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-50 shrink-0">
                            {chartData.slice(0, 3).map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-text-main tracking-tight truncate">{d.name}</span>
                                        <span className="text-[9px] font-bold text-text-muted ">{formatTime(d.value)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 📋 Application Ledger */}
                <div className="bg-surface border border-border rounded-xl shadow-shell-sm overflow-hidden flex flex-col min-h-[600px]">
                    <div className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-hover/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary shadow-shell-sm">
                                <Filter className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-text-main tracking-tight">App List</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input 
                                    type="text" 
                                    placeholder="Filter apps..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-surface border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64"
                                />
                            </div>
                            <button onClick={() => fetchData(true)} className={clsx("p-2 bg-surface border border-border rounded-lg hover:bg-surface-hover transition-all text-text-muted shadow-shell-sm", refreshing && "animate-spin text-primary")}>
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left order-collapse">
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted w-1/3">App / Website</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted hidden sm:table-cell">Category</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted text-right">Time Used</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted text-right">Usage %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredApps.map((app, i) => (
                                    <tr key={i} className="hover:bg-surface-hover transition-colors group">
                                        <td className="px-10 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center shadow-shell-sm group-hover:bg-primary group-hover:text-white transition-all text-text-muted overflow-hidden">
                                                    <AppWindow className="w-5 h-5 shrink-0" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-black text-text-main leading-none truncate max-w-[240px] tracking-tight group-hover:text-primary transition-colors">
                                                        {app.app}
                                                    </span>
                                                    <span className="text-[10px] text-text-muted font-bold mt-1.5">Application</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-5 hidden sm:table-cell">
                                            <span className="px-2 py-1 bg-surface-hover border border-border rounded text-[9px] font-black text-text-muted group-hover:border-primary/20 group-hover:text-primary transition-colors">
                                                {app.category}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5 text-right font-black text-text-main text-sm">{formatTime(app.count)}</td>
                                        <td className="px-10 py-5 text-right">
                                            <div className="flex items-center justify-end gap-6">
                                                <div className="w-24 h-1.5 bg-main rounded-full overflow-hidden border border-border flex-shrink-0">
                                                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${app.percent}%` }} />
                                                </div>
                                                <span className="text-sm font-black text-text-main tabular-nums w-12 text-right">
                                                    {app.percent.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </PageLayout>
    );
}
