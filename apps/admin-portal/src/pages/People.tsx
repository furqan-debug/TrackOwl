import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Search, Filter, Download, UserPlus, Trash2,
    ChevronDown, MoreHorizontal, Pencil, RotateCcw,
    Settings, AlertCircle, CheckCircle, MapPin, Globe2
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import {
    Card,
    PageLayout,
    Modal,
    StatusBadge,
    LoadingState
} from '../components/ui';
import { SecureImage } from '../components/ui/SecureImage';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'Admin' | 'Manager' | 'User' | 'Viewer';
type Status = 'Active' | 'Inactive' | 'Pending';

interface DbMember {
    id: string;
    email: string;
    full_name: string;
    role: Role;
    status: Status;
    pay_rate: number | null;
    bill_rate: number | null;
    weekly_limit: number;
    daily_limit: number;
    idle_limit: number | null;
    idle_enabled: boolean;
    tracking_enabled: boolean;
    os_username: string | null;
    employee_id: string | null;
    birthday: string | null;
    work_address: string | null;
    work_phone: string | null;
    home_address: string | null;
    personal_email: string | null;
    personal_phone: string | null;
    custom_fields: any;
    hire_date: string | null;
    termination_date: string | null;
    department: string | null;
    employee_type: string | null;
    timezone: string | null;
    location: string | null;
    created_at: string;
}

