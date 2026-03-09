import { useState, useRef, useEffect } from 'react';
import { Star, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFavorites } from '../context/FavoritesContext';

export function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toggleFavorite, isFavorite } = useFavorites();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    // Map paths to descriptive names for favorites
    const getPageName = (path: string) => {
        if (path === '/') return 'Dashboard';
        if (path === '/activity') return 'Screenshots';
        if (path.startsWith('/activity/apps')) return 'Apps';
        if (path === '/url-tracking') return 'URLs';
        if (path === '/timesheets') return 'Timesheets';
        if (path === '/reports') return 'Time & activity';
        if (path === '/people') return 'Members';
        if (path === '/projects') return 'Projects';
        if (path === '/calendar') return 'Calendar';
        if (path === '/financials') return 'Financials';

        // Fallback: capitalize the last part of the path
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) return 'Dashboard';
        const last = parts[parts.length - 1];
        return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
    };

    const pageName = getPageName(location.pathname);
    const favorited = isFavorite(location.pathname);

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700 ml-2">{pageName}</h2>
                <button
                    onClick={() => toggleFavorite(pageName, location.pathname)}
                    className="p-1.5 hover:bg-slate-50 rounded-lg group transition-colors"
                    title={favorited ? "Remove from favorites" : "Add to favorites"}
                >
                    <Star
                        className={`w-4 h-4 transition-all ${favorited
                            ? "fill-yellow-400 text-yellow-500 scale-110"
                            : "text-slate-300 group-hover:text-slate-400"
                            }`}
                    />
                </button>
            </div>

            <div className="flex items-center gap-4 text-slate-500" ref={menuRef}>
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        title="Profile options"
                        className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center text-white text-sm font-bold ml-2 shadow-sm cursor-pointer"
                    >
                        K
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
