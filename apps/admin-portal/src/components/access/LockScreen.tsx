import { motion } from 'framer-motion';
import { Lock, CreditCard, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LockScreen() {
    const { organization, signOut } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 overflow-hidden">
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-lg bg-surface border border-border rounded-[40px] shadow-2xl p-12 text-center"
            >
                {/* Icon Header */}
                <div className="w-20 h-20 bg-rose-500/10 rounded-[24px] flex items-center justify-center mx-auto mb-8 border border-rose-500/20 shadow-glow-rose">
                    <Lock className="w-10 h-10 text-rose-500" />
                </div>

                <h1 className="text-3xl font-black text-text-main mb-4 tracking-tight">
                    Account <span className="text-rose-500 italic">Locked</span>
                </h1>

                <p className="text-[15px] font-medium text-text-muted leading-relaxed mb-10 max-w-[340px] mx-auto">
                    {organization?.subscription_status === 'Locked' 
                        ? "Your Premium trial has ended. Upgrade to continue using TrackOwl or downgrade to the Basic plan."
                        : "Your subscription has expired or payment was unsuccessful. Please update your billing information to resume access."}
                </p>

                <div className="grid gap-4">
                    <button
                        onClick={() => navigate('/dashboard/settings/billing')}
                        className="w-full h-14 bg-primary text-white rounded-2xl text-[13px] font-bold shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <CreditCard className="w-5 h-5" />
                        Upgrade to Continue
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full h-14 bg-surface border border-border text-text-muted rounded-2xl text-[13px] font-bold hover:bg-surface-hover active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

                {/* Contact Support */}
                <p className="mt-10 text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">
                    Need help? <button className="text-primary hover:underline">Contact Support</button>
                </p>
            </motion.div>
        </div>
    );
}
