import { X, Clock } from 'lucide-react';
import { SecureImage } from '../ui/SecureImage';

interface ScreenshotLightboxProps {
    enlarged: any;
    setEnlarged: (screenshot: any | null) => void;
}

export function ScreenshotLightbox({ enlarged, setEnlarged }: ScreenshotLightboxProps) {
    if (!enlarged) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-8 backdrop-blur-3xl animate-in fade-in duration-500 cursor-zoom-out" 
            onClick={() => setEnlarged(null)}
        >
            <div className="max-w-7xl w-full relative group" onClick={e => e.stopPropagation()}>
                <div className="absolute -top-20 left-0 right-0 flex justify-between items-center animate-in slide-in-from-bottom-4 duration-700">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight leading-none mb-2">Screenshot Viewer</h2>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary font-mono bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 inline-block">
                            ID: {enlarged.id} • Session: {enlarged.session_id.slice(0, 8)}
                        </p>
                    </div>
                    <button onClick={() => setEnlarged(null)} className="p-4 bg-white/10 border border-white/20 hover:bg-white/20 rounded-2xl shadow-lg transition-all group/close">
                        <X className="w-6 h-6 text-white group-hover/close:rotate-90 transition-transform" strokeWidth={2.5} />
                    </button>
                </div>
                
                <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl animate-in zoom-in-95 duration-500">
                    <SecureImage path={enlarged.file_url} alt="Full Screenshot" className="w-full h-auto" />
                    <div className="absolute bottom-8 left-8 p-6 bg-black/60 border border-white/10 rounded-2xl backdrop-blur-xl animate-in slide-in-from-left-8 duration-1000 delay-300 shadow-xl">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-inner">
                                <Clock className="w-6 h-6 text-primary" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1 font-mono">Capture Timestamp</p>
                                <p className="text-2xl font-bold text-white tracking-tight leading-none">
                                    {new Date(enlarged.recorded_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <p className="text-text-primary/10 text-[11px] font-bold uppercase tracking-[1em] text-center mt-12 animate-pulse font-mono">
                    ENCRYPTED SYNC: ACTIVE
                </p>
            </div>
        </div>
    );
}
