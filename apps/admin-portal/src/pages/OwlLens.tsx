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
import { PageLayout, DatePicker, FilterSelect, RefreshButton, EmptyState, LoadingState, Modal } from '../components/ui';
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
    long_day: 'Very long workday',
    idle: 'Timer running while away',
    low_input: 'Very low activity on timer',
    input_pattern: 'Unusual activity pattern',
    app_mix: 'Unfamiliar apps used',
    focus: 'Strong focus stretch',
    non_productive: 'Non-productive sites',
};

const KIND_CATEGORY: Record<HighlightKind, string> = {
    not_started: 'Attendance',
    long_day: 'Attendance',
    idle: 'Activity',
    low_input: 'Activity',
    input_pattern: 'Activity',
    app_mix: 'Apps & Websites',
    focus: 'Focus',
    non_productive: 'Apps & Websites',
};

function highlightTitle(h: OwlLensHighlight): string {
    if (h.kind === 'input_pattern') {
        const pat = h.evidence?.pattern;
        if (pat === 'held_key') return 'Held key detected';
        if (pat === 'move_only') return 'Mouse jiggler detected';
        if (pat === 'no_pause') return 'Automated activity detected';
        return 'Unusual activity pattern';
    }
    if (h.kind === 'idle') return 'Timer running while away';
    if (h.kind === 'low_input') return 'Very low activity on timer';
    if (h.kind === 'app_mix') return 'Unfamiliar apps used';
    if (h.kind === 'long_day') return 'Very long workday';
    return KIND_LABEL[h.kind];
}

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
    const inspectorRef = useRef<HTMLElement>(null);

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

    // Auto-select first available item if none selected or selection not in shown
    const selected = shown.find(h => h.id === selectedId) ?? shown[0] ?? null;

    const evidence = useMemo(
        () => new Map(shown.map(h => [h.id, evidenceFor(h, isToday, fmtTime)])),
        [shown, isToday, fmtTime],
    );

    const select = (id: string) => {
        setSelectedId(id);
        setChoosingReasonFor(null);
        if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
            inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
        <PageLayout
            maxWidth="wide"
            title="Owl Lens"
            description="Only what is out of the ordinary, compared with each person's own normal."
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    {teams.length > 0 && (
                        <div className="w-36 md:w-44 h-10">
                            <FilterSelect
                                icon={<Users className="w-3.5 h-3.5 text-text-muted" />}
                                value={teamFilter}
                                onChange={setTeamFilter}
                                className="h-10"
                                options={[
                                    { id: 'all', name: role === 'Manager' ? 'All my teams' : 'All teams' },
                                    ...teams.map(t => ({ id: t.id, name: t.name })),
                                ]}
                            />
                        </div>
                    )}
                    <div className="w-36 md:w-40 h-10">
                        <FilterSelect
                            icon={<Filter className="w-3.5 h-3.5 text-text-muted" />}
                            value={severityFilter}
                            onChange={v => setSeverityFilter(v as SeverityFilter)}
                            className="h-10"
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
                        className="flex items-center h-10 bg-surface border border-border rounded-xl shadow-xs overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => shiftDay(-1)}
                            className="h-full px-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-colors border-r border-border shrink-0"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                        <DatePicker
                            value={date}
                            onChange={val => setPickedDate(val >= today ? null : val)}
                            maxDate={today}
                            anchorRef={dayNavRef}
                            className="h-full min-w-[150px] md:min-w-[170px]"
                            triggerClassName="h-full px-3 py-0 border-0 bg-transparent hover:bg-surface-hover shadow-none rounded-none w-full"
                        />
                        <button
                            type="button"
                            onClick={() => shiftDay(1)}
                            className="h-full px-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-colors disabled:opacity-20 border-l border-border shrink-0"
                            title="Next day"
                            disabled={isToday}
                        >
                            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                    </div>

                    <RefreshButton onClick={() => load(true)} refreshing={refreshing} label="Refresh" className="h-10 w-10 rounded-xl" />
                </div>
            }
        >
            {loading ? (
                <div className="min-h-[50vh] flex items-center justify-center">
                    <LoadingState message="Looking for anything out of the ordinary..." />
                </div>
            ) : loadError ? (
                <EmptyState
                    icon={<AlertTriangle className="w-8 h-8 opacity-60" aria-hidden />}
                    title="Owl Lens could not load"
                    description={loadError}
                    action={
                        <button
                            onClick={() => load()}
                            className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-hover text-sm font-semibold text-text-main"
                        >
                            Try again
                        </button>
                    }
                />
            ) : (
                <div className="flex flex-col gap-4 pb-16">
                    {actionError && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-sm text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                            <span className="flex-1">{actionError}</span>
                            <button onClick={() => setActionError(null)} aria-label="Close" className="shrink-0 opacity-70 hover:opacity-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Split Pane: Signal Queue on Left, Case Inspector on Right */}
                    <div className={clsx(
                        'grid gap-4 md:gap-5 items-start',
                        shown.length > 0 && 'lg:grid-cols-[380px_minmax(0,1fr)]'
                    )}>
                        {/* Left Rail: Signal Queue */}
                        <section className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col" aria-label="Signal queue">
                            <div className="flex items-center justify-between border-b border-border px-4 h-11 bg-surface/50 shrink-0">
                                <div className="flex items-center gap-4 h-full">
                                    <button
                                        type="button"
                                        onClick={() => setView('open')}
                                        className={clsx(
                                            'h-full flex items-center gap-1.5 text-xs font-semibold transition-colors border-b-2 -mb-px',
                                            view === 'open'
                                                ? 'text-text-main border-[#0B2559] dark:border-accent'
                                                : 'text-text-muted hover:text-text-main border-transparent'
                                        )}
                                    >
                                        <span>Needs Attention</span>
                                        <span className={clsx(
                                            'px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-semibold',
                                            view === 'open'
                                                ? 'bg-[#0B2559]/10 text-[#0B2559] dark:bg-accent/15 dark:text-accent'
                                                : 'bg-surface-hover text-text-muted'
                                        )}>
                                            {open.length}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('reviewed')}
                                        className={clsx(
                                            'h-full flex items-center gap-1.5 text-xs font-semibold transition-colors border-b-2 -mb-px',
                                            view === 'reviewed'
                                                ? 'text-text-main border-[#0B2559] dark:border-accent'
                                                : 'text-text-muted hover:text-text-main border-transparent'
                                        )}
                                    >
                                        <span>Reviewed</span>
                                        <span className={clsx(
                                            'px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-semibold',
                                            view === 'reviewed'
                                                ? 'bg-[#0B2559]/10 text-[#0B2559] dark:bg-accent/15 dark:text-accent'
                                                : 'bg-surface-hover text-text-muted'
                                        )}>
                                            {reviewed.length}
                                        </span>
                                    </button>
                                </div>

                                {view === 'open' && (criticalCount > 0 || warningCount > 0) && (
                                    <div className="text-[11px] text-text-muted tabular-nums shrink-0 pl-2">
                                        {criticalCount > 0 && (
                                            <span className="font-semibold text-rose-600 dark:text-rose-400">{criticalCount} critical</span>
                                        )}
                                        {criticalCount > 0 && warningCount > 0 && <span className="mx-1">·</span>}
                                        {warningCount > 0 && (
                                            <span className="font-semibold text-amber-600 dark:text-amber-400">{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {shown.length === 0 ? (
                                <div className="p-8 text-center">
                                    <CalmState
                                        view={view}
                                        isToday={isToday}
                                        filtersActive={filtersActive}
                                        neverChecked={!runState?.last_run_at && highlights.length === 0}
                                    />
                                </div>
                            ) : (
                                <ul className="divide-y divide-border/60 max-h-[640px] overflow-y-auto no-scrollbar">
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
                        </section>

                        {/* Right Rail: Case Inspector */}
                        {selected && (
                            <section
                                ref={inspectorRef}
                                aria-label="Signal inspector"
                                className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden scroll-mt-4 lg:sticky lg:top-4"
                            >
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
                            </section>
                        )}
                    </div>
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
                            <p className="sm:mr-auto text-[12px] text-text-muted">
                                Change the list in Settings → Telemetry.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={closeNonProductive}
                            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text-main transition-colors"
                        >
                            Close
                        </button>
                    </>
                }
            >
                <ul className="flex flex-col divide-y divide-border">
                    {nonProductive.map(h => {
                        const sites = Object.entries((h.evidence.domains as Record<string, unknown>) || {})
                            .sort(([, a], [, b]) => num(b) - num(a))
                            .slice(0, 3)
                            .map(([domain]) => domain);
                        return (
                            <li key={h.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 min-w-0">
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Globe className="w-4 h-4" aria-hidden />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text-main truncate">{h.member_name}</p>
                                    <p className="text-[12px] text-text-muted truncate">
                                        {fmtMins(num(h.evidence.nonproductive_mins))} of {fmtMins(num(h.evidence.tracked_mins))} tracked
                                        {sites.length > 0 && <> · {sites.join(', ')}</>}
                                    </p>
                                </div>
                                <span className="shrink-0 px-2 py-0.5 rounded-md border text-[12px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                    {num(h.evidence.share_pct)}%
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Modal>
        </PageLayout>
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

function baselineSourceLabel(h: OwlLensHighlight): string {
    if (h.baseline_source === 'personal') return 'Their usual work pattern';
    if (h.baseline_source === 'team') return "Their team's normal average";
    if (h.baseline_source === 'organization') return "Company average";
    if (h.kind === 'input_pattern') {
        const pat = h.evidence?.pattern;
        if (pat === 'held_key') return 'Normal human typing limit';
        if (pat === 'move_only') return 'Normal mouse activity rule';
        return 'Standard human activity benchmark';
    }
    if (h.kind === 'idle') return 'Company idle auto-stop rule';
    if (h.kind === 'non_productive') return 'Company restricted sites policy';
    return 'Standard workplace rule';
}

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
    let app = typeof e.app === 'string' && e.app ? e.app : '';
    const range = h.window_start && h.window_end ? `${fmtTime(h.window_start)} – ${fmtTime(h.window_end)}` : '';
    let stat = '';
    let why = h.detail;
    let deviation: DeviationData | null = null;

    switch (h.kind) {
        case 'not_started': {
            const missed = Math.max(1, num(e.missed_working_days));
            const last = shortDate(e.last_worked);
            tile(true, 'Untracked Days', String(missed), 'Consecutive workdays');
            tile(has('usual_start_min'), 'Normal Start', clock(e.usual_start_min), 'Usual start time');
            tile(last, 'Last Worked', last, 'Previous active day');
            stat = missed >= 2 ? `${missed} days untracked` : has('usual_start_min') ? `Usually starts ${clock(e.usual_start_min)}` : 'Not started';
            why = missed >= 2
                ? `They have not tracked any time for ${missed} scheduled workdays in a row. This is unusual based on their normal schedule.`
                : `${isToday ? 'No time has been tracked today' : 'No time was tracked that day'}. They normally start working around ${clock(e.usual_start_min)} on this weekday. This alert appears after waiting an hour past their normal start time.`;
            break;
        }
        case 'long_day': {
            const tracked = num(e.tracked_mins);
            const usual = num(e.usual_mins);
            tile(has('tracked_mins'), 'Tracked Today', mins(tracked), 'Total hours tracked');
            tile(has('usual_mins'), 'Usual Day', mins(usual), 'Their normal workday');
            tile(has('longest_break_mins'), 'Longest Break', mins(e.longest_break_mins), 'Longest rest taken');
            stat = `${mins(tracked)} tracked`;
            why = `Today's shift is significantly longer than their usual day (${mins(tracked)} tracked vs ${mins(usual)} normal), with very few breaks taken. This could mean overtime, or that a timer was accidentally left running after work.`;
            if (usual > 0 && tracked > usual) {
                const diff = tracked - usual;
                const multiplier = (tracked / usual).toFixed(1);
                deviation = {
                    label: 'Workday Length',
                    observedLabel: 'Hours worked today',
                    observedValue: tracked,
                    baselineLabel: 'Normal workday',
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
                tile(has('idle_share'), 'Idle Time', pct(idleShare), 'Of tracked shift');
                tile(has('usual_idle_share'), 'Usual Idle', pct(usualShare), 'Their normal average');
                tile(has('tracked_mins'), 'Shift Total', mins(e.tracked_mins), 'Total hours tracked');
                stat = `${pct(idleShare)} idle`;
                why = `A much larger portion of today's shift had zero keyboard or mouse activity compared to their normal average (${pct(idleShare)} idle today vs ${pct(usualShare)} normally).`;
                if (usualShare > 0) {
                    const diffPct = Math.round((idleShare - usualShare) * 100);
                    deviation = {
                        label: 'Idle Time Share',
                        observedLabel: "Today's idle time",
                        observedValue: Math.round(idleShare * 100),
                        baselineLabel: 'Their usual idle time',
                        baselineValue: Math.round(usualShare * 100),
                        unit: '%',
                        varianceText: `+${diffPct}% more idle than usual`,
                    };
                }
            } else {
                const stop = num(e.idle_stop_mins);
                const stretch = num(e.minutes);
                const stretches = num(e.stretches);
                tile(has('minutes'), 'Idle Time', mins(stretch), stretches > 1 ? `Across ${stretches} stretches` : 'Continuous without input');
                tile(h.window_start, 'Started', fmtTime(h.window_start), 'Time spotted');
                tile(true, 'Auto-Stop Rule', stop > 0 ? `${stop} min` : 'Off', 'Company setting');
                stat = stretches > 1 ? `${mins(stretch)} idle (${stretches} stretches)` : `${mins(stretch)} idle`;
                why = `The timer was running for ${mins(stretch)}${stretches > 1 ? ` across ${stretches} stretches` : ''} with zero keyboard or mouse activity. It appears the member stepped away from their computer without pausing their timer.`
                    + (stop > 0 && stretch > stop ? " It also exceeded the company idle auto-stop threshold." : '');
                if (stop > 0 && stretch > stop) {
                    deviation = {
                        label: 'Unattended Idle Time',
                        observedLabel: 'Recorded idle time',
                        observedValue: stretch,
                        baselineLabel: 'Auto-stop limit',
                        baselineValue: stop,
                        unit: 'min',
                        varianceText: `+${stretch - stop} min past auto-stop`,
                    };
                }
            }
            break;
        }
        case 'low_input': {
            const m = num(e.minutes);
            const stretches = num(e.stretches);
            tile(has('minutes'), 'Duration', mins(m), stretches > 1 ? `Across ${stretches} stretches` : 'Time running');
            tile(h.window_start, 'Started', fmtTime(h.window_start), 'Start time');
            tile(h.window_end, 'Ended', fmtTime(h.window_end), 'End time');
            stat = stretches > 1 ? `${mins(m)} low activity (${stretches} stretches)` : `${mins(m)} low activity`;
            why = `The timer ran for ${mins(m)}${stretches > 1 ? ` across ${stretches} stretches` : ''} in ${app || 'an open window'} with only a few seconds of typing or clicking each minute. The computer was likely left unattended with an app open in the foreground.`;
            break;
        }
        case 'input_pattern': {
            const m = num(e.minutes);
            const stretches = num(e.stretches);
            if (e.pattern === 'held_key') {
                const rate = m > 0 ? Math.round(num(e.keystrokes) / m) : 0;
                tile(has('keystrokes'), 'Keystrokes', count(e.keystrokes), stretches > 1 ? `Across ${stretches} stretches (${mins(m)} total)` : `Over ${mins(m)} total`);
                tile(rate > 0, 'Typing Speed', `${count(rate)}/min`, 'Keys per minute');
                tile(has('clicks'), 'Mouse Clicks', count(e.clicks), 'Total clicks');
                stat = rate > 0 ? `${count(rate)} keys/min` : `${mins(m)} held key`;
                why = `A key appears to have been held or weighed down. Over ${count(e.keystrokes)} keystrokes were recorded in ${app || 'an open window'} at an impossible speed of ${count(rate)} keys per minute${stretches > 1 ? ` across ${stretches} separate stretches (${mins(m)} total)` : ` (${mins(m)} duration)`}, with almost zero mouse clicks. This usually happens when an object is placed on the keyboard to make the user look active while away.`;
                if (rate > 0) {
                    const humanPace = 350; // standard benchmark for sustained human typing
                    deviation = {
                        label: 'Typing Speed',
                        observedLabel: 'Recorded typing speed',
                        observedValue: rate,
                        baselineLabel: 'Max human typing limit',
                        baselineValue: humanPace,
                        unit: 'keys/min',
                        varianceText: `${(rate / humanPace).toFixed(1)}x faster than human limit`,
                    };
                }
            } else {
                tile(has('minutes'), 'Duration', mins(m), stretches > 1 ? `Across ${stretches} stretches` : 'Continuous movement');
                tile(has('keystrokes'), 'Keystrokes', count(e.keystrokes), 'Keys typed');
                tile(has('clicks'), 'Mouse Clicks', count(e.clicks), 'Clicks recorded');
                stat = e.pattern === 'move_only'
                    ? (stretches > 1 ? `${mins(m)} move-only (${stretches} stretches)` : `${mins(m)} without keys/clicks`)
                    : (stretches > 1 ? `${mins(m)} continuous (${stretches} stretches)` : `${mins(m)} continuous`);
                why = e.pattern === 'move_only'
                    ? `Continuous mouse movement was recorded for ${mins(m)}${stretches > 1 ? ` across ${stretches} stretches` : ''} with zero typing and zero clicks in ${app || 'an open window'}. This is the classic signature of an automated mouse jiggler used to keep the computer awake while away.`
                    : `Non-stop activity was recorded for ${mins(m)}${stretches > 1 ? ` across ${stretches} stretches` : ''} without any of the natural short pauses people take while working. This pattern usually points to an automated macro or script.`;
            }
            break;
        }
        case 'app_mix':
            tile(has('unfamiliar_share'), 'New Apps', pct(e.unfamiliar_share), 'Time in new software');
            tile(has('tracked_mins'), 'Tracked Today', mins(e.tracked_mins), 'Total hours tracked');
            stat = `${pct(e.unfamiliar_share)} unfamiliar apps`;
            why = "Most of today's time was spent in applications they rarely or never use. This could be a new tool or project, or time spent outside normal work tasks.";
            break;
        case 'focus': {
            const run = num(e.minutes);
            const usualRun = num(e.usual_run_mins);
            tile(has('minutes'), 'Unbroken Focus', mins(run), 'Steady active work');
            tile(has('usual_run_mins'), 'Typical Best', mins(usualRun), 'Their usual best run');
            tile(h.window_start, 'Started', fmtTime(h.window_start), 'Focus start time');
            stat = `${mins(run)} unbroken`;
            why = `A significantly longer stretch of steady, active work than they usually manage (${mins(run)} continuous). A great sign of deep focus.`;
            if (usualRun > 0 && run > usualRun) {
                deviation = {
                    label: 'Unbroken Work Run',
                    observedLabel: "Today's steady run",
                    observedValue: run,
                    baselineLabel: 'Typical best run',
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
            const topDomains = Object.entries((e.domains as Record<string, unknown>) || {})
                .sort(([, a], [, b]) => num(b) - num(a));

            const topSiteBreakdown = topDomains.map(([domain, minutes]) => `${domain} (${mins(minutes)})`);
            if (topDomains.length > 0) {
                app = topSiteBreakdown.slice(0, 3).join(', ');
            }

            tile(has('share_pct'), 'Restricted Time', `${share}%`, 'Of tracked shift');
            tile(has('nonproductive_mins'), 'Time on Sites', mins(e.nonproductive_mins), 'Non-work browsing');
            tile(has('tracked_mins'), 'Shift Total', mins(e.tracked_mins), 'Total hours tracked');

            stat = topDomains.length > 0
                ? `${share}% non-prod (${topDomains[0]![0]})`
                : `${share}% non-productive`;

            why = topSiteBreakdown.length > 0
                ? `Over a quarter of today's tracked shift was spent on non-work websites, primarily ${topSiteBreakdown.slice(0, 3).join(', ')}. TrackOwl flags this when non-work browsing exceeds 25% of working hours.`
                : (h.detail || 'A quarter or more of today\'s tracked shift was on sites the company counts as non-productive, such as social media or streaming video.');

            if (share >= threshold) {
                deviation = {
                    label: 'Time on Restricted Websites',
                    observedLabel: 'Actual time on sites',
                    observedValue: share,
                    baselineLabel: 'Allowed company limit',
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
    critical: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
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
                        ? 'bg-surface dark:bg-surface-hover border-[#0B2559] dark:border-accent shadow-xs'
                        : 'bg-transparent hover:bg-surface-hover/60 border-transparent'
                )}
            >
                {/* Row 1: Severity dot, Alert Title, Timestamp */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={clsx('w-2 h-2 rounded-full shrink-0', SEVERITY_DOT[h.severity])} aria-hidden />
                        <span className={clsx(
                            'text-xs truncate tracking-tight text-text-main',
                            selected ? 'font-bold' : 'font-semibold'
                        )}>
                            {highlightTitle(h)}
                        </span>
                    </div>
                    <span className="text-[11px] text-text-muted tabular-nums shrink-0">
                        {fmtTime(h.detected_at)}
                    </span>
                </div>

                {/* Row 2: Member Name */}
                <div className="mt-1 pl-4 text-xs text-text-muted font-medium truncate">
                    {h.member_name}
                </div>

                {/* Row 3: Relevant Metric & Category */}
                <div className="mt-0.5 pl-4 text-[11px] text-text-muted/80 truncate flex items-center gap-1.5">
                    {stat && <span className="font-medium text-text-main/90 tabular-nums">{stat}</span>}
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
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
        : h.severity === 'warning'
            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
            : 'bg-surface-hover text-text-muted border-border';

    const devBarStyle = h.severity === 'critical'
        ? 'bg-rose-600'
        : h.severity === 'warning'
            ? 'bg-amber-500'
            : 'bg-[#0B2559] dark:bg-accent';

    const devTextStyle = h.severity === 'critical'
        ? 'text-rose-600 dark:text-rose-400 font-bold'
        : h.severity === 'warning'
            ? 'text-amber-600 dark:text-amber-400 font-bold'
            : 'text-text-main font-bold';

    return (
        <div className="flex flex-col bg-surface">
            {/* Sticky Case Header */}
            <header className="sticky top-0 z-10 bg-surface border-b border-border px-6 py-4 flex items-start justify-between gap-4 shrink-0">
                {/* Left: Title, Severity & Context */}
                <div className="min-w-0 space-y-1.5">
                    {/* Row 1: Severity pill + Alert title */}
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                        <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px] border shrink-0', SEVERITY_PILL[h.severity])}>
                            <span className={clsx('w-1.5 h-1.5 rounded-full', SEVERITY_DOT[h.severity])} aria-hidden />
                            {SEVERITY_LABEL[h.severity]}
                        </span>
                        <h2 className="text-base md:text-lg font-bold text-text-main tracking-tight">
                            {highlightTitle(h)}
                        </h2>
                    </div>

                    {/* Row 2: Member avatar & name · Category · Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                        <div className="flex items-center gap-1.5 text-text-main font-medium" title={email ?? undefined}>
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                                {initials(h.member_name)}
                            </span>
                            <span className="truncate">{h.member_name}</span>
                        </div>
                        <span className="text-border">·</span>
                        <span className="font-medium">{KIND_CATEGORY[h.kind]}</span>
                        <span className="text-border">·</span>
                        <span className="tabular-nums">Spotted {spotted}</span>
                        {updated && updated !== spotted && (
                            <>
                                <span className="text-border">·</span>
                                <span className="tabular-nums">Updated {updated}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <Link
                        to={link.to}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text-main transition-colors shadow-xs"
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
                                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#0B2559] hover:bg-[#0B2559]/90 dark:bg-accent dark:text-slate-950 dark:hover:bg-accent/90 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
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
                                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
                                    title="More actions"
                                    aria-expanded={overflowOpen}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>

                                {overflowOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-surface shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            type="button"
                                            onClick={() => { setOverflowOpen(false); onChooseReason(true); }}
                                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-text-main hover:bg-surface-hover transition-colors"
                                        >
                                            Mark as expected...
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setOverflowOpen(false); onReview('dismissed'); }}
                                            className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text-main transition-colors disabled:opacity-50"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Put back
                        </button>
                    )}
                </div>
            </header>

            {/* Reason selection overlay / prompt */}
            {choosingReason && canReview && h.status === 'active' && (
                <div className="border-b border-border bg-surface-hover px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-main">Mark as expected:</span>
                        <div className="flex items-center gap-1.5">
                            {EXPECTED_REASONS.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onReview('expected', r)}
                                    className="px-2.5 py-1 rounded-md bg-surface border border-border hover:bg-surface-hover text-xs font-medium text-text-main transition-colors shadow-xs"
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChooseReason(false)}
                        className="text-xs text-text-muted hover:text-text-main"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Inspector Body */}
            <div className="p-6 md:p-8 space-y-6">
                {/* 1. KPI Strip */}
                {evidence.tiles.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Activity Summary</h3>
                        <div className={clsx(
                            'rounded-xl border border-border divide-y sm:divide-y-0 sm:divide-x divide-border bg-surface shadow-xs',
                            evidence.tiles.length === 3 && 'grid grid-cols-1 sm:grid-cols-3',
                            evidence.tiles.length === 2 && 'grid grid-cols-1 sm:grid-cols-2',
                            evidence.tiles.length === 1 && 'grid grid-cols-1',
                        )}>
                            {evidence.tiles.map(t => (
                                <div key={t.label} className="p-4 flex flex-col justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{t.label}</p>
                                    <p className="text-2xl font-bold text-text-main tabular-nums mt-1 truncate" title={t.value}>
                                        {t.value}
                                    </p>
                                    <p className="text-[11px] text-text-muted mt-1 truncate">{t.caption}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. Baseline Deviation */}
                <section className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Comparison With Normal</h3>
                    {evidence.deviation ? (
                        <div className="p-4 rounded-xl border border-border bg-surface shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-text-main">{evidence.deviation.label}</span>
                                <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums', devBadgeStyle)}>
                                    {evidence.deviation.varianceText}
                                </span>
                            </div>

                            {/* Comparison visualization */}
                            <div className="space-y-2.5 pt-1">
                                <div>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-text-muted font-medium">{evidence.deviation.baselineLabel}</span>
                                        <span className="font-semibold text-text-main tabular-nums">
                                            {evidence.deviation.baselineValue} {evidence.deviation.unit}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                                        <div
                                            className="h-full bg-border rounded-full"
                                            style={{
                                                width: `${Math.min(100, Math.round((evidence.deviation.baselineValue / Math.max(evidence.deviation.baselineValue, evidence.deviation.observedValue)) * 100))}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-text-muted font-medium">{evidence.deviation.observedLabel}</span>
                                        <span className={clsx('tabular-nums', devTextStyle)}>
                                            {evidence.deviation.observedValue} {evidence.deviation.unit}
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full rounded-full bg-surface-hover overflow-hidden">
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
                        <div className="rounded-xl border border-border bg-surface/50 p-4 text-xs text-text-muted">
                            This flag is based on a standard company rule rather than a comparison to previous days.
                        </div>
                    )}
                </section>

                {/* 3. Signal Analysis */}
                <section className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">What This Means</h3>
                    <div className="border-l-2 border-[#0B2559] dark:border-accent pl-4 py-1">
                        <p className="text-sm text-text-main leading-relaxed">
                            {evidence.why}
                        </p>
                    </div>
                </section>

                {/* 4. Session Context */}
                <section className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Activity Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pt-3 border-t border-border text-xs">
                        <div>
                            <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider">
                                {h.kind === 'non_productive' ? 'Identified Sites / Apps' : 'Application'}
                            </span>
                            <span className="text-text-main font-semibold mt-0.5 block truncate" title={evidence.app || undefined}>
                                {evidence.app || (h.kind === 'non_productive' ? 'Web Browsers' : 'System / All Applications')}
                            </span>
                        </div>
                        <div>
                            <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider">Time Window</span>
                            <span className="text-text-main font-semibold mt-0.5 block truncate">
                                {evidence.range || 'Full business day'}
                            </span>
                        </div>
                        <div>
                            <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider">Category</span>
                            <span className="text-text-main font-semibold mt-0.5 block truncate">
                                {KIND_CATEGORY[h.kind]} · {highlightTitle(h)}
                            </span>
                        </div>
                        <div>
                            <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider">Compared Against</span>
                            <span className="text-text-main font-semibold mt-0.5 block truncate">
                                {baselineSourceLabel(h)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Status info if reviewed */}
                {h.status !== 'active' && (
                    <div className="p-3 rounded-lg bg-surface-hover border border-border text-xs text-text-muted">
                        <span className="font-semibold text-text-main">{STATUS_LABEL[h.status]}</span>
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
                icon={<Sparkles className="w-8 h-8 opacity-60 text-text-muted" aria-hidden />}
                title="Owl Lens has not checked yet"
                description="The first check runs within 10 minutes of Owl Lens being switched on. Highlights will appear here after that."
            />
        );
    }
    if (view === 'reviewed') {
        return (
            <EmptyState
                icon={<Check className="w-8 h-8 opacity-60 text-text-muted" aria-hidden />}
                title="Nothing reviewed yet"
                description="Highlights you acknowledge, dismiss or mark as expected will be listed here."
            />
        );
    }
    if (filtersActive) {
        return (
            <EmptyState
                icon={<Filter className="w-8 h-8 opacity-60 text-text-muted" aria-hidden />}
                title="Nothing matches these filters"
                description="Try a different team or severity to see the rest of the day."
            />
        );
    }
    return (
        <EmptyState
            icon={<ShieldCheck className="w-8 h-8 text-emerald-500 dark:text-emerald-400" aria-hidden />}
            title={isToday ? 'Everything looks normal today' : 'Everything looked normal on this day'}
            description={isToday
                ? 'No unusual activity, missing starts, or extended idle periods detected.'
                : 'No unusual activity, missing starts, or extended idle periods were found.'}
        />
    );
}
