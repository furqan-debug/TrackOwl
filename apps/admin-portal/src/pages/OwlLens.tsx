import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
    AlertTriangle,
    ArrowUpRight,
    Check,
    ChevronLeft,
    ChevronRight,
    Filter,
    Globe,
    MoreHorizontal,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DatePicker, FilterSelect, RefreshButton, EmptyState, LoadingState, Modal } from '../components/ui';
import {
    owlLensService,
    type HighlightKind,
    type HighlightSeverity,
    type HighlightStatus,
    type OwlLensHighlight,
    type OwlLensRunState,
} from '../services/owlLens.service';
import { teamService, type Team } from '../services/team.service';

// ---------------------------------------------------------------- wording

const KIND_LABEL: Record<HighlightKind, string> = {
    not_started: 'Workday not started',
    long_day: 'Very long day',
    idle: 'Long idle stretch',
    low_input: 'Timer running, almost no input',
    input_pattern: 'Unusual input pattern',
    app_mix: 'Unusual app mix',
    focus: 'Strong focus',
    non_productive: 'Non-productive sites',
};

const KIND_CATEGORY: Record<HighlightKind, string> = {
    not_started: 'Attendance',
    long_day: 'Attendance',
    idle: 'Presence',
    low_input: 'Presence',
    input_pattern: 'Presence',
    app_mix: 'Apps',
    focus: 'Focus',
    non_productive: 'Apps',
};

const SEVERITY_RANK: Record<HighlightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

const SEVERITY_LABEL: Record<HighlightSeverity, string> = {
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    positive: 'Positive',
};

const STATUS_LABEL: Record<Exclude<HighlightStatus, 'active'>, string> = {
    acknowledged: 'Acknowledged',
    dismissed: 'Dismissed',
    expected: 'Marked as expected',
};

const EXPECTED_REASONS = ['Approved leave', 'Offline meeting', 'Known exception'];

/** The one page that proves the card, opened on that person and that day. */
function sourceLink(h: OwlLensHighlight): { label: string; to: string } {
    const q = `?member=${encodeURIComponent(h.member_id)}&date=${h.business_date}`;
    switch (h.kind) {
        case 'not_started':
        case 'long_day':
            return { label: 'Open Timesheets', to: `/dashboard/timesheets${q}` };
        case 'app_mix':
        case 'non_productive':
            return { label: 'Open Apps & URLs', to: `/dashboard/activity/apps${q}` };
        case 'low_input':
        case 'input_pattern':
            return { label: 'Open Screenshots', to: `/dashboard/activity${q}` };
        case 'idle':
        case 'focus':
        default:
            return { label: 'Open Activity Blocks', to: `/dashboard/activity/blocks${q}` };
    }
}

function errorText(err: unknown, fallback: string): string {
    const message = (err as { message?: unknown } | null)?.message;
    return typeof message === 'string' && message ? message : fallback;
}

// ---------------------------------------------------------------- non-productive pop-up

function fmtMins(mins: number): string {
    const m = Math.max(0, Math.round(mins));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h === 0) return `${r} min`;
    return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

function num(v: unknown): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

const NP_SEEN_KEY = 'owl-lens:non-productive-seen';

function readNpSeen(): Record<string, string> {
    try {
        const raw = window.localStorage.getItem(NP_SEEN_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
    } catch {
        return {};
    }
}

function writeNpSeen(seen: Record<string, string>) {
    try {
        const kept = Object.fromEntries(Object.entries(seen).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14));
        window.localStorage.setItem(NP_SEEN_KEY, JSON.stringify(kept));
    } catch {
        // storage unavailable
    }
}

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type View = 'open' | 'reviewed';

const AUTO_REFRESH_MS = 5 * 60_000;

// ---------------------------------------------------------------- page

