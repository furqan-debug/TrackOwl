import { Camera, ShieldCheck, Check } from 'lucide-react';
import { EmptyState } from '../ui';
import { SecureImage } from '../ui/SecureImage';
import clsx from 'clsx';

interface Screenshot {
    id: number;
    session_id: string;
    recorded_at: string;
    file_url: string;
    user_id?: string;
}

interface ScreenshotGalleryProps {
    screenshots: Screenshot[];
    onSelectImage: (screenshot: Screenshot) => void;
    selectionMode?: boolean;
    selectedIds?: Set<number>;
    onToggleSelect?: (screenshot: Screenshot) => void;
    maxLimit?: number;
    /**
     * Who a capture belongs to. Only passed when the gallery is showing more
     * than one person — with a single member selected every tile has the same
     * owner and naming them on each one is noise.
     */
    memberName?: (userId?: string) => string | undefined;
}

export function ScreenshotGallery({
    screenshots,
    onSelectImage,
    selectionMode = false,
    selectedIds,
    onToggleSelect,
    maxLimit = 50,
    memberName,
}: ScreenshotGalleryProps) {
    if (screenshots.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <EmptyState
                    icon={<Camera />}
                    title="No visual sessions captured"
                    description="When work begins, automated captures will be synced and displayed here for review."
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {screenshots.map((ss) => {
                const isSelected = selectedIds?.has(ss.id);
                const isLimitReached = (selectedIds?.size ?? 0) >= maxLimit;
                const isDisabledFromLimit = selectionMode && !isSelected && isLimitReached;

                return (
                    <div
                        key={ss.id}
                        onClick={() => {
                            if (selectionMode) {
                                onToggleSelect?.(ss);
                            } else {
                                onSelectImage(ss);
                            }
                        }}
                        className={clsx(
                            "group relative flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700",
                            selectionMode && "select-none",
                            isDisabledFromLimit && "opacity-60"
                        )}
                    >
                        {/* Image Container with precise aspect ratio */}
                        <div
                            className={clsx(
                                "relative aspect-video rounded-[24px] overflow-hidden bg-main border shadow-shell-sm transition-all duration-300",
                                selectionMode ? "cursor-pointer" : "cursor-zoom-in",
                                isSelected
                                    ? "border-primary ring-4 ring-primary/20 shadow-elevated scale-[1.01]"
                                    : "border-border group-hover:border-primary/40 group-hover:shadow-elevated ring-4 ring-transparent group-hover:ring-primary/5"
                            )}
                        >
                            <SecureImage
                                path={ss.file_url}
                                alt="Activity Screenshot"
                                className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                            />

                            {/* Whose capture this is. Held at the bottom of
                                the tile so it never covers the checkbox, and
                                only drawn on hover so a wall of captures stays
                                a wall of captures. */}
                            {memberName?.(ss.user_id) && (
                                <div className="absolute inset-x-0 bottom-0 z-10 px-3.5 py-2.5 bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    <span className="text-[12px] font-bold text-white drop-shadow truncate block">
                                        {memberName(ss.user_id)}
                                    </span>
                                </div>
                            )}

                            {/* Selection Overlay / Tint */}
                            {selectionMode && isSelected && (
                                <div className="absolute inset-0 bg-primary/10 pointer-events-none z-10" />
                            )}

                            {/* Checkbox indicator when in selection mode */}
                            {selectionMode && (
                                <div className="absolute top-3.5 right-3.5 z-20 transition-all duration-200">
                                    <div
                                        className={clsx(
                                            "w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md",
                                            isSelected
                                                ? "bg-primary text-white ring-2 ring-white/30 scale-105"
                                                : "bg-black/50 backdrop-blur-md border border-white/40 text-transparent group-hover:border-white group-hover:text-white/40"
                                        )}
                                    >
                                        <Check className="w-4 h-4 stroke-[3]" />
                                    </div>
                                </div>
                            )}

                            {/* Overlay Detail (only when NOT selecting) */}
                            {!selectionMode && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500 delay-75">
                                        <div className="px-5 py-2.5 rounded-xl bg-surface/10 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-2xl">
                                            Expand
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Status HUD */}
                            <div className="absolute left-4 top-4 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500">
                                Verified Source
                            </div>
                        </div>

                        {/* Meta Info: Proper Alignment */}
                        <div className="mt-5 flex items-center justify-between px-2">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={clsx(
                                            "w-1.5 h-1.5 rounded-full shadow-glow-primary transition-colors",
                                            isSelected ? "bg-primary" : "bg-primary"
                                        )}
                                    />
                                    <span
                                        className={clsx(
                                            "text-[14px] font-bold tracking-tight leading-none transition-colors",
                                            isSelected ? "text-primary" : "text-text-main group-hover:text-primary"
                                        )}
                                    >
                                        {new Date(ss.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-text-muted ml-3.5 opacity-70">
                                    {new Date(ss.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover border border-border rounded-xl group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] font-bold text-text-muted tracking-[0.1em] group-hover:text-primary/70">Secure</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
