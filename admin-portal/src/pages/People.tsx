import { useEffect, useRef, useState } from 'react';
import {
    Users, Search, Download,
    ChevronDown, CheckCircle, X,
    Pencil, Trash2,
    RotateCcw,
    Settings,
    UserPlus
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { PageLayout, Button } from '../components/ui';
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
    const isViewer = profile?.role === 'Viewer';
    const [members, setMembers] = useState<MemberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'Members' | 'Invites'>('Members');
    const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
    const [showFilters, setShowFilters] = useState(false);
    const [showBatch, setShowBatch] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editMember, setEditMember] = useState<MemberRow | null>(null);
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
                    pay_rate: addEmail.trim() === 'furqanfreelancer1@gmail.com' ? 0 : (addPayRate ? parseFloat(addPayRate) : null), // Temp safety
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

    async function handleUpdateMeta(id: string, patch: Partial<DbMember>) {
        console.log('UPDATING MEMBER:', id, patch);
        setEditMember(null);
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
        try {
            const { error } = await supabase.from('members').update(patch).eq('id', id);
            if (error) {
                console.error('DATABASE UPDATE ERROR:', error);
                fetchMembers();
            }
        } catch (e) {
            console.error('UPDATE EXCEPTION:', e);
            fetchMembers();
        }
    }


    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to remove this member?')) return;
        setMembers(prev => prev.filter(m => m.id !== id));
        try {
            await supabase.from('members').delete().eq('id', id);
        } catch { fetchMembers(); }
    }

    async function handleBatchDelete() {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to remove ${selectedIds.size} selected member(s)?`)) return;
        setMembers(prev => prev.filter(m => !selectedIds.has(m.id)));
        try {
            await Promise.all(
                Array.from(selectedIds).map(id => supabase.from('members').delete().eq('id', id))
            );
            setSelectedIds(new Set());
        } catch { fetchMembers(); }
        setShowBatch(false);
    }

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

    function toggleSelection(id: string) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    function toggleSelectAll() {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(m => m.id)));
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
        const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
        return matchesSearch && matchesTab && matchesStatus;
    });

    const membersCount = members.filter(m => m.status !== 'Pending').length;
    const invitesCount = members.filter(m => m.status === 'Pending').length;

    return (
        <PageLayout
            title="Team Directory"
            description="Manage your team members and their roles"
            maxWidth="full"
            actions={
                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-2xl">
                        <Users className="w-4 h-4 text-primary" strokeWidth={2.5} />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] font-mono">{membersCount} Members Active</span>
                    </div>
                </div>
            }
        >
            {/* Tabs */}
            <div className="flex items-center gap-12 border-b border-black/[0.03] mb-10">
                <button
                    onClick={() => setActiveTab('Members')}
                    className={clsx(
                        "pb-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-[3px] font-mono",
                        activeTab === 'Members' ? "border-primary text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
                    )}
                >
                    MEMBERS ({membersCount})
                </button>
                <button
                    onClick={() => setActiveTab('Invites')}
                    className={clsx(
                        "pb-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-[3px] font-mono",
                        activeTab === 'Invites' ? "border-primary text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
                    )}
                >
                    PENDING INVITES ({invitesCount})
                </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 mb-10">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <div className="relative group lg:w-[400px]">
                        <Search className="w-5 h-5 text-text-muted absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" strokeWidth={2.5} />
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold text-text-primary placeholder:text-text-muted outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all shadow-sm font-mono"
                        />
                    </div>
                    
                    <div className="relative">
                        <button
                            onClick={() => { if (!isViewer) setShowBatch(!showBatch); }}
                            disabled={isViewer}
                            className={clsx(
                                "flex items-center justify-between gap-4 px-6 py-3.5 glass border border-black/[0.05] rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all font-mono",
                                isViewer ? "opacity-30 cursor-not-allowed" : "text-text-primary hover:bg-black/[0.02] shadow-sm active:scale-95"
                            )}
                        >
                            BULK ACTIONS <ChevronDown className={clsx("w-4 h-4 text-primary transition-transform", showBatch && "rotate-180")} strokeWidth={3} />
                        </button>
                        {showBatch && !isViewer && (
                            <div className="absolute top-16 left-0 w-64 glass border border-black/[0.08] shadow-xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={handleBatchDelete} disabled={selectedIds.size === 0} className="w-full text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 transition-colors font-mono">REMOVE SELECTED ({selectedIds.size})</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                    <button onClick={handleExportCsv} className="flex items-center justify-center gap-3 px-5 py-3.5 text-text-muted hover:text-text-primary text-[10px] font-bold uppercase tracking-[0.2em] transition-colors group font-mono">
                        <Download className="w-4.5 h-4.5 group-hover:translate-y-0.5 transition-transform" strokeWidth={2.5} /> EXPORT CSV
                    </button>
                    
                    <Button 
                        onClick={() => { if (!isViewer) { resetAddForm(); setShowAddModal(true); } }}
                        disabled={isViewer}
                        className="shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" strokeWidth={3} />
                        INVITE MEMBER
                    </Button>

                    <div className="relative">
                        <button onClick={() => setShowFilters(!showFilters)} className="px-6 py-3.5 bg-white border border-black/[0.05] text-text-primary rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black/[0.02] transition-all flex items-center gap-4 shadow-sm group font-mono">
                            FILTER ROLE 
                            {statusFilter !== 'All' ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(80,110,248,0.5)]"></span> : <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" strokeWidth={2.5} />}
                        </button>
                        {showFilters && (
                            <div className="absolute right-0 top-16 w-60 bg-white/95 backdrop-blur-3xl border border-black/[0.08] shadow-xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                {['All', 'Active', 'Inactive', 'Pending'].map(s => (
                                    <button key={s} onClick={() => { setStatusFilter(s as any); setShowFilters(false); }} className={clsx(
                                        "w-full text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors font-mono",
                                        statusFilter === s ? "text-primary bg-primary/5" : "text-text-muted hover:text-text-primary hover:bg-black/[0.02]"
                                    )}>
                                        SHOW {s.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-[32px] border border-black/[0.05] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/[0.03] bg-black/[0.01]">
                                <th className="pl-10 py-7 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-5 h-5 rounded-lg border-black/[0.1] bg-white checked:bg-primary transition-all cursor-pointer shadow-sm"
                                    />
                                </th>
                                <th className="px-8 py-7 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Name</th>
                                <th className="px-8 py-7 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Role</th>
                                <th className="px-8 py-7 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Status</th>
                                <th className="px-8 py-7 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Time Limits</th>
                                <th className="px-8 py-7 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Rates</th>
                                <th className="px-8 py-7 text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Date Added</th>
                                <th className="px-10 py-7"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.03]">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-48 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="w-12 h-12 border-[4px] border-primary/10 border-t-primary rounded-full animate-spin shadow-sm" />
                                            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted font-mono animate-pulse">Loading members...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-48 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-30">
                                            <Users className="w-16 h-16 text-primary" strokeWidth={1} />
                                            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted font-mono">No Members Found</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(m => (
                                    <MemberRowItem
                                        key={m.id}
                                        m={m}
                                        isSelected={selectedIds.has(m.id)}
                                        onToggle={() => toggleSelection(m.id)}
                                        onEdit={() => setEditMember(m)}
                                        onResendInvite={() => handleResendInvite(m.email)}
                                        onDelete={() => handleDelete(m.id)}
                                        isViewer={isViewer}
                                        currentUserRole={profile?.role}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Mock */}
            <div className="mt-8 flex items-center justify-between px-4">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono">
                    {filtered.length} MEMBERS FOUND
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-5 py-2.5 glass border border-black/[0.05] rounded-xl text-[10px] font-bold uppercase opacity-30 cursor-not-allowed tracking-[0.2em] transition-all font-mono">PREV</button>
                    <button className="px-5 py-2.5 glass border border-black/[0.05] rounded-xl text-[10px] font-bold uppercase opacity-30 cursor-not-allowed tracking-[0.2em] transition-all font-mono">NEXT</button>
                </div>
            </div>

            {/* MODALS */}
            {showAddModal && <InviteModal onClose={() => setShowAddModal(false)} onInvite={handleAddMember} form={{ addEmail, setAddEmail, addRole, setAddRole, addPayRate, setAddPayRate, addBillRate, setAddBillRate, addWeekly, setAddWeekly, addDaily, setAddDaily, adding, addError }} isViewer={isViewer} currentUserRole={profile?.role} />}
            {editMember && <EditModal member={editMember} onClose={() => setEditMember(null)} onSave={(patch: any) => handleUpdateMeta(editMember.id, patch)} isViewer={isViewer} currentUserRole={profile?.role} />}
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

    const dateAdded = new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <tr className={clsx(
            "group/row hover:bg-black/[0.01] transition-all",
            isSelected ? "bg-primary/[0.02]" : ""
        )}>
            <td className="pl-10 py-7">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    className="w-5 h-5 rounded-lg border-black/[0.1] bg-white checked:bg-primary transition-all cursor-pointer shadow-sm"
                />
            </td>
            <td className="px-8 py-7">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary text-[12px] font-bold shadow-sm group-hover/row:scale-110 transition-transform duration-300 font-mono">
                        {initials || <Users className="w-5 h-5" />}
                    </div>
                    <div>
                        <span onClick={onEdit} className="text-[15px] font-bold text-text-primary hover:text-primary cursor-pointer block tracking-tight transition-colors leading-none mb-1.5">{m.full_name}</span>
                        <span className="text-[11px] font-bold text-text-muted font-mono opacity-70">{m.email}</span>
                    </div>
                </div>
            </td>
            <td className="px-8 py-7">
                <span className={clsx(
                    "px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] font-mono",
                    m.role === 'Admin' ? "bg-primary/5 text-primary border border-primary/10" : 
                    m.role === 'Manager' ? "bg-purple-500/5 text-purple-600 border border-purple-500/10" :
                    "bg-black/[0.03] text-text-muted border border-black/[0.05]"
                )}>
                    {m.role === 'Admin' ? 'OWNER' : m.role}
                </span>
            </td>
            <td className="px-8 py-7">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-2 h-2 rounded-full",
                        m.status === 'Active' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" :
                        m.status === 'Pending' ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" :
                        "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                    )} />
                    <span className="text-[11px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono">{m.status}</span>
                </div>
            </td>
            <td className="px-8 py-7 text-right">
                <div className="text-[11px] font-bold text-text-muted leading-relaxed uppercase tracking-[0.1em] font-mono">
                    <p className="flex items-center justify-between gap-6"><span>WEEKLY</span> <span className="text-text-primary">{m.weekly_limit}h</span></p>
                    <p className="flex items-center justify-between gap-6"><span>DAILY</span> <span className="text-text-primary">{m.daily_limit}h</span></p>
                </div>
            </td>
            <td className="px-8 py-7">
                <div className="text-[11px] font-bold text-text-muted leading-relaxed uppercase tracking-[0.1em] font-mono">
                    <p className="flex items-center justify-between gap-6"><span>PAY</span> <span className="text-primary font-bold">${m.pay_rate || 0}/h</span></p>
                    <p className="flex items-center justify-between gap-6"><span>BILL</span> <span className="text-purple-600 font-bold">${m.bill_rate || 0}/h</span></p>
                </div>
            </td>
            <td className="px-8 py-7 font-mono text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
                {dateAdded}
            </td>
            <td className="px-10 py-7 text-right relative" ref={dropRef}>
                <button
                    onClick={() => setOpen(!open)}
                    className="p-3 bg-white/50 border border-black/[0.05] rounded-xl text-text-muted hover:text-text-primary transition-all shadow-sm active:scale-95"
                >
                    <ChevronDown className={clsx("w-5 h-5 transition-transform duration-300", open && "rotate-180")} strokeWidth={3} />
                </button>
                {open && (
                    <div className="absolute right-10 top-20 bg-white/95 backdrop-blur-3xl border border-black/[0.08] shadow-2xl rounded-2xl z-50 py-3 w-64 animate-in fade-in zoom-in-95 duration-200">
                        <DropItem
                            icon={<Pencil className="w-4 h-4" />}
                            label={isRestricted ? 'VIEW DETAILS' : 'EDIT MEMBER'}
                            onClick={() => { onEdit(); setOpen(false); }}
                        />
                        {(m.status === 'Pending') && (
                            <DropItem
                                icon={<RotateCcw className="w-4 h-4" />}
                                label="RESEND INVITE"
                                disabled={isRestricted}
                                onClick={() => { if (!isRestricted) { onResendInvite(); setOpen(false); } }}
                                dull={isRestricted}
                            />
                        )}

                        <DropItem icon={<Settings className="w-4 h-4" />} label="SETTINGS" onClick={() => { setOpen(false); onEdit(); }} />
                        <div className="my-3 border-t border-black/[0.03]" />
                        <DropItem
                            icon={<Trash2 className="w-4 h-4" />}
                            label="REMOVE MEMBER"
                            disabled={isRestricted}
                            onClick={() => { if (!isRestricted) { setOpen(false); onDelete(); } }}
                            danger={!isRestricted}
                            dull={isRestricted}
                        />
                    </div>
                )}
            </td>
        </tr>
    );
}

function DropItem({ icon, label, onClick, danger, dull, disabled }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                "w-full flex items-center gap-4 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all text-left font-mono group", // added group
                danger ? "text-rose-500 hover:bg-rose-500/10" : "text-text-muted hover:text-text-primary hover:bg-black/[0.02]",
                dull && "opacity-30 grayscale cursor-not-allowed"
            )}
        >
            <span className="opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>
            {label}
        </button>
    );
}

// ─── Modals (Polished for light theme) ────────────────────────────────

function InviteModal({ onClose, onInvite, form, isViewer, currentUserRole }: any) {
    const rolesAvailable = currentUserRole === 'Admin' ? ['User', 'Viewer', 'Manager', 'Admin'] : ['User', 'Viewer', 'Manager'];
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-500">
            <div className="bg-white/95 backdrop-blur-3xl rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-black/[0.05] animate-in zoom-in-95 duration-300">
                <div className="px-12 py-10 border-b border-black/[0.03] flex items-center justify-between bg-black/[0.01]">
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary tracking-tighter leading-none mb-2">Invite Member</h2>
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Send an invitation to join the team</p>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-black/5 rounded-3xl transition-all shadow-sm"><X className="w-7 h-7 text-text-muted hover:text-text-primary" strokeWidth={3} /></button>
                </div>
                <div className="p-12 space-y-10">
                    <FormField label="EMAIL ADDRESS" value={form.addEmail} onChange={form.setAddEmail} type="email" placeholder="e.g. hello@example.com" />
                    <div className="space-y-4">
                        <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">USER ROLE</label>
                        <div className="relative">
                            <select value={form.addRole} onChange={e => form.setAddRole(e.target.value)}
                                className="w-full px-6 py-4 bg-black/[0.03] border border-black/[0.05] rounded-2xl text-[15px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all appearance-none cursor-pointer font-mono tracking-tight">
                                {rolesAvailable.map(r => <option key={r} value={r} className="bg-white text-text-primary">{r}</option>)}
                            </select>
                            <ChevronDown className="w-5 h-5 text-primary absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={3} />
                        </div>
                    </div>
                    {form.addError && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] font-bold uppercase tracking-[0.2em] p-5 rounded-2xl leading-relaxed font-mono">{form.addError}</div>}
                </div>
                <div className="px-12 py-10 bg-black/[0.01] border-t border-black/[0.03] flex justify-end gap-6">
                    <button onClick={onClose} className="px-8 py-3.5 text-[11px] font-bold text-text-muted hover:text-text-primary uppercase tracking-[0.3em] transition-colors font-mono">CANCEL</button>
                    <button
                        onClick={onInvite}
                        disabled={form.adding || !form.addEmail.trim() || isViewer}
                        className={clsx(
                            "px-10 py-4 rounded-[20px] text-[11px] font-bold uppercase tracking-[0.3em] transition-all font-mono",
                            isViewer ? "bg-black/5 text-text-muted cursor-not-allowed" : "bg-primary text-white hover:shadow-xl hover:shadow-primary/20 shadow-lg active:scale-95 disabled:opacity-30"
                        )}
                    >
                        {form.adding ? 'SENDING...' : 'SEND INVITE'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function EditModal({ member, onClose, onSave, isViewer, currentUserRole }: any) {
    const isRestricted = isViewer || (currentUserRole === 'Manager' && member.role === 'Admin');
    const rolesAvailable = currentUserRole === 'Admin' ? ['User', 'Viewer', 'Manager', 'Admin'] : ['User', 'Viewer', 'Manager'];

    const [name, setName] = useState(member.full_name);
    const [role, setRole] = useState(member.role);
    const [payRate, setPayRate] = useState(member.pay_rate?.toString() || '');
    const [billRate, setBillRate] = useState(member.bill_rate?.toString() || '');
    const [weekly, setWeekly] = useState(member.weekly_limit.toString());
    const [daily, setDaily] = useState(member.daily_limit.toString());
    const [idle, setIdle] = useState(member.idle_limit?.toString() || '10');
    const [idleEnabled, setIdleEnabled] = useState(member.idle_enabled ?? true);
    const [trackingEnabled, setTrackingEnabled] = useState(member.tracking_enabled ?? true);
    
    // New Fields
    const [osUsername, setOsUsername] = useState(member.os_username || '');
    const [employeeId, setEmployeeId] = useState(member.employee_id || '');
    const [birthday, setBirthday] = useState(member.birthday || '');
    const [workAddress, setWorkAddress] = useState(member.work_address || '');
    const [workPhone, setWorkPhone] = useState(member.work_phone || '');
    const [homeAddress, setHomeAddress] = useState(member.home_address || '');
    const [personalEmail, setPersonalEmail] = useState(member.personal_email || '');
    const [personalPhone, setPersonalPhone] = useState(member.personal_phone || '');
    const [hireDate, setHireDate] = useState(member.hire_date || '');
    const [dept, setDept] = useState(member.department || '');
    const [empType, setEmpType] = useState(member.employee_type || 'Full-time');
    const [timezone, setTimezone] = useState(member.timezone || 'Asia/Kolkata');
    const [terminationDate, setTerminationDate] = useState(member.termination_date || '');
    const [customFields, setCustomFields] = useState<any>(member.custom_fields || {});

    const [activeTab, setActiveTab] = useState('INFO');
    const [showActions, setShowActions] = useState(false);
    const tabs = ['INFO', 'EMPLOYMENT', 'ROLES', 'PAY / BILL', 'WORK TIME & LIMITS', 'SETTINGS'];

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in fade-in duration-300 overflow-hidden font-sans">
            {/* Top Header */}
            <div className="px-12 py-8 border-b border-black/[0.05] flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onClose} className="p-3 hover:bg-black/5 rounded-2xl transition-all text-text-muted">
                        <ChevronDown className="w-6 h-6 -rotate-90" strokeWidth={3} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-text-muted mb-2 font-mono uppercase tracking-[0.2em]">
                            <Users className="w-4 h-4" /> MEMBERS
                        </div>
                        <h2 className="text-4xl font-bold text-text-primary tracking-tighter leading-none">{name}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <button 
                            onClick={() => setShowActions(!showActions)}
                            className="px-6 py-4 bg-black/[0.03] border border-black/[0.05] rounded-2xl text-[12px] font-bold text-text-primary flex items-center gap-3 hover:bg-black/[0.06] transition-all font-mono tracking-widest uppercase"
                        >
                            ACTIONS <ChevronDown className="w-4 h-4 text-primary" strokeWidth={3} />
                        </button>
                        {showActions && (
                            <div className="absolute right-0 mt-4 w-64 bg-white rounded-3xl shadow-2xl border border-black/[0.05] py-4 z-10 animate-in fade-in zoom-in-95 duration-200">
                                <button className="w-full px-8 py-4 text-left text-[11px] font-bold text-text-primary hover:bg-black/[0.03] transition-all uppercase tracking-widest font-mono flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> DEACTIVATE USER
                                </button>
                                <button className="w-full px-8 py-4 text-left text-[11px] font-bold text-text-primary hover:bg-black/[0.03] transition-all uppercase tracking-widest font-mono flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-primary" /> RESET PASSWORD
                                </button>
                                <div className="h-[1px] bg-black/[0.05] my-2" />
                                <button className="w-full px-8 py-4 text-left text-[11px] font-bold text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest font-mono flex items-center gap-4">
                                    <X className="w-4 h-4" strokeWidth={3} /> DELETE MEMBER
                                </button>
                            </div>
                        )}
                    </div>
                       <button
                        onClick={() => {
                            console.log('SAVE BUTTON CLICKED. trackingEnabled state:', trackingEnabled);
                            if (isRestricted) { 
                                console.warn('SAVE BLOCKED: Restricted access');
                                onClose(); 
                                return; 
                            }
                            const patch = {
                                full_name: name, role, pay_rate: payRate ? parseFloat(payRate) : null,
                                bill_rate: billRate ? parseFloat(billRate) : null,
                                weekly_limit: parseInt(weekly) || 40,
                                daily_limit: parseInt(daily) || 8,
                                idle_limit: parseInt(idle) || 10,
                                idle_enabled: idleEnabled,
                                os_username: osUsername,
                                employee_id: employeeId,
                                birthday: birthday,
                                work_address: workAddress,
                                work_phone: workPhone,
                                home_address: homeAddress,
                                personal_email: personalEmail,
                                personal_phone: personalPhone,
                                hire_date: hireDate,
                                department: dept,
                                employee_type: empType,
                                timezone: timezone,
                                termination_date: terminationDate || null,
                                custom_fields: customFields,
                                tracking_enabled: trackingEnabled
                            };
                            console.log('PREPARING PATCH IN MODAL:', patch);
                            onSave(patch);
                        }}
                        className="px-10 py-4 bg-primary text-white rounded-2xl text-[12px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 font-mono"
                    >
                        {isRestricted ? 'READ ONLY' : 'SAVE CHANGES'}
                    </button>
                    <button onClick={onClose} className="p-3 hover:bg-black/5 rounded-2xl transition-all text-text-muted ml-4">
                        <X className="w-7 h-7" strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-12 border-b border-black/[0.03] flex items-center gap-10 bg-white shrink-0">
                {tabs.map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={clsx(
                            "py-6 text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-[3px] font-mono",
                            activeTab === t ? "border-primary text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FAFAFB]">
                <div className="p-12 max-w-7xl mx-auto space-y-12 pb-32">
                    {activeTab === 'INFO' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Profile Summary */}
                            <div className="flex items-start gap-10">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-[40px] bg-primary/5 border-2 border-primary/10 flex items-center justify-center text-primary text-4xl font-bold font-mono overflow-hidden shadow-sm">
                                        {member.full_name.split(' ').map((n:any)=>n[0]).join('')}
                                    </div>
                                    <div className="text-center mt-4">
                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Joined</p>
                                        <p className="text-[12px] font-bold text-text-primary font-mono">{new Date(member.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-4 text-text-primary font-bold">
                                        <div className="w-8 h-8 rounded-xl bg-black/[0.03] flex items-center justify-center"><X className="w-4 h-4 text-text-muted rotate-45" /></div>
                                        <span className="text-[14px]">{member.email}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-text-primary font-bold">
                                        <div className="w-8 h-8 rounded-xl bg-black/[0.03] flex items-center justify-center"><Settings className="w-4 h-4 text-text-muted" /></div>
                                        <span className="text-[14px]">{timezone}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-text-muted font-bold opacity-60">
                                        <div className="w-8 h-8 rounded-xl bg-black/[0.03] flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-text-muted" /></div>
                                        <span className="text-[14px]">Last tracked time {member.lastSeen || 'never'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Identity Section */}
                            <section className="space-y-8">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Identity</h3>
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <FormField label="FULL NAME" value={name} onChange={setName} />
                                        <FormField label="TIMEZONE" value={timezone} onChange={setTimezone} />
                                        <FormField label="OS USERNAME" value={osUsername} onChange={setOsUsername} placeholder="No OS username" />
                                        <FormField label="EMPLOYEE ID" value={employeeId} onChange={setEmployeeId} />
                                        <div className="space-y-4">
                                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">BIRTHDAY</label>
                                            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                                                className="w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all shadow-sm font-mono" />
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="p-8 bg-black/[0.03] border border-black/[0.05] rounded-[32px] space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono block mb-2">IP ADDRESS</label>
                                                <p className="text-xl font-bold text-text-primary font-mono">120.29.78.176</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono block mb-2">LAST RECORDED</label>
                                                <p className="text-[14px] font-bold text-text-primary font-mono">{new Date().toDateString()}</p>
                                            </div>
                                            <div className="pt-4 border-t border-black/[0.05]">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-bold uppercase rounded-lg tracking-widest">BETA</span>
                                                    <span className="text-[12px] font-bold text-primary hover:underline cursor-pointer font-mono">Trackora People</span>
                                                </div>
                                                <p className="text-[12px] text-text-muted leading-relaxed font-bold">Try these new features for free while Trackora People is in BETA:</p>
                                                <ul className="text-[11px] text-text-muted list-disc pl-5 mt-4 space-y-2 font-bold opacity-80">
                                                    <li>View IP addresses history</li>
                                                    <li>Create and manage custom fields</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Contact Section */}
                            <section className="space-y-8 pt-6">
                                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Contact</h3>
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <FormField label="WORK ADDRESS" value={workAddress} onChange={setWorkAddress} />
                                        <FormField label="WORK EMAIL" value={member.email} disabled={true} />
                                        <FormField label="WORK PHONE" value={workPhone} onChange={setWorkPhone} />
                                    </div>
                                    <div className="space-y-8">
                                        <FormField label="HOME ADDRESS" value={homeAddress} onChange={setHomeAddress} />
                                        <FormField label="PERSONAL EMAIL" value={personalEmail} onChange={setPersonalEmail} />
                                        <FormField label="PERSONAL PHONE" value={personalPhone} onChange={setPersonalPhone} />
                                    </div>
                                </div>
                            </section>

                            {/* Custom Fields Section */}
                            <section className="space-y-8 pt-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Custom Fields</h3>
                                    <button className="text-[12px] font-bold text-primary hover:underline font-mono">Manage custom fields</button>
                                </div>
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <FormField label="SOCIAL SECURITY NUMBER" value={customFields.ssn || ''} onChange={(v:any) => setCustomFields({...customFields, ssn: v})} />
                                        <FormField label="EMPLOYEE ID (CUSTOM)" value={customFields.customId || ''} onChange={(v:any) => setCustomFields({...customFields, customId: v})} />
                                        <FormField label="EMERGENCY CONTACT" value={customFields.emergency || ''} onChange={(v:any) => setCustomFields({...customFields, emergency: v})} />
                                    </div>
                                    <div className="space-y-8">
                                        <FormField label="SPECIALIZATION" value={customFields.spec || ''} onChange={(v:any) => setCustomFields({...customFields, spec: v})} />
                                        <FormField label="ALIAS" value={customFields.alias || ''} onChange={(v:any) => setCustomFields({...customFields, alias: v})} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'EMPLOYMENT' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Employment Details</h3>
                           <div className="grid grid-cols-2 gap-12">
                                <FormField label="JOB ROLE" value={dept} onChange={setDept} placeholder="Marketing Director" />
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">EMPLOYEE TYPE</label>
                                    <select value={empType} onChange={e => setEmpType(e.target.value)}
                                        className="w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-mono">
                                        <option value="Full-time">Full-time</option>
                                        <option value="Part-time">Part-time</option>
                                        <option value="Contractor">Contractor</option>
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">HIRE DATE</label>
                                    <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)}
                                        className="w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-mono" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">TERMINATION DATE</label>
                                    <input type="date" value={terminationDate} onChange={e => setTerminationDate(e.target.value)}
                                        className="w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all font-mono" />
                                </div>
                           </div>
                        </div>
                    )}

                    {activeTab === 'ROLES' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Permissions & Access</h3>
                           <div className="max-w-md space-y-4">
                               <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">USER ROLE</label>
                               <div className="relative">
                                   <select value={role} onChange={e => setRole(e.target.value)}
                                       disabled={isRestricted}
                                       className={clsx(
                                           "w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[15px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all appearance-none cursor-pointer font-mono tracking-tight",
                                           isRestricted && "opacity-60 cursor-not-allowed"
                                       )}>
                                       {rolesAvailable.map((r:any) => <option key={r} value={r} className="bg-white text-text-primary">{r}</option>)}
                                   </select>
                                   <ChevronDown className="w-5 h-5 text-primary absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={3} />
                               </div>
                               <p className="text-[11px] text-text-muted font-bold leading-relaxed pt-2">
                                   Admins have full control, Managers can handle teams and projects, Users can track time, Viewers can only see reports.
                               </p>
                           </div>
                        </div>
                    )}

                    {activeTab === 'PAY / BILL' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Compensation & Billing</h3>
                           <div className="grid grid-cols-2 gap-12">
                                <FormField label="PAY RATE ($/HR)" value={payRate} onChange={setPayRate} type="number" />
                                <FormField label="BILL RATE ($/HR)" value={billRate} onChange={setBillRate} type="number" />
                           </div>
                        </div>
                    )}

                    {activeTab === 'WORK TIME & LIMITS' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">Tracking Rules & Limits</h3>
                           <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-10">
                                    <FormField label="WEEKLY LIMIT (HOURS)" value={weekly} onChange={setWeekly} type="number" />
                                    <FormField label="DAILY LIMIT (HOURS)" value={daily} onChange={setDaily} type="number" />
                                </div>
                                <div className="space-y-10">
                                    <div className="flex items-center gap-4 bg-white p-8 rounded-[32px] border border-black/[0.1] shadow-sm">
                                        <div className="flex-1">
                                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono block mb-1">IDLE TRACKING</label>
                                            <p className="text-[13px] text-text-primary font-bold tracking-tight">Pause tracker when inactive</p>
                                        </div>
                                        <button onClick={() => setIdleEnabled(!idleEnabled)} disabled={isRestricted}
                                            className={clsx("w-14 h-8 rounded-full p-1 transition-all duration-300 shadow-inner", idleEnabled ? "bg-primary" : "bg-black/10")}>
                                            <div className={clsx("w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300", idleEnabled ? "translate-x-6" : "translate-x-0")} />
                                        </button>
                                    </div>
                                    {idleEnabled && <FormField label="IDLE LIMIT (MINUTES)" value={idle} onChange={setIdle} type="number" />}
                                </div>
                           </div>
                        </div>
                    )}

                    {activeTab === 'SETTINGS' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                           <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono border-l-4 border-primary pl-4">User Configurations</h3>
                           <div className="max-w-xl space-y-10">
                                <div className="flex items-center justify-between p-8 bg-white rounded-[32px] border border-black/[0.1] shadow-sm">
                                    <div className="flex-1">
                                        <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono block mb-1">TRACKING ENABLED</label>
                                        <p className="text-[13px] text-text-primary font-bold tracking-tight">Allow this user to record time</p>
                                    </div>
                                    <button 
                                        onClick={() => setTrackingEnabled(!trackingEnabled)} 
                                        disabled={isRestricted}
                                        className={clsx(
                                            "w-14 h-8 rounded-full p-1 transition-all duration-300 shadow-inner",
                                            trackingEnabled ? "bg-emerald-500" : "bg-black/10"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300",
                                            trackingEnabled ? "translate-x-6" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>
                           </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FormField({ label, value, onChange, type = 'text', placeholder, disabled }: any) {
    return (
        <div className="space-y-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono leading-none">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={clsx(
                    "w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all shadow-sm placeholder:text-text-muted font-mono tracking-tight",
                    disabled && "bg-black/[0.02] cursor-not-allowed opacity-60"
                )}
            />
        </div>
    );
}

function InviteSentPopup({ email, onClose }: any) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xl flex items-center justify-center z-[200] p-4 animate-in fade-in duration-500">
            <div className="bg-white/95 backdrop-blur-3xl rounded-[48px] w-full max-w-md p-12 text-center shadow-2xl border border-black/[0.05] animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-inner">
                    <CheckCircle className="w-12 h-12 text-emerald-500" strokeWidth={3} />
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-4 tracking-tighter leading-none">Invite Sent</h2>
                <p className="text-text-secondary text-sm mb-12 leading-relaxed font-bold font-mono uppercase tracking-widest opacity-70">
                    An invitation has been sent to <span className="text-primary">{email}</span>.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-primary text-white py-5 rounded-[24px] text-[11px] font-bold uppercase tracking-[0.4em] transition-all active:scale-95 shadow-lg shadow-primary/20 font-mono"
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
}
