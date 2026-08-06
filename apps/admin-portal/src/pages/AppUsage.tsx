import { useEffect, useState, useCallback, useMemo } from 'react';
import { activityService } from '../services/activity.service';
import type { AppEntry } from '../services/activity.service';
import { useAuth } from '../context/AuthContext';
import {
    AppWindow, Monitor, Users, Search,
    Clock, RefreshCw, Filter,
    PieChart as PieChartIcon,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { PageLayout, StatMetric, LoadingState, EmptyState, FilterSelect, DatePicker } from '../components/ui';
import clsx from 'clsx';
import { orgLocalToUtc } from '../lib/dataUtils';

// AppEntry imported from activity.service.ts

interface MemberInfo {
    id: string;
    auth_user_id?: string | null;
    full_name: string;
    email?: string;
    idle_limit?: number | null;
}

const COLORS = ['var(--chart-pie-slot-0)', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'];

// categorizeApp logic moved to activityService



// Module-level cache
let appUsageCache: any = null;
let appUsageCacheKey: string | null = null;

export function AppUsage() {
    const { profile, managedMemberIds, displayTimezone } = useAuth();
    const organizationId = profile?.organization_id;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [apps, setApps] = useState<AppEntry[]>([]);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' }));

    useEffect(() => {
        if (displayTimezone) {
            setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone }));
        }
    }, [displayTimezone]);

    useEffect(() => {
        import('../lib/supabase').then(({ supabase }) => {
            if (!organizationId) return;
            let query = supabase.from('members')
                .select('id, auth_user_id, full_name, email, idle_limit')
                .eq('organization_id', organizationId)
                .eq('status', 'Active')
                .order('full_name', { ascending: true });

            const isScoped = profile?.role === 'Manager' || profile?.role === 'Client';
            if (isScoped && managedMemberIds) {
                const memberIdsFilter = managedMemberIds.length > 0 ? managedMemberIds : ['00000000-0000-0000-0000-000000000000'];
                query = query.in('id', memberIdsFilter);
            }

            query.then(({ data }) => {
                if (data) setMembers(data);
            });
        });
    }, [organizationId, profile?.role, managedMemberIds]);

    const fetchData = useCallback(async (isSilent = false, forceRefresh = false) => {
        const cacheKey = `${profile?.id}_${selectedDate}_${selectedMemberId}`;
        if (!forceRefresh && appUsageCache && appUsageCacheKey === cacheKey) {
            setApps(appUsageCache.apps);
            setLoading(false);
            return;
        }

        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        const start = orgLocalToUtc(selectedDate, 'start', displayTimezone || 'UTC').toISOString();
        const end = orgLocalToUtc(selectedDate, 'end', displayTimezone || 'UTC').toISOString();

        try {
            if (!organizationId) return;
            const appArray = await activityService.fetchAppUsage(
                organizationId,
                start,
                end,
                members,
                selectedMemberId
            );

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
    }, [selectedDate, selectedMemberId, members, displayTimezone, organizationId, profile?.id]);

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



    const chartData = useMemo(() => {
        const top = apps.slice(0, 5).map(d => ({ name: d.app, value: d.count }));
        if (apps.length > 5) {
            const other = apps.slice(5).reduce((a, b) => a + b.count, 0);
            top.push({ name: 'Other Content', value: other });
        }
        return top;
    }, [apps]);

    const filteredApps = apps.filter(a => {
        const term = searchTerm.toLowerCase();
        return (a.raw_app && a.raw_app.toLowerCase().includes(term)) ||
               (a.domain && a.domain.toLowerCase().includes(term)) ||
               (a.window_title && a.window_title.toLowerCase().includes(term));
    });

    const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE);
    const paginatedApps = filteredApps.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

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

                    <DatePicker
                        value={selectedDate}
                        onChange={setSelectedDate}
                        className="h-10 min-w-[180px]"
                    />

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
                        <StatMetric icon={<Clock className="w-5 h-5" />} label="Usage Time" value={formatTime(apps.reduce((a, b) => a + b.count, 0))} sub="Total tracked software time" />
                    </div>

                    <div className="xl:col-span-8 bg-surface border border-border rounded-xl shadow-shell-sm p-8 relative overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-accent shadow-shell-sm">
                                    <PieChartIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-text-main tracking-[0.05em]">App Distribution</h3>
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
                            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-accent shadow-shell-sm">
                                <Filter className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-black text-text-main tracking-[0.05em]">App List</h3>
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
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted w-[20%]">App Name</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted w-[20%] hidden lg:table-cell">Domain</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted w-[25%] hidden xl:table-cell">Window Title</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted hidden sm:table-cell">Category</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted text-right">Time Used</th>
                                    <th className="px-10 py-4 text-[11px] font-black text-text-muted text-right">Usage %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedApps.map((app, i) => {
                                    const isExpanded = expandedRows.has(i);
                                    const toggleExpand = () => {
                                        const next = new Set(expandedRows);
                                        if (next.has(i)) next.delete(i);
                                        else next.add(i);
                                        setExpandedRows(next);
                                    };

                                    return (
                                        <tr key={i} onClick={toggleExpand} className="hover:bg-surface-hover transition-colors group cursor-pointer">
                                        <td className="px-10 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center shadow-shell-sm group-hover:bg-primary group-hover:text-white transition-all text-text-muted overflow-hidden">
                                                    <AppWindow className="w-5 h-5 shrink-0" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className={clsx("text-sm font-black text-text-main leading-tight tracking-tight group-hover:text-primary transition-colors", !isExpanded && "truncate max-w-[200px]")} title={app.raw_app}>
                                                        {app.raw_app || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-5 hidden lg:table-cell">
                                            <span className={clsx("text-sm font-medium text-text-muted", !isExpanded ? "truncate block max-w-[200px]" : "break-all")} title={app.domain}>
                                                {app.domain || '-'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5 hidden xl:table-cell">
                                            <span className={clsx("text-sm font-medium text-text-muted", !isExpanded ? "truncate block max-w-[300px]" : "break-words")} title={app.window_title}>
                                                {app.window_title || '-'}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5 hidden sm:table-cell">
                                            <span className="px-2 py-1 bg-surface-hover border border-border rounded text-[9px] font-black text-text-muted group-hover:border-primary/20 group-hover:text-primary transition-colors tracking-[0.1em]">
                                                {app.category}
                                            </span>
                                        </td>
                                        <td className="px-10 py-5 text-right font-black text-text-main text-sm">{formatTime(app.count)}</td>
                                        <td className="px-10 py-5 text-right">
                                            <div className="flex items-center justify-end gap-6">
                                                <div className="w-24 h-1.5 bg-main rounded-full overflow-hidden border border-border flex-shrink-0">
                                                    <div className="h-full transition-all duration-1000" style={{ width: `${app.percent}%`, background: 'linear-gradient(90deg, var(--chart-gold-secondary) 0%, var(--chart-gold) 0%)' }} />
                                                </div>
                                                <span className="text-sm font-black text-text-main tabular-nums w-12 text-right">
                                                    {app.percent.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-8 py-4 border-t border-border bg-surface-hover/30 shrink-0">
                            <span className="text-xs font-bold text-text-muted">
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredApps.length)} of {filteredApps.length}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-shell-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-black text-text-main tabular-nums min-w-[3rem] text-center">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-shell-sm"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </PageLayout>
    );
}
