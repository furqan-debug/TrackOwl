import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, ChevronLeft, Star, Zap, LogOut, Lock, Sun, Moon } from 'lucide-react';
import { navStructure, matchActive, type BadgeType, type Role } from '../nav/navModel';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { SecureImage } from '../components/ui/SecureImage';
import logoDark from '../assets/branding/4.svg';

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 68;

export interface SidebarProps {
    /** When true, sidebar is shown as mobile overlay (always expanded, no collapse toggle). */
    overlay?: boolean;
    /** Called when overlay should close (e.g. backdrop click or link click). */
    onOverlayClose?: () => void;
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ overlay = false, onOverlayClose, isCollapsed = false, onToggle }: SidebarProps) {
    const location = useLocation();
    const { favorites, toggleFavorite, isFavorite } = useFavorites();
    const { profile, signOut, organization, isPremium } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const userRole = (profile?.role || 'User') as Role;

    const effectiveCollapsed = overlay ? false : isCollapsed;
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [favoritesExpanded, setFavoritesExpanded] = useState(true);
    const [avatarError, setAvatarError] = useState(false);

    // Reset error state if avatar changes
    useEffect(() => {
        setAvatarError(false);
    }, [profile?.avatar_url]);

    // Filtered nav structure based on roles
    const filteredNav = useMemo(() => {
        return navStructure
            .map(group => {
                if (group.children) {
                    const allowedChildren = group.children.filter(child =>
                        !child.allowedRoles || child.allowedRoles.includes(userRole)
                    );
                    return { ...group, children: allowedChildren };
                }
                return { ...group };
            })
            .filter(group => {
                if (group.allowedRoles && !group.allowedRoles.includes(userRole)) return false;
                if (group.children && group.children.length === 0) return false;
                return true;
            }) as typeof navStructure;
    }, [userRole]);

    useEffect(() => {
        const currentPath = location.pathname;
        const newExpanded = { ...expandedGroups };
        let changed = false;

        filteredNav.forEach(group => {
            if (group.children) {
                const isChildActive = group.children.some(child => matchActive(currentPath, child.path));
                if (isChildActive && !newExpanded[group.name]) {
                    newExpanded[group.name] = true;
                    changed = true;
                }
            }
        });

        if (changed) {
            setExpandedGroups(newExpanded);
        }
    }, [location.pathname, filteredNav]);

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const renderBadge = (badge?: BadgeType) => {
        if (!badge || effectiveCollapsed) return null;
        if (badge === 'new') {
            return (
                <span className="flex items-center gap-1 bg-primary text-white text-[12px] font-bold px-2.5 py-1 rounded-full ml-2 shrink-0 ">
                    New
                </span>
            );
        }
        if (badge === 'bolt') {
            return <Zap className="w-3.5 h-3.5 text-primary ml-2 shrink-0 fill-primary" aria-hidden />;
        }
        return null;
    };

    return (
        <aside
            className={clsx(
                "h-full flex flex-col overflow-y-auto shell-scrollbar border-r border-white/5",
                overlay ? "w-[260px]" : "sticky top-0 transition-[width] duration-300 ease-in-out"
            )}
            style={{
                width: overlay ? undefined : (effectiveCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED),
                background: 'var(--gradient-sidebar)'
            }}
            aria-label="Main navigation"
        >
            {/* Logo Area */}
            <Link
                to="/dashboard"
                className={clsx(
                    "flex items-center sticky top-0 z-20 border-b border-white/[0.05] hover:opacity-80 transition-opacity",
                    effectiveCollapsed ? "justify-center px-0 py-6" : "px-6 py-6"
                )}
                style={{ background: 'transparent' }}
            >
                {effectiveCollapsed ? (
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <img src={logoDark} alt="" className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <img src={logoDark} alt="TrackOwl" className="h-16 w-auto object-contain" />
                )}
            </Link>

            <div className={clsx("flex-1 flex flex-col pt-8", effectiveCollapsed ? "px-2 pb-4" : "px-4 pb-8")}>
                {/* Favorites Section */}
                {!effectiveCollapsed && (
                    <div className="mb-8 px-2">
                        <button
                            type="button"
                            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                            className="w-full flex items-center justify-between py-2 text-[12px] font-bold text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] transition-colors group px-2"
                            aria-expanded={favoritesExpanded}
                        >
                            <div className="flex items-center gap-2">
                                <Star className={clsx("w-4 h-4 transition-colors", favorites.length > 0 ? "text-accent fill-accent/20" : "text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-text-active)]")} aria-hidden />
                                Favorites
                                <span className="text-[11px] opacity-60 font-mono ml-1">({favorites.length})</span>
                            </div>
                            <ChevronDown className={clsx("w-3 h-3 text-[var(--sidebar-text)] transition-transform duration-300", !favoritesExpanded && "-rotate-90")} />
                        </button>

                        <div className={clsx(
                            "mt-3 space-y-1.5 overflow-hidden transition-all duration-300",
                            favoritesExpanded ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                        )}>
                            {favorites.length > 0 ? (
                                favorites.map((fav) => (
                                    <Link
                                        key={fav.path}
                                        to={fav.path}
                                        onClick={() => onOverlayClose?.()}
                                        className={clsx(
                                            "flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-xl transition-all group",
                                            location.pathname === fav.path
                                                ? "bg-[var(--bg-menu-active)] text-[var(--sidebar-text-active)] font-bold border border-white/10"
                                                : "text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-white/5"
                                        )}
                                    >
                                        <div className={clsx("w-2 h-2 rounded-full", location.pathname === fav.path ? "bg-accent shadow-[0_0_8px_rgba(244,180,0,0.5)]" : "bg-white/40 group-hover:bg-accent/60")} />
                                        <span className="truncate font-bold text-[14px]">{fav.name}</span>
                                    </Link>
                                ))
                            ) : (
                                <p className="px-3 py-2.5 text-[11px] text-[var(--sidebar-text)] italic opacity-60 font-medium">No identified clusters.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Navigation */}
                <nav className="space-y-2" aria-label="Primary">
                    {!effectiveCollapsed && (
                        <p className="px-4 text-[11px] font-black text-white/40 mb-3 text-left uppercase tracking-[0.2em]">Navigation</p>
                    )}
                    {filteredNav.map((group) => {
                        const hasChildren = group.children && group.children.length > 0;
                        const isExpanded = !effectiveCollapsed && expandedGroups[group.name];
                        const isDirectlyActive = group.path && location.pathname === group.path;
                        const isChildActive = hasChildren && group.children?.some(c => matchActive(location.pathname, c.path));

                        return (
                            <div key={group.name} className="flex flex-col">
                                {hasChildren ? (
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group.name)}
                                        className={clsx(
                                            'group flex items-center rounded-xl text-[14px] font-bold transition-all',
                                            effectiveCollapsed ? 'justify-center p-3 w-full' : 'justify-between px-3.5 py-3 w-full',
                                            isChildActive && !isExpanded ? 'bg-[var(--bg-menu-active)] text-accent shadow-lg' :
                                                isExpanded ? 'text-white bg-white/[0.05]' : 'text-[var(--sidebar-text)] hover:text-white hover:bg-white/5'
                                        )}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className={clsx("flex items-center gap-3", effectiveCollapsed && "justify-center")}>
                                            <group.icon className={clsx("w-[20px] h-[20px] shrink-0 transition-colors",
                                                isChildActive && !isExpanded ? "text-accent" :
                                                    isChildActive || isExpanded ? "text-white" : "text-[var(--sidebar-text)] group-hover:text-white")}
                                                strokeWidth={2.5} aria-hidden />
                                            {!effectiveCollapsed && (
                                                <div className="flex items-center gap-2">
                                                    <span className="tracking-tight">{group.name}</span>
                                                    {group.requiresPremium && !isPremium && (
                                                        <Lock className="w-3.5 h-3.5 text-accent animate-pulse" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {!effectiveCollapsed && (
                                            <ChevronDown className={clsx("w-3.5 h-3.5 text-[var(--sidebar-text)] shrink-0 transition-transform duration-300", !isExpanded && "-rotate-90")} />
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        to={group.path!}
                                        onClick={() => onOverlayClose?.()}
                                        className={clsx(
                                            'group flex items-center justify-between rounded-xl text-[14px] font-bold transition-all relative overflow-hidden',
                                            effectiveCollapsed ? 'p-3' : 'px-3.5 py-3 gap-3',
                                            isDirectlyActive
                                                ? 'bg-white/10 text-white shadow-lg ring-1 ring-white/10'
                                                : 'text-[var(--sidebar-text)] hover:text-white hover:bg-white/5'
                                        )}
                                    >
                                        <div className={clsx("flex items-center gap-3", effectiveCollapsed && "justify-center w-full")}>
                                            <group.icon className={clsx("w-[20px] h-[20px] shrink-0 transition-colors",
                                                isDirectlyActive ? "text-accent" : "text-[var(--sidebar-text)] group-hover:text-accent")}
                                                strokeWidth={2.5} aria-hidden />
                                            {!effectiveCollapsed && (
                                                <div className="flex items-center gap-2">
                                                    <span className="tracking-tight text-[14px]">{group.name}</span>
                                                    {group.requiresPremium && !isPremium && (
                                                        <Lock className="w-3.5 h-3.5 text-accent animate-pulse" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {!effectiveCollapsed && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(group.name, group.path!); }}
                                                className={clsx("p-1 rounded-md transition-opacity shrink-0", isFavorite(group.path!) ? "text-accent opacity-100" : "text-[var(--sidebar-text)] opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-white/10")}
                                            >
                                                <Star className={clsx("w-4 h-4", isFavorite(group.path!) && "fill-accent")} />
                                            </button>
                                        )}
                                    </Link>
                                )}

                                {hasChildren && isExpanded && (
                                    <div className="mt-1 pb-2 space-y-1 relative ml-[26px] border-l border-white/10 pl-4 animate-in slide-in-from-top-1 duration-200">
                                        {group.children!.map((child) => {
                                            const isActive = matchActive(location.pathname, child.path);
                                            return (
                                                <Link
                                                    key={child.name}
                                                    to={child.path}
                                                    onClick={() => onOverlayClose?.()}
                                                    className={clsx(
                                                        'flex items-center justify-between px-3 py-2 text-[12px] rounded-lg transition-all group/child',
                                                        isActive
                                                            ? 'text-[var(--sidebar-text-active)] font-bold bg-white/[0.05]'
                                                            : 'text-[var(--sidebar-text)] hover:bg-[var(--bg-surface-hover)]/10 hover:text-[var(--sidebar-text-active)]'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate tracking-tight font-bold text-[13px]">{child.name}</span>
                                                        {child.requiresPremium && !isPremium && (
                                                            <Lock className="w-3 h-3 text-accent/80" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {renderBadge(child.badge)}
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(child.name, child.path); }}
                                                            className={clsx("p-1 rounded-md transition-opacity", isFavorite(child.path) ? "text-accent opacity-100" : "text-[var(--sidebar-text)] opacity-0 group-hover/child:opacity-100 hover:text-accent hover:bg-white/10")}
                                                        >
                                                            <Star className={clsx("w-3.5 h-3.5", isFavorite(child.path) && "fill-accent")} />
                                                        </button>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto border-t border-white/10 bg-white/[0.03] backdrop-blur-md px-4 py-6 relative z-20">
                {/* User Profile Area */}
                <div className={clsx("flex flex-col gap-5", effectiveCollapsed ? "items-center" : "")}>
                    <Link
                        to="/dashboard/profile"
                        onClick={() => onOverlayClose?.()}
                        className={clsx("flex items-center gap-3 group cursor-pointer", effectiveCollapsed ? "justify-center" : "")}
                    >
                        <div className="relative shrink-0 min-w-[40px] min-h-[40px] w-10 h-10">
                            <div className="w-full h-full rounded-xl bg-accent flex items-center justify-center text-[#001B4D] font-black text-sm shadow-lg shadow-accent/20 transition-transform group-hover:scale-105 overflow-hidden">
                                {profile?.avatar_url && !avatarError ? (
                                    <SecureImage
                                        path={profile.avatar_url}
                                        bucket="avatars"
                                        alt={profile.full_name || 'User Avatar'}
                                        className="w-full h-full object-cover"
                                        onError={() => setAvatarError(true)}
                                    />
                                ) : (
                                    profile?.full_name?.charAt(0) || '?'
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4FC08D] border-2 border-[#001B4D] rounded-full shadow-sm" />
                        </div>
                        {!effectiveCollapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-black text-white truncate leading-none mb-1.5 tracking-tight group-hover:text-accent transition-colors">{profile?.full_name}</p>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none">View Profile</span>
                                </div>
                            </div>
                        )}
                    </Link>

                    {!effectiveCollapsed && (
                        <div className="flex items-center justify-between gap-3">
                            <div className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 flex items-center gap-2 flex-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                    {isPremium ? (organization?.subscription_status === 'Trial' ? 'Trial' : 'Premium') : (organization?.plan_type || 'Basic')} Plan
                                </span>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0"
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => signOut()}
                        className={clsx(
                            "w-full flex items-center gap-3 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-all group",
                            effectiveCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
                        )}
                    >
                        <LogOut className="w-[16px] h-[16px] shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
                        {!effectiveCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </div>

            {/* Collapse toggle */}
            {!overlay && (
                <div className="border-t border-white/[0.05] bg-black/10 px-4 py-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => onToggle?.()}
                        className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] hover:bg-surface-hover/[0.05] transition-all"
                    >
                        <ChevronLeft className={clsx("w-3.5 h-3.5 transition-transform duration-500", effectiveCollapsed && "rotate-180")} strokeWidth={2} />
                    </button>
                </div>
            )}
        </aside>
    );
}
