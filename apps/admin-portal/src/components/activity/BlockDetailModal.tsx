import { useState, useEffect } from 'react';
import {
    X, Mouse, Keyboard, Clock, Activity,
    Loader2, Image as ImageIcon
} from 'lucide-react';
import { activityService, type BlockRecordEntry, type BlockMinuteSample } from '../../services/activity.service';
import { SecureImage } from '../ui/SecureImage';
import { AppIcon } from '../ui/AppIcon';
import { initialOf } from '../../lib/initials';
import clsx from 'clsx';

interface BlockDetailModalProps {
    block: BlockRecordEntry | null;
    onClose: () => void;
    targetTz?: string | null;
}

export function BlockDetailModal({ block, onClose, targetTz }: BlockDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [samples, setSamples] = useState<BlockMinuteSample[]>([]);
    const [screenshots, setScreenshots] = useState<any[]>([]);
    const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

    useEffect(() => {
        if (!block) return;
        let active = true;
        setLoading(true);

        activityService.fetchBlockMinuteSamples(block.session_id, block.block_start, block.block_end)
            .then(({ samples: s, screenshots: ss }) => {
                if (!active) return;
                setSamples(s);
                setScreenshots(ss);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load block samples:', err);
                if (active) setLoading(false);
            });

        return () => { active = false; };
    }, [block]);

    if (!block) return null;

    const tz = targetTz || undefined;

    const formatTime = (isoString: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            }).format(new Date(isoString));
        } catch {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    const formatTimeShort = (isoString: string) => {
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

    const formatBlockWindow = (startIso: string, endIso: string) =>
        `${formatTimeShort(startIso)} – ${formatTimeShort(endIso)}`;

    const pct = block.activity_percent;
    const activeMins = Math.floor(block.active_seconds / 60);
    const activeSecsRemainder = block.active_seconds % 60;
    const activeTimeLabel = activeMins > 0
        ? `${activeMins}m ${activeSecsRemainder}s`
        : `${activeSecsRemainder}s`;

    const activityBarColor =
        pct >= 60 ? 'bg-emerald-500' :
        pct >= 30 ? 'bg-accent' :
        'bg-rose-500';

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="flex min-h-full items-start justify-center p-4 pt-16 pb-10">
            {/* Modal Container */}
            <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* ── Header ── */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
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
                        <div>
                            <div className="flex items-center gap-2 min-w-0">
                                <h3 className="text-base font-bold text-text-main truncate max-w-[260px]">
                                    {(() => {
                                        const name = block.member?.full_name || 'Team Member';
                                        // If stored as email, show the local part before @
                                        if (name.includes('@')) {
                                            return name.split('@')[0]?.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || name;
                                        }
                                        return name;
                                    })()}
                                </h3>
                                <span className={clsx(
                                    'text-[11px] font-bold px-2 py-0.5 rounded-full border',
                                    block.credited
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                )}>
                                    {block.credited ? 'Credited' : 'Idle Adjusted'}
                                </span>
                                {block.is_offline && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                        Offline
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5 font-mono">
                                {formatBlockWindow(block.block_start, block.block_end)}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-text-muted hover:text-text-main hover:bg-white/5 rounded-xl transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Summary Strip ── */}
                <div className="px-6 py-3.5 border-b border-border bg-surface-hover shrink-0 overflow-x-auto">
                    <div className="flex items-center gap-5 min-w-max">
                        {/* App */}
                        <div className="flex items-center gap-2.5">
                            <AppIcon name={block.app_name || ''} className="w-8 h-8 rounded-lg shadow-shell-sm shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-text-main leading-tight">
                                    {block.app_name || 'General Work'}
                                </span>
                                {block.domain && (
                                    <span className="text-[10px] font-mono text-text-muted leading-tight">{block.domain}</span>
                                )}
                            </div>
                        </div>

                        <div className="w-px h-7 bg-border shrink-0" />

                        {/* Activity bar */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <span className={clsx(
                                'text-sm font-black font-mono',
                                pct >= 60 ? 'text-emerald-400' :
                                pct >= 30 ? 'text-accent' : 'text-rose-400'
                            )}>
                                {pct}%
                            </span>
                            <div className="w-28 bg-border/40 h-2 rounded-full overflow-hidden">
                                <div
                                    className={clsx('h-full rounded-full transition-all duration-500', activityBarColor)}
                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                            </div>
                            <span className="text-[11px] text-text-muted font-medium">
                                {activeTimeLabel} active
                            </span>
                        </div>

                        <div className="w-px h-7 bg-border shrink-0" />

                        {/* Input counts */}
                        <div className="flex items-center gap-4 shrink-0">
                            <span className="flex items-center gap-1.5 text-sm font-bold text-text-main">
                                <Mouse className="w-3.5 h-3.5 text-blue-400" />
                                {block.mouse_clicks.toLocaleString()}
                                <span className="text-[11px] font-normal text-text-muted">clicks</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-sm font-bold text-text-main">
                                <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                                {block.key_presses.toLocaleString()}
                                <span className="text-[11px] font-normal text-text-muted">keys</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-6 space-y-6">

                    {/* Screenshots Filmstrip */}
                    {screenshots.length > 0 && (
                        <div className="space-y-2.5">
                            <h4 className="text-[11px] font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5 text-accent" />
                                Screenshots ({screenshots.length})
                            </h4>
                            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                                {screenshots.map((ss, idx) => (
                                    <div
                                        key={ss.id || idx}
                                        onClick={() => setSelectedScreenshot(ss.file_url)}
                                        className="relative group w-40 h-24 shrink-0 rounded-xl overflow-hidden border border-border bg-black/40 cursor-pointer hover:border-accent transition-all shadow-shell-sm hover:shadow-elevated"
                                    >
                                        <SecureImage
                                            path={ss.file_url}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                            <span className="text-[10px] text-white font-mono">
                                                {formatTime(ss.recorded_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Minute-by-Minute Visual Rows */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-accent" />
                                Minute-by-Minute Breakdown
                            </h4>
                            {!loading && (
                                <span className="text-[11px] text-text-muted font-mono">
                                    {samples.length} / 10 samples
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-text-muted gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                <span className="text-xs font-medium">Loading minute breakdown...</span>
                            </div>
                        ) : samples.length === 0 ? (
                            <div className="py-8 text-center text-text-muted border border-dashed border-border rounded-xl">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-xs italic">No granular minute samples found for this block window.</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {samples.map((s, idx) => {
                                    const activeSecs = s.active_seconds ?? 0;
                                    const isIdle = s.idle || (s.mouse_clicks === 0 && s.key_presses === 0 && activeSecs === 0);
                                    const minutePct = s.activity_percent;
                                    const minuteBarColor =
                                        minutePct >= 60 ? 'bg-emerald-500' :
                                        minutePct >= 30 ? 'bg-accent' :
                                        minutePct > 0 ? 'bg-amber-500' : 'bg-zinc-600/60';

                                    return (
                                        <div
                                            key={s.id || idx}
                                            className={clsx(
                                                'flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/60 bg-surface-hover/30 hover:bg-surface-hover/60 transition-colors',
                                                isIdle && 'opacity-50'
                                            )}
                                        >
                                            {/* Time */}
                                            <span className="font-mono text-[11px] font-bold text-text-muted w-[72px] shrink-0">
                                                {formatTime(s.recorded_at)}
                                            </span>

                                            {/* Activity bar */}
                                            <div className="flex items-center gap-2 w-[130px] shrink-0">
                                                <div className="flex-1 bg-border/40 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={clsx('h-full rounded-full transition-all', minuteBarColor)}
                                                        style={{ width: `${Math.min(100, Math.max(0, minutePct))}%` }}
                                                    />
                                                </div>
                                                <span className={clsx(
                                                    'text-[11px] font-bold font-mono w-8 text-right shrink-0',
                                                    minutePct >= 60 ? 'text-emerald-400' :
                                                    minutePct >= 30 ? 'text-accent' :
                                                    minutePct > 0 ? 'text-amber-400' : 'text-text-muted'
                                                )}>
                                                    {minutePct}%
                                                </span>
                                            </div>

                                            {/* Input counts */}
                                            {isIdle ? (
                                                <span className="text-[11px] text-text-muted italic font-medium shrink-0">— Idle</span>
                                            ) : (
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="flex items-center gap-1 font-mono text-[11px] text-text-main">
                                                        <Mouse className="w-3 h-3 text-blue-400/80" />
                                                        {s.mouse_clicks}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-mono text-[11px] text-text-main">
                                                        <Keyboard className="w-3 h-3 text-purple-400/80" />
                                                        {s.key_presses}
                                                    </span>
                                                </div>
                                            )}

                                            {/* App + Window Title */}
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <span className="text-[11px] font-semibold text-text-main shrink-0">
                                                    {s.app_name || 'App'}
                                                </span>
                                                {s.window_title && (
                                                    <span
                                                        className="text-[11px] text-text-muted truncate"
                                                        title={s.window_title}
                                                    >
                                                        — {s.window_title}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-6 py-3.5 border-t border-border bg-surface flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-main font-semibold text-xs rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
            </div>

            {/* Enlarged Screenshot Lightbox */}
            {selectedScreenshot && (
                <div
                    className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedScreenshot(null)}
                >
                    <div className="relative max-w-5xl max-h-[90vh]">
                        <button
                            onClick={() => setSelectedScreenshot(null)}
                            className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <SecureImage
                            path={selectedScreenshot}
                            className="max-h-[85vh] w-auto rounded-xl shadow-2xl border border-white/20"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
