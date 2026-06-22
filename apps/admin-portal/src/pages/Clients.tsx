import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Search, Building2, Mail,
    Plus, Globe,
    Trash2, Edit, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    PageLayout, Button, StatusBadge,
    LoadingState, EmptyState, Modal, Input,
    StatMetric
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
        <PageLayout
            title="Clients"
            description="Manage your client database and business relationships."
            actions={
                <Button
                    onClick={handleOpenCreate}
                    disabled={isViewer}
                    variant="primary"
                    className="shadow-shell-sm h-12 px-8 rounded-xl font-bold text-[14px] flex items-center gap-3"
                >
                    <Plus className="w-5 h-5" />
                    Add Client
                </Button>
            }
        >
            <div className="flex flex-col gap-8 pb-20">

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                    <StatMetric
                        icon={<Building2 className="w-5 h-5" />}
                        label="Total Clients"
                        value={clients.length}
                        sub="Registered clients"
                        accent="brand-gradient"
                    />
                    <StatMetric
                        icon={<Activity className="w-5 h-5" />}
                        label="Active"
                        value={clients.filter(c => c.status === 'Active').length}
                        sub="Currently active"
                        accent="brand-gradient"
                    />
                    <StatMetric
                        icon={<Globe className="w-5 h-5" />}
                        label="Recent"
                        value={clients.filter(c => {
                            const created = new Date(c.created_at).getTime();
                            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                            return created > thirtyDaysAgo;
                        }).length}
                        sub="Last 30 days"
                        accent="brand-gradient"
                    />
                </div>

                {/* 🏗️ Main Ledger */}
                <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border overflow-hidden flex flex-col">
                    {/* Search & Filters */}
                    <div className="px-8 py-6 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between bg-surface shrink-0">
                        <div className="relative group/search w-[420px]">
                            <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-12 pl-14 pr-6 bg-surface-solid border border-border rounded-xl text-[14px] font-medium text-text-main placeholder:text-text-muted/60 outline-none focus:border-primary shadow-shell-sm focus:shadow-shell transition-all duration-300"
                            />
                        </div>

                        <div className="bg-surface border border-border p-1.5 rounded-2xl flex items-center shadow-shell-sm">
                            {['All', 'Active', 'Inactive'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={clsx(
                                        "px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                                        statusFilter === s
                                            ? "bg-slate-900 text-white shadow-shell-sm"
                                            : "text-text-muted hover:text-slate-900 hover:bg-surface-hover"
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
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="pl-8 pr-8 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase">Client</th>
                                    <th className="px-8 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase">Email</th>
                                    <th className="px-8 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase">Status</th>
                                    <th className="pr-8 py-6 text-[11px] font-bold text-text-muted tracking-[0.2em] uppercase text-right min-w-[150px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-text-muted">
                                            <LoadingState message="Loading clients..." />
                                        </td>
                                    </tr>
                                ) : filteredClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20">
                                            <EmptyState
                                                icon={<Building2 className="w-12 h-12 text-text-muted/20" />}
                                                title="No clients found"
                                                description="Your client list is currently empty."
                                                action={!isViewer && (
                                                    <Button onClick={handleOpenCreate} variant="secondary" size="sm">
                                                        Add First Client
                                                    </Button>
                                                )}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map((client) => (
                                        <tr key={client.id} className="hover:bg-surface-hover/50 transition-all group">
                                            <td className="pl-8 pr-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl border border-border bg-primary/5 text-primary border-primary/10 flex items-center justify-center font-bold text-xl shrink-0 shadow-shell-sm transition-all duration-300 group-hover:scale-110">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex flex-col gap-2">
                                                        <span className="text-[18px] font-bold text-text-main tracking-tight">{client.name}</span>
                                                        <span className="text-[13px] font-bold text-text-muted flex items-center gap-1.5">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            {client.company}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="h-14 flex items-center">
                                                    <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-surface border border-border rounded-xl text-[13px] font-semibold text-text-muted shadow-shell-sm">
                                                        <Mail className="w-4 h-4 text-text-muted/60" />
                                                        {client.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="h-14 flex items-center">
                                                    <button
                                                        onClick={() => toggleStatus(client)}
                                                        disabled={isViewer}
                                                    >
                                                        <StatusBadge
                                                            variant={client.status === 'Active' ? 'success' : 'default'}
                                                            className={clsx(
                                                                "px-3 py-1 text-[12px] font-bold rounded-lg border",
                                                                !isViewer && "cursor-pointer active:scale-95 transition-all"
                                                            )}
                                                        >
                                                            {client.status}
                                                        </StatusBadge>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="pr-8 py-5 text-right">
                                                <div className="h-14 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Button
                                                        onClick={() => handleOpenEdit(client)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-9 h-9 p-0 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover hover:border hover:border-slate-200 flex items-center justify-center transition-all"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => { if (!isViewer) setDeletingClient(client); }}
                                                        disabled={isViewer}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-9 h-9 p-0 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-8 py-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 bg-surface shrink-0">
                        <p className="text-[13px] font-semibold text-text-muted">
                            Total {clients.length} clients registered.
                        </p>
                        {clients.length > 5 && (
                            <div className="flex items-center gap-2">
                                <Button variant="secondary" size="sm" className="rounded-xl px-4 py-2 font-bold text-[13px]">
                                    Previous
                                </Button>
                                <Button variant="secondary" size="sm" className="rounded-xl px-4 py-2 font-bold text-[13px]">
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CREATE/EDIT MODAL */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editClient ? 'Edit Client' : 'Add Client'}
                subtitle={editClient ? 'Update client details and information' : 'Create a new client record'}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Client Name"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Jane Cooper"
                        leftIcon={<Building2 className="w-4 h-4" />}
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g., jane@example.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                    />
                    <Input
                        label="Company Name"
                        required
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        placeholder="e.g., Acme Inc"
                        leftIcon={<Globe className="w-4 h-4" />}
                    />

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            onClick={handleCloseModal}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || isViewer}
                            variant="primary"
                            className="flex-1"
                        >
                            {saving ? 'Saving...' : (editClient ? 'Save Changes' : 'Add Client')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            {deletingClient && (
                <Modal
                    isOpen={!!deletingClient}
                    onClose={() => setDeletingClient(null)}
                    title="Delete Client"
                    subtitle="Are you sure you want to remove this client?"
                    maxWidth="max-w-md"
                >
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-text-secondary leading-relaxed">
                                This will permanently remove <span className="font-bold text-text-primary">"{deletingClient.name}"</span>. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button
                                onClick={() => setDeletingClient(null)}
                                variant="secondary"
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="flex-1 shadow-shell-sm shadow-rose-100"
                            >
                                Delete Client
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </PageLayout>
    );
}


