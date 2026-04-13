import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, ChevronLeft, Star, Zap, LogOut } from 'lucide-react';
import { navStructure, matchActive, type BadgeType, type Role } from '../nav/navModel';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import logoFull from '../assets/branding/logo-full.png';

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
    const { favorites } = useFavorites();
    const { profile, signOut } = useAuth();
    const userRole = (profile?.role || 'User') as Role;
    
    const effectiveCollapsed = overlay ? false : isCollapsed;
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [favoritesExpanded, setFavoritesExpanded] = useState(true);

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
                <span className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ml-2 shrink-0 tracking-widest">
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
                "h-full bg-[#f8f9fa] border-r border-black/[0.04] flex flex-col overflow-y-auto shell-scrollbar",
                overlay ? "w-[260px]" : "sticky top-0 transition-[width] duration-300 ease-in-out"
            )}
            style={overlay ? undefined : { width: effectiveCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
            aria-label="Main navigation"
        >
            {/* Logo Area */}
            <Link 
                to="/dashboard"
                className={clsx(
                    "flex items-center sticky top-0 z-20 bg-[#f8f9fa]/80 backdrop-blur-md border-b border-black/[0.03] hover:opacity-80 transition-opacity", 
                    effectiveCollapsed ? "justify-center px-0 py-5" : "px-6 py-5"
                )}
            >
                {effectiveCollapsed ? (
                    <div className="w-11 h-11 flex items-center justify-center shrink-0">
                        <img src={logoFull} alt="" className="w-full h-full object-contain" />
                    </div>
                ) : (
                    <img src={logoFull} alt="Trackora" className="h-11 w-auto object-contain" />
                )}
            </Link>

            <div className={clsx("flex-1 flex flex-col pt-8", effectiveCollapsed ? "px-2 pb-4" : "px-4 pb-8")}>
                {/* Favorites Section */}
                {!effectiveCollapsed && (
                    <div className="mb-8 px-2">
                        <button
                            type="button"
                            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                            className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] hover:text-text-primary transition-colors group px-2"
                            aria-expanded={favoritesExpanded}
                        >
                            <div className="flex items-center gap-2">
                                <Star className={clsx("w-3.5 h-3.5 transition-colors", favorites.length > 0 ? "text-primary fill-primary/10" : "text-text-muted group-hover:text-text-secondary")} aria-hidden />
                                Favorites
                                <span className="text-[10px] text-text-muted/50 font-mono ml-1">({favorites.length})</span>
                            </div>
                            <ChevronDown className={clsx("w-3 h-3 text-text-muted transition-transform duration-300", !favoritesExpanded && "-rotate-90")} />
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
                                                ? "bg-primary/5 text-primary font-bold shadow-sm border border-primary/10"
                                                : "text-text-secondary hover:text-text-primary hover:bg-black/[0.02]"
                                        )}
                                    >
                                        <div className={clsx("w-2 h-2 rounded-full", location.pathname === fav.path ? "bg-primary" : "bg-black/10 group-hover:bg-primary/30")} />
                                        <span className="truncate tracking-tight font-bold">{fav.name}</span>
                                    </Link>
                                ))
                            ) : (
                                <p className="px-3 py-2.5 text-[11px] text-text-muted italic opacity-60 font-medium">No identified clusters.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Navigation */}
                <nav className="space-y-1" aria-label="Primary">
                    {!effectiveCollapsed && (
                        <p className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4 opacity-30 text-left">Navigation</p>
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
                                            'group flex items-center rounded-xl text-[13px] font-bold transition-all',
                                            effectiveCollapsed ? 'justify-center p-3 w-full' : 'justify-between px-3.5 py-2.5 w-full',
                                            isChildActive && !isExpanded ? 'bg-primary text-white shadow-sm' : 
                                            isExpanded ? 'text-text-primary bg-black/[0.03]' : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.03]'
                                        )}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className={clsx("flex items-center gap-3", effectiveCollapsed && "justify-center")}>
                                            <group.icon className={clsx("w-[18px] h-[18px] shrink-0 transition-colors", 
                                                isChildActive && !isExpanded ? "text-white" : 
                                                isChildActive || isExpanded ? "text-primary" : "text-text-muted group-hover:text-primary")} 
                                                strokeWidth={2} aria-hidden />
                                            {!effectiveCollapsed && <span className="tracking-tight">{group.name}</span>}
                                        </div>
                                        {!effectiveCollapsed && (
                                            <ChevronDown className={clsx("w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-300", !isExpanded && "-rotate-90")} />
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        to={group.path!}
                                        onClick={() => onOverlayClose?.()}
                                        className={clsx(
                                            'group flex items-center rounded-xl text-[13px] font-bold transition-all relative overflow-hidden',
                                            effectiveCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3',
                                            isDirectlyActive 
                                                ? 'bg-primary text-white shadow-sm' 
                                                : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.03]'
                                        )}
                                    >
                                        <group.icon className={clsx("w-[18px] h-[18px] shrink-0 transition-colors", 
                                            isDirectlyActive ? "text-white" : "text-text-muted group-hover:text-primary")} 
                                            strokeWidth={2} aria-hidden />
                                        {!effectiveCollapsed && <span className="tracking-tight">{group.name}</span>}
                                    </Link>
                                )}

                                {hasChildren && isExpanded && (
                                    <div className="mt-1 pb-1 space-y-0.5 relative ml-8 border-l border-black/[0.04] pl-3 animate-in slide-in-from-top-1 duration-200">
                                        {group.children!.map((child) => {
                                            const isActive = matchActive(location.pathname, child.path);
                                            return (
                                                <Link
                                                    key={child.name}
                                                    to={child.path}
                                                    onClick={() => onOverlayClose?.()}
                                                    className={clsx(
                                                        'flex items-center justify-between px-3 py-2 text-[12px] rounded-lg transition-all group',
                                                        isActive 
                                                            ? 'text-primary font-bold bg-primary/5' 
                                                            : 'text-text-secondary hover:bg-black/[0.02] hover:text-text-primary'
                                                    )}
                                                >
                                                    <span className="truncate tracking-tight font-medium">{child.name}</span>
                                                    {renderBadge(child.badge)}
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

            {/* Profile Area */}
            <div className="mt-auto border-t border-black/[0.03] bg-white/50 p-4 relative z-20">
                 <div className={clsx("flex items-center gap-3 p-1.5 rounded-xl transition-all hover:bg-black/[0.02] cursor-pointer group mb-2", effectiveCollapsed ? "justify-center" : "")}>
                    <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm uppercase font-head">
                            {profile?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    {!effectiveCollapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-bold text-text-primary truncate font-head leading-none mb-1">{profile?.full_name}</p>
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest opacity-60 font-mono">Role: {profile?.role}</p>
                        </div>
                    )}
                </div>
                
                <button
                    type="button"
                    onClick={() => signOut()}
                    className={clsx(
                        "w-full flex items-center rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/5 transition-all group py-1",
                        effectiveCollapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3"
                    )}
                >
                    <LogOut className="w-[16px] h-[16px] shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
                    {!effectiveCollapsed && <span className="font-mono">Log out</span>}
                </button>
            </div>

            {/* Collapse toggle */}
            {!overlay && (
                 <div className="border-t border-black/[0.03] bg-white/50 px-4 py-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => onToggle?.()}
                        className="w-full flex items-center justify-center p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-black/[0.02] transition-all"
                    >
                        <ChevronLeft className={clsx("w-3.5 h-3.5 transition-transform duration-500", effectiveCollapsed && "rotate-180")} strokeWidth={2} />
                    </button>
                </div>
            )}
        </aside>
    );
}
