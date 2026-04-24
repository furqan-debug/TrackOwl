import { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, Menu, ChevronDown, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { navStructure, matchActive, type Role } from '../nav/navModel';
import { useAuth } from '../context/AuthContext';
import { SecureImage } from './ui/SecureImage';
import logoFull from '../assets/branding/logo-full.png';

export interface HeaderProps {
    onOpenMobileMenu?: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const menuRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userRole = (profile?.role || 'User') as Role;

    const closeAll = useCallback(() => {
        setShowProfileMenu(false);
        setActiveDropdown(null);
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        closeAll();
    }, [location.pathname, closeAll]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const filteredNav = navStructure.filter(group => {
        if (group.allowedRoles && !group.allowedRoles.includes(userRole)) return false;
        return true;
    });

    return (
        <header className="sticky top-0 z-[60] w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all duration-300">
            <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between px-6 lg:px-10 relative">

                {/* 💎 Brand Section */}
                <div className="flex items-center gap-6">
                    <Link to="/dashboard" className="flex items-center group transition-transform duration-300 hover:scale-[1.02]">
                        <img
                            src={logoFull}
                            alt="Trackora"
                            className="h-20 w-auto object-contain"
                        />
                    </Link>

                    <div className="hidden lg:block h-5 w-px bg-slate-200/60" />

                    <div className="hidden lg:flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Admin</span>
                        <span className="text-[12px] font-bold text-slate-900 tracking-tight">Workspace</span>
                    </div>
                </div>

                {/* 🗺️ Main Navigation */}
                <nav
                    className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-1"
                    ref={dropdownRef}
                >
                    {filteredNav.map((group) => {
                        const hasChildren = group.children && group.children.length > 0;
                        const isActive = group.path ? matchActive(location.pathname, group.path) : group.children?.some(c => matchActive(location.pathname, c.path));
                        const isDropdownOpen = activeDropdown === group.name;

                        return (
                            <div key={group.name} className="relative px-1">
                                {hasChildren ? (
                                    <button
                                        onMouseEnter={() => setActiveDropdown(group.name)}
                                        className={clsx(
                                            "relative flex items-center gap-1.5 px-4 h-9 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300",
                                            isActive || isDropdownOpen ? "text-primary bg-primary/5 shadow-sm ring-1 ring-primary/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        )}
                                    >
                                        {group.name}
                                        <ChevronDown className={clsx("w-3 h-3 opacity-50 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                    </button>
                                ) : (
                                    <Link
                                        to={group.path!}
                                        onMouseEnter={() => setActiveDropdown(null)}
                                        className={clsx(
                                            "relative flex items-center gap-1.5 px-4 h-9 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300",
                                            isActive ? "text-primary bg-primary/5 shadow-sm ring-1 ring-primary/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        )}
                                    >
                                        {group.name}
                                    </Link>
                                )}

                                {hasChildren && isDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-1.5 bg-white border border-slate-200 rounded-[24px] shadow-xl z-50"
                                        onMouseLeave={() => setActiveDropdown(null)}
                                    >
                                        <div className="px-4 py-2.5 mb-1 border-b border-slate-100">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{group.name}</span>
                                        </div>
                                        <div className="grid gap-1">
                                            {group.children!.map((child) => (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    className={clsx(
                                                        "flex items-center justify-between px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200",
                                                        matchActive(location.pathname, child.path)
                                                            ? "bg-primary text-white shadow-sm"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                                                    )}
                                                >
                                                    {child.name}
                                                    {matchActive(location.pathname, child.path) && (
                                                        <div className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* 👤 Right Section: Profile & Actions */}
                <div className="flex items-center justify-end gap-3" ref={menuRef}>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowProfileMenu((v) => !v)}
                            className={clsx(
                                "flex items-center gap-2.5 pl-3 pr-1.5 h-10 rounded-xl transition-all duration-300 group border",
                                showProfileMenu
                                    ? "bg-white border-slate-200 shadow-md scale-[1.02]"
                                    : "bg-white/50 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"
                            )}
                        >
                            <div className="flex flex-col items-end">
                                <span className="text-[12px] font-bold text-slate-900 tracking-tight leading-none truncate max-w-[100px]">
                                    {profile?.full_name?.split(' ')[0] || 'Member'}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Online</span>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[11px] font-bold overflow-hidden shadow-sm ring-1 ring-slate-100">
                                    {profile?.avatar_url ? (
                                        <SecureImage path={profile.avatar_url} bucket="avatars" alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        profile?.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                            </div>
                        </button>

                        {showProfileMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="absolute right-0 top-full mt-3 w-64 bg-white border border-slate-200 rounded-[24px] shadow-2xl py-1.5 z-[70] origin-top-right overflow-hidden"
                            >
                                <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-[14px] font-bold border border-primary/5">
                                            {profile?.full_name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <p className="text-[13px] font-bold text-slate-900 tracking-tight truncate">{profile?.full_name || 'Legacy Operator'}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{profile?.role || 'Guest'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-1.5 space-y-0.5">
                                    <Link
                                        to="/dashboard/profile"
                                        className="flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary rounded-xl transition-all group"
                                    >
                                        <UserIcon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                        My Profile
                                    </Link>

                                    <div className="h-px bg-slate-100 my-1 mx-2" />

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all group"
                                    >
                                        <LogOut className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                                        Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {onOpenMobileMenu && (
                        <button
                            onClick={onOpenMobileMenu}
                            className="xl:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
