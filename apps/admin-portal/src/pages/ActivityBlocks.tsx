import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Activity, Mouse, Keyboard, Clock, Search,
    ChevronLeft, ChevronRight,
    Zap, Users, Eye, Filter
} from 'lucide-react';
import { activityService, type BlockRecordEntry } from '../services/activity.service';
import { useAuth } from '../context/AuthContext';
import {
    PageLayout, StatMetric, LoadingState, EmptyState,
    FilterSelect, DatePicker, RefreshButton, AppIcon
} from '../components/ui';
import { BlockDetailModal } from '../components/activity/BlockDetailModal';
import { initialOf } from '../lib/initials';
import clsx from 'clsx';

interface MemberInfo {
    id: string;
    auth_user_id?: string | null;
    full_name: string;
    email?: string;
    avatar_url?: string;
    role?: string;
}

export function ActivityBlocks() {
    const { profile, managedMemberIds, displayTimezone } = useAuth();
    const organizationId = profile?.organization_id;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [membersLoaded, setMembersLoaded] = useState(false);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

    const [selectedDate, setSelectedDate] = useState(() =>
        new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' })
    );

    const [blocks, setBlocks] = useState<BlockRecordEntry[]>([]);
    const [activeBlock, setActiveBlock] = useState<BlockRecordEntry | null>(null);

    // Search & pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    const requestSeqRef = useRef(0);

    // Check if selectedDate is today
    const todayStr = useMemo(() =>
        new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' }),
        [displayTimezone]
    );
    const isToday = selectedDate === todayStr;

    // Load active members for the org
    useEffect(() => {
        import('../lib/supabase').then(({ supabase }) => {
            if (!organizationId) {
                setMembersLoaded(true);
                return;
            }
            let query = supabase.from('members')
                .select('id, auth_user_id, full_name, email, avatar_url, role')
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
                setMembersLoaded(true);
            });
        });
    }, [organizationId, profile?.role, managedMemberIds]);

    // Fetch block records
    const fetchBlocks = useCallback(async (isSilent = false) => {
        if (!organizationId || !membersLoaded) return;
        const mySeq = ++requestSeqRef.current;

        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const data = await activityService.fetchBlockRecords(
                organizationId,
                selectedDate,
                members,
                selectedMemberId
            );

            if (mySeq === requestSeqRef.current) {
                setBlocks(data);
                setCurrentPage(1);
            }
        } catch (err) {
            console.error('Error fetching activity blocks:', err);
        } finally {
            if (mySeq === requestSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [organizationId, selectedDate, members, selectedMemberId, membersLoaded]);

    useEffect(() => {
        if (membersLoaded) {
            fetchBlocks();
        }
    }, [fetchBlocks, membersLoaded]);

    // Date navigation helpers
    const handleShiftDay = (delta: number) => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y!, m! - 1, d!);
        dateObj.setDate(dateObj.getDate() + delta);
        setSelectedDate(dateObj.toLocaleDateString('en-CA'));
    };

    // Aggregate KPI Stats
    const stats = useMemo(() => {
        const totalBlocks = blocks.length;
        const totalTrackedSeconds = totalBlocks * 600; // 10 minutes per block
        const totalActiveSeconds = blocks.reduce((acc, b) => acc + (b.active_seconds || 0), 0);
        const totalClicks = blocks.reduce((acc, b) => acc + (b.mouse_clicks || 0), 0);
        const totalKeys = blocks.reduce((acc, b) => acc + (b.key_presses || 0), 0);

        const avgActivity = totalBlocks > 0
            ? Math.round(blocks.reduce((acc, b) => acc + (b.activity_percent || 0), 0) / totalBlocks)
            : 0;

        const formatHoursMins = (secs: number) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            if (h === 0) return `${m}m`;
            return `${h}h ${m}m`;
        };

        return {
            totalBlocks,
            totalTrackedTime: formatHoursMins(totalTrackedSeconds),
            totalActiveTime: formatHoursMins(totalActiveSeconds),
            totalClicks,
            totalKeys,
            avgActivity
        };
    }, [blocks]);

    // Format local time for blocks
    const tz = displayTimezone || undefined;
    const formatTimeRange = (startIso: string, endIso: string) => {
        try {
            const fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
            return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
        } catch {
            return `${new Date(startIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(endIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    };

    // Filtered blocks for Table
    const filteredBlocks = useMemo(() => {
        if (!searchTerm.trim()) return blocks;
        const lower = searchTerm.toLowerCase();
        return blocks.filter(b =>
            b.member?.full_name?.toLowerCase().includes(lower) ||
            b.app_name?.toLowerCase().includes(lower) ||
            b.domain?.toLowerCase().includes(lower)
        );
    }, [blocks, searchTerm]);

    const totalPages = Math.ceil(filteredBlocks.length / ITEMS_PER_PAGE);
    const paginatedBlocks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBlocks.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredBlocks, currentPage]);

    return (
        <PageLayout
            title="Activity Blocks"
            description="10-minute input activity blocks, mouse clicks, keystrokes, and active movement."
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    {/* Member Filter */}
                    <div className="w-48">
                        <FilterSelect
                            icon={<Users className="w-4 h-4 text-text-muted" />}
                            value={selectedMemberId}
                            onChange={setSelectedMemberId}
                            options={[
                                { id: 'all', name: 'All Members' },
                                ...members.map(m => ({ id: m.id, name: m.full_name }))
                            ]}
                        />
                    </div>

                    {/* Day Navigator */}
                    <div className="flex items-center h-10 bg-surface border border-border p-1 rounded-xl shadow-shell-sm">
                        <button
                            onClick={() => handleShiftDay(-1)}
                            className="p-2 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <DatePicker
                            value={selectedDate}
                            onChange={(val) => setSelectedDate(val)}
                            className="min-w-[170px]"
                        />
                        <button
                            onClick={() => handleShiftDay(1)}
                            className="p-2 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg disabled:opacity-20"
                            title="Next day"
                            disabled={isToday}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <RefreshButton
                        onClick={() => fetchBlocks(true)}
                        refreshing={refreshing}
                        label="Refresh blocks"
                    />
                </div>
            }
        >
            {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                    <LoadingState message="Loading 10-minute activity blocks..." />
                </div>
            ) : (
                <div className="flex flex-col gap-8 pb-16">
                    {/* 📊 Metrics Summary (4 clean cards matching Activity & Dashboard) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatMetric
                            icon={<Clock className="w-4 h-4" />}
                            label="Tracked Time"
                            value={stats.totalTrackedTime}
                            sub={`${stats.totalBlocks} ten-minute blocks`}
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Zap className="w-4 h-4" />}
                            label="Avg Activity"
                            value={`${stats.avgActivity}%`}
                            sub={`${stats.totalActiveTime} active movement`}
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Mouse className="w-4 h-4" />}
                            label="Mouse Clicks"
                            value={stats.totalClicks.toLocaleString()}
                            sub="User click interactions"
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Keyboard className="w-4 h-4" />}
                            label="Keystrokes"
                            value={stats.totalKeys.toLocaleString()}
                            sub="Key press events"
                            accent="brand-gradient"
                        />
                    </div>

                    {/* 📋 Activity Blocks Ledger */}
                    {blocks.length === 0 ? (
                        <EmptyState
                            icon={<Activity className="w-8 h-8 text-accent" />}
                            title="No activity blocks recorded"
                            description={`No 10-minute activity blocks were found on ${selectedDate} for the selected filter.`}
                        />
                    ) : (
                        <div className="bg-surface border border-border rounded-xl shadow-shell-sm overflow-hidden flex flex-col min-h-[500px]">
                            {/* Card Header with Search */}
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface-hover/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-accent shadow-shell-sm">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-text-main tracking-[0.05em]">
                                            10-Minute Blocks ({filteredBlocks.length})
                                        </h3>
                                        <p className="text-[11px] text-text-muted">
                                            Click any block to inspect minute-by-minute activity and screenshots
                                        </p>
                                    </div>
                                </div>

                                <div className="relative w-72">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type="text"
                                        placeholder="Filter by member, app, domain..."
                                        value={searchTerm}
                                        onChange={e => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-main placeholder:text-text-muted"
                                    />
                                </div>
                            </div>

                            {/* Clean Ledger Table */}
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-hover/30 border-b border-border">
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider">
                                                Time Window
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider">
                                                Member
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider">
                                                Activity Score
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider text-right">
                                                Clicks
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider text-right">
                                                Keystrokes
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider text-right">
                                                Active Time
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider">
                                                Primary Application
                                            </th>
                                            <th className="px-6 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider text-right">
                                                Drill Down
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {paginatedBlocks.map(block => {
                                            const pct = block.activity_percent;
                                            const activeMins = Math.floor(block.active_seconds / 60);
                                            const activeSecsRem = block.active_seconds % 60;

                                            return (
                                                <tr
                                                    key={block.id}
                                                    onClick={() => setActiveBlock(block)}
                                                    className="hover:bg-surface-hover/60 transition-colors cursor-pointer group"
                                                >
                                                    {/* Time Window */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                                                            <span className="font-mono text-xs font-bold text-text-main">
                                                                {formatTimeRange(block.block_start, block.block_end)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Member */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold flex items-center justify-center text-[10px] shrink-0">
                                                                {block.member?.avatar_url ? (
                                                                    <img
                                                                        src={block.member.avatar_url}
                                                                        alt=""
                                                                        className="w-full h-full rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    initialOf(block.member?.full_name || 'U')
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold text-text-main group-hover:text-primary transition-colors">
                                                                {block.member?.full_name || 'Member'}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Activity Score */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <span className={clsx(
                                                                "text-xs font-black font-mono w-10 text-right shrink-0",
                                                                pct >= 60 ? "text-emerald-400" :
                                                                pct >= 30 ? "text-accent" :
                                                                pct > 0 ? "text-amber-400" : "text-text-muted"
                                                            )}>
                                                                {pct}%
                                                            </span>
                                                            <div className="w-20 bg-surface-hover h-2 rounded-full overflow-hidden border border-border shrink-0">
                                                                <div
                                                                    className={clsx(
                                                                        "h-full rounded-full transition-all duration-300",
                                                                        pct >= 60 ? "bg-emerald-500" :
                                                                        pct >= 30 ? "bg-accent" :
                                                                        pct > 0 ? "bg-amber-500" : "bg-zinc-600"
                                                                    )}
                                                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Mouse Clicks */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-text-main">
                                                            <Mouse className="w-3 h-3 text-blue-400/80" />
                                                            {block.mouse_clicks.toLocaleString()}
                                                        </span>
                                                    </td>

                                                    {/* Keystrokes */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-text-main">
                                                            <Keyboard className="w-3 h-3 text-purple-400/80" />
                                                            {block.key_presses.toLocaleString()}
                                                        </span>
                                                    </td>

                                                    {/* Active Time */}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="font-mono text-xs text-text-muted">
                                                            <strong className="text-text-main">{activeMins}m {activeSecsRem}s</strong> / 10m
                                                        </span>
                                                    </td>

                                                    {/* Primary App & Domain */}
                                                    <td className="px-6 py-4 max-w-[240px]">
                                                        <div className="flex items-center gap-2.5 truncate">
                                                            <AppIcon name={block.app_name || ''} className="w-7 h-7 shadow-shell-sm shrink-0" />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-xs font-bold text-text-main truncate">
                                                                    {block.app_name || 'General Work'}
                                                                </span>
                                                                {block.domain && (
                                                                    <span className="text-[10px] text-text-muted font-mono truncate">
                                                                        {block.domain}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Drill Down Action */}
                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-text-muted group-hover:text-accent group-hover:border-accent/40 transition-colors shadow-shell-sm">
                                                            <Eye className="w-3 h-3" />
                                                            Details
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="px-6 py-3.5 border-t border-border flex items-center justify-between bg-surface-hover/30 shrink-0">
                                    <span className="text-xs text-text-muted font-medium">
                                        Showing page <strong className="text-text-main">{currentPage}</strong> of <strong className="text-text-main">{totalPages}</strong>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="px-3 py-1 bg-surface border border-border rounded-lg text-xs font-semibold text-text-main disabled:opacity-30 hover:bg-surface-hover transition-colors shadow-shell-sm"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="px-3 py-1 bg-surface border border-border rounded-lg text-xs font-semibold text-text-main disabled:opacity-30 hover:bg-surface-hover transition-colors shadow-shell-sm"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Drill-Down Modal for Granular 1-Minute Inspection */}
            <BlockDetailModal
                block={activeBlock}
                onClose={() => setActiveBlock(null)}
                targetTz={displayTimezone}
            />
        </PageLayout>
    );
}
