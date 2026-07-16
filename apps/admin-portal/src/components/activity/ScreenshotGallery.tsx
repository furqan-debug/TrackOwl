import { Camera, ShieldCheck } from 'lucide-react';
import { EmptyState } from '../ui';
import { SecureImage } from '../ui/SecureImage';

interface ScreenshotGalleryProps {
    screenshots: any[];
    onSelectImage: (screenshot: any) => void;
}

export function ScreenshotGallery({ screenshots, onSelectImage }: ScreenshotGalleryProps) {
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
            {screenshots.map((ss) => (
                <div
                    key={ss.id}
                    onClick={() => onSelectImage(ss)}
                    className="group relative flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                    {/* Image Container with precise aspect ratio */}
                    <div className="relative aspect-video rounded-[24px] overflow-hidden bg-main border border-border shadow-shell-sm group-hover:border-primary/40 group-hover:shadow-elevated transition-all duration-500 cursor-zoom-in ring-4 ring-transparent group-hover:ring-primary/5">
                        <SecureImage
                            path={ss.file_url}
                            alt="Activity Screenshot"
                            className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                        />

                        {/* Overlay Detail */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500 delay-75">
                                <div className="px-5 py-2.5 rounded-xl bg-surface/10 backdrop-blur-xl border border-white/20 text-white text-[11px] font-bold shadow-2xl">
                                    Expand
                                </div>
                            </div>
                        </div>

                        {/* Status HUD */}
                        <div className="absolute left-4 top-4 px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 transition-all duration-500">
                            Verified Source
                        </div>
                    </div>

                    {/* Meta Info: Proper Alignment */}
                    <div className="mt-5 flex items-center justify-between px-2">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-primary" />
                                <span className="text-[14px] font-bold text-text-main tracking-tight leading-none group-hover:text-primary transition-colors">
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
            ))}
        </div>
    );
}
