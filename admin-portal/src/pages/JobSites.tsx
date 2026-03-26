import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    MapPin, Plus, Search, 
    Map, User, 
    Trash2, ShieldCheck,
    Navigation, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
    PageHeader, Card, Button, StatusBadge, 
    LoadingState, EmptyState, Modal, Input 
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

interface JobSite {
    id: string;
    name: string;
    address: string;
    radius: number;
    assigned_members: number;
    status: 'Active' | 'Inactive';
    created_at: string;
}

export function JobSites() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sites, setSites] = useState<JobSite[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editSite, setEditSite] = useState<JobSite | null>(null);
    const [deletingSite, setDeletingSite] = useState<JobSite | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', address: '', radius: 150 });

    useEffect(() => {
        fetchSites();
    }, []);

    async function fetchSites() {
        setLoading(true);
        const { data, error } = await supabase
            .from('job_sites')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSites(data);
        }
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        
        const payload = {
            name: formData.name,
            address: formData.address,
            radius: formData.radius,
            organization_id: profile?.organization_id
        };

        if (editSite) {
            const { data, error } = await supabase
                .from('job_sites')
                .update(payload)
                .eq('id', editSite.id)
                .select()
                .single();

            if (!error && data) {
                setSites(sites.map(s => s.id === data.id ? data : s));
                handleCloseModal();
            }
        } else {
            const { data, error } = await supabase
                .from('job_sites')
                .insert({ ...payload, status: 'Active', assigned_members: 0 })
                .select()
                .single();

            if (!error && data) {
                setSites([data, ...sites]);
                handleCloseModal();
            }
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!deletingSite) return;
        
        const { error } = await supabase
            .from('job_sites')
            .delete()
            .eq('id', deletingSite.id);

        if (!error) {
            setSites(sites.filter(s => s.id !== deletingSite.id));
            setDeletingSite(null);
        }
    }

    async function toggleStatus(site: JobSite) {
        if (isViewer) return;
        const newStatus = site.status === 'Active' ? 'Inactive' : 'Active';
        const { data, error } = await supabase
            .from('job_sites')
            .update({ status: newStatus })
            .eq('id', site.id)
            .select()
            .single();

        if (!error && data) {
            setSites(sites.map(s => s.id === data.id ? data : s));
        }
    }

    function handleOpenCreate() {
        setEditSite(null);
        setFormData({ name: '', address: '', radius: 150 });
        setShowModal(true);
    }

    function handleOpenEdit(site: JobSite) {
        setEditSite(site);
        setFormData({ name: site.name, address: site.address, radius: site.radius });
        setShowModal(true);
    }

    function handleCloseModal() {
        setShowModal(false);
        setEditSite(null);
        setFormData({ name: '', address: '', radius: 150 });
    }

    const filteredSites = sites.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.address.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-10 max-w-full mx-auto animate-in fade-in duration-700">
            <PageHeader
                title="Job Sites & Geofencing"
                description="Manage operational locations and geofenced boundaries for automated time tracking."
                actions={
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => navigate('/locations')}
                            variant="secondary"
                            className="px-6 py-3.5 shadow-sm"
                        >
                            <Map className="w-4 h-4 mr-2" />
                            Global Map
                        </Button>
                        <Button
                            onClick={handleOpenCreate}
                            disabled={isViewer}
                            variant="primary"
                            className="px-8 py-3.5 scale-105 shadow-xl shadow-primary/20 group"
                        >
                            <Plus className="w-4 h-4 mr-2.5 group-hover:rotate-90 transition-transform" strokeWidth={3} />
                            Deploy New Site
                        </Button>
                    </div>
                }
            />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatsCard 
                    label="Active Locations" 
                    value={sites.filter(s => s.status === 'Active').length} 
                    icon={<Target className="w-5 h-5 text-primary" strokeWidth={2.5} />} 
                    description="Operational geofences"
                />
                <StatsCard 
                    label="Stationed Members" 
                    value={sites.reduce((acc, s) => acc + s.assigned_members, 0)} 
                    icon={<User className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />} 
                    description="Total field personnel"
                />
                <StatsCard 
                    label="Average Coverage" 
                    value={`${sites.length > 0 ? Math.round(sites.reduce((acc, s) => acc + s.radius, 0) / sites.length) : 0}m`} 
                    icon={<Navigation className="w-5 h-5 text-violet-600" strokeWidth={2.5} />} 
                    description="Radius mean across sites"
                />
            </div>

            <Card className="overflow-hidden p-0 border-border/60 shadow-xl">
                {/* Search & Filters */}
                <div className="p-8 border-b border-border bg-surface-subtle/30 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="relative group w-full max-md">
                        <Search className="w-4 h-4 text-text-muted absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" strokeWidth={3} />
                        <input
                            type="text"
                            placeholder="Search site name or address identifier..."
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
                                <th className="pl-12 pr-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border min-w-[350px]">Geographic Designation</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border text-right">Geofence</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border text-right">Stationed</th>
                                <th className="px-6 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono border-b border-border">Status</th>
                                <th className="pl-6 pr-12 py-8 text-right border-b border-border min-w-[150px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-32">
                                        <LoadingState message="Retrieving geographic registry..." />
                                    </td>
                                </tr>
                            ) : filteredSites.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-32">
                                        <EmptyState 
                                            icon={<MapPin className="w-12 h-12 text-text-muted/20" />}
                                            title="No operational sites found" 
                                            description="Your site registry is currently empty or matches no active filters." 
                                            action={!isViewer && (
                                                <Button onClick={handleOpenCreate} variant="secondary" size="sm">
                                                    Deploy First Geofence
                                                </Button>
                                            )}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredSites.map((site) => (
                                    <tr key={site.id} className="hover:bg-primary/[0.01] transition-all group duration-500">
                                        <td className="px-12 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-2xl bg-surface-solid border border-border flex items-center justify-center font-bold text-text-primary text-xl shadow-sm transition-all group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary group-hover:text-white group-hover:border-primary/20 font-mono italic shrink-0">
                                                    <MapPin className="w-6 h-6" />
                                                </div>
                                                <div className="space-y-1 overflow-hidden">
                                                    <div className="font-bold text-text-primary text-lg tracking-tighter group-hover:text-primary transition-colors duration-500 italic truncate">{site.name}</div>
                                                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] font-mono opacity-60 flex items-center gap-2 truncate whitespace-nowrap">
                                                        <Navigation className="w-3 h-3 shrink-0" />
                                                        {site.address}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-subtle border border-border rounded-xl text-[11px] font-bold text-primary font-mono italic shadow-inner">
                                                <Target className="w-3 h-3 opacity-40" />
                                                {site.radius}m
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right font-mono font-bold text-text-primary text-lg">
                                            {site.assigned_members}
                                        </td>
                                        <td className="px-6 py-8">
                                            <button 
                                                onClick={() => toggleStatus(site)}
                                                disabled={isViewer}
                                                className="group/toggle"
                                            >
                                                <StatusBadge 
                                                    variant={site.status === 'Active' ? 'success' : 'default'}
                                                    className={clsx(
                                                        "px-5 py-2 transition-all font-mono italic",
                                                        !isViewer && "cursor-pointer group-hover/toggle:scale-110 active:scale-95 shadow-sm"
                                                    )}
                                                >
                                                    {site.status}
                                                </StatusBadge>
                                            </button>
                                        </td>
                                        <td className="pl-6 pr-12 py-8 text-right">
                                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                                <Button 
                                                    onClick={() => handleOpenEdit(site)}
                                                    variant="secondary"
                                                    size="sm"
                                                    className="p-3 bg-surface-solid rounded-xl hover:bg-primary hover:text-white transition-all shadow-lg active:scale-90"
                                                    title="Configure"
                                                >
                                                    <ShieldCheck className="w-5 h-5 font-bold" strokeWidth={2.5} />
                                                </Button>
                                                <Button 
                                                    onClick={() => { if (!isViewer) setDeletingSite(site); }}
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
                        Total {sites.length} operational sites monitored within the geofencing ecosystem.
                    </p>
                    {sites.length > 5 && (
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
                title={editSite ? 'Update Job Site' : 'Deploy Job Site'}
                subtitle={editSite ? 'Modify existing coordinate parameters' : 'Initialize a new geographic boundary'}
            >
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Input
                        label="Operational Site Name"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Downtown Plaza"
                        leftIcon={<MapPin className="w-4 h-4" />}
                    />
                    <Input
                        label="Physical Address / Coordinates"
                        required
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Commerce St, Suite 100"
                        leftIcon={<Navigation className="w-4 h-4" />}
                    />
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <label className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">
                                Geofence Radius
                            </label>
                            <span className="text-[11px] font-bold text-primary font-mono bg-primary/5 px-3 py-1 rounded-lg">
                                {formData.radius} METERS
                            </span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="1000"
                            step="50"
                            value={formData.radius}
                            onChange={e => setFormData({ ...formData, radius: Number(e.target.value) })}
                            className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-text-muted/40 uppercase tracking-widest font-mono">
                            <span>Precision (50m)</span>
                            <span>Wide (1000m)</span>
                        </div>
                        <p className="text-[10px] font-bold text-text-muted/60 italic leading-relaxed px-1">
                            Personnel will receive tracking prompts upon penetration of this coordinate radius.
                        </p>
                    </div>

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
                            {saving ? 'SAVING...' : (editSite ? 'UPDATE SITE' : 'DEPLOY GEOFENCE')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            {deletingSite && (
                <Modal
                    isOpen={!!deletingSite}
                    onClose={() => setDeletingSite(null)}
                    title="Decommission Site"
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
                                This will permanently dissolve geofence <span className="text-rose-600">"{deletingSite.name.toUpperCase()}"</span>. Automated tracking for this area will be disabled.
                            </p>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button
                                onClick={() => setDeletingSite(null)}
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
                                CONFIRM DECOMMISSION
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
