import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Search, Building2, Mail, 
    Plus, Globe, 
    Trash2, ShieldCheck, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
    PageLayout, Card, Button, StatusBadge, 
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
        <PageLayout
            title="Clients"
            description="Manage your client database and business relationships."
            actions={
                <Button
                    onClick={handleOpenCreate}
                    disabled={isViewer}
                    variant="primary"
                    className="shadow-shell-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                </Button>
            }
        >

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard 
                    label="Total Clients" 
                    value={clients.length} 
                    icon={<Building2 className="w-5 h-5 text-text-muted" />} 
                    description="Registered clients"
                />
                <StatsCard 
                    label="Active" 
                    value={clients.filter(c => c.status === 'Active').length} 
                    icon={<Activity className="w-5 h-5 text-text-muted" />} 
                    description="Currently active"
                />
                <StatsCard 
                    label="Recent" 
                    value={clients.filter(c => {
                        const created = new Date(c.created_at).getTime();
                        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                        return created > thirtyDaysAgo;
                    }).length} 
                    icon={<Globe className="w-5 h-5 text-text-muted" />} 
                    description="Last 30 days"
                />
            </div>

            <Card className="overflow-hidden p-0 border-border/60 shadow-xl">
                {/* Search & Filters */}
                <div className="p-6 border-b border-border bg-surface-subtle/30 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative group w-full max-w-md">
                        <Search className="w-4 h-4 text-text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2 bg-surface-solid border border-border rounded-lg text-sm text-text-primary outline-none focus:border-primary transition-all"
                        />
                    </div>
                    
                    <div className="flex items-center bg-surface-solid border border-border rounded-lg p-1 shadow-shell-sm">
                        {['All', 'Active', 'Inactive'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                                    statusFilter === s ? "bg-primary text-white shadow-shell-sm" : "text-text-muted hover:text-text-primary"
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
                                <th className="pl-6 pr-6 py-4 text-xs font-semibold text-text-muted border-b border-border min-w-[320px]">Client</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted border-b border-border">Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted border-b border-border">Status</th>
                                <th className="pl-6 pr-6 py-4 text-right border-b border-border min-w-[150px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
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
                                    <tr key={client.id} className="hover:bg-surface-subtle transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center font-bold text-text-primary text-sm">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-text-primary text-sm">{client.name}</span>
                                                    <span className="text-xs text-text-muted flex items-center gap-1.5">
                                                        <Building2 className="w-3 h-3" />
                                                        {client.company}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg text-xs text-text-muted">
                                                <Mail className="w-3.5 h-3.5 opacity-60" />
                                                {client.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => toggleStatus(client)}
                                                disabled={isViewer}
                                            >
                                                <StatusBadge 
                                                    variant={client.status === 'Active' ? 'success' : 'default'}
                                                    className={clsx(
                                                        "px-3 py-0.5",
                                                        !isViewer && "cursor-pointer active:scale-95"
                                                    )}
                                                >
                                                    {client.status}
                                                </StatusBadge>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button 
                                                    onClick={() => handleOpenEdit(client)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="p-1.5 text-text-muted"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    onClick={() => { if (!isViewer) setDeletingClient(client); }}
                                                    disabled={isViewer}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="p-1.5 text-text-muted hover:text-rose-600"
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

                <div className="p-6 bg-surface-subtle/30 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-text-muted text-center md:text-left">
                        Total {clients.length} clients registered.
                    </p>
                    {clients.length > 5 && (
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm">
                                Previous
                            </Button>
                            <Button variant="secondary" size="sm">
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

function StatsCard({ label, value, icon, description }: { label: string; value: number | string; icon: React.ReactNode; description: string }) {
    return (
        <div className="bg-surface-solid p-6 rounded-xl border border-border hover:shadow-md transition-all group relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-surface-subtle flex items-center justify-center border border-border">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xs font-semibold text-text-muted ">{label}</h3>
                    <p className="text-[10px] text-text-muted/60">{description}</p>
                </div>
            </div>
            <p className="text-3xl font-bold text-text-primary tracking-tight">{value}</p>
        </div>
    );
}
