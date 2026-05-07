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
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-main/40 backdrop-blur-md rounded-[32px] overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-surface border border-border rounded-[40px] shadow-2xl p-12 text-center relative overflow-hidden"
            >
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 blur-[30px] rounded-full" />

                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-glow-primary">
                    <Crown className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-2xl font-black text-text-main mb-4 tracking-tight">
                    {title}
                </h3>

                <p className="text-[13px] font-medium text-text-muted leading-relaxed mb-10">
                    {description}
                </p>

                <button
                    onClick={() => navigate('/dashboard/settings/billing')}
                    className="w-full h-12 bg-primary text-white rounded-xl text-[12px] font-bold shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                >
                    <Zap className="w-4 h-4" />
                    Unlock Premium Now
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
}
