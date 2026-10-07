import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Says so when the connection has gone.
 *
 * Mounted once, at the root, so it covers every page including sign-in and
 * onboarding — a page that loaded before the connection dropped carries on
 * looking perfectly healthy otherwise.
 *
 * Fixed to the top and above everything, but it does not take the pointer:
 * reading a page while offline is fine, and the banner should not be in the
 * way of it.
 */
export function OfflineBanner() {
    const online = useOnlineStatus();

    return (
        <AnimatePresence>
            {!online && (
                <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed top-0 inset-x-0 z-[999] pointer-events-none flex justify-center p-3"
                >
                    <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-warning/15 border border-warning/30 shadow-premium backdrop-blur-sm">
                        <WifiOff className="w-4 h-4 text-warning shrink-0" />
                        <span className="text-[12px] font-bold text-text-main">
                            You are offline. Nothing will be saved, and the
                            figures on screen may be out of date.
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
