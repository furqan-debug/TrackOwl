import { useEffect, useRef, useState } from 'react';
import { 
    Users, Search, Filter, Download, UserPlus, Trash2, 
    ChevronDown, MoreHorizontal, Pencil, RotateCcw, 
    Settings, X, Shield, User, AlertCircle, CheckCircle,
    Clock, DollarSign, FileText
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { 
    Button, 
    Card, 
    PageLayout,
    Modal,
    StatusBadge, 
    EmptyState, 
    LoadingState 
} from '../components/ui';
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
    const [showFilters, setShowFilters] = useState(false);

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
                title="Members"
                description="Manage your team members, roles, and compensation settings."
                maxWidth="full"
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            leftIcon={<UserPlus className="w-5 h-5" />}
                            onClick={() => { if (!isViewer) { resetAddForm(); setShowAddModal(true); } }}
                            disabled={isViewer}
                        >
                            Invite Member
                        </Button>
                        <Button
                            variant="secondary"
                            leftIcon={<Download className="w-4 h-4" />}
                            onClick={handleExportCsv}
                        >
                            Export CSV
                        </Button>
                    </div>
                }
            >
                <div className="flex bg-surface-subtle p-1 rounded-lg border border-border w-fit mb-10">
                    <button
                        onClick={() => setActiveTab('Members')}
                        className={clsx(
                            "px-6 py-2 text-xs font-semibold rounded-md transition-all",
                            activeTab === 'Members' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                        )}
                    >
                        Members ({membersCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('Invites')}
                        className={clsx(
                            "px-6 py-2 text-xs font-semibold rounded-md transition-all",
                            activeTab === 'Invites' ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                        )}
                    >
                        Pending Invites ({invitesCount})
                    </button>
                </div>
                {/* Action Bar */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 mb-8">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                        <div className="relative group lg:w-[400px]">
                            <Search className="w-5 h-5 text-text-muted absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder={`Search ${activeTab.toLowerCase()}...`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-13 pr-6 py-3.5 bg-surface-solid border border-border rounded-xl text-sm font-semibold text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-all"
                            />
                        </div>
                        <Button
                            variant="secondary"
                            leftIcon={<Filter className="w-4 h-4" />}
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(showFilters && "border-primary bg-primary/5")}
                        >
                            Filters
                        </Button>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-4 animate-in slide-in-from-right-4 duration-300">
                             <span className="text-[10px] font-bold text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10 uppercase tracking-wider">
                                {selectedIds.size} Selected
                            </span>
                            <Button 
                                variant="danger" 
                                size="sm" 
                                leftIcon={<Trash2 className="w-4 h-4" />}
                                onClick={handleBatchDelete}
                                disabled={isViewer}
                            >
                                Batch Delete
                            </Button>
                        </div>
                    )}
                </div>

                <Card noPadding className="border border-border/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-border/5">
                                    <th className="pl-10 py-5 w-16">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filtered.length && filtered.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-5 h-5 rounded-lg border-border bg-surface-solid checked:bg-primary transition-all cursor-pointer shadow-sm"
                                        />
                                    </th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest opacity-80">Member</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest opacity-80">Role</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap opacity-80">Engagement</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap opacity-80">Rates</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap opacity-80">Limits</th>
                                    <th className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap opacity-80">Status</th>
                                    <th className="pr-10 py-5 text-right text-[11px] font-bold text-text-muted uppercase tracking-widest opacity-80">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="py-24">
                                            <LoadingState message="Loading members..." />
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-24">
                                            <EmptyState 
                                                title={`No ${activeTab.toLowerCase()} found`}
                                                description="Check your search query or invite a new team member."
                                                icon={<Users className="w-10 h-10" />}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((m: any) => (
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
                </Card>

                {/* Pagination Placeholder */}
                <div className="mt-8 flex items-center justify-between px-4">
                    <div className="text-xs font-semibold text-text-muted opacity-70">
                         Showing {filtered.length} members
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" size="sm" disabled className="px-6 opacity-40">Previous</Button>
                        <Button variant="secondary" size="sm" disabled className="px-6 opacity-40">Next</Button>
                    </div>
                </div>

                {/* Modals & Popups */}
                {showAddModal && <InviteModal onClose={() => setShowAddModal(false)} onInvite={handleAddMember} form={{ addEmail, setAddEmail, addRole, setAddRole, addPayRate, setAddPayRate, addBillRate, setAddBillRate, addWeekly, setAddWeekly, addDaily, setAddDaily, adding, addError }} isViewer={isViewer} currentUserRole={profile?.role} />}
                {editMember && <EditModal member={editMember} onClose={() => setEditMember(null)} onSave={(patch: any) => handleUpdateMeta(editMember.id, patch)} isViewer={isViewer} currentUserRole={profile?.role} onRefresh={fetchMembers} />}
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
            "group/row transition-all border-b border-border/40 last:border-0",
            isSelected ? "bg-primary/[0.04]" : "hover:bg-border/5"
        )}>
            <td className="pl-10 py-6">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    className="w-5 h-5 rounded-lg border-border bg-surface-solid checked:bg-primary transition-all cursor-pointer shadow-sm"
                />
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary text-sm font-bold shadow-sm group-hover/row:scale-105 transition-transform duration-300">
                        {initials || <Users className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                        <span onClick={onEdit} className="text-sm font-bold text-text-primary hover:text-primary cursor-pointer block tracking-tight transition-colors leading-none mb-1.5 truncate">
                            {m.full_name}
                        </span>
                        <span className="text-[11px] font-medium text-text-muted opacity-80 block truncate">
                            {m.email}
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <StatusBadge 
                    variant={m.role === 'Admin' ? 'success' : m.role === 'Manager' ? 'warning' : 'default'}
                    icon={m.role === 'Admin' ? <Shield className="w-3 h-3" /> : m.role === 'Manager' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                >
                    {m.role === 'Admin' ? 'OWNER' : m.role.toUpperCase()}
                </StatusBadge>
            </td>
            <td className="px-8 py-6">
                <div className="text-[11px] font-bold text-text-muted leading-relaxed whitespace-nowrap">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="w-16 opacity-60 uppercase tracking-widest">Sessions</span>
                        <span className="text-text-primary">{m.sessionCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-16 opacity-60 uppercase tracking-widest">Projects</span>
                        <span className="text-text-primary">{m.projectsCount || 0}</span>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="text-[11px] font-bold text-text-muted leading-relaxed whitespace-nowrap">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="w-10 opacity-60 uppercase tracking-widest">Pay</span>
                        <span className="text-primary font-bold">${m.pay_rate || 0}/h</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-10 opacity-60 uppercase tracking-widest">Bill</span>
                        <span className="text-purple-600 font-bold">${m.bill_rate || 0}/h</span>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="text-[11px] font-bold text-text-muted leading-relaxed whitespace-nowrap">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="w-12 opacity-60 uppercase tracking-widest">Weekly</span>
                        <span className="text-text-primary">{m.weekly_limit}h</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-12 opacity-60 uppercase tracking-widest">Daily</span>
                        <span className="text-text-primary">{m.daily_limit}h</span>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <StatusBadge 
                    variant={m.status === 'Active' ? 'success' : m.status === 'Pending' ? 'warning' : 'default'}
                >
                    {m.status.toUpperCase()}
                </StatusBadge>
            </td>
            <td className="pr-10 py-6 text-right relative" ref={dropRef}>
                <button
                    onClick={() => setOpen(!open)}
                    className="p-3 bg-white border border-border rounded-xl text-text-muted hover:text-text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95 group/btn"
                >
                    <MoreHorizontal className={clsx("w-5 h-5 transition-transform duration-300", open && "rotate-90")} strokeWidth={2} />
                </button>
                {open && (
                    <div className="absolute right-10 top-20 bg-surface-solid border border-border shadow-2xl rounded-2xl z-50 py-3 w-64 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-border/40 mb-2">
                             <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1">Options</p>
                             <p className="text-[12px] font-bold text-text-primary truncate">{m.full_name}</p>
                        </div>
                        <DropItem
                            icon={<Pencil className="w-4 h-4" />}
                            label={isRestricted ? 'View Profile' : 'Edit Member'}
                            onClick={() => { onEdit(); setOpen(false); }}
                        />
                        {m.status === 'Pending' && (
                            <DropItem
                                icon={<RotateCcw className="w-4 h-4" />}
                                label="Resend Invite"
                                disabled={isRestricted}
                                onClick={() => { if (!isRestricted) { onResendInvite(); setOpen(false); } }}
                            />
                        )}
                        <DropItem 
                            icon={<Settings className="w-4 h-4" />} 
                            label="Configuration" 
                            onClick={() => { setOpen(false); onEdit(); }} 
                        />
                        <div className="my-2 border-t border-border/40" />
                        <DropItem
                            icon={<Trash2 className="w-4 h-4" />}
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
                "w-full flex items-center gap-4 px-6 py-3 text-xs font-semibold transition-all text-left group",
                danger ? "text-rose-500 hover:bg-rose-500/10" : "text-text-muted hover:text-text-primary hover:bg-border/5",
                disabled && "opacity-30 cursor-not-allowed"
            )}
        >
            <span className={clsx("transition-opacity", !disabled && "group-hover:scale-110")}>{icon}</span>
            {label}
        </button>
    );
}

// ─── Modals (Polished for light theme) ────────────────────────────────

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
                <>
                    <Button variant="secondary" onClick={onClose} className="px-8">
                        Discard
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onInvite}
                        loading={form.adding}
                        disabled={!form.addEmail.trim() || isViewer}
                        leftIcon={<UserPlus className="w-5 h-5" />}
                        className="px-10 shadow-lg shadow-primary/20"
                    >
                        Send Invite
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                <FormField 
                    label="Email Address" 
                    value={form.addEmail} 
                    onChange={form.setAddEmail} 
                    type="email" 
                    placeholder="email@company.com" 
                />

                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Role</label>
                    <div className="relative group">
                        <select 
                            value={form.addRole} 
                            onChange={e => form.setAddRole(e.target.value)}
                            className="w-full px-6 py-4 bg-surface-solid border border-border rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                        >
                            {rolesAvailable.map(r => <option key={r} value={r} className="bg-surface-solid text-text-primary">{r.toUpperCase()}</option>)}
                        </select>
                        <ChevronDown className="w-5 h-5 text-primary absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none group-hover:scale-110 transition-transform" strokeWidth={3} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <FormField label="Pay Rate ($/hr)" value={form.addPayRate} onChange={form.setAddPayRate} type="number" placeholder="0.00" />
                    <FormField label="Bill Rate ($/hr)" value={form.addBillRate} onChange={form.setAddBillRate} type="number" placeholder="0.00" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <FormField label="Weekly Limit (Hrs)" value={form.addWeekly} onChange={form.setAddWeekly} type="number" placeholder="40" />
                    <FormField label="Daily Limit (Hrs)" value={form.addDaily} onChange={form.setAddDaily} type="number" placeholder="8" />
                </div>

                {form.addError && (
                    <div className="bg-rose-500/5 border border-rose-500/20 text-rose-600 text-[10px] font-bold uppercase tracking-[0.1em] p-5 rounded-2xl leading-relaxed font-mono flex items-start gap-4 animate-in slide-in-from-top-2">
                         <AlertCircle className="w-5 h-5 shrink-0" />
                         {form.addError}
                    </div>
                )}
            </div>
        </Modal>
    );
}

