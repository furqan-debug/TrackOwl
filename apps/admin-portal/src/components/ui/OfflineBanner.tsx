import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Pages where the warning has nothing to say.
 *
 * The marketing and policy pages save nothing and show no live figures, so
 * "nothing will be saved, and the figures on screen may be out of date" is
 * noise there — it reads as a fault in a page that is working perfectly well.
 * Everywhere else keeps it: signing in, accepting an invite and resetting a
 * password all need the network, and the dashboard shows figures that do go
 * stale.
 */
const PUBLIC_PATHS = ['/', '/privacy', '/terms', '/security', '/about'];

/**
 * Says so when the connection has gone.
 *
 * Mounted once, at the root, so it covers every page that can act on the
 * network — sign-in, onboarding and the whole dashboard. A page that loaded
 * before the connection dropped carries on looking perfectly healthy
 * otherwise. The marketing pages are excluded; see PUBLIC_PATHS.
 *
 * Fixed to the top and above everything, but it does not take the pointer:
 * reading a page while offline is fine, and the banner should not be in the
 * way of it.
 */
export function OfflineBanner() {
    const online = useOnlineStatus();
    const { pathname } = useLocation();

    const onPublicPage = PUBLIC_PATHS.includes(pathname);

    return (
        <AnimatePresence>
            {!online && !onPublicPage && (
                <motion.div
                    role="status"
                    aria-live="polite"
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed top-0 inset-x-0 z-[999] pointer-events-none flex justify-center p-3"
                >
                    {/* Deliberately not themed. The theme class is applied by
                        useTheme, which only runs once AppShell, Header or
                        Sidebar has mounted — and this banner can appear before
                        any of them, while the page is still loading. Reading
                        theme tokens then gives the light-mode text colour on
                        whatever background is already there, which is how it
                        first appeared: navy on navy. Solid amber and near
                        black carry their own contrast in every state. */}
                    <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#F59E0B] border border-[#B45309] shadow-premium">
                        <WifiOff className="w-4 h-4 text-[#1F1A17] shrink-0" />
                        <span className="text-[12px] font-bold text-[#1F1A17]">
                            You are offline. Nothing will be saved, and the
                            figures on screen may be out of date.
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
