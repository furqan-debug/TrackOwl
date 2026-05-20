import { Link, useLocation } from 'react-router-dom';
import { X, LogOut, Star, ChevronRight } from 'lucide-react';
import { navStructure, type Role } from '../nav/navModel';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import clsx from 'clsx';
import logoDark from '../assets/branding/4.svg';

interface MobileNavProps {
    onClose: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
    const location = useLocation();
    const { profile, signOut } = useAuth();
    const { favorites } = useFavorites();
    const userRole = (profile?.role || 'User') as Role;

    const filteredNav = navStructure.filter(group => {
        if (group.allowedRoles && !group.allowedRoles.includes(userRole)) return false;
        return true;
    });

    return (
        <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer — uses same navy gradient as desktop sidebar */}
            <div
                className="fixed inset-y-0 left-0 w-[300px] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col border-r border-white/5"
                style={{ background: 'var(--gradient-sidebar)' }}
            >
                <div className="flex items-center justify-between p-6 border-b border-white/[0.05]">
                    <div className="flex items-center">
                        <img src={logoDark} alt="TrackOwl" className="h-24 w-auto object-contain" />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                    {/* Navigation */}
                    <nav className="space-y-1">
                        {filteredNav.map((group) => (
                            <div key={group.name} className="space-y-1">
                                {group.path ? (
                                    <Link
                                        to={group.path}
                                        onClick={onClose}
                                        className={clsx(
                                            "flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-bold transition-all",
                                            location.pathname === group.path
                                                ? "bg-accent text-[#001B4D] shadow-lg"
                                                : "text-[var(--sidebar-text)] hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <group.icon className={clsx("w-4.5 h-4.5", location.pathname === group.path ? "text-[#001B4D]" : "text-[var(--sidebar-text)]")} strokeWidth={2.5} />
                                            {group.name}
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="pt-2">
                                        <div className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                                            {group.name}
                                        </div>
                                        <div className="space-y-1 mt-1">
                                            {group.children?.map(child => (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    onClick={onClose}
                                                    className={clsx(
                                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                                                        location.pathname === child.path
                                                            ? "text-[var(--sidebar-text-active)] bg-white/[0.05]"
                                                            : "text-[var(--sidebar-text)] hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className={clsx("w-1.5 h-1.5 rounded-full", location.pathname === child.path ? "bg-accent shadow-[0_0_8px_rgba(244,180,0,0.5)]" : "bg-white/40")} />
                                                    {child.name}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>

                    {/* Favorites */}
                    {favorites.length > 0 && (
                        <div className="space-y-3">
                            <div className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Star className="w-3 h-3 fill-accent text-accent" />
                                Favorites
                            </div>
                            <div className="space-y-1">
                                {favorites.map(fav => (
                                    <Link
                                        key={fav.path}
                                        to={fav.path}
                                        onClick={onClose}
                                        className="flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] font-medium text-[var(--sidebar-text)] hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        {fav.name}
                                        <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-white/[0.03]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-[#001B4D] font-bold shadow-lg shadow-accent/20">
                            {profile?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{profile?.full_name}</p>
                            <p className="text-[10px] text-white/60 font-bold">{profile?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#FF4D4D]/10 text-[#FF4D4D] text-[11px] font-black uppercase tracking-[0.15em] hover:bg-[#FF4D4D]/20 transition-all border border-[#FF4D4D]/20"
                    >
                        <LogOut className="w-4 h-4" strokeWidth={2.5} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

