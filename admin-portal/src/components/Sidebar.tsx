import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, ChevronLeft, Star, Zap } from 'lucide-react';
import { navStructure, matchActive, type BadgeType } from '../nav/navModel';
import { useFavorites } from '../context/FavoritesContext';

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

export interface SidebarProps {
    /** When true, sidebar is shown as mobile overlay (always expanded, no collapse toggle). */
    overlay?: boolean;
    /** Called when overlay should close (e.g. backdrop click). */
    onOverlayClose?: () => void;
}

export function Sidebar({ overlay = false, onOverlayClose }: SidebarProps = {}) {
    const location = useLocation();
    const { favorites } = useFavorites();
    const [collapsed, setCollapsed] = useState(false);
    const effectiveCollapsed = overlay ? false : collapsed;
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [favoritesExpanded, setFavoritesExpanded] = useState(true);

    // Auto-expand groups based on the current active path
    useEffect(() => {
        const currentPath = location.pathname;
        const newExpanded = { ...expandedGroups };
        let changed = false;

        navStructure.forEach(group => {
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
    }, [location.pathname]);

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const renderBadge = (badge?: BadgeType) => {
        if (!badge || effectiveCollapsed) return null;
        if (badge === 'new') {
            return (
                <span className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0">
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
                "h-full bg-surface-subtle border-r border-border flex flex-col overflow-y-auto shell-scrollbar",
                overlay ? "w-[260px]" : "sticky top-0 transition-[width] duration-200 ease-out"
            )}
            style={overlay ? undefined : { width: effectiveCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
            aria-label="Main navigation"
        >
            {/* Logo Area */}
            <div className={clsx("flex items-center sticky top-0 z-10 bg-surface-subtle border-b border-border-subtle", effectiveCollapsed ? "justify-center px-0 py-4" : "px-4 py-4 gap-2.5")}>
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-shell-sm">
                    <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45" aria-hidden />
                </div>
                {!effectiveCollapsed && <span className="text-lg font-semibold text-text-primary tracking-tight truncate">DigiReps</span>}
            </div>

            <div className={clsx("flex-1 flex flex-col", effectiveCollapsed ? "px-2 pb-4" : "px-3 pb-6")}>
                {/* Favorites Section */}
                {!effectiveCollapsed && (
                    <>
                        <div className="mb-2 mt-3">
                            <button
                                type="button"
                                onClick={() => setFavoritesExpanded(!favoritesExpanded)}
                                className="w-full flex items-center justify-between px-2 py-2 rounded-shell-md text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle"
                                aria-expanded={favoritesExpanded}
                                aria-label={favoritesExpanded ? "Collapse favorites" : "Expand favorites"}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Star className="w-4 h-4 text-text-muted" aria-hidden />
                                    Favorites ({favorites.length})
                                </div>
                                {favoritesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" aria-hidden /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" aria-hidden />}
                            </button>

                            {favoritesExpanded && favorites.length > 0 && (
                                <div className="mt-0.5 ml-4 space-y-0.5">
                                    {favorites.map((fav) => (
                                        <Link
                                            key={fav.path}
                                            to={fav.path}
                                            onClick={overlay ? () => onOverlayClose?.() : undefined}
                                            className={clsx(
                                                "block px-3 py-2 text-[13px] rounded-shell-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle",
                                                location.pathname === fav.path
                                                    ? "bg-surface text-text-primary font-medium shadow-shell-sm"
                                                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                                            )}
                                        >
                                            {fav.name}
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {favoritesExpanded && favorites.length === 0 && (
                                <div className="mt-0.5 ml-4 px-3 py-2 text-[11px] text-text-muted italic">
                                    No favorites yet.
                                </div>
                            )}
                        </div>
                        <div className="w-full h-px bg-border-subtle my-2" aria-hidden />
                    </>
                )}

                {/* Main Navigation */}
                <nav className={clsx("space-y-0.5", !effectiveCollapsed && "mt-1")} aria-label="Primary">
                    {navStructure.map((group) => {
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
                                            'flex items-center rounded-shell-md text-[13.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle',
                                            effectiveCollapsed ? 'justify-center p-2 w-full' : 'justify-between px-2 py-2 w-full',
                                            isChildActive && !isExpanded ? 'text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                                        )}
                                        aria-expanded={isExpanded}
                                        aria-label={effectiveCollapsed ? group.name : undefined}
                                    >
                                        <div className={clsx("flex items-center gap-3", effectiveCollapsed && "justify-center")}>
                                            <group.icon className={clsx("w-[18px] h-[18px] shrink-0", isChildActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary")} strokeWidth={2} aria-hidden />
                                            {!effectiveCollapsed && group.name}
                                        </div>
                                        {!effectiveCollapsed && (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden />)}
                                    </button>
                                ) : (
                                    <Link
                                        to={group.path!}
                                        onClick={overlay ? () => onOverlayClose?.() : undefined}
                                        className={clsx(
                                            'flex items-center rounded-shell-md text-[13.5px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle',
                                            effectiveCollapsed ? 'justify-center p-2' : 'px-2 py-2 gap-3',
                                            isDirectlyActive ? 'bg-surface text-primary shadow-shell-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                                        )}
                                        aria-current={isDirectlyActive ? 'page' : undefined}
                                    >
                                        <group.icon className={clsx("w-[18px] h-[18px] shrink-0", isDirectlyActive ? "text-primary" : "text-text-muted")} strokeWidth={2} aria-hidden />
                                        {!effectiveCollapsed && group.name}
                                    </Link>
                                )}

                                {hasChildren && isExpanded && (
                                    <div className="mt-0.5 pb-2 space-y-0.5 relative">
                                        <div className="absolute left-[17px] top-0 bottom-2 w-px bg-border" aria-hidden />

                                        {group.children!.map((child) => {
                                            const isActive = matchActive(location.pathname, child.path);
                                            return (
                                                <Link
                                                    key={child.name}
                                                    to={child.path}
                                                    onClick={overlay ? () => onOverlayClose?.() : undefined}
                                                    className={clsx(
                                                        'flex items-center justify-between ml-[30px] px-3 py-2 text-[13px] rounded-shell-md transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle',
                                                        isActive ? 'bg-surface text-text-primary font-medium shadow-shell-sm' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                                                    )}
                                                    aria-current={isActive ? 'page' : undefined}
                                                >
                                                    {isActive && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" aria-hidden />
                                                    )}
                                                    <span className="truncate">{child.name}</span>
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

            {/* Collapse toggle (desktop only) */}
            {!overlay && (
                <div className="sticky bottom-0 border-t border-border-subtle bg-surface-subtle p-2">
                    <button
                        type="button"
                        onClick={() => setCollapsed(c => !c)}
                        className="w-full flex items-center justify-center p-2 rounded-shell-md text-text-muted hover:text-text-primary hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-subtle"
                        aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <ChevronLeft className={clsx("w-4 h-4 transition-transform", effectiveCollapsed && "rotate-180")} aria-hidden />
                    </button>
                </div>
            )}
        </aside>
    );
}
