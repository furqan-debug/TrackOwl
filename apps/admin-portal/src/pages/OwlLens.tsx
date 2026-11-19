import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
    AlertOctagon,
    AlertTriangle,
    ArrowUpRight,
    Check,
    ChevronLeft,
    ChevronRight,
    Filter,
    Info,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout, DatePicker, FilterSelect, RefreshButton, EmptyState, LoadingState } from '../components/ui';
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
};

const KIND_CATEGORY: Record<HighlightKind, string> = {
    not_started: 'Attendance',
    long_day: 'Attendance',
    idle: 'Presence',
    low_input: 'Presence',
    input_pattern: 'Presence',
    app_mix: 'Apps',
    focus: 'Focus',
};

const SEVERITY_RANK: Record<HighlightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

const SEVERITY_LABEL: Record<HighlightSeverity, string> = {
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    positive: 'Positive',
};

const SEVERITY_STYLE: Record<HighlightSeverity, { bar: string; tile: string; pill: string }> = {
    critical: {
        bar: 'border-l-rose-500',
        tile: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    },
    warning: {
        bar: 'border-l-amber-500',
        tile: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
        pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    },
    info: {
        bar: 'border-l-sky-500',
        tile: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
        pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    },
    positive: {
        bar: 'border-l-emerald-500',
        tile: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    },
};

function SeverityIcon({ severity, className }: { severity: HighlightSeverity; className?: string }) {
    if (severity === 'critical') return <AlertOctagon className={className} aria-hidden />;
    if (severity === 'warning') return <AlertTriangle className={className} aria-hidden />;
    if (severity === 'positive') return <Sparkles className={className} aria-hidden />;
    return <Info className={className} aria-hidden />;
}

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

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
type View = 'open' | 'reviewed';

const AUTO_REFRESH_MS = 5 * 60_000;

// ---------------------------------------------------------------- page

