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
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout, DatePicker, FilterSelect, RefreshButton, EmptyState, LoadingState, Modal, RowMenu } from '../components/ui';
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

    const review = async (h: OwlLensHighlight, status: HighlightStatus, reason?: string) => {
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
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 px-3.5 rounded-lg border border-border bg-surface-hover text-xs text-text-muted">
                            <p>
                                <span className="font-semibold text-text-main">Admin preview until {trialEndShort}</span>
                                {' '}— visible only to Owners &amp; Admins.
                            </p>
                            <button
                                type="button"
                                onClick={endTrial}
                                disabled={endingTrial}
                                className="font-semibold text-text-main underline-offset-2 hover:underline disabled:opacity-50"
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

                    <section className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
                        {/* Tabs and the day's summary, as the list's own header */}
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 md:px-5 border-b border-border">
                            <div className="flex items-center gap-5" role="tablist">
                                {(['open', 'reviewed'] as View[]).map(v => (
                                    <button
                                        key={v}
                                        role="tab"
                                        aria-selected={view === v}
                                        onClick={() => setView(v)}
                                        className={clsx(
                                            'relative py-3 text-[13px] font-semibold transition-colors',
                                            view === v
                                                ? 'text-text-main after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
                                                : 'text-text-muted hover:text-text-main'
                                        )}
                                    >
                                        {v === 'open' ? 'Needs attention' : 'Reviewed'}
                                        <span className="ml-1.5 tabular-nums text-text-muted font-medium">
                                            ({v === 'open' ? open.length : reviewed.length})
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="py-2 text-xs text-text-muted tabular-nums">
                                {view === 'open' && open.length > 0 && (
                                    <>
                                        {criticalCount > 0 && <span className="font-semibold text-rose-600 dark:text-rose-400">{criticalCount} critical</span>}
                                        {criticalCount > 0 && warningCount > 0 && ' · '}
                                        {warningCount > 0 && <span className="font-semibold text-amber-700 dark:text-amber-300">{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</span>}
                                        {(criticalCount > 0 || warningCount > 0) && checkedAgo && ' · '}
                                    </>
                                )}
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
                            <ul className="divide-y divide-border-soft">
                                {shown.map(h => (
                                    <HighlightRow
                                        key={h.id}
                                        h={h}
                                        canReview={canReview}
                                        busy={busyId === h.id}
                                        choosingReason={choosingReasonFor === h.id}
                                        isToday={isToday}
                                        fmtTime={fmtTime}
                                        onReview={(status, reason) => review(h, status, reason)}
                                        onChooseReason={show => setChoosingReasonFor(show ? h.id : null)}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
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

// ---------------------------------------------------------------- row

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

/**
 * The numbers behind a highlight as short chips, and a one-line takeaway.
 * Both come from the evidence the background check saved with the card, so
 * nothing is recalculated here. The full sentence stays on hover.
 */
function summarize(h: OwlLensHighlight, range: string, isToday: boolean): { chips: string[]; diagnosis: string } {
    const e = h.evidence || {};
    const chips: string[] = [];
    const add = (cond: unknown, text: string) => { if (cond) chips.push(text); };
    const app = typeof e.app === 'string' && e.app ? e.app : '';

    switch (h.kind) {
        case 'not_started': {
            const missed = num(e.missed_working_days);
            const last = shortDate(e.last_worked);
            add(missed >= 2, `${missed} days untracked`);
            add(e.usual_start_min != null, `Usually starts ${clock(e.usual_start_min)}`);
            add(last, `Last tracked ${last}`);
            return {
                chips,
                diagnosis: missed >= 2
                    ? `No time logged for ${missed} consecutive workdays${last ? ` (last tracked ${last})` : ''}.`
                    : `No time logged ${isToday ? 'yet today' : 'that day'}, well past their usual start.`,
            };
        }
        case 'long_day': {
            const hasBreak = e.longest_break_mins != null;
            add(e.tracked_mins != null, `${mins(e.tracked_mins)} tracked`);
            add(e.usual_mins != null, `Usual ${mins(e.usual_mins)}`);
            add(hasBreak, `Longest break ${mins(e.longest_break_mins)}`);
            add(range, range);
            return {
                chips,
                diagnosis: `Far longer than their usual day${hasBreak && num(e.longest_break_mins) < 30 ? ', with no break of 30 min or more' : ''}.`,
            };
        }
        case 'idle': {
            if (e.pattern === 'share') {
                add(e.idle_share != null, `${pct(e.idle_share)} idle`);
                add(e.usual_idle_share != null, `Usual ${pct(e.usual_idle_share)}`);
                add(e.tracked_mins != null, `${mins(e.tracked_mins)} tracked`);
                return { chips, diagnosis: 'Much more of the day was idle than is normal for them.' };
            }
            const stop = num(e.idle_stop_mins);
            add(e.minutes != null, `${mins(e.minutes)} idle`);
            add(range, range);
            add(stop > 0, `Auto-stop ${stop} min`);
            return {
                chips,
                diagnosis: stop > 0 && num(e.minutes) > stop
                    ? `No keyboard or mouse activity, and the timer outlasted the ${stop}-minute auto-stop.`
                    : 'No keyboard or mouse activity while the timer kept running.',
            };
        }
        case 'low_input':
            add(e.minutes != null, mins(e.minutes));
            add(app, app);
            add(range, range);
            return { chips, diagnosis: 'Timer running in one app with only a trickle of keyboard and mouse input.' };
        case 'input_pattern': {
            const m = num(e.minutes);
            const keys = num(e.keystrokes);
            add(e.keystrokes != null, `${count(keys)} keys`);
            add(e.pattern === 'held_key' && m > 0, `${count(Math.round(keys / Math.max(m, 1)))}/min`);
            add(e.clicks != null, `${count(e.clicks)} clicks`);
            add(app, app);
            add(range, range);
            return {
                chips,
                diagnosis: e.pattern === 'held_key'
                    ? 'Sustained keystroke rate exceeds human typing speed (likely a held-down key).'
                    : e.pattern === 'move_only'
                        ? 'Activity with no keystrokes or clicks, all in one window.'
                        : 'Activity in almost every second, with none of the usual pauses.',
            };
        }
        case 'app_mix':
            add(e.unfamiliar_share != null, `${pct(e.unfamiliar_share)} in unfamiliar apps`);
            add(e.tracked_mins != null, `${mins(e.tracked_mins)} tracked`);
            return { chips, diagnosis: 'Most of the day was spent in apps they rarely use.' };
        case 'focus':
            add(e.minutes != null, `${mins(e.minutes)} unbroken`);
            add(e.usual_run_mins != null, `Usual best ${mins(e.usual_run_mins)}`);
            add(range, range);
            return { chips, diagnosis: 'A longer stretch of steady, active work than their usual best.' };
        case 'non_productive': {
            const sites = Object.entries((e.domains as Record<string, unknown>) || {})
                .sort(([, a], [, b]) => num(b) - num(a))
                .slice(0, 2)
                .map(([d]) => d);
            add(e.share_pct != null, `${num(e.share_pct)}%`);
            add(e.nonproductive_mins != null, `${mins(e.nonproductive_mins)} of ${mins(e.tracked_mins)}`);
            sites.forEach(s => chips.push(s));
            return { chips, diagnosis: 'A quarter or more of tracked time was on non-productive sites.' };
        }
        default:
            return { chips, diagnosis: h.detail };
    }
}

const SEVERITY_BADGE: Record<HighlightSeverity, string> = {
    critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    positive: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
};

interface HighlightRowProps {
    h: OwlLensHighlight;
    canReview: boolean;
    busy: boolean;
    choosingReason: boolean;
    isToday: boolean;
    fmtTime: (iso: string | null) => string;
    onReview: (status: HighlightStatus, reason?: string) => void;
    onChooseReason: (open: boolean) => void;
}

function HighlightRow({ h, canReview, busy, choosingReason, isToday, fmtTime, onReview, onChooseReason }: HighlightRowProps) {
    const link = sourceLink(h);
    const spotted = fmtTime(h.detected_at);
    const range = h.window_start && h.window_end ? `${fmtTime(h.window_start)}–${fmtTime(h.window_end)}` : '';
    const { chips, diagnosis } = summarize(h, range, isToday);
    const baseline = h.baseline_source === 'team'
        ? 'vs team normal'
        : h.baseline_source === 'organization' ? 'vs organisation normal' : null;

    return (
        <li className={clsx(
            'flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-4 md:px-5 py-3.5 hover:bg-surface-hover/70 transition-colors',
            h.status !== 'active' && 'opacity-80',
        )}>
            <div className="flex-1 min-w-0 max-w-2xl">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                    <span className={clsx('inline-flex items-center px-1.5 py-px rounded border text-[10px] font-bold', SEVERITY_BADGE[h.severity])}>
                        {SEVERITY_LABEL[h.severity]}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-px rounded border border-border text-[10px] font-semibold text-text-muted">
                        {KIND_CATEGORY[h.kind]}
                    </span>
                    <h3 className="text-sm font-semibold text-text-main">{KIND_LABEL[h.kind]}</h3>
                    <span className="text-sm font-medium text-text-muted truncate max-w-full">
                        {h.member_name}
                        {h.member_email && <span className="hidden lg:inline font-normal opacity-70"> · {h.member_email}</span>}
                    </span>
                    {spotted && <span className="text-xs text-text-muted/70">Spotted {spotted}</span>}
                </div>

                {(chips.length > 0 || baseline) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {chips.map(c => (
                            <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-hover border border-border-soft text-xs font-medium text-text-main tabular-nums">
                                {c}
                            </span>
                        ))}
                        {baseline && <span className="text-xs text-text-muted">{baseline}</span>}
                    </div>
                )}

                <p className="mt-1.5 text-sm text-text-muted truncate" title={h.detail}>{diagnosis}</p>

                {h.status !== 'active' && (
                    <p className="mt-1 text-xs text-text-muted">
                        {STATUS_LABEL[h.status]}
                        {h.status === 'expected' && h.status_reason ? ` (${h.status_reason})` : ''}
                        {h.status_by_name ? ` by ${h.status_by_name}` : ''}
                        {h.status_at ? ` at ${fmtTime(h.status_at)}` : ''}
                    </p>
                )}

                {canReview && h.status === 'active' && choosingReason && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-text-muted">Why is it expected?</span>
                        {EXPECTED_REASONS.map(r => (
                            <ActionButton key={r} disabled={busy} onClick={() => onReview('expected', r)}>
                                {r}
                            </ActionButton>
                        ))}
                        <button
                            disabled={busy}
                            onClick={() => onChooseReason(false)}
                            className="text-xs font-semibold text-text-muted hover:text-text-main px-1"
                        >
                            Cancel
                        </button>
                        <p className="basis-full text-[11px] text-text-muted">
                            Owl Lens will stay quiet about {h.member_name} for the rest of this day.
                        </p>
                    </div>
                )}
            </div>

            <div className="shrink-0 flex items-center gap-2 md:ml-auto">
                <Link
                    to={link.to}
                    className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-medium text-text-main transition-colors"
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
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs font-semibold text-primary transition-colors disabled:opacity-50"
                        >
                            <Check className="w-3.5 h-3.5" aria-hidden />
                            Acknowledge
                        </button>
                        <RowMenu
                            label={`More actions for ${KIND_LABEL[h.kind]}, ${h.member_name}`}
                            items={[
                                // No icons: the shared menu is 144px wide and "Mark as expected" would wrap.
                                { label: 'Dismiss', icon: null, onClick: () => onReview('dismissed'), disabled: busy },
                                { label: 'Mark as expected', icon: null, onClick: () => onChooseReason(true), disabled: busy },
                            ]}
                        />
                    </>
                )}

                {canReview && h.status !== 'active' && (
                    <ActionButton disabled={busy} onClick={() => onReview('active')} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                        Put back
                    </ActionButton>
                )}
            </div>
        </li>
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
