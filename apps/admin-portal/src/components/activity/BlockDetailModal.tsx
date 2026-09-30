import { useState, useEffect } from 'react';
import {
    X, Mouse, Keyboard, Clock, Activity,
    Sparkles, Loader2, Image as ImageIcon
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

        return () => {
            active = false;
        };
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

    const formatBlockWindow = (startIso: string, endIso: string) => {
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

    const activeMins = Math.floor(block.active_seconds / 60);
    const activeSecsRemainder = block.active_seconds % 60;
    const activeTimeLabel = activeMins > 0
        ? `${activeMins}m ${activeSecsRemainder}s`
        : `${activeSecsRemainder}s`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 text-accent font-bold flex items-center justify-center text-sm shrink-0">
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
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-text-main">
                                    {block.member?.full_name || 'Team Member'}
                                </h3>
                                <span className={clsx(
                                    "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                                    block.credited
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                )}>
                                    {block.credited ? 'Credited' : 'Idle Adjusted'}
                                </span>
                                {block.is_offline && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                        Offline Tracked
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted mt-0.5">
                                10-Minute Window: <span className="font-semibold text-text-main">{formatBlockWindow(block.block_start, block.block_end)}</span>
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

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto shell-scrollbar p-6 space-y-6">
                    {/* KPI Cards Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Activity Score */}
                        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-accent" />
                                Activity Score
                            </span>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-black text-text-main">
                                    {block.activity_percent}%
                                </span>
                                <span className="text-[10px] text-text-muted">of 10 mins</span>
                            </div>
                            {/* Visual Progress Bar */}
                            <div className="w-full bg-border/50 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full rounded-full transition-all duration-500",
                                        block.activity_percent >= 60 ? "bg-emerald-500" :
                                        block.activity_percent >= 30 ? "bg-accent" : "bg-rose-500"
                                    )}
                                    style={{ width: `${Math.min(100, Math.max(0, block.activity_percent))}%` }}
                                />
                            </div>
                        </div>

                        {/* Active Input Time */}
                        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                Active Movement
                            </span>
                            <div className="mt-2 flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-text-main">
                                    {activeTimeLabel}
                                </span>
                                <span className="text-[10px] text-text-muted">/ 10m</span>
                            </div>
                            <span className="text-[10px] text-text-muted mt-2">
                                {block.active_seconds} of 600 seconds active
                            </span>
                        </div>

                        {/* Mouse Clicks */}
                        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                                <Mouse className="w-3.5 h-3.5 text-blue-400" />
                                Mouse Clicks
                            </span>
                            <div className="mt-2">
                                <span className="text-2xl font-black text-text-main">
                                    {block.mouse_clicks.toLocaleString()}
                                </span>
                            </div>
                            <span className="text-[10px] text-text-muted mt-2">
                                ~{(block.mouse_clicks / 10).toFixed(1)} clicks/min
                            </span>
                        </div>

                        {/* Key Presses */}
                        <div className="p-3.5 rounded-xl bg-card border border-border flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-text-muted flex items-center gap-1.5">
                                <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                                Key Presses
                            </span>
                            <div className="mt-2">
                                <span className="text-2xl font-black text-text-main">
                                    {block.key_presses.toLocaleString()}
                                </span>
                            </div>
                            <span className="text-[10px] text-text-muted mt-2">
                                ~{(block.key_presses / 10).toFixed(1)} keys/min
                            </span>
                        </div>
                    </div>

                    {/* Dominant App & Domain Banner */}
                    <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AppIcon name={block.app_name} className="w-9 h-9 rounded-lg" />
                            <div>
                                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                    Primary Application
                                </span>
                                <h4 className="text-sm font-bold text-text-main">
                                    {block.app_name || 'Unrecorded App'}
                                </h4>
                            </div>
                        </div>
                        {block.domain && (
                            <div className="text-right">
                                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                    Active Domain
                                </span>
                                <p className="text-xs font-mono font-medium text-accent">
                                    {block.domain}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Screenshots Preview in this block */}
                    {screenshots.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <ImageIcon className="w-3.5 h-3.5 text-accent" />
                                    Screenshots in this 10-Minute Block ({screenshots.length})
                                </h4>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {screenshots.map((ss, idx) => (
                                    <div
                                        key={ss.id || idx}
                                        onClick={() => setSelectedScreenshot(ss.file_url)}
                                        className="relative group rounded-xl overflow-hidden border border-border bg-black/40 aspect-video cursor-pointer hover:border-accent transition-all shadow-shell-sm"
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

                    {/* 1-Minute Samples Breakdown */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-accent" />
                                Minute-by-Minute Granular Activity Samples
                            </h4>
                            <span className="text-[11px] text-text-muted font-mono">
                                {samples.length} minute samples captured
                            </span>
                        </div>

                        {loading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-text-muted gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-accent" />
                                <span className="text-xs font-medium">Loading minute-by-minute breakdown...</span>
                            </div>
                        ) : samples.length === 0 ? (
                            <div className="py-8 text-center text-text-muted border border-dashed border-border rounded-xl">
                                <p className="text-xs italic">No granular minute samples found for this block window.</p>
                            </div>
                        ) : (
                            <div className="border border-border rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-surface border-b border-border text-[11px] font-bold text-text-muted uppercase tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3">Time</th>
                                            <th className="py-2.5 px-3">Activity</th>
                                            <th className="py-2.5 px-3">Clicks</th>
                                            <th className="py-2.5 px-3">Keystrokes</th>
                                            <th className="py-2.5 px-3">Active Secs</th>
                                            <th className="py-2.5 px-3">App & Window Title</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50 font-medium">
                                        {samples.map((s, idx) => {
                                            const activeSecs = s.active_seconds ?? 0;
                                            const isIdle = s.idle || (s.mouse_clicks === 0 && s.key_presses === 0 && activeSecs === 0);

                                            return (
                                                <tr
                                                    key={s.id || idx}
                                                    className={clsx(
                                                        "hover:bg-white/[0.03] transition-colors",
                                                        isIdle && "opacity-60"
                                                    )}
                                                >
                                                    <td className="py-2.5 px-3 font-mono text-text-main whitespace-nowrap">
                                                        {formatTime(s.recorded_at)}
                                                    </td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "font-bold",
                                                                s.activity_percent >= 60 ? "text-emerald-400" :
                                                                s.activity_percent >= 30 ? "text-accent" : "text-text-muted"
                                                            )}>
                                                                {s.activity_percent}%
                                                            </span>
                                                            <div className="w-12 bg-border/40 h-1.5 rounded-full overflow-hidden">
                                                                <div
                                                                    className={clsx(
                                                                        "h-full rounded-full",
                                                                        s.activity_percent >= 60 ? "bg-emerald-400" :
                                                                        s.activity_percent >= 30 ? "bg-accent" : "bg-rose-500/80"
                                                                    )}
                                                                    style={{ width: `${Math.min(100, Math.max(0, s.activity_percent))}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-text-main whitespace-nowrap">
                                                        <span className="flex items-center gap-1">
                                                            <Mouse className="w-3 h-3 text-blue-400/80" />
                                                            {s.mouse_clicks}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-text-main whitespace-nowrap">
                                                        <span className="flex items-center gap-1">
                                                            <Keyboard className="w-3 h-3 text-purple-400/80" />
                                                            {s.key_presses}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-text-main whitespace-nowrap">
                                                        <span className="text-text-muted">
                                                            <span className="font-bold text-text-main">{activeSecs}</span> / 60s
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 max-w-[260px]">
                                                        <div className="truncate flex items-center gap-1.5">
                                                            <span className="font-semibold text-text-main shrink-0">
                                                                {s.app_name || 'App'}
                                                            </span>
                                                            {s.window_title && (
                                                                <span className="text-text-muted truncate font-normal" title={s.window_title}>
                                                                    — {s.window_title}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border bg-surface flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-main font-semibold text-xs rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Enlarged Screenshot Overlay */}
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
