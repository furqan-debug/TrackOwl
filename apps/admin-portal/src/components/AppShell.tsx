import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MobileNav } from './MobileNav.tsx';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="flex flex-col h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans">
            <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

            <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Mobile overlay */}
                {mobileMenuOpen && (
                    <MobileNav onClose={() => setMobileMenuOpen(false)} />
                )}

                <main className="flex-1 overflow-y-auto shell-scrollbar">
                    <div className="max-w-[1600px] mx-auto w-full min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
