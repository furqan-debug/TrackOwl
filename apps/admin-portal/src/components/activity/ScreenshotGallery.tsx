import { Camera, ShieldCheck, Maximize2 } from 'lucide-react';
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {screenshots.map((ss) => (
                <div 
                    key={ss.id}
                    onClick={() => onSelectImage(ss)}
                    className="group relative flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    {/* Image Container with precise aspect ratio */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group-hover:border-primary transition-all duration-300 cursor-zoom-in">
                        <SecureImage 
                            path={ss.file_url} 
                            alt="Activity Screenshot" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        
                        {/* Overlay Detail */}
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-2xl">
                                    <Maximize2 className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        {/* Status HUD */}
                        <div className="absolute left-3 top-3 px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded text-[9px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            High Res
                        </div>
                    </div>

                    {/* Meta Info: Proper Alignment */}
                    <div className="mt-4 flex items-center justify-between px-1">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">
                                {new Date(ss.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                {new Date(ss.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Verified</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
