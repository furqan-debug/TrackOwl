import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav.tsx';
import { useAuth } from '../context/AuthContext';
import { LockScreen } from './access/LockScreen';
import { useTheme } from '../hooks/useTheme';
import logoDark from '../assets/branding/4.svg';
import logoLight from '../assets/branding/3.svg';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { organization } = useAuth();
    const { theme, toggleTheme } = useTheme();
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
                {/* Mobile Top Bar — hidden on md+ */}
                <div className="md:hidden sticky top-0 z-[60] flex items-center justify-between px-4 h-14 bg-[var(--bg-surface)] border-b border-[var(--border-color)] shrink-0">
                    <img
                        src={theme === 'dark' ? logoDark : logoLight}
                        alt="TrackOwl"
                        className="h-8 w-auto object-contain"
                    />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-primary hover:bg-primary/5 active:scale-95 transition-all"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                        </button>
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-white shadow-md active:scale-95 transition-all"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                    {/* Mobile overlay */}
                    {mobileMenuOpen && (
                        <MobileNav onClose={() => setMobileMenuOpen(false)} />
                    )}

                    <main className="flex-1 overflow-y-auto shell-scrollbar">
                        <div className="max-w-[1600px] mx-auto w-full min-h-full py-6 px-4 md:py-10 md:px-6 lg:px-10">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
