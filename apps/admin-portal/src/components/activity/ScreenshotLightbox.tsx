import { X, Clock, Maximize2, Minimize2, Shield, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SecureImage } from '../ui/SecureImage';

interface ScreenshotLightboxProps {
    enlarged: any;
    setEnlarged: (screenshot: any | null) => void;
}

export function ScreenshotLightbox({ enlarged, setEnlarged }: ScreenshotLightboxProps) {
    const [isMaximized, setIsMaximized] = useState(false);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setEnlarged(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [setEnlarged]);

    if (!enlarged) return null;

    return (
        <div
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-500 p-0 md:p-10"
            style={{ cursor: 'zoom-out' }}
            onClick={() => setEnlarged(null)}
        >
            {/* Main Lightbox Frame */}
            <div
                className={`flex flex-col overflow-hidden transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) bg-[#0c0c0e] border border-white/10 shadow-2xl
                    ${isMaximized ? 'w-screen h-screen rounded-none' : 'w-full h-full max-w-7xl max-h-[90vh] rounded-[2rem]'}
                `}
                onClick={e => e.stopPropagation()}
                style={{ cursor: 'default' }}
            >
                {/* Header: High-Tech HUD Style */}
                <div className="flex justify-between items-center px-8 py-5 shrink-0 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary animate-pulse" />
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center">
                                    TrackOwl <span className="text-primary italic ml-1">VISION</span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                <span className="text-[10px] font-mono text-white/40 tracking-[0.2em] ">
                                    Live_Capture_Stream // ID:{enlarged.id}
                                </span>
                            </div>
                        </div>

                        <div className="hidden lg:block h-8 w-px bg-surface/10 mx-2" />

                        <div className="hidden lg:block">
                            <p className="text-[9px] font-black text-primary/60 tracking-[0.3em]">Source Node</p>
                            <p className="text-xs font-mono text-white/70">{enlarged.session_id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-2.5 rounded-xl bg-surface/5 hover:bg-surface-hover/10 border border-white/10 text-white/50 hover:text-white transition-all"
                        >
                            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button
                            onClick={() => setEnlarged(null)}
                            className="ml-2 p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 transition-all hover:rotate-90"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                {/* Body: Focus on the Image */}
                <div className="flex-1 min-h-0 w-full relative group/viewport overflow-hidden bg-[radial-gradient(circle_at_center,_#111_0%,_#000_100%)]">
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <SecureImage
                            path={enlarged.file_url}
                            alt="Surveillance Capture"
                            className="max-w-full max-h-full object-contain transition-transform duration-1000 group-hover/viewport:scale-[1.02]"
                            style={{
                                filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.9))',
                            }}
                        />

                        {/* Floating Metadata Badge */}
                        <div className="absolute bottom-8 left-8 flex items-center gap-4 p-4 glass-panel rounded-2xl border-white/10 translate-y-4 opacity-0 group-hover/viewport:translate-y-0 group-hover/viewport:opacity-100 transition-all duration-500">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                                <Clock className="text-primary w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-primary tracking-tighter">Capture Timestamp</p>
                                <p className="text-lg font-bold text-white leading-none">
                                    {new Date(enlarged.recorded_at).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer: Diagnostic Info */}
                <div className="px-8 py-4 flex justify-between items-center bg-[#08080a] border-t border-white/5 shrink-0">
                    <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-white/30 ">Integrity Check</span>
                            <span className="text-[10px] text-emerald-500/80 font-mono">SECURE_SSL_VERIFIED</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-white/30 ">Engine</span>
                            <span className="text-[10px] text-white/60 font-mono">VISION_AI_V4.2</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-surface/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[9px] font-bold text-white/40 tracking-[0.2em]">
                            System Active // Monitoring Source
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-white/20 mr-4">
                            <kbd className="px-1.5 py-0.5 rounded bg-surface/5 border border-white/10 text-[9px] font-mono">ESC</kbd>
                            <span className="text-[9px] font-bold ">Exit_View</span>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-surface/5 hover:bg-surface-hover/10 border border-white/10 rounded-xl text-xs font-bold text-white/80 transition-all">
                            <Download size={14} />
                            Archive
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}