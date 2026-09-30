import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    Activity, Mouse, Keyboard, Clock, Search,
    ChevronLeft, ChevronRight, LayoutGrid, List,
    Eye, Zap, Users
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
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [selectedDate, setSelectedDate] = useState(() =>
        new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' })
    );

    const [blocks, setBlocks] = useState<BlockRecordEntry[]>([]);
    const [activeBlock, setActiveBlock] = useState<BlockRecordEntry | null>(null);

    // Table view search & pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const requestSeqRef = useRef(0);

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
        const current = new Date(`${selectedDate}T12:00:00Z`);
        current.setUTCDate(current.getUTCDate() + delta);
        setSelectedDate(current.toISOString().split('T')[0]!);
    };

    const handleToday = () => {
        setSelectedDate(new Date().toLocaleDateString('en-CA', { timeZone: displayTimezone || 'UTC' }));
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
    const formatTimeOnly = (isoString: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }).format(new Date(isoString));
        } catch {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    // Filtered blocks for Table View
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

    // Blocks grouped by member for Grid View
    const memberGridGroups = useMemo(() => {
        const map = new Map<string, { member: MemberInfo; blocks: BlockRecordEntry[] }>();

        blocks.forEach(b => {
            const uid = b.user_id;
            if (!map.has(uid)) {
                map.set(uid, {
                    member: b.member || { id: uid, full_name: 'Unknown Member' },
                    blocks: []
                });
            }
            map.get(uid)!.blocks.push(b);
        });

        return Array.from(map.values()).sort((a, b) =>
            a.member.full_name.localeCompare(b.member.full_name)
        );
    }, [blocks]);

    // Compute hour range for grid
    const activeHours = useMemo(() => {
        const hourSet = new Set<number>();
        blocks.forEach(b => {
            try {
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    hour: 'numeric',
                    hour12: false
                }).formatToParts(new Date(b.block_start));
                const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
                hourSet.add(h);
            } catch {
                hourSet.add(new Date(b.block_start).getHours());
            }
        });

        if (hourSet.size === 0) return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
        const minHour = Math.max(0, Math.min(...Array.from(hourSet)) - 1);
        const maxHour = Math.min(23, Math.max(...Array.from(hourSet)) + 1);
        const hours: number[] = [];
        for (let i = minHour; i <= maxHour; i++) hours.push(i);
        return hours;
    }, [blocks, tz]);

    return (
        <PageLayout>
            <div className="space-y-6">
                {/* Page Title & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-text-main">
                                Activity Blocks
                            </h1>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent">
                                10-Min Granular
                            </span>
                        </div>
                        <p className="text-xs text-text-muted mt-1">
                            Inspect 10-minute input activity blocks, mouse clicks, keystrokes, and movement samples.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Day Navigator */}
                        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-shell-sm">
                            <button
                                onClick={() => handleShiftDay(-1)}
                                className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-text-main transition-colors"
                                title="Previous day"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <DatePicker
                                value={selectedDate}
                                onChange={setSelectedDate}
                            />
                            <button
                                onClick={() => handleShiftDay(1)}
                                className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-text-main transition-colors"
                                title="Next day"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleToday}
                                className="ml-1 px-2.5 py-1 text-[11px] font-bold text-text-muted hover:text-text-main hover:bg-white/5 rounded-lg transition-colors border-l border-border"
                            >
                                Today
                            </button>
                        </div>

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

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-shell-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold px-2.5",
                                    viewMode === 'grid'
                                        ? "bg-accent/20 text-accent shadow-sm"
                                        : "text-text-muted hover:text-text-main hover:bg-white/5"
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Timeline
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold px-2.5",
                                    viewMode === 'table'
                                        ? "bg-accent/20 text-accent shadow-sm"
                                        : "text-text-muted hover:text-text-main hover:bg-white/5"
                                )}
                            >
                                <List className="w-3.5 h-3.5" />
                                Table
                            </button>
                        </div>

                        <RefreshButton
                            refreshing={refreshing}
                            onClick={() => fetchBlocks(true)}
                        />
                    </div>
                </div>

                {/* KPI Metrics Summary */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <StatMetric
                        label="Tracked Time"
                        value={stats.totalTrackedTime}
                        icon={<Clock className="w-5 h-5 text-accent" />}
                    />
                    <StatMetric
                        label="Avg Activity"
                        value={`${stats.avgActivity}%`}
                        icon={<Activity className="w-5 h-5 text-emerald-400" />}
                    />
                    <StatMetric
                        label="Active Movement"
                        value={stats.totalActiveTime}
                        icon={<Zap className="w-5 h-5 text-amber-400" />}
                    />
                    <StatMetric
                        label="Mouse Clicks"
                        value={stats.totalClicks.toLocaleString()}
                        icon={<Mouse className="w-5 h-5 text-blue-400" />}
                    />
                    <StatMetric
                        label="Key Presses"
                        value={stats.totalKeys.toLocaleString()}
                        icon={<Keyboard className="w-5 h-5 text-purple-400" />}
                    />
                    <StatMetric
                        label="10-Min Blocks"
                        value={stats.totalBlocks}
                        icon={<LayoutGrid className="w-5 h-5 text-accent" />}
                    />
                </div>

                {/* Content Area */}
                {loading ? (
                    <LoadingState message="Loading 10-minute activity blocks..." />
                ) : blocks.length === 0 ? (
                    <EmptyState
                        icon={<Activity className="w-8 h-8 text-accent" />}
                        title="No activity recorded"
                        description={`No 10-minute activity blocks were found on ${selectedDate} for the selected filter.`}
                    />
                ) : viewMode === 'grid' ? (
                    /* ─── TIMELINE GRID VIEW ───────────────────────────────── */
                    <div className="space-y-6">
                        {memberGridGroups.map(group => (
                            <div
                                key={group.member.id}
                                className="bg-card border border-border rounded-2xl p-5 shadow-shell-sm space-y-4"
                            >
                                {/* Member Row Header */}
                                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold flex items-center justify-center text-xs shrink-0">
                                            {group.member.avatar_url ? (
                                                <img
                                                    src={group.member.avatar_url}
                                                    alt=""
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                initialOf(group.member.full_name)
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-main">
                                                {group.member.full_name}
                                            </h3>
                                            <p className="text-[11px] text-text-muted">
                                                {group.blocks.length} blocks · {Math.round(group.blocks.reduce((acc, b) => acc + b.activity_percent, 0) / group.blocks.length)}% avg activity
                                            </p>
                                        </div>
                                    </div>

                                    {/* Member Totals Pills */}
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1 font-mono text-text-muted">
                                            <Mouse className="w-3.5 h-3.5 text-blue-400" />
                                            {group.blocks.reduce((acc, b) => acc + b.mouse_clicks, 0).toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1 font-mono text-text-muted">
                                            <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                                            {group.blocks.reduce((acc, b) => acc + b.key_presses, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Hourly Rows Grid */}
                                <div className="space-y-3">
                                    {activeHours.map(hour => {
                                        // Find blocks in this hour for this member
                                        const hourBlocks = group.blocks.filter(b => {
                                            try {
                                                const parts = new Intl.DateTimeFormat('en-US', {
                                                    timeZone: tz,
                                                    hour: 'numeric',
                                                    hour12: false
                                                }).formatToParts(new Date(b.block_start));
                                                const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
                                                return h === hour;
                                            } catch {
                                                return new Date(b.block_start).getHours() === hour;
                                            }
                                        });

                                        return (
                                            <div key={hour} className="flex items-center gap-4">
                                                {/* Hour Pillar */}
                                                <div className="w-16 shrink-0 text-right">
                                                    <span className="text-xs font-mono font-bold text-text-muted">
                                                        {hour.toString().padStart(2, '0')}:00
                                                    </span>
                                                </div>

                                                {/* 6 Ten-Minute Slots (00, 10, 20, 30, 40, 50) */}
                                                <div className="flex-1 grid grid-cols-6 gap-2">
                                                    {[0, 1, 2, 3, 4, 5].map(slotIdx => {
                                                        const slotMin = slotIdx * 10;
                                                        const block = hourBlocks.find(b => {
                                                            try {
                                                                const parts = new Intl.DateTimeFormat('en-US', {
                                                                    timeZone: tz,
                                                                    minute: 'numeric'
                                                                }).formatToParts(new Date(b.block_start));
                                                                const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
                                                                return Math.floor(m / 10) * 10 === slotMin;
                                                            } catch {
                                                                const m = new Date(b.block_start).getMinutes();
                                                                return Math.floor(m / 10) * 10 === slotMin;
                                                            }
                                                        });

                                                        if (!block) {
                                                            return (
                                                                <div
                                                                    key={slotIdx}
                                                                    className="h-14 rounded-xl border border-dashed border-border/40 bg-black/10 flex items-center justify-center opacity-30"
                                                                >
                                                                    <span className="text-[10px] font-mono text-text-muted">
                                                                        :{slotMin.toString().padStart(2, '0')}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }

                                                        const pct = block.activity_percent;
                                                        const activeMins = (block.active_seconds / 60).toFixed(1);

                                                        return (
                                                            <div
                                                                key={slotIdx}
                                                                onClick={() => setActiveBlock(block)}
                                                                className={clsx(
                                                                    "h-14 rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all duration-200 relative group/slot shadow-sm",
                                                                    pct >= 60 ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500 hover:shadow-emerald-500/10" :
                                                                    pct >= 30 ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500 hover:shadow-blue-500/10" :
                                                                    pct > 0 ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500 hover:shadow-amber-500/10" :
                                                                    "bg-zinc-500/10 border-zinc-500/20 hover:border-zinc-400"
                                                                )}
                                                            >
                                                                {/* Top Row: Time & Percentage */}
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-mono text-text-muted">
                                                                        :{slotMin.toString().padStart(2, '0')}
                                                                    </span>
                                                                    <span className={clsx(
                                                                        "text-xs font-black",
                                                                        pct >= 60 ? "text-emerald-400" :
                                                                        pct >= 30 ? "text-blue-400" :
                                                                        pct > 0 ? "text-amber-400" : "text-text-muted"
                                                                    )}>
                                                                        {pct}%
                                                                    </span>
                                                                </div>

                                                                {/* Bottom Row: Metrics Icons */}
                                                                <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                                                                    <span className="flex items-center gap-0.5">
                                                                        <Mouse className="w-2.5 h-2.5 text-blue-400" />
                                                                        {block.mouse_clicks}
                                                                    </span>
                                                                    <span className="flex items-center gap-0.5">
                                                                        <Keyboard className="w-2.5 h-2.5 text-purple-400" />
                                                                        {block.key_presses}
                                                                    </span>
                                                                </div>

                                                                {/* Hover Tooltip HUD */}
                                                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-surface text-text-main text-[11px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover/slot:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30 shadow-2xl border border-border">
                                                                    <div className="text-center font-mono">
                                                                        {formatTimeOnly(block.block_start)} – {formatTimeOnly(block.block_end)}
                                                                    </div>
                                                                    <div className="text-[10px] font-normal text-text-muted mt-0.5 flex items-center justify-center gap-2">
                                                                        <span>{block.app_name || 'App'}</span>
                                                                        <span>·</span>
                                                                        <span>{activeMins}m active</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ─── DETAILED TABLE VIEW ──────────────────────────────── */
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-shell-sm space-y-4 p-5">
                        {/* Table Search & Filter Bar */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search by member, app, or domain..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:border-accent"
                                />
                            </div>
                            <span className="text-xs text-text-muted font-mono">
                                Showing {filteredBlocks.length} blocks
                            </span>
                        </div>

                        {/* Table */}
                        <div className="border border-border/60 rounded-xl overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-surface border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">Member</th>
                                        <th className="py-3 px-4">10-Min Window</th>
                                        <th className="py-3 px-4">Activity Score</th>
                                        <th className="py-3 px-4">Clicks</th>
                                        <th className="py-3 px-4">Keystrokes</th>
                                        <th className="py-3 px-4">Active Movement</th>
                                        <th className="py-3 px-4">Primary Application</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 font-medium">
                                    {paginatedBlocks.map(block => {
                                        const pct = block.activity_percent;
                                        const activeMins = Math.floor(block.active_seconds / 60);
                                        const activeSecsRem = block.active_seconds % 60;

                                        return (
                                            <tr
                                                key={block.id}
                                                className="hover:bg-white/[0.02] transition-colors"
                                            >
                                                {/* Member */}
                                                <td className="py-3 px-4 whitespace-nowrap">
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
                                                        <span className="font-bold text-text-main">
                                                            {block.member?.full_name || 'Member'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Time Window */}
                                                <td className="py-3 px-4 font-mono text-text-main whitespace-nowrap">
                                                    {formatTimeOnly(block.block_start)} – {formatTimeOnly(block.block_end)}
                                                </td>

                                                {/* Activity Score */}
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx(
                                                            "font-bold font-mono",
                                                            pct >= 60 ? "text-emerald-400" :
                                                            pct >= 30 ? "text-blue-400" :
                                                            pct > 0 ? "text-amber-400" : "text-text-muted"
                                                        )}>
                                                            {pct}%
                                                        </span>
                                                        <div className="w-16 bg-border/40 h-1.5 rounded-full overflow-hidden">
                                                            <div
                                                                className={clsx(
                                                                    "h-full rounded-full",
                                                                    pct >= 60 ? "bg-emerald-400" :
                                                                    pct >= 30 ? "bg-blue-400" :
                                                                    pct > 0 ? "bg-amber-400" : "bg-rose-500/60"
                                                                )}
                                                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Mouse Clicks */}
                                                <td className="py-3 px-4 font-mono whitespace-nowrap text-text-main">
                                                    <span className="flex items-center gap-1">
                                                        <Mouse className="w-3 h-3 text-blue-400" />
                                                        {block.mouse_clicks.toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Keystrokes */}
                                                <td className="py-3 px-4 font-mono whitespace-nowrap text-text-main">
                                                    <span className="flex items-center gap-1">
                                                        <Keyboard className="w-3 h-3 text-purple-400" />
                                                        {block.key_presses.toLocaleString()}
                                                    </span>
                                                </td>

                                                {/* Active Movement Duration */}
                                                <td className="py-3 px-4 font-mono whitespace-nowrap text-text-muted">
                                                    <span className="text-text-main font-semibold">
                                                        {activeMins}m {activeSecsRem}s
                                                    </span> / 10m
                                                </td>

                                                {/* App & Domain */}
                                                <td className="py-3 px-4 max-w-[200px]">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <AppIcon name={block.app_name} className="w-5 h-5 rounded shrink-0" />
                                                        <span className="font-semibold text-text-main truncate">
                                                            {block.app_name || 'App'}
                                                        </span>
                                                        {block.domain && (
                                                            <span className="text-[10px] text-accent font-mono truncate">
                                                                ({block.domain})
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => setActiveBlock(block)}
                                                        className="px-2.5 py-1 bg-white/5 hover:bg-accent/20 hover:text-accent rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-text-muted">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-white/5 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-white/5 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Drill-Down Modal */}
            <BlockDetailModal
                block={activeBlock}
                onClose={() => setActiveBlock(null)}
                targetTz={displayTimezone}
            />
        </PageLayout>
    );
}