export function OwlLens() {
    const { profile, displayTimezone, timezoneReady } = useAuth();
    const organizationId = profile?.organization_id;
    const role = profile?.role;
    const canReview = role === 'Owner' || role === 'Admin' || role === 'Manager';
    const isAdmin = role === 'Owner' || role === 'Admin';

    const tz = displayTimezone || 'UTC';
    const today = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: tz }), [tz]);

    const [pickedDate, setPickedDate] = useState<string | null>(null);
    const date = pickedDate ?? today;
    const isToday = date === today;

    const [highlights, setHighlights] = useState<OwlLensHighlight[]>([]);
    const [runState, setRunState] = useState<OwlLensRunState | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
    const [teamFilter, setTeamFilter] = useState<string>('all');
    const [view, setView] = useState<View>('open');

    const [busyId, setBusyId] = useState<string | null>(null);
    const [choosingReasonFor, setChoosingReasonFor] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const requestSeqRef = useRef(0);
    const dayNavRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async (quiet = false) => {
        if (!organizationId || !timezoneReady) return;
        const seq = ++requestSeqRef.current;
        if (quiet) setRefreshing(true);
        else setLoading(true);
        try {
            const [rows, run] = await Promise.all([
                owlLensService.fetchHighlights(organizationId, date),
                owlLensService.fetchRunState(organizationId).catch(() => null),
            ]);
            if (seq !== requestSeqRef.current) return;
            setHighlights(rows);
            setRunState(run);
            setLoadError(null);
        } catch (err) {
            if (seq !== requestSeqRef.current) return;
            console.error('[OwlLens] load failed:', err);
            setLoadError(errorText(err, 'Something went wrong while loading highlights.'));
        } finally {
            if (seq === requestSeqRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [organizationId, timezoneReady, date]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!isToday) return;
        const t = setInterval(() => load(true), AUTO_REFRESH_MS);
        return () => clearInterval(t);
    }, [isToday, load]);

    useEffect(() => {
        if (!organizationId) return;
        let cancelled = false;
        teamService.fetchTeams()
            .then(all => {
                if (cancelled) return;
                const mine = role === 'Manager'
                    ? all.filter(t => t.manager_id === profile?.id || (t.leadIds || []).includes(profile?.id || ''))
                    : all;
                setTeams(mine);
            })
            .catch(err => console.error('[OwlLens] teams failed:', err));
        return () => { cancelled = true; };
    }, [organizationId, role, profile?.id]);

    useEffect(() => {
        setChoosingReasonFor(null);
        setActionError(null);
    }, [date]);

    const teamMemberIds = useMemo(() => {
        if (teamFilter === 'all') return null;
        const team = teams.find(t => t.id === teamFilter);
        return new Set(team?.memberIds || []);
    }, [teamFilter, teams]);

    const filtered = useMemo(() => highlights.filter(h => {
        if (teamMemberIds && !teamMemberIds.has(h.member_id)) return false;
        if (severityFilter === 'info') return h.severity === 'info' || h.severity === 'positive';
        if (severityFilter !== 'all') return h.severity === severityFilter;
        return true;
    }), [highlights, teamMemberIds, severityFilter]);

    const open = useMemo(() => filtered
        .filter(h => h.status === 'active')
        .sort((a, b) =>
            SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
            || b.updated_at.localeCompare(a.updated_at)), [filtered]);

    const reviewed = useMemo(() => filtered
        .filter(h => h.status !== 'active')
        .sort((a, b) => (b.status_at || '').localeCompare(a.status_at || '')), [filtered]);

    const shown = view === 'open' ? open : reviewed;

    const nonProductive = useMemo(() => highlights
        .filter(h => h.kind === 'non_productive' && h.status === 'active')
        .sort((a, b) =>
            num(b.evidence.share_pct) - num(a.evidence.share_pct)
            || a.member_name.localeCompare(b.member_name)), [highlights]);
    const npKey = nonProductive.map(h => h.id).sort().join(',');
    const npDay = `${organizationId}:${date}`;
    const [npSeen, setNpSeen] = useState<Record<string, string>>(readNpSeen);
    const closeNonProductive = () => {
        const next = { ...npSeen, [npDay]: npKey };
        setNpSeen(next);
        writeNpSeen(next);
    };

    const npOpen = !loading && !loadError
        && nonProductive.length > 0 && npSeen[npDay] !== npKey;
    const dayLabel = isToday
        ? 'Today'
        : new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

    const criticalCount = open.filter(h => h.severity === 'critical').length;
    const warningCount = open.filter(h => h.severity === 'warning').length;
    const filtersActive = severityFilter !== 'all' || teamFilter !== 'all';

    const fmtTime = useCallback((iso: string | null) => {
        if (!iso) return '';
        return new Date(iso)
            .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
            .toLowerCase();
    }, [tz]);

    const checkedAgo = (() => {
        if (!runState?.last_run_at) return null;
        const mins = Math.max(0, Math.round((Date.now() - new Date(runState.last_run_at).getTime()) / 60_000));
        if (mins < 1) return 'Checked just now';
        if (mins < 60) return `Checked ${mins} min ago`;
        return `Last checked at ${fmtTime(runState.last_run_at)}`;
    })();

    // Auto-select first available item if none selected or selection not in shown
    const selected = shown.find(h => h.id === selectedId) ?? shown[0] ?? null;

    const evidence = useMemo(
        () => new Map(shown.map(h => [h.id, evidenceFor(h, isToday, fmtTime)])),
        [shown, isToday, fmtTime],
    );

    const select = (id: string) => {
        setSelectedId(id);
        setChoosingReasonFor(null);
    };

    const review = async (h: OwlLensHighlight, status: HighlightStatus, reason?: string) => {
        const leavesView = view === 'open' ? status !== 'active' : status === 'active';
        const at = shown.findIndex(x => x.id === h.id);
        const nextId = leavesView ? (shown[at + 1] ?? shown[at - 1])?.id ?? null : h.id;
        setBusyId(h.id);
        setActionError(null);
        try {
            await owlLensService.setStatus(h.id, status, reason);
            const now = new Date().toISOString();
            setHighlights(prev => prev.map(x => x.id !== h.id ? x : {
                ...x,
                status,
                status_reason: status === 'expected' ? (reason ?? null) : null,
                status_by_name: status === 'active' ? null : (profile?.full_name ?? null),
                status_at: status === 'active' ? null : now,
            }));
            setChoosingReasonFor(null);
            setSelectedId(nextId);
        } catch (err) {
            console.error('[OwlLens] review failed:', err);
            setActionError(errorText(err, 'That did not save. Please try again.'));
        } finally {
            setBusyId(null);
        }
    };

    const shiftDay = (delta: number) => {
        const [y, m, d] = date.split('-').map(Number);
        const next = new Date(y!, m! - 1, d! + delta).toLocaleDateString('en-CA');
        setPickedDate(next >= today ? null : next);
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-white">
            {/* Top Workspace Header */}
            <header className="h-14 px-4 md:px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0 z-20">
                {/* Left: Title + Vertical Divider + Live Alert Summary */}
                <div className="flex items-center min-w-0">
                    <h1 className="text-base font-bold text-slate-900 tracking-tight shrink-0">Owl Lens</h1>
                    <div className="h-4 w-px bg-slate-200 mx-3 shrink-0" aria-hidden />
                    <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                        {open.length > 0 ? (
                            <>
                                {criticalCount > 0 && (
                                    <span className="font-semibold text-rose-600 shrink-0">
                                        {criticalCount} critical
                                    </span>
                                )}
                                {criticalCount > 0 && warningCount > 0 && <span className="text-slate-300">·</span>}
                                {warningCount > 0 && (
                                    <span className="font-semibold text-amber-600 shrink-0">
                                        {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
                                    </span>
                                )}
                                {(criticalCount > 0 || warningCount > 0) && checkedAgo && <span className="text-slate-300">·</span>}
                                <span className="truncate">{checkedAgo || `${open.length} active alerts`}</span>
                            </>
                        ) : (
                            <span className="truncate">All clear · {checkedAgo || 'Checked just now'}</span>
                        )}
                    </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    {teams.length > 0 && (
                        <div className="hidden sm:block w-36 md:w-44">
                            <FilterSelect
                                icon={<Users className="w-3.5 h-3.5 text-slate-500" />}
                                value={teamFilter}
                                onChange={setTeamFilter}
                                options={[
                                    { id: 'all', name: role === 'Manager' ? 'All my teams' : 'All teams' },
                                    ...teams.map(t => ({ id: t.id, name: t.name })),
                                ]}
                            />
                        </div>
                    )}
                    <div className="w-36 md:w-40">
                        <FilterSelect
                            icon={<Filter className="w-3.5 h-3.5 text-slate-500" />}
                            value={severityFilter}
                            onChange={v => setSeverityFilter(v as SeverityFilter)}
                            sortOptions={false}
                            options={[
                                { id: 'all', name: 'All severities' },
                                { id: 'critical', name: 'Critical' },
                                { id: 'warning', name: 'Warning' },
                                { id: 'info', name: 'Info & positive' },
                            ]}
                        />
                    </div>

                    <div
                        ref={dayNavRef}
                        className="flex items-center h-9 bg-white border border-slate-200 px-1 rounded-lg"
                    >
                        <button
                            onClick={() => shiftDay(-1)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors rounded-md"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <DatePicker
                            value={date}
                            onChange={val => setPickedDate(val >= today ? null : val)}
                            maxDate={today}
                            anchorRef={dayNavRef}
                            className="min-w-[140px] md:min-w-[160px]"
                        />
                        <button
                            onClick={() => shiftDay(1)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors rounded-md disabled:opacity-20"
                            title="Next day"
                            disabled={isToday}
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <RefreshButton onClick={() => load(true)} refreshing={refreshing} label="Refresh" />
                </div>
            </header>

            {/* Error Notification Bar */}
            {actionError && (
                <div className="flex items-center justify-between px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
                        <span>{actionError}</span>
                    </div>
                    <button onClick={() => setActionError(null)} aria-label="Close" className="opacity-70 hover:opacity-100">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Main Content Workspace: Split Pane */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center bg-white">
                    <LoadingState message="Looking for anything out of the ordinary..." />
                </div>
            ) : loadError ? (
                <div className="flex-1 flex items-center justify-center p-6 bg-white">
                    <EmptyState
                        icon={<AlertTriangle className="w-8 h-8 opacity-60" aria-hidden />}
                        title="Owl Lens could not load"
                        description={loadError}
                        action={
                            <button
                                onClick={() => load()}
                                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
                            >
                                Try again
                            </button>
                        }
                    />
                </div>
            ) : (
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    {/* Left Pane: Signal Queue (380px) */}
                    <aside className="w-full md:w-[380px] lg:w-[400px] shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col h-full overflow-hidden">
                        {/* Underline Tabs */}
                        <div className="flex items-center border-b border-slate-200 px-4 gap-6 bg-slate-50 shrink-0">
                            <button
                                type="button"
                                onClick={() => setView('open')}
                                className={clsx(
                                    'relative py-3 text-xs font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px',
                                    view === 'open'
                                        ? 'text-slate-900 border-[#0B2559]'
                                        : 'text-slate-500 hover:text-slate-900 border-transparent'
                                )}
                            >
                                <span>Needs Attention</span>
                                <span className={clsx(
                                    'px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-semibold',
                                    view === 'open' ? 'bg-[#0B2559]/10 text-[#0B2559]' : 'bg-slate-200/70 text-slate-600'
                                )}>
                                    {open.length}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('reviewed')}
                                className={clsx(
                                    'relative py-3 text-xs font-semibold transition-colors flex items-center gap-2 border-b-2 -mb-px',
                                    view === 'reviewed'
                                        ? 'text-slate-900 border-[#0B2559]'
                                        : 'text-slate-500 hover:text-slate-900 border-transparent'
                                )}
                            >
                                <span>Reviewed</span>
                                <span className={clsx(
                                    'px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-semibold',
                                    view === 'reviewed' ? 'bg-[#0B2559]/10 text-[#0B2559]' : 'bg-slate-200/70 text-slate-600'
                                )}>
                                    {reviewed.length}
                                </span>
                            </button>
                        </div>

                        {/* Alert Rows List */}
                        {shown.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center p-6 text-center">
                                <CalmState
                                    view={view}
                                    isToday={isToday}
                                    filtersActive={filtersActive}
                                    neverChecked={!runState?.last_run_at && highlights.length === 0}
                                />
                            </div>
                        ) : (
                            <ul className="flex-1 overflow-y-auto divide-y divide-slate-200/80 no-scrollbar">
                                {shown.map(h => (
                                    <QueueItem
                                        key={h.id}
                                        h={h}
                                        selected={selected?.id === h.id}
                                        stat={evidence.get(h.id)?.stat ?? ''}
                                        fmtTime={fmtTime}
                                        onSelect={() => select(h.id)}
                                    />
                                ))}
                            </ul>
                        )}
                    </aside>

                    {/* Right Pane: Case Inspector */}
                    <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-white">
                        {selected ? (
                            <Inspector
                                key={selected.id}
                                h={selected}
                                evidence={evidence.get(selected.id) ?? evidenceFor(selected, isToday, fmtTime)}
                                canReview={canReview}
                                busy={busyId === selected.id}
                                choosingReason={choosingReasonFor === selected.id}
                                fmtTime={fmtTime}
                                onReview={(status, reason) => review(selected, status, reason)}
                                onChooseReason={show => setChoosingReasonFor(show ? selected.id : null)}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                                <p className="text-sm">Select an alert from the queue to inspect details</p>
                            </div>
                        )}
                    </main>
                </div>
            )}

            {/* Non-Productive Alert Modal */}
            <Modal
                isOpen={npOpen}
                onClose={closeNonProductive}
                title="Non-productive time over 25%"
                subtitle={`${dayLabel}: ${nonProductive.length} ${nonProductive.length === 1 ? 'person' : 'people'} spent a quarter or more of their tracked time on non-productive sites.`}
                height="h-auto"
                maxWidth="max-w-xl"
                footer={
                    <>
                        {isAdmin && (
                            <p className="sm:mr-auto text-[12px] text-slate-500">
                                Change the list in Settings → Telemetry.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={closeNonProductive}
                            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
                        >
                            Close
                        </button>
                    </>
                }
            >
                <ul className="flex flex-col divide-y divide-slate-200">
                    {nonProductive.map(h => {
                        const sites = Object.entries((h.evidence.domains as Record<string, unknown>) || {})
                            .sort(([, a], [, b]) => num(b) - num(a))
                            .slice(0, 3)
                            .map(([domain]) => domain);
                        return (
                            <li key={h.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 min-w-0">
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                    <Globe className="w-4 h-4" aria-hidden />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{h.member_name}</p>
                                    <p className="text-[12px] text-slate-500 truncate">
                                        {fmtMins(num(h.evidence.nonproductive_mins))} of {fmtMins(num(h.evidence.tracked_mins))} tracked
                                        {sites.length > 0 && <> · {sites.join(', ')}</>}
                                    </p>
                                </div>
                                <span className="shrink-0 px-2 py-0.5 rounded-md border text-[12px] font-bold bg-amber-500/10 text-amber-700 border-amber-500/20">
                                    {num(h.evidence.share_pct)}%
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Modal>
        </div>
    );
}

// ---------------------------------------------------------------- evidence calculation

function mins(v: unknown): string {
    return fmtMins(num(v));
}

function count(v: unknown): string {
    return num(v).toLocaleString('en-US');
}

function pct(v: unknown): string {
    return `${Math.round(num(v) * 100)}%`;
}

function clock(v: unknown): string {
    const m = Math.round(num(v));
    const h = Math.floor(m / 60) % 24;
    const r = m % 60;
    return `${h % 12 === 0 ? 12 : h % 12}:${String(r).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

function shortDate(v: unknown): string {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return '';
    return new Date(`${v.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const BASELINE_LABEL: Record<OwlLensHighlight['baseline_source'], string> = {
    personal: 'Their own normal',
    team: "Their team's normal",
    organization: "The organisation's normal",
    rule: 'Fixed human-speed threshold',
};

interface DeviationData {
    label: string;
    observedLabel: string;
    observedValue: number;
    baselineLabel: string;
    baselineValue: number;
    unit: string;
    varianceText: string;
}

interface Evidence {
    stat: string;
    tiles: { label: string; value: string; caption: string }[];
    deviation: DeviationData | null;
    app: string;
    range: string;
    why: string;
}

function evidenceFor(h: OwlLensHighlight, isToday: boolean, fmtTime: (iso: string | null) => string): Evidence {
    const e = h.evidence || {};
    const tiles: Evidence['tiles'] = [];
    const tile = (cond: unknown, label: string, value: string, caption = '') => {
        if (cond) tiles.push({ label, value, caption });
    };
    const has = (k: string) => e[k] !== undefined && e[k] !== null;
    const app = typeof e.app === 'string' && e.app ? e.app : '';
    const range = h.window_start && h.window_end ? `${fmtTime(h.window_start)} – ${fmtTime(h.window_end)}` : '';
    let stat = '';
    let why = h.detail;
    let deviation: DeviationData | null = null;

    switch (h.kind) {
        case 'not_started': {
            const missed = Math.max(1, num(e.missed_working_days));
            const last = shortDate(e.last_worked);
            tile(true, 'Untracked Days', String(missed), 'Consecutive workdays');
            tile(has('usual_start_min'), 'Typical Start', clock(e.usual_start_min), 'Expected begin time');
            tile(last, 'Last Tracked', last, 'Previous active day');
            stat = missed >= 2 ? `${missed} days untracked` : has('usual_start_min') ? `Usually starts ${clock(e.usual_start_min)}` : 'Not started';
            why = missed >= 2
                ? 'This is not a one-off. They have not tracked any time on several of their workdays in a row, and this is one of the weekdays they normally work.'
                : `They normally start well before this on this weekday, and ${isToday ? 'no time has been tracked yet' : 'no time was tracked that day'}. Owl Lens waits an hour past their usual start before raising this.`;
            break;
        }
        case 'long_day': {
            const tracked = num(e.tracked_mins);
            const usual = num(e.usual_mins);
            tile(has('tracked_mins'), 'Tracked', mins(tracked), 'Total duration');
            tile(has('usual_mins'), 'Usual Day', mins(usual), 'Historical average');
            tile(has('longest_break_mins'), 'Longest Break', mins(e.longest_break_mins), 'Max rest interval');
            stat = `${mins(tracked)} tracked`;
            why = 'This day is far longer than what they normally work. Very long days with few breaks can point to overwork, or to a timer that was left running.';
            if (usual > 0 && tracked > usual) {
                const diff = tracked - usual;
                const multiplier = (tracked / usual).toFixed(1);
                deviation = {
                    label: 'Daily Work Duration',
                    observedLabel: 'Observed',
                    observedValue: tracked,
                    baselineLabel: 'Usual Baseline',
                    baselineValue: usual,
                    unit: 'min',
                    varianceText: `+${fmtMins(diff)} (${multiplier}x usual)`,
                };
            }
            break;
        }
        case 'idle': {
            if (e.pattern === 'share') {
                const idleShare = num(e.idle_share);
                const usualShare = num(e.usual_idle_share);
                tile(has('idle_share'), 'Idle Share', pct(idleShare), 'Observed ratio');
                tile(has('usual_idle_share'), 'Usual Idle', pct(usualShare), 'Historical baseline');
                tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins), 'Session total');
                stat = `${pct(idleShare)} idle`;
                why = 'A much bigger part of their tracked day had no keyboard or mouse activity than is normal for them.';
                if (usualShare > 0) {
                    const diffPct = Math.round((idleShare - usualShare) * 100);
                    deviation = {
                        label: 'Idle Proportion',
                        observedLabel: 'Observed Idle',
                        observedValue: Math.round(idleShare * 100),
                        baselineLabel: 'Normal Idle',
                        baselineValue: Math.round(usualShare * 100),
                        unit: '%',
                        varianceText: `+${diffPct}% above baseline`,
                    };
                }
            } else {
                const stop = num(e.idle_stop_mins);
                const stretch = num(e.minutes);
                tile(has('minutes'), 'Idle Stretch', mins(stretch), 'Uninterrupted span');
                tile(h.window_start, 'Started', fmtTime(h.window_start), 'Timestamp spotted');
                tile(true, 'Auto-Stop Limit', stop > 0 ? `${stop} min` : 'Off', 'Org threshold');
                stat = `${mins(stretch)} idle`;
                why = 'The timer kept running with no keyboard or mouse activity for a long stretch, which usually means someone stepped away without stopping it.'
                    + (stop > 0 && stretch > stop ? " It also ran past the organisation's idle auto-stop, which should have ended the session." : '');
                if (stop > 0 && stretch > stop) {
                    deviation = {
                        label: 'Idle Stretch Duration',
                        observedLabel: 'Recorded Stretch',
                        observedValue: stretch,
                        baselineLabel: 'Auto-Stop Threshold',
                        baselineValue: stop,
                        unit: 'min',
                        varianceText: `+${stretch - stop} min beyond limit`,
                    };
                }
            }
            break;
        }
        case 'low_input': {
            const m = num(e.minutes);
            tile(has('minutes'), 'Duration', mins(m), 'Window length');
            tile(h.window_start, 'Started', fmtTime(h.window_start), 'Start time');
            tile(h.window_end, 'Ended', fmtTime(h.window_end), 'End time');
            stat = `${mins(m)} low input`;
            why = 'The timer was running in one app with only a trickle of keyboard and mouse activity, far too little for normal work over that long.';
            break;
        }
        case 'input_pattern': {
            const m = num(e.minutes);
            if (e.pattern === 'held_key') {
                const rate = m > 0 ? Math.round(num(e.keystrokes) / m) : 0;
                tile(has('keystrokes'), 'Keystrokes', count(e.keystrokes), m > 0 ? `In ${mins(m)} session window` : 'Session keystrokes');
                tile(rate > 0, 'Key Rate', `${count(rate)}/min`, 'Keystroke velocity');
                tile(has('clicks'), 'Mouse Clicks', count(e.clicks), 'Pointer activity');
                stat = rate > 0 ? `${count(rate)} keys/min` : `${mins(m)} held key`;
                why = 'Nobody types that fast for that long. A key held down, or something resting on the keyboard, produces this pattern and makes the time look active when it may not be.';
                if (rate > 0) {
                    const humanPace = 350; // standard benchmark for sustained human typing
                    deviation = {
                        label: 'Keystroke Rate',
                        observedLabel: 'Observed Rate',
                        observedValue: rate,
                        baselineLabel: 'Human Max Pace',
                        baselineValue: humanPace,
                        unit: 'keys/min',
                        varianceText: `${(rate / humanPace).toFixed(1)}x sustained human maximum`,
                    };
                }
            } else {
                tile(has('minutes'), 'Duration', mins(m), 'Session duration');
                tile(has('keystrokes'), 'Keystrokes', count(e.keystrokes), 'Session keystrokes');
                tile(has('clicks'), 'Mouse Clicks', count(e.clicks), 'Pointer activity');
                stat = e.pattern === 'move_only' ? `${mins(m)} without keys/clicks` : `${mins(m)} continuous`;
                why = e.pattern === 'move_only'
                    ? 'There was activity, but not a single keystroke or click, all in the same window. A mouse jiggler or auto-mover looks like this.'
                    : 'Activity registered in almost every second, without the short natural pauses people make. Automated input can produce this pattern.';
            }
            break;
        }
        case 'app_mix':
            tile(has('unfamiliar_share'), 'Unfamiliar Mix', pct(e.unfamiliar_share), 'Time in new apps');
            tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins), 'Day total');
            stat = `${pct(e.unfamiliar_share)} unfamiliar apps`;
            why = 'Most of the day went to apps this person rarely uses. It may be a new tool or project, or time spent outside their normal work.';
            break;
        case 'focus': {
            const run = num(e.minutes);
            const usualRun = num(e.usual_run_mins);
            tile(has('minutes'), 'Unbroken Run', mins(run), 'Active duration');
            tile(has('usual_run_mins'), 'Usual Best', mins(usualRun), 'Typical best');
            tile(h.window_start, 'Started', fmtTime(h.window_start), 'Window start');
            stat = `${mins(run)} unbroken`;
            why = 'A longer stretch of steady, active work than they usually manage. Worth recognising.';
            if (usualRun > 0 && run > usualRun) {
                deviation = {
                    label: 'Focus Stretch',
                    observedLabel: 'Observed Run',
                    observedValue: run,
                    baselineLabel: 'Typical Run',
                    baselineValue: usualRun,
                    unit: 'min',
                    varianceText: `+${run - usualRun} min longer than normal`,
                };
            }
            break;
        }
        case 'non_productive': {
            const share = num(e.share_pct);
            const threshold = 25;
            tile(has('share_pct'), 'Non-Productive', `${share}%`, 'Of tracked time');
            tile(has('nonproductive_mins'), 'Total Duration', mins(e.nonproductive_mins), 'On restricted sites');
            tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins), 'Day total');
            stat = `${share}% non-productive`;
            why = 'A quarter or more of their tracked time was on sites the organisation counts as non-productive, such as social media or streaming.';
            if (share >= threshold) {
                deviation = {
                    label: 'Non-Productive Time Ratio',
                    observedLabel: 'Observed Share',
                    observedValue: share,
                    baselineLabel: 'Warning Threshold',
                    baselineValue: threshold,
                    unit: '%',
                    varianceText: `+${share - threshold}% above 25% threshold`,
                };
            }
            break;
        }
    }

    return {
        stat,
        tiles: tiles.slice(0, 3),
        deviation,
        app,
        range,
        why,
    };
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '')).toUpperCase();
}

function distinctEmail(h: OwlLensHighlight): string | null {
    const email = h.member_email?.trim();
    if (!email) return null;
    return email.toLowerCase() === h.member_name.trim().toLowerCase() ? null : email;
}

const SEVERITY_DOT: Record<HighlightSeverity, string> = {
    critical: 'bg-rose-500',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
    positive: 'bg-emerald-500',
};

const SEVERITY_PILL: Record<HighlightSeverity, string> = {
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ---------------------------------------------------------------- queue row

function QueueItem({ h, selected, stat, fmtTime, onSelect }: {
    h: OwlLensHighlight;
    selected: boolean;
    stat: string;
    fmtTime: (iso: string | null) => string;
    onSelect: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                aria-current={selected ? 'true' : undefined}
                className={clsx(
                    'w-full text-left p-3.5 transition-colors block border-l-[3px]',
                    selected
                        ? 'bg-white border-[#0B2559] shadow-xs'
                        : 'bg-transparent hover:bg-white/70 border-transparent'
                )}
            >
                {/* Row 1: Severity dot, Alert Title, Timestamp */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={clsx('w-2 h-2 rounded-full shrink-0', SEVERITY_DOT[h.severity])} aria-hidden />
                        <span className={clsx(
                            'text-xs truncate tracking-tight text-slate-900',
                            selected ? 'font-bold' : 'font-semibold'
                        )}>
                            {KIND_LABEL[h.kind]}
                        </span>
                    </div>
                    <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                        {fmtTime(h.detected_at)}
                    </span>
                </div>

                {/* Row 2: Member Name */}
                <div className="mt-1 pl-4 text-xs text-slate-700 font-medium truncate">
                    {h.member_name}
                </div>

                {/* Row 3: Relevant Metric & Category */}
                <div className="mt-0.5 pl-4 text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                    {stat && <span className="font-medium text-slate-700 tabular-nums">{stat}</span>}
                    {stat && <span>·</span>}
                    <span>{KIND_CATEGORY[h.kind]}</span>
                </div>
            </button>
        </li>
    );
}

// ---------------------------------------------------------------- inspector

interface InspectorProps {
    h: OwlLensHighlight;
    evidence: Evidence;
    canReview: boolean;
    busy: boolean;
    choosingReason: boolean;
    fmtTime: (iso: string | null) => string;
    onReview: (status: HighlightStatus, reason?: string) => void;
    onChooseReason: (open: boolean) => void;
}

function Inspector({ h, evidence, canReview, busy, choosingReason, fmtTime, onReview, onChooseReason }: InspectorProps) {
    const link = sourceLink(h);
    const email = distinctEmail(h);
    const spotted = fmtTime(h.detected_at);
    const updated = fmtTime(h.updated_at);
    const [overflowOpen, setOverflowOpen] = useState(false);
    const overflowRef = useRef<HTMLDivElement>(null);

    // Close overflow menu on outside click
    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
                setOverflowOpen(false);
            }
        }
        if (overflowOpen) {
            document.addEventListener('mousedown', handleOutside);
            return () => document.removeEventListener('mousedown', handleOutside);
        }
    }, [overflowOpen]);

    // Deviation colors based on alert severity
    const devBadgeStyle = h.severity === 'critical'
        ? 'bg-rose-50 text-rose-700 border border-rose-200'
        : h.severity === 'warning'
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-slate-100 text-slate-700 border border-slate-200';

    const devBarStyle = h.severity === 'critical'
        ? 'bg-rose-600'
        : h.severity === 'warning'
            ? 'bg-amber-500'
            : 'bg-slate-700';

    const devTextStyle = h.severity === 'critical'
        ? 'text-rose-600 font-bold'
        : h.severity === 'warning'
            ? 'text-amber-600 font-bold'
            : 'text-slate-800 font-bold';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Sticky Case Header */}
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
                {/* Left Meta & Identity */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs mb-1">
                        <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border', SEVERITY_PILL[h.severity])}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', SEVERITY_DOT[h.severity])} aria-hidden />
                            {SEVERITY_LABEL[h.severity]}
                        </span>
                        <span className="text-slate-500 font-medium">{KIND_CATEGORY[h.kind]}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 tabular-nums">
                            Spotted {spotted}{updated && updated !== spotted ? `, updated ${updated}` : ''}
                        </span>
                    </div>

                    <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                        {KIND_LABEL[h.kind]}
                    </h2>

                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#0B2559]/10 text-[#0B2559] flex items-center justify-center text-[10px] font-bold">
                            {initials(h.member_name)}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{h.member_name}</span>
                        {email && <span className="text-xs text-slate-500">({email})</span>}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                        to={link.to}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors shadow-xs"
                    >
                        {link.label}
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>

                    {canReview && h.status === 'active' && (
                        <>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onReview('acknowledged')}
                                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#0B2559] hover:bg-[#0B2559]/90 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                            >
                                <Check className="w-3.5 h-3.5" aria-hidden />
                                Acknowledge
                            </button>

                            {/* Overflow Actions Menu */}
                            <div className="relative" ref={overflowRef}>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => setOverflowOpen(prev => !prev)}
                                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                    title="More actions"
                                    aria-expanded={overflowOpen}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {overflowOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            type="button"
                                            onClick={() => { setOverflowOpen(false); onChooseReason(true); }}
                                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                        >
                                            Mark as expected...
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setOverflowOpen(false); onReview('dismissed'); }}
                                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                        >
                                            Dismiss alert
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {canReview && h.status !== 'active' && (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onReview('active')}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Put back
                        </button>
                    )}
                </div>
            </header>

            {/* Reason selection overlay / prompt */}
            {choosingReason && canReview && h.status === 'active' && (
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">Mark as expected:</span>
                        <div className="flex items-center gap-1.5">
                            {EXPECTED_REASONS.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onReview('expected', r)}
                                    className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-800 transition-colors shadow-xs"
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChooseReason(false)}
                        className="text-xs text-slate-500 hover:text-slate-900"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-4xl no-scrollbar">
                {/* 1. KPI Strip */}
                {evidence.tiles.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key Metrics</h3>
                        <div className={clsx(
                            'rounded-xl border border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white shadow-xs',
                            evidence.tiles.length === 3 && 'grid grid-cols-1 sm:grid-cols-3',
                            evidence.tiles.length === 2 && 'grid grid-cols-1 sm:grid-cols-2',
                            evidence.tiles.length === 1 && 'grid grid-cols-1',
                        )}>
                            {evidence.tiles.map(t => (
                                <div key={t.label} className="p-4 flex flex-col justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1 truncate" title={t.value}>
                                        {t.value}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1 truncate">{t.caption}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. Baseline Deviation */}
                <section className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Baseline Deviation</h3>
                    {evidence.deviation ? (
                        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-900">{evidence.deviation.label}</span>
                                <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums', devBadgeStyle)}>
                                    {evidence.deviation.varianceText}
                                </span>
                            </div>

                            {/* Comparison visualization */}
                            <div className="space-y-2.5 pt-1">
                                <div>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-600 font-medium">{evidence.deviation.baselineLabel}</span>
                                        <span className="font-semibold text-slate-700 tabular-nums">
                                            {evidence.deviation.baselineValue} {evidence.deviation.unit}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-slate-300 rounded-full"
                                            style={{
                                                width: `${Math.min(100, Math.round((evidence.deviation.baselineValue / Math.max(evidence.deviation.baselineValue, evidence.deviation.observedValue)) * 100))}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-700 font-medium">{evidence.deviation.observedLabel}</span>
                                        <span className={clsx('tabular-nums', devTextStyle)}>
                                            {evidence.deviation.observedValue} {evidence.deviation.unit}
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={clsx('h-full rounded-full transition-all duration-500', devBarStyle)}
                                            style={{
                                                width: `${Math.min(100, Math.round((evidence.deviation.observedValue / Math.max(evidence.deviation.baselineValue, evidence.deviation.observedValue)) * 100))}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500">
                            Baseline comparison unavailable for this rule-based signal.
                        </div>
                    )}
                </section>

                {/* 3. Signal Analysis */}
                <section className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Signal Analysis</h3>
                    <div className="border-l-2 border-[#0B2559] pl-4 py-1">
                        <p className="text-sm text-slate-700 leading-relaxed">
                            {evidence.why}
                        </p>
                    </div>
                </section>

                {/* 4. Session Context */}
                <section className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Session Context</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-3 border-t border-slate-200 text-xs">
                        <div>
                            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Application</span>
                            <span className="text-slate-800 font-semibold mt-0.5 block truncate">
                                {evidence.app || 'System / All Applications'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Session Window</span>
                            <span className="text-slate-800 font-semibold mt-0.5 block truncate">
                                {evidence.range || 'Full business day'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Detection Basis</span>
                            <span className="text-slate-800 font-semibold mt-0.5 block truncate">
                                {KIND_CATEGORY[h.kind]} · {KIND_LABEL[h.kind]}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Member Baseline</span>
                            <span className="text-slate-800 font-semibold mt-0.5 block truncate">
                                {BASELINE_LABEL[h.baseline_source]}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Status info if reviewed */}
                {h.status !== 'active' && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{STATUS_LABEL[h.status]}</span>
                        {h.status === 'expected' && h.status_reason ? ` (${h.status_reason})` : ''}
                        {h.status_by_name ? ` by ${h.status_by_name}` : ''}
                        {h.status_at ? ` at ${fmtTime(h.status_at)}` : ''}.
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- calm state

function CalmState({ view, isToday, filtersActive, neverChecked }: {
    view: View;
    isToday: boolean;
    filtersActive: boolean;
    neverChecked: boolean;
}) {
    if (neverChecked) {
        return (
            <EmptyState
                icon={<Sparkles className="w-8 h-8 opacity-60" aria-hidden />}
                title="Owl Lens has not checked yet"
                description="The first check runs within 10 minutes of Owl Lens being switched on. Highlights will appear here after that."
            />
        );
    }
    if (view === 'reviewed') {
        return (
            <EmptyState
                icon={<Check className="w-8 h-8 opacity-60" aria-hidden />}
                title="Nothing reviewed yet"
                description="Highlights you acknowledge, dismiss or mark as expected will be listed here."
            />
        );
    }
    if (filtersActive) {
        return (
            <EmptyState
                icon={<Filter className="w-8 h-8 opacity-60" aria-hidden />}
                title="Nothing matches these filters"
                description="Try a different team or severity to see the rest of the day."
            />
        );
    }
    return (
        <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-emerald-500" aria-hidden />}
            title={isToday ? 'Everything looks normal today' : 'Everything looked normal on this day'}
            description={isToday
                ? 'No unusual activity, missing starts, or extended idle periods detected.'
                : 'No unusual activity, missing starts, or extended idle periods were found.'}
        />
    );
}
