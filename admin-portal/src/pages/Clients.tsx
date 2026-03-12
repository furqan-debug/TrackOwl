import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Search, MoreHorizontal, Building2, Mail, CircleDot, X, Loader2, Plus, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
        
        if (editClient) {
            const { data, error } = await supabase
                .from('clients')
                .update({
                    name: formData.name,
                    email: formData.email,
                    company: formData.company,
                })
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
                .insert({
                    name: formData.name,
                    email: formData.email,
                    company: formData.company,
                    status: 'Active'
                })
                .select()
                .single();

            if (!error && data) {
                setClients([data, ...clients]);
                handleCloseModal();
            }
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this client? This will remove all associations with projects.')) return;
        
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (!error) {
            setClients(clients.filter(c => c.id !== id));
        }
    }

    async function toggleStatus(client: Client) {
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
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            {/* Header Area */}
            <div className="flex justify-between items-end mb-8 relative z-20">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Clients</h1>
                    <p className="text-slate-500">Manage your business partners and associate them with projects.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleOpenCreate}
                        disabled={isViewer}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-sm ${isViewer ? 'bg-slate-300 text-slate-100 cursor-not-allowed grayscale opacity-60 shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        <Plus className="w-4 h-4" />
                        Add Client
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-colors">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Clients</p>
                        <p className="text-3xl font-bold text-slate-800">{loading ? '-' : clients.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:border-emerald-200 transition-colors">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Accounts</p>
                        <p className="text-3xl font-bold text-slate-800">{loading ? '-' : clients.filter(c => c.status === 'Active').length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CircleDot className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:border-purple-200 transition-colors">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Recent Partners</p>
                        <p className="text-3xl font-bold text-slate-800">
                            {loading ? '-' : clients.filter(c => {
                                const created = new Date(c.created_at).getTime();
                                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                                return created > thirtyDaysAgo;
                            }).length}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Globe className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div className="relative w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search clients, companies, emails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-slate-200 rounded-lg text-sm px-3 py-2 bg-white text-slate-700 outline-none hover:bg-slate-50"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr className="border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client Name & Company</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Email</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Status</th>
                                <th className="px-6 py-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center text-slate-500">
                                        Loading clients...
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4 border border-slate-100">
                                            <Building2 className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 mb-1">No clients found</h3>
                                        <p className="text-slate-500 text-sm">Add a new client to start associating them with your projects.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{client.name}</div>
                                                    <div className="text-sm text-slate-500 tracking-tight">{client.company}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Mail className="w-4 h-4 text-slate-400" />
                                                {client.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => !isViewer && toggleStatus(client)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity ${client.status === 'Active'
                                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                                    : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20'
                                                } ${isViewer ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}>
                                                <CircleDot className={`w-3 h-3 ${client.status === 'Active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                {client.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleOpenEdit(client)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title={isViewer ? "View Details" : "Edit Client"}
                                                >
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => { if (!isViewer) handleDelete(client.id); }}
                                                    disabled={isViewer}
                                                    className={`p-1.5 rounded-lg transition-colors ${isViewer ? 'text-slate-200 cursor-default' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    title={isViewer ? "Read-only" : "Delete Client"}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Client Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col scale-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {editClient ? <MoreHorizontal className="w-5 h-5 text-blue-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
                                {editClient ? 'Edit Client' : 'Add New Client'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. John Doe"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@example.com"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || isViewer}
                                    className={`px-5 py-2 font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isViewer ? 'bg-slate-400 text-slate-100 grayscale opacity-60 shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isViewer ? 'Read-only' : (editClient ? 'Update Client' : 'Add Client')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
