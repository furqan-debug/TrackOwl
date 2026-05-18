import { motion } from 'framer-motion';
import { Crown, Zap, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureLockOverlayProps {
    title?: string;
    description?: string;
}

export function FeatureLockOverlay({
    title = "Premium Feature",
    description = "Upgrade to Premium to unlock this feature and get the complete employee monitoring suite."
}: FeatureLockOverlayProps) {
    const navigate = useNavigate();

    return (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center bg-surface/90 backdrop-blur-md rounded-2xl overflow-hidden px-6 py-8">
            {/* Subtle decorative glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 blur-[30px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex flex-col items-center gap-5 w-full"
            >
                {/* Icon */}
                <div className="w-14 h-14 bg-primary/10 rounded-md flex items-center justify-center border border-primary/20 mb-2">
                    <Crown className="w-5 h-5 text-primary" />
                </div>

                {/* Title */}
                <h3 className="text-[18px] font-black text-text-main tracking-tight leading-snug">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-[14px] font-medium text-text-muted leading-relaxed max-w-[360px]">
                    {description}
                </p>

                {/* CTA */}
                <button
                    onClick={() => navigate('/dashboard/settings/billing')}
                    className="mt-2 w-full max-w-[210px] h-9 bg-primary text-white rounded-xl text-[12px] font-bold shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 group"
                >
                    <Zap className="w-3.5 h-3.5" />
                    Unlock Premium Now
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
}
