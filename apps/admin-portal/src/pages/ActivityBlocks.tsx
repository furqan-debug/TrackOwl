import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Mouse, Keyboard, Clock,
    ChevronLeft, ChevronRight, ChevronRight as ChevronRowRight,
    Zap, Users, BarChart2
} from 'lucide-react';
import { activityService, type BlockRecordEntry } from '../services/activity.service';
import { useAuth } from '../context/AuthContext';
import {
    PageLayout, StatMetric, LoadingState, EmptyState,
    FilterSelect, DatePicker, RefreshButton, AppIcon
} from '../components/ui';
import { SecureImage } from '../components/ui/SecureImage';
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

/** Shortest time a pressed refresh stays visible, so a fast query still shows
    that the click registered. Matches Reports, App Usage and To-Dos. */
const MIN_REFRESH_FEEDBACK_MS = 650;

export function ActivityBlocks() {
    const { profile, managedMemberIds, displayTimezone, isRep } = useAuth();
    const organizationId = profile?.organization_id;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [membersLoaded, setMembersLoaded] = useState(false);
    const [members, setMembers] = useState<MemberInfo[]>([]);
    // Reps are locked to their own member id; admins start on 'all'
    const [selectedMemberId, setSelectedMemberId] = useState<string>(() =>
        isRep ? (profile?.id ?? 'all') : 'all'
    );

    const [selectedDate, setSelectedDate] = useState(() =>
        new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' })
    );

    const [blocks, setBlocks] = useState<BlockRecordEntry[]>([]);
    const [activeBlock, setActiveBlock] = useState<BlockRecordEntry | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

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

            // Reps only load themselves; Managers and Clients see their managed subset
            const isScoped = profile?.role === 'Manager' || profile?.role === 'Client' || isRep;
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
    const fetchBlocks = useCallback(async (isSilent = false, forceRefresh = false) => {
        if (!organizationId || !membersLoaded) return;
        const mySeq = ++requestSeqRef.current;
        const startedAt = Date.now();

        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        // forceRefresh means the button was pressed, so it spins as well as
        // the page showing its loader. Without the second flag the two were
        // mutually exclusive — pressing refresh could show one or the other,
        // never both, which is why this page skipped the loader entirely.
        if (forceRefresh) setRefreshing(true);

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
                // Hold the syncing animation long enough to read. The query
                // answers in a fraction of a second, so clearing it the moment
                // the rows land made it flash past — the page looked like it
                // had ignored the button. Only on a pressed refresh; a first
                // load clears as soon as the data is there.
                if (forceRefresh) {
                    const elapsed = Date.now() - startedAt;
                    if (elapsed < MIN_REFRESH_FEEDBACK_MS) {
                        await new Promise(resolve =>
                            setTimeout(resolve, MIN_REFRESH_FEEDBACK_MS - elapsed)
                        );
                    }
                }

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
        const totalTrackedSeconds = blocks.reduce((acc, b) => {
            if (b.credited === false) return acc;
            const s = new Date(b.block_start).getTime();
            const e = new Date(b.block_end).getTime();
            const diff = Math.max(0, (e - s) / 1000);
            return acc + Math.min(diff, 720);
        }, 0);
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

    // Pagination
    const totalPages = Math.ceil(blocks.length / ITEMS_PER_PAGE);
    const paginatedBlocks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return blocks.slice(start, start + ITEMS_PER_PAGE);
    }, [blocks, currentPage]);

    // Generate page number pills (max 5 visible + ellipsis)
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [1];
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    }, [totalPages, currentPage]);

    // Activity stripe color per row
    const stripeClass = (pct: number) => {
        if (pct >= 60) return 'border-l-2 border-l-emerald-500';
        if (pct >= 30) return 'border-l-2 border-l-amber-500';
        if (pct > 0)  return 'border-l-2 border-l-rose-400/70';
        return 'border-l-2 border-l-zinc-600/40';
    };

    return (
        <PageLayout
            title="Activity Blocks"
            description="10-minute granular activity windows — clicks, keystrokes, and active movement."
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    {/* Member Filter — hidden for reps who see only their own data */}
                    {!isRep && (
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
                    )}

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
                        onClick={() => fetchBlocks(false, true)}
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
                    {/* KPI cards. All four take the brand accent, so all four icons
                        are white on a transparent tile — they were emerald, gold and
                        amber against the first card's white, which made three of them
                        look like status colours rather than plain labels. */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatMetric
                            icon={<Clock className="w-5 h-5" />}
                            label="Tracked Time"
                            value={stats.totalTrackedTime}
                            sub={`${stats.totalBlocks} ten-minute blocks`}
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Zap className="w-5 h-5" />}
                            label="Avg Activity"
                            value={`${stats.avgActivity}%`}
                            sub="Active movement score"
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Mouse className="w-5 h-5" />}
                            label="Mouse Clicks"
                            value={stats.totalClicks.toLocaleString()}
                            sub={`across ${stats.totalBlocks} blocks`}
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Keyboard className="w-5 h-5" />}
                            label="Keystrokes"
                            value={stats.totalKeys.toLocaleString()}
                            sub={`across ${stats.totalBlocks} blocks`}
                            accent="brand-gradient"
                        />
                    </div>

                    {/* Activity Blocks Ledger */}
                    {blocks.length === 0 ? (
                        <EmptyState
                            icon={<BarChart2 className="w-10 h-10 text-accent" />}
                            title="No activity blocks found"
                            description={`There are no 10-minute activity windows recorded for ${selectedDate}. Members may not have tracked time that day.`}
                        />
                    ) : (
                        <div className="bg-surface border border-border rounded-xl shadow-shell-sm overflow-hidden flex flex-col">
                            {/* Table */}
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-surface-hover/50 border-b border-border">
                                            <th className="px-5 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider w-[180px]">
                                                Time Window
                                            </th>
                                            <th className="px-5 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider">
                                                Member
                                            </th>
                                            <th className="px-5 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider w-[180px]">
                                                Activity
                                            </th>
                                            <th className="px-5 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider w-[140px]">
                                                Input Events
                                            </th>
                                            <th className="px-5 py-3.5 text-[11px] font-black text-text-muted uppercase tracking-wider">
                                                Primary App
                                            </th>
                                            <th className="w-8" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {paginatedBlocks.map(block => {
                                            const pct = block.activity_percent;

                                            return (
                                                <tr
                                                    key={block.id}
                                                    onClick={() => setActiveBlock(block)}
                                                    className={clsx(
                                                        'hover:bg-surface-hover/60 transition-colors cursor-pointer group',
                                                        stripeClass(pct)
                                                    )}
                                                >
                                                    {/* Time Window */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className="font-mono text-xs font-bold text-text-main">
                                                            {formatTimeRange(block.block_start, block.block_end)}
                                                        </span>
                                                    </td>

                                                    {/* Member */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden">
                                                                {block.member?.avatar_url ? (
                                                                    <SecureImage
                                                                        path={block.member.avatar_url}
                                                                        bucket="avatars"
                                                                        className="w-full h-full object-cover"
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

                                                    {/* Activity Score + Bar */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <span className={clsx(
                                                                'text-xs font-black font-mono w-9 text-right shrink-0',
                                                                pct >= 60 ? 'text-emerald-400' :
                                                                pct >= 30 ? 'text-accent' :
                                                                pct > 0 ? 'text-amber-400' : 'text-text-muted'
                                                            )}>
                                                                {pct}%
                                                            </span>
                                                            <div className="w-24 bg-surface-hover h-2.5 rounded-full overflow-hidden border border-border shrink-0">
                                                                <div
                                                                    className={clsx(
                                                                        'h-full rounded-full transition-all duration-300',
                                                                        pct >= 60 ? 'bg-emerald-500' :
                                                                        pct >= 30 ? 'bg-accent' :
                                                                        pct > 0 ? 'bg-amber-500' : 'bg-zinc-600'
                                                                    )}
                                                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Input Events — Clicks + Keys merged */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <span className="inline-flex items-center gap-1 font-mono text-xs text-text-main">
                                                                <Mouse className="w-3 h-3 text-blue-400/80 shrink-0" />
                                                                {block.mouse_clicks.toLocaleString()}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 font-mono text-xs text-text-main">
                                                                <Keyboard className="w-3 h-3 text-purple-400/80 shrink-0" />
                                                                {block.key_presses.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Primary App & Domain */}
                                                    <td className="px-5 py-4 max-w-[220px]">
                                                        <div className="flex items-center gap-2.5 min-w-0">
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

                                                    {/* Hover chevron — no dedicated column header */}
                                                    <td className="pr-4 py-4 text-right w-8">
                                                        <ChevronRowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            {totalPages > 1 && (
                                <div className="px-5 py-3.5 border-t border-border flex items-center justify-between bg-surface-hover/30 shrink-0">
                                    <span className="text-xs text-text-muted font-medium">
                                        Showing{' '}
                                        <strong className="text-text-main">
                                            {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, blocks.length)}
                                        </strong>{' '}
                                        of <strong className="text-text-main">{blocks.length}</strong> blocks
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="p-1.5 rounded-lg text-text-muted disabled:opacity-30 hover:bg-surface hover:text-text-main transition-colors"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        {pageNumbers.map((pg, idx) =>
                                            pg === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-text-muted">…</span>
                                            ) : (
                                                <button
                                                    key={pg}
                                                    onClick={() => setCurrentPage(pg as number)}
                                                    className={clsx(
                                                        'w-7 h-7 rounded-lg text-xs font-bold transition-colors',
                                                        currentPage === pg
                                                            ? 'bg-primary text-white shadow-shell-sm'
                                                            : 'text-text-muted hover:bg-surface hover:text-text-main'
                                                    )}
                                                >
                                                    {pg}
                                                </button>
                                            )
                                        )}
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="p-1.5 rounded-lg text-text-muted disabled:opacity-30 hover:bg-surface hover:text-text-main transition-colors"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Drill-Down Modal */}
            <BlockDetailModal
                block={activeBlock}
                onClose={() => setActiveBlock(null)}
                targetTz={displayTimezone}
            />
        </PageLayout>
    );
}
