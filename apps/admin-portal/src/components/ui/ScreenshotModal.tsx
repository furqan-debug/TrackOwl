import { useEffect } from 'react';
import { Camera, X, Download } from 'lucide-react';
import { SecureImage } from './SecureImage';

interface ScreenshotModalProps {
    screenshot: {
        path: string;
        recordedAt: string;
        activityPercent: number;
    } | null;
    onClose: () => void;
}

export function ScreenshotModal({ screenshot, onClose }: ScreenshotModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!screenshot) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-full flex flex-col relative animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                            <Camera className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Enlarged Capture</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Recorded at {new Date(screenshot.recordedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <Download className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-6 min-h-0">
                    <SecureImage 
                        path={screenshot.path} 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Activity Intensity</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                    <div className="h-full bg-primary" style={{ width: `${screenshot.activityPercent}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-slate-700">{screenshot.activityPercent}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500">ESC</kbd>
                        to close
                    </div>
                </div>
            </div>
        </div>
    );
}
