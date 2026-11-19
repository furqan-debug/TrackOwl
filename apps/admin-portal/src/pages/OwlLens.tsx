import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
    Info,
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

/** "2 h 10 min" */
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

// Which non-productive pop-ups this browser has closed: "org:day" -> the cards
// it showed. It opens again when someone new crosses the line that day.
// Only a convenience: if storage is blocked the pop-up simply shows again.
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
        // Keep the most recent fortnight of days.
        const kept = Object.fromEntries(Object.entries(seen).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14));
        window.localStorage.setItem(NP_SEEN_KEY, JSON.stringify(kept));
    } catch {
        // storage unavailable; nothing to do
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

    // null follows "today", so the page never sits on a stale day after the
    // time zone settles or the clock passes midnight.
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
    // The alert open in the inspector. null, or one no longer in the queue,
    // falls back to the first in the queue, so the panel is never empty.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const inspectorRef = useRef<HTMLElement>(null);

    const requestSeqRef = useRef(0);
    // The day navigator (arrows and date); the calendar opens lined up with it.
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

    // The background check runs every 10 minutes; keep today's feed current.
    useEffect(() => {
        if (!isToday) return;
        const t = setInterval(() => load(true), AUTO_REFRESH_MS);
        return () => clearInterval(t);
    }, [isToday, load]);

    // Teams for the filter. A manager is offered only the teams they manage or lead.
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

    // Reset the reason picker and any error when the day changes.
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

    // Everyone at or over 25% non-productive that day, listed together. Not
    // narrowed by the team or severity filters; the database already limits
    // it to the people this viewer may see.
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

    // Quiet trial: the first 14 days only Owners and Admins see Owl Lens.
    const trialUntil = runState?.trial_until ? new Date(runState.trial_until) : null;
    const inTrial = !!trialUntil && trialUntil.getTime() > Date.now();
    const trialEndLabel = trialUntil
        ? trialUntil.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz })
        : '';
    const trialEndShort = trialUntil
        ? trialUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz })
        : '';
    const [endingTrial, setEndingTrial] = useState(false);
    const endTrial = async () => {
        if (!organizationId) return;
        setEndingTrial(true);
        setActionError(null);
        try {
            await owlLensService.endTrial(organizationId);
            await load(true);
        } catch (err) {
            console.error('[OwlLens] end trial failed:', err);
            setActionError(errorText(err, 'The trial could not be ended. Please try again.'));
        } finally {
            setEndingTrial(false);
        }
    };
    const npOpen = !loading && !loadError && !(inTrial && !isAdmin)
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

    // Worked out on each render, so it moves on whenever the feed reloads.
    const checkedAgo = (() => {
        if (!runState?.last_run_at) return null;
        const mins = Math.max(0, Math.round((Date.now() - new Date(runState.last_run_at).getTime()) / 60_000));
        if (mins < 1) return 'Checked just now';
        if (mins < 60) return `Checked ${mins} min ago`;
        return `Last checked at ${fmtTime(runState.last_run_at)}`;
    })();

    const selected = shown.find(h => h.id === selectedId) ?? shown[0] ?? null;
    const evidence = useMemo(
        () => new Map(shown.map(h => [h.id, evidenceFor(h, isToday, fmtTime)])),
        [shown, isToday, fmtTime],
    );

    const select = (id: string) => {
        setSelectedId(id);
        setChoosingReasonFor(null);
        // Stacked layout: bring the inspector into view under the queue.
        if (!window.matchMedia('(min-width: 1024px)').matches) {
            inspectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const review = async (h: OwlLensHighlight, status: HighlightStatus, reason?: string) => {
        // If this takes the alert out of the current tab, the next one in the
        // queue (or the one before, at the end) takes its place in the inspector.
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
            title="Owl Lens"
            description="Only what is out of the ordinary, compared with each person's own normal."
            actions={
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    {teams.length > 0 && (
                        <div className="w-44 md:w-48">
                            <FilterSelect
                                icon={<Users className="w-4 h-4 text-text-muted" />}
                                value={teamFilter}
                                onChange={setTeamFilter}
                                options={[
                                    { id: 'all', name: role === 'Manager' ? 'All my teams' : 'All teams' },
                                    ...teams.map(t => ({ id: t.id, name: t.name })),
                                ]}
                            />
                        </div>
                    )}
                    <div className="w-40 md:w-44">
                        <FilterSelect
                            icon={<Filter className="w-4 h-4 text-text-muted" />}
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

                    {/* At least as wide as the calendar (288px), so the open panel
                        fits exactly under this box, edge to edge. */}
                    <div
                        ref={dayNavRef}
                        className="flex items-center h-10 min-w-[288px] bg-surface border border-border p-1 rounded-xl shadow-shell-sm"
                    >
                        <button
                            onClick={() => shiftDay(-1)}
                            className="p-2 md:p-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <DatePicker
                            value={date}
                            onChange={val => setPickedDate(val >= today ? null : val)}
                            maxDate={today}
                            anchorRef={dayNavRef}
                            className="flex-1 min-w-[170px] md:min-w-[180px]"
                        />
                        <button
                            onClick={() => shiftDay(1)}
                            className="p-2 md:p-2.5 hover:bg-surface-hover text-text-muted hover:text-text-main transition-all rounded-lg disabled:opacity-20"
                            title="Next day"
                            disabled={isToday}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <RefreshButton onClick={() => load(true)} refreshing={refreshing} label="Refresh highlights" />
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
            ) : inTrial && !isAdmin ? (
                <EmptyState
                    icon={<ShieldCheck className="w-8 h-8 opacity-60" aria-hidden />}
                    title="Owl Lens is in its trial period"
                    description={`Your admins are checking the highlights before everyone relies on them. Owl Lens opens for you on ${trialEndLabel}.`}
                />
            ) : (
                <div className="flex flex-col gap-4 pb-16">
                    {inTrial && isAdmin && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 px-4 rounded-xl bg-sky-500/10 text-[13px]">
                            <Info className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden />
                            <p className="flex-1 min-w-[200px] text-text-main">
                                <span className="font-semibold">Admin preview until {trialEndShort}.</span>
                                <span className="text-text-muted"> Only Owners and Admins can see Owl Lens for now.</span>
                            </p>
                            <button
                                type="button"
                                onClick={endTrial}
                                disabled={endingTrial}
                                className="font-semibold text-sky-700 dark:text-sky-300 hover:underline underline-offset-2 disabled:opacity-50"
                            >
                                {endingTrial ? 'Ending trial…' : 'End trial now'}
                            </button>
                        </div>
                    )}

                    {actionError && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-sm text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                            <span className="flex-1">{actionError}</span>
                            <button onClick={() => setActionError(null)} aria-label="Close" className="shrink-0 opacity-70 hover:opacity-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Signal queue on the left, inspector on the right; stacked below lg. */}
                    <div className={clsx(
                        'grid gap-4 md:gap-5 items-start',
                        shown.length > 0 && 'lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]',
                    )}>
                        <section className="bg-surface rounded-2xl border border-border-soft shadow-sm" aria-label="Signal queue">
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 md:p-4">
                                <div className="inline-flex items-center bg-surface-hover rounded-lg p-1" role="tablist">
                                    {(['open', 'reviewed'] as View[]).map(v => (
                                        <button
                                            key={v}
                                            role="tab"
                                            aria-selected={view === v}
                                            onClick={() => setView(v)}
                                            className={clsx(
                                                'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors tabular-nums',
                                                view === v
                                                    ? 'bg-surface text-text-main shadow-xs'
                                                    : 'text-text-muted hover:text-text-main'
                                            )}
                                        >
                                            {v === 'open' ? `Needs attention (${open.length})` : `Reviewed (${reviewed.length})`}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-text-muted tabular-nums">
                                    {view === 'open' && criticalCount > 0 && <span className="text-rose-600 dark:text-rose-400 font-semibold">{criticalCount} critical</span>}
                                    {view === 'open' && criticalCount > 0 && warningCount > 0 && ' · '}
                                    {view === 'open' && warningCount > 0 && <span className="text-amber-700 dark:text-amber-300 font-semibold">{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</span>}
                                    {view === 'open' && (criticalCount > 0 || warningCount > 0) && checkedAgo && ' · '}
                                    {checkedAgo}
                                </p>
                            </div>

                            {shown.length === 0 ? (
                                <CalmState
                                    view={view}
                                    isToday={isToday}
                                    filtersActive={filtersActive}
                                    neverChecked={!runState?.last_run_at && highlights.length === 0}
                                />
                            ) : (
                                <ul className="flex flex-col gap-0.5 px-2 pb-2">
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

                        {selected && (
                            <section
                                ref={inspectorRef}
                                aria-label="Signal inspector"
                                className="bg-surface rounded-2xl border border-border-soft shadow-sm scroll-mt-4 lg:sticky lg:top-4"
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
                        <ActionButton onClick={closeNonProductive}>Close</ActionButton>
                    </>
                }
            >
                <ul className="flex flex-col divide-y divide-border">
                    {nonProductive.map(h => {
                        // jsonb does not keep key order, so sort by minutes here.
                        const sites = Object.entries((h.evidence.domains as Record<string, unknown>) || {})
                            .sort(([, a], [, b]) => num(b) - num(a))
                            .slice(0, 3)
                            .map(([domain]) => domain);
                        return (
                            <li key={h.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 min-w-0">
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center">
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

// ---------------------------------------------------------------- evidence

/** "2 h 10 min" from a number that may be missing. */
function mins(v: unknown): string {
    return fmtMins(num(v));
}

function count(v: unknown): string {
    return num(v).toLocaleString('en-US');
}

/** 0.42 -> "42%" */
function pct(v: unknown): string {
    return `${Math.round(num(v) * 100)}%`;
}

/** Minutes after midnight -> "9:10 am" */
function clock(v: unknown): string {
    const m = Math.round(num(v));
    const h = Math.floor(m / 60) % 24;
    const r = m % 60;
    return `${h % 12 === 0 ? 12 : h % 12}:${String(r).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "2026-11-12" -> "Nov 12" */
function shortDate(v: unknown): string {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return '';
    return new Date(`${v.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const BASELINE_LABEL: Record<OwlLensHighlight['baseline_source'], string> = {
    personal: 'Their own normal',
    team: "Their team's normal",
    organization: "The organisation's normal",
    rule: 'A fixed rule',
};

interface Evidence {
    /** One number for the queue row. */
    stat: string;
    /** Up to three tiles for the inspector. */
    tiles: { label: string; value: string }[];
    /** Session context under the tiles. */
    context: { label: string; value: string }[];
    /** Why it was flagged, in plain words, without repeating the numbers. */
    why: string;
}

/**
 * Everything shown about a highlight, taken from the evidence the background
 * check saved with it. Nothing is recalculated here, and nothing is made up:
 * a tile only appears when its number is there.
 */
function evidenceFor(h: OwlLensHighlight, isToday: boolean, fmtTime: (iso: string | null) => string): Evidence {
    const e = h.evidence || {};
    const tiles: Evidence['tiles'] = [];
    const context: Evidence['context'] = [];
    const tile = (cond: unknown, label: string, value: string) => { if (cond) tiles.push({ label, value }); };
    const ctx = (cond: unknown, label: string, value: string) => { if (cond) context.push({ label, value }); };
    const has = (k: string) => e[k] !== undefined && e[k] !== null;
    const app = typeof e.app === 'string' && e.app ? e.app : '';
    const range = h.window_start && h.window_end ? `${fmtTime(h.window_start)} – ${fmtTime(h.window_end)}` : '';
    let stat = '';
    let why = h.detail;

    switch (h.kind) {
        case 'not_started': {
            const missed = Math.max(1, num(e.missed_working_days));
            const last = shortDate(e.last_worked);
            tile(true, 'Untracked workdays', String(missed));
            tile(has('usual_start_min'), 'Typical start', clock(e.usual_start_min));
            tile(last, 'Last tracked', last);
            stat = missed >= 2 ? `${missed} days untracked` : has('usual_start_min') ? `Usually starts ${clock(e.usual_start_min)}` : 'Not started';
            why = missed >= 2
                ? 'This is not a one-off. They have not tracked any time on several of their workdays in a row, and this is one of the weekdays they normally work.'
                : `They normally start well before this on this weekday, and ${isToday ? 'no time has been tracked yet' : 'no time was tracked that day'}. Owl Lens waits an hour past their usual start before raising this.`;
            break;
        }
        case 'long_day':
            tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins));
            tile(has('usual_mins'), 'Usual day', mins(e.usual_mins));
            tile(has('longest_break_mins'), 'Longest break', mins(e.longest_break_mins));
            ctx(range, 'Session', range);
            stat = `${mins(e.tracked_mins)} tracked`;
            why = 'This day is far longer than what they normally work. Very long days with few breaks can point to overwork, or to a timer that was left running.';
            break;
        case 'idle':
            if (e.pattern === 'share') {
                tile(has('idle_share'), 'Idle share', pct(e.idle_share));
                tile(has('usual_idle_share'), 'Usual idle share', pct(e.usual_idle_share));
                tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins));
                stat = `${pct(e.idle_share)} idle`;
                why = 'A much bigger part of their tracked day had no keyboard or mouse activity than is normal for them.';
            } else {
                const stop = num(e.idle_stop_mins);
                tile(has('minutes'), 'Idle stretch', mins(e.minutes));
                tile(h.window_start, 'Started', fmtTime(h.window_start));
                tile(true, 'Idle auto-stop', stop > 0 ? `${stop} min` : 'Off');
                ctx(range, 'Session', range);
                stat = `${mins(e.minutes)} idle`;
                why = 'The timer kept running with no keyboard or mouse activity for a long stretch, which usually means someone stepped away without stopping it.'
                    + (stop > 0 && num(e.minutes) > stop ? " It also ran past the organisation's idle auto-stop, which should have ended the session." : '');
            }
            break;
        case 'low_input':
            tile(has('minutes'), 'Duration', mins(e.minutes));
            tile(h.window_start, 'Started', fmtTime(h.window_start));
            tile(h.window_end, 'Ended', fmtTime(h.window_end));
            ctx(app, 'Application', app);
            stat = `${mins(e.minutes)} of low input`;
            why = 'The timer was running in one app with only a trickle of keyboard and mouse activity, far too little for normal work over that long.';
            break;
        case 'input_pattern': {
            const m = num(e.minutes);
            if (e.pattern === 'held_key') {
                const rate = m > 0 ? count(Math.round(num(e.keystrokes) / m)) : '';
                tile(has('keystrokes'), 'Keystrokes', count(e.keystrokes));
                tile(rate, 'Key rate', `${rate}/min`);
                tile(has('clicks'), 'Mouse clicks', count(e.clicks));
                stat = rate ? `${rate} keys/min` : `${mins(m)} held key`;
                why = 'Nobody types that fast for that long. A key held down, or something resting on the keyboard, produces this pattern and makes the time look active when it may not be.';
            } else {
                tile(has('minutes'), 'Duration', mins(m));
                tile(has('keystrokes'), 'Keystrokes', count(e.keystrokes));
                tile(has('clicks'), 'Mouse clicks', count(e.clicks));
                stat = e.pattern === 'move_only' ? `${mins(m)} with no keys or clicks` : `${mins(m)} without pauses`;
                why = e.pattern === 'move_only'
                    ? 'There was activity, but not a single keystroke or click, all in the same window. A mouse jiggler or auto-mover looks like this.'
                    : 'Activity registered in almost every second, without the short natural pauses people make. Automated input can produce this pattern.';
            }
            ctx(app, 'Application', app);
            ctx(range, 'Session', range);
            break;
        }
        case 'app_mix':
            tile(has('unfamiliar_share'), 'Unfamiliar apps', pct(e.unfamiliar_share));
            tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins));
            ctx(range, 'Session', range);
            stat = `${pct(e.unfamiliar_share)} in unfamiliar apps`;
            why = 'Most of the day went to apps this person rarely uses. It may be a new tool or project, or time spent outside their normal work.';
            break;
        case 'focus':
            tile(has('minutes'), 'Unbroken run', mins(e.minutes));
            tile(has('usual_run_mins'), 'Usual best', mins(e.usual_run_mins));
            tile(h.window_start, 'Started', fmtTime(h.window_start));
            ctx(range, 'Session', range);
            stat = `${mins(e.minutes)} unbroken`;
            why = 'A longer stretch of steady, active work than they usually manage. Worth recognising.';
            break;
        case 'non_productive': {
            const sites = Object.entries((e.domains as Record<string, unknown>) || {})
                .sort(([, a], [, b]) => num(b) - num(a))
                .slice(0, 3)
                .map(([d]) => d);
            tile(has('share_pct'), 'Non-productive', `${num(e.share_pct)}%`);
            tile(has('nonproductive_mins'), 'Time on those sites', mins(e.nonproductive_mins));
            tile(has('tracked_mins'), 'Tracked', mins(e.tracked_mins));
            ctx(sites.length > 0, 'Top sites', sites.join(', '));
            stat = `${num(e.share_pct)}% non-productive`;
            why = 'A quarter or more of their tracked time was on sites the organisation counts as non-productive, such as social media or streaming.';
            break;
        }
    }

    ctx(true, 'Compared with', BASELINE_LABEL[h.baseline_source]);
    return { stat, tiles: tiles.slice(0, 3), context, why };
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return ((parts[0]![0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] ?? '' : '')).toUpperCase();
}

/** The email, only when it adds something the name does not already say. */
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

const SEVERITY_SOFT: Record<HighlightSeverity, string> = {
    critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    positive: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

// ---------------------------------------------------------------- queue

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
                    'relative w-full text-left flex items-start gap-3 pl-4 pr-3 py-2.5 rounded-lg transition-colors',
                    selected ? 'bg-primary/5' : 'hover:bg-surface-hover',
                )}
            >
                {selected && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" aria-hidden />}
                <span className={clsx('mt-1.5 w-2 h-2 rounded-full shrink-0', SEVERITY_DOT[h.severity])} aria-label={SEVERITY_LABEL[h.severity]} />
                <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-3">
                        <span className={clsx('text-[13px] truncate', selected ? 'font-semibold text-text-main' : 'font-medium text-text-main')}>
                            {KIND_LABEL[h.kind]}
                        </span>
                        <span className="text-[11px] text-text-muted tabular-nums shrink-0">{fmtTime(h.detected_at)}</span>
                    </span>
                    <span className="block text-[12px] text-text-muted truncate">
                        {h.member_name}
                        {stat && <span className="tabular-nums"> · {stat}</span>}
                    </span>
                </span>
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

    return (
        <article className="flex flex-col gap-6 p-5 md:p-7" aria-live="polite">
            {/* Header */}
            <header className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold', SEVERITY_SOFT[h.severity])}>
                        <span className={clsx('w-1.5 h-1.5 rounded-full', SEVERITY_DOT[h.severity])} aria-hidden />
                        {SEVERITY_LABEL[h.severity]}
                    </span>
                    <span className="font-medium text-text-muted">{KIND_CATEGORY[h.kind]}</span>
                    <span className="text-text-muted/70" aria-hidden>·</span>
                    <span className="text-text-muted tabular-nums">
                        Spotted {spotted}{updated && updated !== spotted ? `, updated ${updated}` : ''}
                    </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-text-main tracking-tight leading-tight">{KIND_LABEL[h.kind]}</h2>
                <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {initials(h.member_name)}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-main truncate">{h.member_name}</p>
                        {email && <p className="text-xs text-text-muted truncate">{email}</p>}
                    </div>
                </div>
            </header>

            {/* Key evidence */}
            {evidence.tiles.length > 0 && (
                <section className="flex flex-col gap-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Key evidence</h3>
                    <div className={clsx('grid gap-3', evidence.tiles.length >= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
                        {evidence.tiles.map(t => (
                            <div key={t.label} className="rounded-xl bg-surface-hover px-4 py-3.5 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{t.label}</p>
                                <p className="mt-1 text-xl font-bold text-text-main tabular-nums truncate" title={t.value}>{t.value}</p>
                            </div>
                        ))}
                    </div>
                    {evidence.context.length > 0 && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[13px] mt-1">
                            {evidence.context.map(c => (
                                <div key={c.label} className="contents">
                                    <dt className="text-text-muted">{c.label}</dt>
                                    <dd className="text-text-main font-medium tabular-nums min-w-0 truncate" title={c.value}>{c.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </section>
            )}

            {/* Why */}
            <section className="flex flex-col gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Why Owl Lens flagged this</h3>
                <p className="text-sm text-text-main leading-relaxed">{evidence.why}</p>
            </section>

            {h.status !== 'active' && (
                <p className="text-[13px] text-text-muted">
                    {STATUS_LABEL[h.status]}
                    {h.status === 'expected' && h.status_reason ? ` (${h.status_reason})` : ''}
                    {h.status_by_name ? ` by ${h.status_by_name}` : ''}
                    {h.status_at ? ` at ${fmtTime(h.status_at)}` : ''}.
                </p>
            )}

            {/* Actions */}
            <footer className="flex flex-col gap-3 pt-5 border-t border-border-soft">
                {canReview && h.status === 'active' && choosingReason ? (
                    <div className="flex flex-col gap-2.5">
                        <p className="text-[13px] font-semibold text-text-main">Why is it expected?</p>
                        <div className="flex flex-wrap items-center gap-2">
                            {EXPECTED_REASONS.map(r => (
                                <SecondaryButton key={r} disabled={busy} onClick={() => onReview('expected', r)}>{r}</SecondaryButton>
                            ))}
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onChooseReason(false)}
                                className="text-[13px] font-semibold text-text-muted hover:text-text-main px-2"
                            >
                                Cancel
                            </button>
                        </div>
                        <p className="text-xs text-text-muted">Owl Lens will stay quiet about {h.member_name} for the rest of this day.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            to={link.to}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-primary/25 text-primary hover:bg-primary/5 text-[13px] font-semibold transition-colors"
                        >
                            {link.label}
                            <ArrowUpRight className="w-4 h-4" aria-hidden />
                        </Link>
                        {canReview && h.status === 'active' && (
                            <>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onReview('acknowledged')}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-white dark:text-slate-900 hover:bg-primary-hover text-[13px] font-semibold shadow-xs transition-colors disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" aria-hidden />
                                    Acknowledge
                                </button>
                                <span className="hidden sm:block flex-1" aria-hidden />
                                <SecondaryButton disabled={busy} onClick={() => onChooseReason(true)}>Mark as expected</SecondaryButton>
                                <SecondaryButton disabled={busy} onClick={() => onReview('dismissed')}>Dismiss</SecondaryButton>
                            </>
                        )}
                        {canReview && h.status !== 'active' && (
                            <SecondaryButton disabled={busy} onClick={() => onReview('active')} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                                Put back
                            </SecondaryButton>
                        )}
                    </div>
                )}
            </footer>
        </article>
    );
}

function SecondaryButton({ children, icon, onClick, disabled }: {
    children: ReactNode;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-surface-hover hover:bg-border-soft text-[13px] font-semibold text-text-main transition-colors disabled:opacity-50"
        >
            {icon}
            {children}
        </button>
    );
}

function ActionButton({ children, icon, onClick, disabled }: {
    children: ReactNode;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-[12px] font-semibold text-text-main transition-colors disabled:opacity-50"
        >
            {icon}
            {children}
        </button>
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
