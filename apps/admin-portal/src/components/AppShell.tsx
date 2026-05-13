import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav.tsx';
import { useAuth } from '../context/AuthContext';
import { LockScreen } from './access/LockScreen';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { organization } = useAuth();
    const isLockedPath = location.pathname === '/dashboard/pricing' || location.pathname === '/dashboard/settings/billing';
    const isLocked = organization?.subscription_status === 'Locked' && !isLockedPath;

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans">
            {isLocked && <LockScreen />}
            
            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full shrink-0">
                <Sidebar 
                    isCollapsed={sidebarCollapsed} 
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
                />
            </div>

            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Mobile Menu Toggle (only visible on mobile) */}
                <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden fixed top-4 right-4 z-[70] w-12 h-12 flex items-center justify-center rounded-2xl bg-primary text-white shadow-premium border border-white/10 active:scale-95 transition-all"
                    aria-label="Open menu"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div className="flex-1 flex flex-col min-h-0 relative">
                    {/* Mobile overlay */}
                    {mobileMenuOpen && (
                        <MobileNav onClose={() => setMobileMenuOpen(false)} />
                    )}

                    <main className="flex-1 overflow-y-auto shell-scrollbar">
                        <div className="max-w-[1600px] mx-auto w-full min-h-full py-10 px-6 lg:px-10">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
