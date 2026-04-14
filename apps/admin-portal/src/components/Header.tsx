import { useState, useRef, useEffect, useCallback } from 'react';
import { LogOut, Menu, ChevronDown, User as UserIcon } from 'lucide-react';
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
        <header className="h-16 sticky top-0 z-[60] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all">
            <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between px-6 lg:px-10">

                {/* 💎 Brand Architecture */}
                <div className="flex items-center gap-8 lg:gap-12 shrink-0">
                    <Link to="/dashboard" className="flex items-center group">
                        <img
                            src={logoFull}
                            alt="Trackora"
                            className="h-23 w-auto object-contain scale-[1.6] origin-left transition-transform duration-300"
                        />
                    </Link>

                    {/* 🗺️ Global Navigation */}
                    <nav className="hidden xl:flex items-center gap-1" ref={dropdownRef}>
                        {filteredNav.map((group) => {
                            const hasChildren = group.children && group.children.length > 0;
                            const isActive = group.path ? matchActive(location.pathname, group.path) : group.children?.some(c => matchActive(location.pathname, c.path));
                            const isDropdownOpen = activeDropdown === group.name;

                            return (
                                <div key={group.name} className="relative py-1">
                                    {hasChildren ? (
                                        <button
                                            onMouseEnter={() => setActiveDropdown(group.name)}
                                            className={clsx(
                                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                                isActive ? "text-slate-900 bg-slate-50" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50/50"
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
                                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                                isActive ? "text-slate-900 bg-slate-50" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50/50"
                                            )}
                                        >
                                            {group.name}
                                        </Link>
                                    )}

                                    {hasChildren && isDropdownOpen && (
                                        <div
                                            className="absolute top-full left-0 mt-1 w-52 p-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 z-50 overflow-hidden"
                                            onMouseLeave={() => setActiveDropdown(null)}
                                        >
                                            <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{group.name}</span>
                                            </div>
                                            {group.children!.map((child) => (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    className={clsx(
                                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all",
                                                        matchActive(location.pathname, child.path)
                                                            ? "bg-slate-900 text-white"
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
                </div>

                {/* Discovery & Profile Alignment */}
                <div className="flex items-center gap-5 lg:gap-8" ref={menuRef}>
                    <div className="flex items-center gap-3">
                        {/* Profile Pillar */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowProfileMenu((v) => !v)}
                                className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-400 transition-all duration-300 shadow-sm group"
                            >
                                <div className="flex flex-col items-end">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{profile?.full_name?.split(' ')[0] || 'User'}</span>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-0.5">Active</span>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[11px] font-black overflow-hidden ring-2 ring-white shadow-md">
                                    {profile?.avatar_url ? (
                                        <SecureImage path={profile.avatar_url} bucket="avatars" alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        profile?.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                                    <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30">
                                        <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight truncate">{profile?.full_name || 'Legacy Operator'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold truncate tracking-widest">{profile?.email || user?.email}</p>
                                        <div className="mt-4">
                                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[8px] font-black uppercase tracking-widest text-slate-500">
                                                Role: {profile?.role || 'Guest'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-1.5 space-y-0.5">
                                        <Link to="/dashboard/profile" className="w-full flex items-center gap-4 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all group">
                                            <UserIcon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                            My Profile
                                        </Link>
                                        <div className="h-px bg-slate-50 my-1 mx-2" />
                                        <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all group">
                                            <LogOut className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {onOpenMobileMenu && (
                        <button onClick={onOpenMobileMenu} className="xl:hidden p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