interface MemberRow extends DbMember {
    totalMinutes: number;
    activityPercent: number;
    lastSeen: string | null;
    sessionCount: number;
    projectsCount: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function People() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const isViewer = profile?.role === 'Viewer';
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'Members' | 'Invites'>('Members');
    const [showFilters, setShowFilters] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);

    // Form state
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<Role>('User');
    const [addPayRate, setAddPayRate] = useState('');
    const [addBillRate, setAddBillRate] = useState('');
    const [addWeekly, setAddWeekly] = useState('40');
    const [addDaily, setAddDaily] = useState('8');
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    useEffect(() => { fetchMembers(); }, []);

    async function fetchMembers() {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setMembers(data as any);
        } catch (e) {
            console.error('Fetch members error:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMember() {
        if (!addEmail.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();

            console.log('--- ATTEMPTING INVITE ---');

            // Use fetch directly for better error visibility
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    email: addEmail.trim().toLowerCase(),
                    role: addRole,
                    pay_rate: addPayRate ? parseFloat(addPayRate) : 0,
                    bill_rate: addBillRate ? parseFloat(addBillRate) : 0,
                    weekly_limit: parseInt(addWeekly) || 40,
                    daily_limit: parseInt(addDaily) || 8,
                    admin_portal_url: window.location.origin
                })
            });

            const result = await response.json();
            console.log('--- RESPONSE RECEIVED ---', result);

            if (!response.ok) {
                throw new Error(result.error || `Server returned ${response.status}`);
            }

            setInviteSentTo(addEmail);
            setShowAddModal(false);
            resetAddForm();
            await fetchMembers();
        } catch (e: any) {
            console.error('INVITE FAILED:', e);
            setAddError(e.message);
        } finally {
            setAdding(false);
        }
    }

    async function handleResendInvite(email: string) {
        setAdding(true);
        setAddError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('send-invite-email', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: { email, admin_portal_url: window.location.origin }
            });

            if (error) throw error;
            if (!data?.ok) throw new Error(data?.error || 'Failed to resend invite');

            setInviteSentTo(email);
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        } finally {
            setAdding(false);
        }
    }




    async function handleDeactivate(id: string) {
        if (!confirm('Are you sure you want to deactivate this member? This will stop their tracking and block access.')) return;
        setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'Inactive' } : m));
        try {
            const { error } = await supabase.from('members').update({ status: 'Inactive' }).eq('id', id);
            if (error) throw error;
        } catch { fetchMembers(); }
    }

    const handleBatchDelete = async () => {
        if (!window.confirm(`Are you sure you want to remove ${selectedIds.size} members?`)) return;
        setLoading(true);
        for (const id of Array.from(selectedIds)) {
            await supabase.from('members').delete().eq('id', id);
        }
        setMembers((prev: MemberRow[]) => prev.filter(m => !selectedIds.has(m.id)));
        setSelectedIds(new Set());
        setLoading(false);
    };

    function handleExportCsv() {
        if (filtered.length === 0) return;
        const headers = ['Name', 'Email', 'Role', 'Status', 'Pay Rate', 'Bill Rate', 'Total Minutes', 'Activity %'];
        const csvRows = [headers.join(',')];
        for (const r of filtered) {
            csvRows.push([`"${r.full_name}"`, `"${r.email}"`, `"${r.role}"`, `"${r.status}"`, r.pay_rate || 0, r.bill_rate || 0, r.totalMinutes, r.activityPercent].join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Members_Export_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    const toggleSelection = (id: string) => {
        setSelectedIds((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    function toggleSelectAll() {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set<string>());
        } else {
            setSelectedIds(new Set<string>(filtered.map(m => m.id)));
        }
    }

    function resetAddForm() {
        setAddEmail(''); setAddRole('User');
        setAddPayRate(''); setAddBillRate(''); setAddWeekly('40'); setAddDaily('8');
        setAddError(null);
    }

    const filtered = members.filter(m => {
        const matchesSearch = m.full_name.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase());
        const isInvite = m.status === 'Pending';
        const matchesTab = activeTab === 'Invites' ? isInvite : !isInvite;
        return matchesSearch && matchesTab;
    });

    const membersCount = members.filter(m => m.status !== 'Pending').length;
    const invitesCount = members.filter(m => m.status === 'Pending').length;

    return (
        <PageLayout
            title="People"
            description="Manage your team members, roles, and compensation settings."
            maxWidth="full"
            actions={
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { if (!isViewer) { resetAddForm(); setShowAddModal(true); } }}
                        disabled={isViewer}
                        className="flex items-center gap-2 px-5 h-10 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UserPlus className="w-4 h-4" /> Invite Member
                    </button>
                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-2 px-5 h-10 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                </div>
            }
        >
            <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50 w-fit mb-8 h-10">
                <button
                    onClick={() => setActiveTab('Members')}
                    className={clsx(
                        "px-6 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all h-full",
                        activeTab === 'Members' ? "bg-white text-primary shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Members ({membersCount})
                </button>
                <button
                    onClick={() => setActiveTab('Invites')}
                    className={clsx(
                        "px-6 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all h-full",
                        activeTab === 'Invites' ? "bg-white text-primary shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Pending Invites ({invitesCount})
                </button>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <div className="relative group lg:w-[400px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab.toLowerCase()}...`}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx(
                            "flex items-center gap-2 px-4 h-10 border rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                            showFilters ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" /> Filter
                    </button>
                </div>

                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-right-2 duration-300">
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-4 h-10 flex items-center rounded-xl border border-primary/10 uppercase tracking-widest">
                            {selectedIds.size} Selected
                        </span>
                        <button
                            onClick={handleBatchDelete}
                            disabled={isViewer}
                            className="flex items-center gap-2 px-4 h-10 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Batch Delete
                        </button>
                    </div>
                )}
            </div>

            <Card noPadding className="border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="pl-8 py-4 w-12 border-b border-slate-100">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer transition-all"
                                    />
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Member</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Role</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Engagement</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Rates</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Limits</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Geography</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                                <th className="pr-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-24">
                                        <LoadingState />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-10 h-10 text-slate-200" />
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No matching results</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((m: any) => (
                                    <MemberRowItem
                                        key={m.id}
                                        m={m}
                                        isSelected={selectedIds.has(m.id)}
                                        onToggle={() => toggleSelection(m.id)}
                                        onEdit={(tab?: string) => navigate(`/dashboard/people/${m.id}/edit${tab ? `?tab=${tab}` : ''}`)}
                                        onResendInvite={() => handleResendInvite(m.email)}
                                        onDelete={() => handleDeactivate(m.id)}
                                        isViewer={isViewer}
                                        currentUserRole={profile?.role}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="mt-8 flex items-center justify-between px-4 pb-20">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Showing {filtered.length} of {membersCount + invitesCount} results
                </div>
                <div className="flex items-center gap-2">
                    <button disabled className="px-4 h-9 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-400 disabled:opacity-30">Prev</button>
                    <button disabled className="px-4 h-9 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-400 disabled:opacity-30">Next</button>
                </div>
            </div>

            {showAddModal && <InviteModal onClose={() => setShowAddModal(false)} onInvite={handleAddMember} form={{ addEmail, setAddEmail, addRole, setAddRole, addPayRate, setAddPayRate, addBillRate, setAddBillRate, addWeekly, setAddWeekly, addDaily, setAddDaily, adding, addError }} isViewer={isViewer} currentUserRole={profile?.role} />}
            {inviteSentTo && <InviteSentPopup email={inviteSentTo} onClose={() => setInviteSentTo(null)} />}
        </PageLayout>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function MemberRowItem({ m, isSelected, onToggle, onEdit, onResendInvite, onDelete, isViewer, currentUserRole }: any) {
    const isRestricted = isViewer || (currentUserRole === 'Manager' && m.role === 'Admin');
    const [open, setOpen] = useState(false);
    const dropRef = useRef<HTMLTableDataCellElement>(null);
    const initials = m.full_name.split(' ').map((w: any) => w[0]).join('').slice(0, 2).toUpperCase();

    useEffect(() => {
        function h(e: MouseEvent) { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false); }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <tr className={clsx(
            "group/row transition-all",
            isSelected ? "bg-primary/5" : "hover:bg-slate-50/50"
        )}>
            <td className="pl-8 py-5">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer transition-all"
                />
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-[11px] font-bold shadow-sm group-hover/row:scale-105 transition-transform duration-300 overflow-hidden">
                        {m.avatar_url ? (
                            <SecureImage 
                                path={m.avatar_url} 
                                bucket="avatars" 
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            initials || <Users className="w-4 h-4" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <span onClick={onEdit} className="text-[13px] font-bold text-slate-900 hover:text-primary cursor-pointer block tracking-tight transition-colors truncate">
                            {m.full_name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 block truncate">
                            {m.email}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <StatusBadge
                    variant={m.role === 'Admin' ? 'success' : m.role === 'Manager' ? 'warning' : 'default'}
                    className="text-[9px] h-6 px-2.5 font-bold uppercase tracking-widest"
                >
                    {m.role === 'Admin' ? 'OWNER' : m.role.toUpperCase()}
                </StatusBadge>
            </td>
            <td className="px-6 py-5">
                <div className="text-[11px] font-bold text-slate-400 space-y-0.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                        <span className="opacity-60 text-[9px] uppercase tracking-widest w-12 text-right">SESS:</span>
                        <span className="text-slate-900 tabular-nums">{m.sessionCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="opacity-60 text-[9px] uppercase tracking-widest w-12 text-right">PROJ:</span>
                        <span className="text-slate-900 tabular-nums">{m.projectsCount || 0}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="text-[11px] font-bold text-slate-400 space-y-0.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                        <span className="opacity-60 text-[9px] uppercase tracking-widest w-10 text-right">PAY:</span>
                        <span className="text-primary tabular-nums">${m.pay_rate || 0}/h</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="opacity-60 text-[9px] uppercase tracking-widest w-10 text-right">BILL:</span>
                        <span className="text-purple-600 tabular-nums">${m.bill_rate || 0}/h</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="text-[11px] font-bold text-slate-400 space-y-0.5 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                        <span className="opacity-60 text-[9px] uppercase tracking-widest w-12 text-right">WEEK:</span>
                        <span className="text-slate-900 tabular-nums">{m.weekly_limit}h</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <span className="opacity-60 text-[9px] uppercase tracking-widest w-12 text-right">DAY:</span>
                        <span className="text-slate-900 tabular-nums">{m.daily_limit}h</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                {m.location ? (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        <MapPin className="w-3 h-3 text-primary/60" />
                        {m.location}
                    </div>
                ) : m.timezone ? (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 whitespace-nowrap opacity-60">
                        <Globe2 className="w-3 h-3" />
                        {m.timezone}
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">—</span>
                )}
            </td>
            <td className="px-6 py-5">
                <StatusBadge
                    variant={m.status === 'Active' ? 'success' : m.status === 'Pending' ? 'warning' : 'default'}
                    className="text-[9px] h-6 px-2.5 font-bold uppercase tracking-widest"
                >
                    {m.status.toUpperCase()}
                </StatusBadge>
            </td>
            <td className="pr-8 py-5 text-right relative" ref={dropRef}>
                <button
                    onClick={() => setOpen(!open)}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm group/btn"
                >
                    <MoreHorizontal className={clsx("w-4 h-4 transition-transform duration-300", open && "rotate-90")} />
                </button>
                {open && (
                    <div className="absolute right-8 top-16 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 py-2 w-56 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-3 border-b border-slate-100 mb-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Quick Actions</p>
                            <p className="text-[12px] font-bold text-slate-900 truncate">{m.full_name}</p>
                        </div>
                        <DropItem
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            label={isRestricted ? 'View Profile' : 'Edit Member'}
                            onClick={() => { onEdit(); setOpen(false); }}
                        />
                        {m.status === 'Pending' && (
                            <DropItem
                                icon={<RotateCcw className="w-3.5 h-3.5" />}
                                label="Resend Invite"
                                disabled={isRestricted}
                                onClick={() => { if (!isRestricted) { onResendInvite(); setOpen(false); } }}
                            />
                        )}
                        <DropItem
                            icon={<Settings className="w-3.5 h-3.5" />}
                            label="Configuration"
                            onClick={() => { setOpen(false); onEdit('Limits'); }}
                        />
                        <div className="my-1 border-t border-slate-100" />
                        <DropItem
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            label="Deactivate Member"
                            disabled={isRestricted}
                            onClick={() => { if (!isRestricted) { setOpen(false); onDelete(); } }}
                            danger
                        />
                    </div>
                )}
            </td>
        </tr>
    );
}

function DropItem({ icon, label, onClick, danger, disabled }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "w-full flex items-center gap-3 px-5 py-2.5 text-[11px] font-bold transition-all text-left group",
                danger ? "text-rose-500 hover:bg-rose-50" : "text-slate-600 hover:text-primary hover:bg-slate-50",
                disabled && "opacity-30 cursor-not-allowed"
            )}
        >
            <span className={clsx("transition-transform", !disabled && "group-hover:scale-110")}>{icon}</span>
            <span className="uppercase tracking-widest">{label}</span>
        </button>
    );
}

// ─── Modals ───────────────────────────────────────────────────────────

function InviteModal({ onClose, onInvite, form, isViewer, currentUserRole }: any) {
    const rolesAvailable = currentUserRole === 'Admin' ? ['User', 'Viewer', 'Manager', 'Admin'] : ['User', 'Viewer', 'Manager'];

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Invite Member"
            subtitle="Send an invitation to join the team."
            maxWidth="max-w-md"
            footer={
                <div className="flex gap-3 justify-end w-full">
                    <button onClick={onClose} className="px-6 h-11 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={onInvite}
                        disabled={!form.addEmail.trim() || isViewer || form.adding}
                        className="px-8 h-11 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {form.adding ? 'Sending...' : <><UserPlus className="w-4 h-4" /> Send Invite</>}
                    </button>
                </div>
            }
        >
            <div className="space-y-6 pt-4">
                <FormField
                    label="Email Address"
                    value={form.addEmail}
                    onChange={form.setAddEmail}
                    type="email"
                    placeholder="email@company.com"
                />

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Assignment</label>
                    <div className="relative group">
                        <select
                            value={form.addRole}
                            onChange={e => form.setAddRole(e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                            {rolesAvailable.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-primary transition-colors" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Pay Rate ($/hr)" value={form.addPayRate} onChange={form.setAddPayRate} type="number" placeholder="0.00" />
                    <FormField label="Bill Rate ($/hr)" value={form.addBillRate} onChange={form.setAddBillRate} type="number" placeholder="0.00" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Weekly Limit" value={form.addWeekly} onChange={form.setAddWeekly} type="number" placeholder="40" />
                    <FormField label="Daily Limit" value={form.addDaily} onChange={form.setAddDaily} type="number" placeholder="8" />
                </div>

                {form.addError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-widest p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {form.addError}
                    </div>
                )}
            </div>
        </Modal>
    );
}

function FormField({ label, value, onChange, type = 'text', placeholder, disabled }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={clsx(
                    "w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-[12px] font-bold text-slate-900 outline-none focus:border-primary transition-all shadow-sm placeholder:text-slate-300 tabular-nums",
                    disabled && "bg-slate-50 cursor-not-allowed opacity-60"
                )}
            />
        </div>
    );
}

function InviteSentPopup({ email, onClose }: any) {
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] w-full max-w-sm p-10 text-center shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Invite Sent</h2>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest leading-relaxed mb-8">
                    Invitation has been dispatched to <br/><span className="text-primary">{email}</span>
                </p>
                <button
                    onClick={onClose}
                    className="w-full h-12 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
}
