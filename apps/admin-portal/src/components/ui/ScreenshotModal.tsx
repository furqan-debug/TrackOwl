import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SecureImage } from './SecureImage';

interface Screenshot {
    path: string;
    recordedAt: string;
    activityPercent: number;
}

interface ScreenshotModalProps {
    screenshots: Screenshot[];
    currentIndex: number;
    onClose: () => void;
    onNavigate: (index: number) => void;
}

export function ScreenshotModal({ screenshots, currentIndex, onClose, onNavigate }: ScreenshotModalProps) {
    const screenshot = screenshots[currentIndex] ?? null;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < screenshots.length - 1;

    const goPrev = useCallback(() => { if (hasPrev) onNavigate(currentIndex - 1); }, [hasPrev, currentIndex, onNavigate]);
    const goNext = useCallback(() => { if (hasNext) onNavigate(currentIndex + 1); }, [hasNext, currentIndex, onNavigate]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') goPrev();
            if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, goPrev, goNext]);

    if (!screenshot) return null;

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white/60 text-[12px] font-bold select-none">
                {currentIndex + 1} / {screenshots.length}
            </div>

            {/* Left arrow */}
            <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                disabled={!hasPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-20 disabled:pointer-events-none"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Screenshot */}
            <SecureImage
                path={screenshot.path}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
            />

            {/* Right arrow */}
            <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                disabled={!hasNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-20 disabled:pointer-events-none"
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}