export function OwlLens() {
    const { profile, displayTimezone, timezoneReady } = useAuth();
    const organizationId = profile?.organization_id;
    const role = profile?.role;
    const canReview = role === 'Owner' || role === 'Admin' || role === 'Manager';

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

                    <div className="flex items-center h-10 bg-surface border border-border p-1 rounded-xl shadow-shell-sm">
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
                            className="min-w-[170px] md:min-w-[180px]"
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
            ) : (
                <div className="flex flex-col gap-4 pb-16">
                    {/* Summary line and the open / reviewed switch */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center bg-surface border border-border rounded-xl p-1 shadow-shell-sm">
                            {(['open', 'reviewed'] as View[]).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={clsx(
                                        'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                                        view === v
                                            ? 'bg-surface-hover text-text-main shadow-shell-sm'
                                            : 'text-text-muted hover:text-text-main'
                                    )}
                                >
                                    {v === 'open' ? `Needs attention (${open.length})` : `Reviewed (${reviewed.length})`}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-text-muted">
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

                    {actionError && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-sm text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                            <span className="flex-1">{actionError}</span>
                            <button onClick={() => setActionError(null)} aria-label="Close" className="shrink-0 opacity-70 hover:opacity-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {shown.length === 0 ? (
                        <CalmState
                            view={view}
                            isToday={isToday}
                            filtersActive={filtersActive}
                            neverChecked={!runState?.last_run_at && highlights.length === 0}
                        />
                    ) : (
                        <div className="flex flex-col gap-3">
                            {shown.map(h => (
                                <HighlightCard
                                    key={h.id}
                                    h={h}
                                    canReview={canReview}
                                    busy={busyId === h.id}
                                    choosingReason={choosingReasonFor === h.id}
                                    fmtTime={fmtTime}
                                    onReview={(status, reason) => review(h, status, reason)}
                                    onChooseReason={show => setChoosingReasonFor(show ? h.id : null)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </PageLayout>
    );
}

// ---------------------------------------------------------------- card

interface HighlightCardProps {
    h: OwlLensHighlight;
    canReview: boolean;
    busy: boolean;
    choosingReason: boolean;
    fmtTime: (iso: string | null) => string;
    onReview: (status: HighlightStatus, reason?: string) => void;
    onChooseReason: (open: boolean) => void;
}

function HighlightCard({ h, canReview, busy, choosingReason, fmtTime, onReview, onChooseReason }: HighlightCardProps) {
    const style = SEVERITY_STYLE[h.severity];
    const link = sourceLink(h);
    const spotted = fmtTime(h.detected_at);
    const updated = fmtTime(h.updated_at);

    return (
        <article
            className={clsx(
                'bg-surface border border-border border-l-4 rounded-shell-lg shadow-soft p-4 md:p-5 flex gap-3 md:gap-4',
                style.bar,
                h.status !== 'active' && 'opacity-80'
            )}
        >
            <div className={clsx('w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0', style.tile)}>
                <SeverityIcon severity={h.severity} className="w-4 h-4 md:w-5 md:h-5" />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-[15px] font-semibold text-text-main leading-snug">
                    {KIND_LABEL[h.kind]} <span className="text-text-muted font-normal">—</span> {h.member_name}
                </h3>
                <p className="mt-1 text-[13px] text-text-muted leading-relaxed">{h.detail}</p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold', style.pill)}>
                        {SEVERITY_LABEL[h.severity]}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border bg-surface-hover text-[10px] font-bold text-text-muted">
                        {KIND_CATEGORY[h.kind]}
                    </span>
                    {h.baseline_source === 'team' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border text-[10px] font-semibold text-text-muted">
                            Based on team baseline
                        </span>
                    )}
                    {h.baseline_source === 'organization' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border text-[10px] font-semibold text-text-muted">
                            Based on organisation baseline
                        </span>
                    )}
                    <span className="text-[11px] text-text-muted">
                        Spotted {spotted}{updated && updated !== spotted ? ` · updated ${updated}` : ''}
                    </span>
                </div>

                {h.status !== 'active' && (
                    <p className="mt-2 text-[12px] text-text-muted">
                        {STATUS_LABEL[h.status]}
                        {h.status === 'expected' && h.status_reason ? ` (${h.status_reason})` : ''}
                        {h.status_by_name ? ` by ${h.status_by_name}` : ''}
                        {h.status_at ? ` at ${fmtTime(h.status_at)}` : ''}
                    </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link
                        to={link.to}
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline"
                    >
                        {link.label}
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>

                    {canReview && h.status === 'active' && !choosingReason && (
                        <div className="flex flex-wrap items-center gap-2">
                            <ActionButton disabled={busy} onClick={() => onReview('acknowledged')} icon={<Check className="w-3.5 h-3.5" />}>
                                Acknowledge
                            </ActionButton>
                            <ActionButton disabled={busy} onClick={() => onReview('dismissed')} icon={<X className="w-3.5 h-3.5" />}>
                                Dismiss
                            </ActionButton>
                            <ActionButton disabled={busy} onClick={() => onChooseReason(true)} icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                                Mark as expected
                            </ActionButton>
                        </div>
                    )}

                    {canReview && h.status !== 'active' && (
                        <ActionButton disabled={busy} onClick={() => onReview('active')} icon={<RotateCcw className="w-3.5 h-3.5" />}>
                            Put back
                        </ActionButton>
                    )}
                </div>

                {canReview && h.status === 'active' && choosingReason && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[12px] text-text-muted">Why is it expected?</span>
                        {EXPECTED_REASONS.map(r => (
                            <ActionButton key={r} disabled={busy} onClick={() => onReview('expected', r)}>
                                {r}
                            </ActionButton>
                        ))}
                        <button
                            disabled={busy}
                            onClick={() => onChooseReason(false)}
                            className="text-[12px] font-semibold text-text-muted hover:text-text-main px-1"
                        >
                            Cancel
                        </button>
                        <p className="basis-full text-[11px] text-text-muted">
                            Owl Lens will stay quiet about {h.member_name} for the rest of this day.
                        </p>
                    </div>
                )}
            </div>
        </article>
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
