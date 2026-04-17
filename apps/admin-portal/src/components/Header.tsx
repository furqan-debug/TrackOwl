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
    const { profile, user } = useAuth();
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
        <header className="h-[72px] sticky top-0 z-[60] w-full bg-white/70 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-10 lg:px-12 relative">

                {/* 💎 Brand (Left Section) */}
                <div className="flex items-center">
                    <Link to="/dashboard" className="flex items-center group">
                        <img
                            src={logoFull}
                            alt="Trackora"
                            className="h-30 w-auto object-contain"
                        />
                    </Link>
                </div>

                {/* 🗺️ Global Navigation (Absolute Centered Section) */}
                <nav
                    className="absolute left-1/2 -translate-x-1/2 hidden xl:flex items-center justify-center gap-8"
                    ref={dropdownRef}
                >
                    {filteredNav.map((group) => {
                        const hasChildren = group.children && group.children.length > 0;
                        const isActive = group.path ? matchActive(location.pathname, group.path) : group.children?.some(c => matchActive(location.pathname, c.path));
                        const isDropdownOpen = activeDropdown === group.name;

                        const baseStyles = "relative flex items-center gap-1.5 px-1 py-2 text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300";
                        const activeStyles = "text-slate-900";
                        const inactiveStyles = "text-slate-400/70 hover:text-slate-900 hover:opacity-100";

                        return (
                            <div key={group.name} className="relative">
                                {hasChildren ? (
                                    <button
                                        onMouseEnter={() => setActiveDropdown(group.name)}
                                        className={clsx(baseStyles, isActive ? activeStyles : inactiveStyles)}
                                    >
                                        {group.name}
                                        <ChevronDown className={clsx("w-3 h-3 opacity-40 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                                        {isActive && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />}
                                    </button>
                                ) : (
                                    <Link
                                        to={group.path!}
                                        onMouseEnter={() => setActiveDropdown(null)}
                                        className={clsx(baseStyles, isActive ? activeStyles : inactiveStyles)}
                                    >
                                        {group.name}
                                        {isActive && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />}
                                    </Link>
                                )}

                                {hasChildren && isDropdownOpen && (
                                    <div
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 bg-white border border-slate-200/60 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-top-2 duration-300 z-50 overflow-hidden"
                                        onMouseLeave={() => setActiveDropdown(null)}
                                    >
                                        <div className="px-3 py-2 border-b border-slate-50/50 mb-1">
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{group.name}</span>
                                        </div>
                                        {group.children!.map((child) => (
                                            <Link
                                                key={child.path}
                                                to={child.path}
                                                className={clsx(
                                                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all duration-200",
                                                    matchActive(location.pathname, child.path)
                                                        ? "bg-slate-900 text-white shadow-md"
                                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                )}
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Discovery & Profile Alignment (Right Section) */}
                <div className="flex items-center justify-end gap-6" ref={menuRef}>
                    <div className="flex items-center gap-3">
                        {/* Profile Pillar */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowProfileMenu((v) => !v)}
                                className="flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-md transition-all duration-300 group"
                            >
                                <div className="flex flex-col items-end">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">Active</span>
                                </div>
                                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[12px] font-black overflow-hidden ring-2 ring-white shadow-lg transition-transform group-hover:scale-105">
                                    {profile?.avatar_url ? (
                                        <SecureImage path={profile.avatar_url} bucket="avatars" alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        profile?.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 top-full mt-3 w-72 bg-white border border-slate-200 rounded-3xl shadow-2xl py-2 z-[70] animate-in fade-in zoom-in-95 duration-300 origin-top-right overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/40">
                                        <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight truncate">{profile?.full_name || 'Legacy Operator'}</p>
                                        <p className="text-[11px] text-slate-400 font-bold truncate tracking-widest">{profile?.email || user?.email}</p>
                                        <div className="mt-4">
                                            <span className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                                                Role: {profile?.role || 'Guest'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-2 space-y-1">
                                        <Link to="/dashboard/profile" className="w-full flex items-center gap-4 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-2xl transition-all group">
                                            <UserIcon className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                                            My Profile
                                        </Link>
                                        <div className="h-px bg-slate-50 my-1 mx-3" />
                                        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-2xl transition-all group">
                                            <LogOut className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {onOpenMobileMenu && (
                        <button onClick={onOpenMobileMenu} className="xl:hidden p-3 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200">
                            <Menu className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
