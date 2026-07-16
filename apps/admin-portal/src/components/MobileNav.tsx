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

            {/* Drawer */}
            <div
                className="fixed inset-y-0 left-0 w-[280px] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col border-r border-white/5"
                style={{ background: 'var(--gradient-sidebar)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                    <img src={logoDark} alt="TrackOwl" className="h-10 w-auto object-contain" />
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {filteredNav.map((group) => (
                        <div key={group.name}>
                            {group.path && !group.children ? (
                                /* Direct link — show icon + name */
                                <Link
                                    to={group.path}
                                    onClick={onClose}
                                    className={clsx(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border",
                                        location.pathname === group.path
                                            ? "bg-[var(--bg-menu-active)] text-[var(--sidebar-text-active)] border-white/10 shadow-sm"
                                            : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-white/[0.05] border-transparent"
                                    )}
                                >
                                    <group.icon
                                        className={clsx("w-4 h-4 shrink-0",
                                            location.pathname === group.path ? "text-[var(--sidebar-text-active)]" : "text-[var(--sidebar-text)]"
                                        )}
                                        strokeWidth={2}
                                    />
                                    {group.name}
                                </Link>
                            ) : group.path && group.children ? (
                                /* Has both path AND children — link to parent path */
                                <Link
                                    to={group.path}
                                    onClick={onClose}
                                    className={clsx(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border",
                                        location.pathname.startsWith(group.path)
                                            ? "bg-[var(--bg-menu-active)] text-[var(--sidebar-text-active)] border-white/10 shadow-sm"
                                            : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-white/[0.05] border-transparent"
                                    )}
                                >
                                    <group.icon
                                        className={clsx("w-4 h-4 shrink-0",
                                            location.pathname.startsWith(group.path) ? "text-[var(--sidebar-text-active)]" : "text-[var(--sidebar-text)]"
                                        )}
                                        strokeWidth={2}
                                    />
                                    {group.name}
                                </Link>
                            ) : (
                                /* Group with children only — show label + child links */
                                <div className="mt-3">
                                    <div className="flex items-center gap-2 px-3 pb-1.5">
                                        <group.icon className="w-3 h-3 text-white/30" strokeWidth={2.5} />
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.18em]">
                                            {group.name}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {group.children?.map(child => (
                                            <Link
                                                key={child.path}
                                                to={child.path}
                                                onClick={onClose}
                                                className={clsx(
                                                    "flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border",
                                                    location.pathname === child.path
                                                        ? "bg-[var(--bg-menu-active)] text-[var(--sidebar-text-active)] border-white/10"
                                                        : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-white/[0.05] border-transparent"
                                                )}
                                            >
                                                <span className={clsx(
                                                    "w-1.5 h-1.5 rounded-full shrink-0 transition-all",
                                                    location.pathname === child.path
                                                        ? "bg-accent shadow-[0_0_8px_rgba(244,180,0,0.6)]"
                                                        : "bg-white/25"
                                                )} />
                                                {child.name}
                                                {location.pathname === child.path && (
                                                    <div className="ml-auto w-1 h-4 rounded-full bg-accent/50" />
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Favorites */}
                    {favorites.length > 0 && (
                        <div className="mt-4 space-y-1">
                            <div className="flex items-center gap-2 px-3 pb-1.5">
                                <Star className="w-3 h-3 text-accent" fill="currentColor" />
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.18em]">
                                    Favorites
                                </span>
                            </div>
                            {favorites.map(fav => (
                                <Link
                                    key={fav.path}
                                    to={fav.path}
                                    onClick={onClose}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[var(--sidebar-text)] hover:text-white hover:bg-white/[0.08] transition-all"
                                >
                                    {fav.name}
                                    <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-white/[0.07] bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-[#001B4D] text-[13px] font-bold shadow-lg shadow-accent/20 shrink-0">
                            {profile?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-white truncate leading-tight">{profile?.full_name}</p>
                            <p className="text-[10px] text-white/50 font-semibold">{profile?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#FF4D4D]/10 text-[#FF4D4D] text-[11px] font-black uppercase tracking-[0.15em] hover:bg-[#FF4D4D]/20 transition-all border border-[#FF4D4D]/20"
                    >
                        <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
