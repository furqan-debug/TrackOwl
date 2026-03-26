import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Search, Building2, Mail, 
    Plus, Globe, 
    Trash2, ShieldCheck, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
    PageHeader, Card, Button, StatusBadge, 
    LoadingState, EmptyState, Modal, Input 
} from '../components/ui';
import clsx from 'clsx';

interface Client {
    id: string;
    name: string;
    email: string;
    company: string;
    status: 'Active' | 'Inactive';
    created_at: string;
}

export function Clients() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editClient, setEditClient] = useState<Client | null>(null);
    const [deletingClient, setDeletingClient] = useState<Client | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', company: '' });

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setClients(data);
        }
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            name: formData.name,
            email: formData.email,
            company: formData.company,
            organization_id: profile?.organization_id
        };

        if (editClient) {
            const { data, error } = await supabase
                .from('clients')
                .update(payload)
                .eq('id', editClient.id)
                .select()
                .single();

            if (!error && data) {
                setClients(clients.map(c => c.id === data.id ? data : c));
                handleCloseModal();
            }
        } else {
            const { data, error } = await supabase
                .from('clients')
                .insert({ ...payload, status: 'Active' })
                .select()
                .single();

            if (!error && data) {
                setClients([data, ...clients]);
                handleCloseModal();
            }
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!deletingClient) return;
        
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', deletingClient.id);

        if (!error) {
            setClients(clients.filter(c => c.id !== deletingClient.id));
            setDeletingClient(null);
        }
    }

    async function toggleStatus(client: Client) {
        if (isViewer) return;
        const newStatus = client.status === 'Active' ? 'Inactive' : 'Active';
        const { data, error } = await supabase
            .from('clients')
            .update({ status: newStatus })
            .eq('id', client.id)
            .select()
            .single();

        if (!error && data) {
            setClients(clients.map(c => c.id === data.id ? data : c));
        }
    }

    function handleOpenCreate() {
        setEditClient(null);
        setFormData({ name: '', email: '', company: '' });
        setShowModal(true);
    }

    function handleOpenEdit(client: Client) {
        setEditClient(client);
        setFormData({ name: client.name, email: client.email, company: client.company });
        setShowModal(true);
    }

    function handleCloseModal() {
        setShowModal(false);
        setEditClient(null);
        setFormData({ name: '', email: '', company: '' });
    }

    const filteredClients = clients.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-10 max-w-full mx-auto animate-in fade-in duration-700">
            <PageHeader
                title="Client Management"
                description="Manage your strategic business partners and organizational representatives."
                actions={
                    <Button
                        onClick={handleOpenCreate}
                        disabled={isViewer}
                        variant="primary"
                        className="px-8 py-3.5 scale-105 shadow-xl shadow-primary/20 group"
                    >
                        <Plus className="w-4 h-4 mr-2.5 group-hover:rotate-90 transition-transform" strokeWidth={3} />
                        Add New Client
                    </Button>
                }
            />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatsCard 
                    label="Total Clients" 
                    value={clients.length} 
                    icon={<Building2 className="w-5 h-5 text-primary" strokeWidth={2.5} />} 
                    description="Registered entities"
                />
                <StatsCard 
                    label="Active Partners" 
                    value={clients.filter(c => c.status === 'Active').length} 
                    icon={<Activity className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />} 
                    description="Operational accounts"
                />
                <StatsCard 
                    label="New Arrivals" 
                    value={clients.filter(c => {
                        const created = new Date(c.created_at).getTime();
                        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                        return created > thirtyDaysAgo;
                    }).length} 
                    icon={<Globe className="w-5 h-5 text-violet-600" strokeWidth={2.5} />} 
                    description="Last 30 days"
                />
            </div>

            <Card className="overflow-hidden p-0 border-border/60 shadow-xl">
                {/* Search & Filters */}
                <div className="p-8 border-b border-border bg-surface-subtle/30 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="relative group w-full max-w-md">
                        <Search className="w-4 h-4 text-text-muted absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" strokeWidth={3} />
                        <input
                            type="text"
                            placeholder="Search by name, company, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-13 pr-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary placeholder:text-text-muted/40 outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono uppercase"
                        />
                    </div>
                    
                    <div className="flex items-center bg-surface-subtle border border-border rounded-2xl p-1 shadow-inner">
                        {['All', 'Active', 'Inactive'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 font-mono",
                                    statusFilter === s ? "bg-surface-solid text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-subtle/20">
                                <th className="pl-12 pr-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border min-w-[320px]">Partner Details</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border">Contact Channel</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border">Current Status</th>
                                <th className="pl-6 pr-12 py-8 text-right border-b border-border min-w-[150px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-32">
                                        <LoadingState message="Retrieving client registry..." />
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-32">
                                        <EmptyState 
                                            icon={<Building2 className="w-12 h-12 text-text-muted/20" />}
                                            title="No clients found" 
                                            description="Your client registry is currently empty or matches no filters." 
                                            action={!isViewer && (
                                                <Button onClick={handleOpenCreate} variant="secondary" size="sm">
                                                    Initialize First Client
                                                </Button>
                                            )}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-primary/[0.01] transition-all group duration-500">
                                        <td className="px-12 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-surface-solid border border-border flex items-center justify-center font-bold text-text-primary text-xl shadow-sm transition-all group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary group-hover:text-white group-hover:border-primary/20 font-mono italic">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="font-bold text-text-primary text-lg tracking-tighter group-hover:text-primary transition-colors duration-500 italic">{client.name}</div>
                                                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-60 flex items-center gap-2">
                                                        <Building2 className="w-3 h-3" />
                                                        {client.company}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-surface-subtle border border-border rounded-xl text-[11px] font-bold text-text-muted group-hover:text-text-primary transition-colors duration-500 font-mono uppercase tracking-tight">
                                                <Mail className="w-3.5 h-3.5 opacity-40" />
                                                {client.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <button 
                                                onClick={() => toggleStatus(client)}
                                                disabled={isViewer}
                                                className="group/toggle"
                                            >
                                                <StatusBadge 
                                                    variant={client.status === 'Active' ? 'success' : 'default'}
                                                    className={clsx(
                                                        "px-5 py-2 transition-all font-mono italic",
                                                        !isViewer && "cursor-pointer group-hover/toggle:scale-110 active:scale-95 shadow-sm"
                                                    )}
                                                >
                                                    {client.status}
                                                </StatusBadge>
                                            </button>
                                        </td>
                                        <td className="pl-6 pr-12 py-8 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                                <Button 
                                                    onClick={() => handleOpenEdit(client)}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="p-3 bg-surface-solid rounded-xl hover:bg-primary hover:text-white transition-all shadow-lg active:scale-90"
                                                    title="Configure"
                                                >
                                                    <ShieldCheck className="w-5 h-5 font-bold" strokeWidth={2.5} />
                                                </Button>
                                                <Button 
                                                    onClick={() => { if (!isViewer) setDeletingClient(client); }}
                                                    disabled={isViewer}
                                                    variant="danger"
                                                    size="sm"
                                                    className={clsx(
                                                        "p-3 rounded-xl transition-all shadow-lg active:scale-90",
                                                        isViewer ? "opacity-20 cursor-not-allowed" : "bg-surface-solid text-text-muted hover:bg-rose-600 hover:text-white"
                                                    )}
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-10 bg-surface-subtle/30 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-50 text-center md:text-left">
                        Total {clients.length} strategic partners registered in the management ecosystem.
                    </p>
                    {clients.length > 5 && (
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" className="px-5 py-2 text-[9px] font-mono">
                                Previous
                            </Button>
                            <Button variant="secondary" size="sm" className="px-5 py-2 text-[9px] font-mono">
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* CREATE/EDIT MODAL */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editClient ? 'Update Client' : 'Add Client'}
                subtitle={editClient ? 'Modify existing partner profile' : 'Initialize a new strategic alliance'}
            >
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Input
                        label="Full Name / Representative"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        leftIcon={<Building2 className="w-4 h-4" />}
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@company.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                    />
                    <Input
                        label="Company / Organization"
                        required
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Corp"
                        leftIcon={<Globe className="w-4 h-4" />}
                    />

                    <div className="pt-6 flex gap-4">
                        <Button
                            type="button"
                            onClick={handleCloseModal}
                            variant="secondary"
                            className="flex-1 py-4 font-mono text-[11px]"
                        >
                            CANCEL
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || isViewer}
                            variant="primary"
                            className="flex-[2] py-4 shadow-xl font-mono text-[11px]"
                        >
                            {saving ? 'SAVING...' : (editClient ? 'UPDATE PROFILE' : 'CREATE ACCOUNT')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            {deletingClient && (
                <Modal
                    isOpen={!!deletingClient}
                    onClose={() => setDeletingClient(null)}
                    title="Terminate Partnership"
                    subtitle="Critical Action Warning"
                    maxWidth="max-w-[480px]"
                >
                    <div className="text-center space-y-8">
                        <div className="w-24 h-24 bg-rose-500/10 rounded-[32px] flex items-center justify-center mx-auto shadow-inner border border-rose-500/10 rotate-3 group-hover:rotate-0 transition-transform">
                            <Trash2 className="w-10 h-10 text-rose-600" strokeWidth={2.5} />
                        </div>
                        <div className="space-y-4">
                            <p className="text-text-primary text-xl font-bold tracking-tight">Are you absolutely sure?</p>
                            <p className="text-text-muted font-bold uppercase tracking-widest leading-relaxed text-[11px] font-mono opacity-80 px-4">
                                This will permanently remove <span className="text-rose-600">"{deletingClient.name.toUpperCase()}"</span> from the registry. All associated records will be archived.
                            </p>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={() => setDeletingClient(null)}
                                variant="secondary"
                                className="flex-1 py-4 font-mono text-[11px]"
                            >
                                ABORT
                            </Button>
                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="flex-[1.5] py-4 shadow-xl shadow-rose-900/10 font-mono text-[11px]"
                            >
                                CONFIRM DELETE
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function StatsCard({ label, value, icon, description }: { label: string; value: number | string; icon: React.ReactNode; description: string }) {
    return (
        <div className="bg-surface-solid p-10 rounded-[44px] border border-border hover:border-primary/20 transition-all group overflow-hidden relative shadow-sm hover:shadow-xl duration-700">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:bg-primary/[0.03] transition-colors duration-1000" />
            <div className="flex items-center gap-6 mb-6">
                <div className="w-12 h-12 rounded-[18px] bg-surface-subtle flex items-center justify-center border border-border shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mb-0.5">{label}</p>
                    <p className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest font-mono italic">{description}</p>
                </div>
            </div>
            <h2 className="text-6xl font-bold text-text-primary tracking-tighter leading-none italic font-mono">{value}</h2>
        </div>
    );
}
