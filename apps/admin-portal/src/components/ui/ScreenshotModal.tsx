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
                className="bg-surface rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl max-h-full flex flex-col relative animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-text-muted">
                            <Camera className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-text-main">Enlarged Capture</h3>
                            <p className="text-[10px] font-bold text-text-muted ">
                                Recorded at {new Date(screenshot.recordedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-slate-600 transition-colors">
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-surface-hover rounded-lg text-text-muted hover:text-rose-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-surface-hover flex items-center justify-center p-6 min-h-0">
                    <SecureImage
                        path={screenshot.path}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-surface flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-text-muted ">Activity Intensity</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-24 h-1.5 bg-main rounded-full overflow-hidden border border-border">
                                    <div className="h-full bg-primary" style={{ width: `${screenshot.activityPercent}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-text-main">{screenshot.activityPercent}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-text-muted text-[9px] font-bold ">
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-hover border border-border text-text-muted">ESC</kbd>
                        to close
                    </div>
                </div>
            </div>
        </div>
    );
}