// Geo lookup using ipapi.co (free, no key for public IPs, 1000 req/day limit)
async function lookupIp(ip?: string): Promise<{ city: string; country: string; countryCode: string; lat: number; lon: number }> {
    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (d.error) throw new Error(d.reason || 'Rate limited');
        return {
            city: d.city || 'Unknown',
            country: d.country_name || 'Unknown',
            countryCode: d.country || '??',
            lat: d.latitude || 0,
            lon: d.longitude || 0,
        };
    } catch {
        // Fallback to ipinfo.io
        try {
            const path = ip ? `/${ip}/json` : '/json';
            const res2 = await fetch(`https://ipinfo.io${path}`, { signal: AbortSignal.timeout(4000) });
            const d2 = await res2.json();
            const [lat, lon] = (d2.loc || '0,0').split(',').map(Number);
            return {
                city: d2.city || 'Unknown',
                country: d2.country || 'Unknown',
                countryCode: d2.country || '??',
                lat: lat || 0,
                lon: lon || 0,
            };
        } catch {
            return { city: 'Unknown', country: 'Unknown', countryCode: '??', lat: 0, lon: 0 };
        }
    }
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function EditModal({ member, onClose, onSave, isViewer, currentUserRole, onRefresh }: any) {
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
    
    // Tracking Info
    const [lastSession, setLastSession] = useState<{started_at: string, ip_address: string} | null>(null);
    const [location, setLocation] = useState<{city: string, country: string} | null>(null);

    // Metadata Fields
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

    const [activeTab, setActiveTab] = useState<'INFO' | 'STATS' | 'ACTIONS'>('INFO');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchLastSession();
    }, [member.id]);

    async function fetchLastSession() {
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('started_at, ip_address')
                .eq('user_id', member.id)
                .order('started_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            if (data && data[0]) {
                setLastSession(data[0] as any);
                if (data[0].ip_address) {
                    const geo = await lookupIp(data[0].ip_address);
                    setLocation({ city: geo.city, country: geo.country });
                }
            }
        } catch (e) {
            console.error('Fetch session error:', e);
        }
    }

    async function handleSave() {
        if (isRestricted) return;
        setSaving(true);
        setSaveStatus('idle');
        
        const patch = {
            full_name: name,
            role,
            pay_rate: parseFloat(payRate) || 0,
            bill_rate: parseFloat(billRate) || 0,
            weekly_limit: parseInt(weekly) || 40,
            daily_limit: parseInt(daily) || 8,
            idle_limit: parseInt(idle) || 10,
            idle_enabled: idleEnabled,
            tracking_enabled: trackingEnabled,
            os_username: osUsername,
            employee_id: employeeId,
            birthday,
            work_address: workAddress,
            work_phone: workPhone,
            home_address: homeAddress,
            personal_email: personalEmail,
            personal_phone: personalPhone,
            hire_date: hireDate,
            department: dept,
            employee_type: empType,
            timezone,
            termination_date: terminationDate,
            custom_fields: customFields
        };

        try {
            await onSave(patch);
            setSaveStatus('success');
            onRefresh?.();
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Save failed:', err);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    }

    const handleDeactivate = async () => {
        if (!confirm('Deactivate this user? They will no longer be able to log in.')) return;
        try {
            const { error } = await supabase.from('members').update({ status: 'Inactive' }).eq('id', member.id);
            if (error) throw error;
            onRefresh?.();
            onClose();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleResetPassword = async () => {
        if (!confirm(`Send password reset link to ${member.email}?`)) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            alert('Password reset email sent');
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleDeleteInternal = async () => {
        if (!confirm('PERMANENTLY DELETE this member? This cannot be undone.')) return;
        try {
            const { error } = await supabase.from('members').delete().eq('id', member.id);
            if (error) throw error;
            onRefresh?.();
            onClose();
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
            <Card className="w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-300 flex flex-col" noPadding>
                {/* Header */}
                <div className="px-10 py-8 border-b border-border bg-border/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[24px] bg-primary/5 border border-primary/10 flex items-center justify-center text-primary text-[24px] font-bold shadow-sm font-mono">
                            {member.full_name[0].toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-1">{member.full_name}</h2>
                            <div className="flex items-center gap-3">
                                <StatusBadge variant={member.status === 'Active' ? 'success' : 'warning'}>{member.status.toUpperCase()}</StatusBadge>
                                <span className="text-[11px] font-bold text-text-muted font-mono uppercase tracking-widest">{member.email}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            loading={saving}
                            disabled={isRestricted}
                            className="px-8"
                        >
                            {saveStatus === 'success' ? 'Changes Saved' : 'Save Changes'}
                        </Button>
                        <button onClick={onClose} className="p-3 hover:bg-border/10 rounded-2xl transition-all shadow-sm">
                            <X className="w-6 h-6 text-text-muted hover:text-text-primary" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex px-10 border-b border-border bg-surface-solid shrink-0">
                    {(['INFO', 'STATS', 'ACTIONS'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "px-8 py-5 text-[11px] font-bold tracking-[0.2em] transition-all relative font-mono uppercase",
                                activeTab === tab ? "text-primary" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(80,110,248,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                    {activeTab === 'INFO' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             {/* Basic Information */}
                             <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <User className="w-5 h-5 text-primary" />
                                    <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Basic Information</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <FormField label="Full Name" value={name} onChange={setName} disabled={isRestricted} />
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Role</label>
                                        <select 
                                            value={role} 
                                            onChange={e => setRole(e.target.value as any)}
                                            disabled={isRestricted}
                                            className="w-full px-6 py-4 bg-surface-solid border border-border rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:border-primary transition-all"
                                        >
                                            {rolesAvailable.map(r => <option key={r} value={r} className="bg-surface-solid text-text-primary">{r.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <FormField label="Employee ID" value={employeeId} onChange={setEmployeeId} disabled={isRestricted} placeholder="e.g. EMP-998" />
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Employment Type</label>
                                        <select 
                                            value={empType} 
                                            onChange={e => setEmpType(e.target.value)}
                                            disabled={isRestricted}
                                            className="w-full px-6 py-4 bg-surface-solid border border-border rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:border-primary transition-all"
                                        >
                                            {['Full-time', 'Part-time', 'Contractor'].map(t => <option key={t} value={t} className="bg-surface-solid text-text-primary">{t.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <FormField label="Department" value={dept} onChange={setDept} disabled={isRestricted} placeholder="e.g. Engineering" />
                                </div>
                             </section>

                             {/* Compensation */}
                             <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <DollarSign className="w-5 h-5 text-primary" />
                                    <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Compensation</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <FormField label="Pay Rate ($/hr)" value={payRate} onChange={setPayRate} disabled={isRestricted} type="number" />
                                    <FormField label="Bill Rate ($/hr)" value={billRate} onChange={setBillRate} disabled={isRestricted} type="number" />
                                </div>
                             </section>

                             {/* Limits & Tracking */}
                             <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Limits & Tracking</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <FormField label="Weekly Limit (Hrs)" value={weekly} onChange={setWeekly} disabled={isRestricted} type="number" />
                                    <FormField label="Daily Limit (Hrs)" value={daily} onChange={setDaily} disabled={isRestricted} type="number" />
                                    
                                    <div className="flex items-center justify-between p-6 bg-border/5 rounded-2xl border border-border/60">
                                        <div>
                                            <p className="text-[11px] font-bold text-text-primary uppercase">Idle Detection</p>
                                            <p className="text-[10px] font-bold text-text-muted uppercase">Stop tracking when idle</p>
                                        </div>
                                        <button 
                                            onClick={() => setIdleEnabled(!idleEnabled)} 
                                            disabled={isRestricted}
                                            className={clsx("w-12 h-6 rounded-full p-1 transition-all", idleEnabled ? "bg-primary" : "bg-border")}
                                        >
                                            <div className={clsx("w-4 h-4 bg-white rounded-full transition-all", idleEnabled ? "translate-x-6" : "translate-x-0")} />
                                        </button>
                                    </div>

                                    {idleEnabled && (
                                        <FormField label="Idle Timeout (Minutes)" value={idle} onChange={setIdle} disabled={isRestricted} type="number" />
                                    )}

                                    <div className="flex items-center justify-between p-6 bg-border/5 rounded-2xl border border-border/60">
                                        <div>
                                            <p className="text-[11px] font-bold text-text-primary uppercase">Enable Tracking</p>
                                            <p className="text-[10px] font-bold text-text-muted uppercase">Allow syncing from desktop app</p>
                                        </div>
                                        <button 
                                            onClick={() => setTrackingEnabled(!trackingEnabled)} 
                                            disabled={isRestricted}
                                            className={clsx("w-12 h-6 rounded-full p-1 transition-all", trackingEnabled ? "bg-emerald-500" : "bg-border")}
                                        >
                                            <div className={clsx("w-4 h-4 bg-white rounded-full transition-all", trackingEnabled ? "translate-x-6" : "translate-x-0")} />
                                        </button>
                                    </div>
                                </div>
                             </section>

                             {/* Dates */}
                             <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Dates</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <FormField label="Computer Username" value={osUsername} onChange={setOsUsername} disabled={isRestricted} />
                                    <FormField label="Birthday" value={birthday} onChange={setBirthday} type="date" disabled={isRestricted} />
                                    <FormField label="Hire Date" value={hireDate} onChange={setHireDate} type="date" disabled={isRestricted} />
                                    <FormField label="Termination Date" value={terminationDate} onChange={setTerminationDate} type="date" disabled={isRestricted} />
                                    <FormField label="Timezone" value={timezone} onChange={setTimezone} disabled={isRestricted} />
                                </div>
                             </section>

                             {/* Contact Details */}
                             <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <Settings className="w-5 h-5 text-primary" />
                                    <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Contact Details</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <FormField label="Work Address" value={workAddress} onChange={setWorkAddress} disabled={isRestricted} />
                                    <FormField label="Home Address" value={homeAddress} onChange={setHomeAddress} disabled={isRestricted} />
                                    <FormField label="Personal Email" value={personalEmail} onChange={setPersonalEmail} disabled={isRestricted} />
                                    <FormField label="Work Phone" value={workPhone} onChange={setWorkPhone} disabled={isRestricted} />
                                    <FormField label="Personal Phone" value={personalPhone} onChange={setPersonalPhone} disabled={isRestricted} />
                                </div>
                             </section>

                             {/* Additional Info */}
                             <section>
                                <div className="flex items-center gap-3 mb-8">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Additional Information</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                    <FormField 
                                        label="SSN" 
                                        value={customFields.ssn || ''} 
                                        onChange={(v: any) => setCustomFields({...customFields, ssn: v})} 
                                        disabled={isRestricted} 
                                        placeholder="XXX-XX-XXXX"
                                    />
                                    <FormField 
                                        label="Emergency Contact" 
                                        value={customFields.emergency || ''} 
                                        onChange={(v: any) => setCustomFields({...customFields, emergency: v})} 
                                        disabled={isRestricted} 
                                    />
                                    <FormField 
                                        label="Skills/Notes" 
                                        value={customFields.spec || ''} 
                                        onChange={(v: any) => setCustomFields({...customFields, spec: v})} 
                                        disabled={isRestricted} 
                                    />
                                    <FormField 
                                        label="Nickname" 
                                        value={customFields.alias || ''} 
                                        onChange={(v: any) => setCustomFields({...customFields, alias: v})} 
                                        disabled={isRestricted} 
                                    />
                                </div>
                             </section>
                        </div>
                    )}

                    {activeTab === 'STATS' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="grid grid-cols-3 gap-6">
                                <Card className="bg-border/5">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Last Active</p>
                                    <h4 className="text-xl font-bold text-text-primary tracking-tight">
                                        {lastSession ? timeAgo(lastSession.started_at) : 'No Activity'}
                                    </h4>
                                </Card>
                                <Card className="bg-border/5">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">IP Address</p>
                                    <h4 className="text-xl font-bold text-text-primary tracking-tight">
                                        {lastSession?.ip_address || 'Unknown'}
                                    </h4>
                                </Card>
                                <Card className="bg-border/5">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Location</p>
                                    <h4 className="text-xl font-bold text-text-primary tracking-tight">
                                        {location ? `${location.city}, ${location.country}` : 'Locating...'}
                                    </h4>
                                </Card>
                             </div>

                             <Card noPadding className="border-border/60">
                                <div className="px-8 py-6 border-b border-border bg-border/5">
                                    <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Activity History</h4>
                                </div>
                                <div className="p-8">
                                     <div className="h-48 flex items-center justify-center border-2 border-dashed border-border rounded-xl">
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Activity stats will appear here soon.</p>
                                     </div>
                                </div>
                             </Card>
                        </div>
                    )}

                    {activeTab === 'ACTIONS' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <section className="p-8 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                                        <AlertCircle className="w-6 h-6 text-rose-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-rose-600 tracking-tight">Deactivate Member</h4>
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Permanently remove this member from the team.</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="danger" 
                                    disabled={isRestricted}
                                    className="px-10"
                                    onClick={handleDeactivate}
                                >
                                    Deactivate Member
                                </Button>
                             </section>

                             <section className="p-8 bg-border/5 border border-border rounded-3xl">
                                <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wider mb-6">Account Security</h4>
                                <div className="flex flex-col gap-4 max-w-sm">
                                    <Button variant="secondary" className="px-10" onClick={handleResetPassword}>Reset Password</Button>
                                    <Button variant="danger" className="px-10" onClick={handleDeleteInternal}>Delete Data History</Button>
                                </div>
                             </section>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function FormField({ label, value, onChange, type = 'text', placeholder, disabled }: any) {
    return (
        <div className="space-y-4">
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider leading-none">{label}</label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={clsx(
                    "w-full px-6 py-4 bg-white border border-black/[0.1] rounded-2xl text-[14px] font-bold text-text-primary outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all shadow-sm placeholder:text-text-muted tracking-tight",
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
                <p className="text-text-secondary text-base mb-12 leading-relaxed font-bold uppercase tracking-wider opacity-70">
                    An invitation has been sent to <span className="text-primary">{email}</span>.
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-primary text-white py-5 rounded-[24px] text-[12px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
}
