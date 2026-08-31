import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Search,
    Building2,
    Mail,
    Plus,
    Globe,
    Trash2,
    Edit,
    Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    PageLayout,
    Button,
    StatusBadge,
    LoadingState,
    EmptyState,
    Modal,
    Input,
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

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: ''
    });

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

        if (isViewer) return;

        setSaving(true);

        const payload = {
            name: formData.name,
            email: formData.email,
            company: formData.company,
            organization_id: profile?.organization_id
        };

        try {
            if (editClient) {
                const { data, error } = await supabase
                    .from('clients')
                    .update(payload)
                    .eq('id', editClient.id)
                    .select()
                    .single();

                if (!error && data) {
                    setClients(prev =>
                        prev.map(client =>
                            client.id === data.id ? data : client
                        )
                    );

                    handleCloseModal();
                }
            } else {
                const { data, error } = await supabase
                    .from('clients')
                    .insert({
                        ...payload,
                        status: 'Active'
                    })
                    .select()
                    .single();

                if (!error && data) {
                    // Send invite email asynchronously
                    supabase.functions
                        .invoke('send-invite-email', {
                            body: {
                                email: data.email,
                                role: 'Client',
                                admin_portal_url: window.location.origin
                            }
                        })
                        .catch(err => {
                            console.error(
                                'Error invoking send-invite-email function:',
                                err
                            );
                        });

                    setClients(prev => [data, ...prev]);
                    handleCloseModal();
                }
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deletingClient || isViewer) return;

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', deletingClient.id);

        if (!error) {
            setClients(prev =>
                prev.filter(client => client.id !== deletingClient.id)
            );

            setDeletingClient(null);
        }
    }

    async function toggleStatus(client: Client) {
        if (isViewer) return;

        const newStatus =
            client.status === 'Active' ? 'Inactive' : 'Active';

        const { data, error } = await supabase
            .from('clients')
            .update({
                status: newStatus
            })
            .eq('id', client.id)
            .select()
            .single();

        if (!error && data) {
            // Keep matching member account status in sync
            await supabase
                .from('members')
                .update({
                    status: newStatus
                })
                .eq('email', client.email);

            setClients(prev =>
                prev.map(c =>
                    c.id === data.id ? data : c
                )
            );
        }
    }

    function handleOpenCreate() {
        setEditClient(null);

        setFormData({
            name: '',
            email: '',
            company: ''
        });

        setShowModal(true);
    }

    function handleOpenEdit(client: Client) {
        setEditClient(client);

        setFormData({
            name: client.name,
            email: client.email,
            company: client.company
        });

        setShowModal(true);
    }

    function handleCloseModal() {
        setShowModal(false);
        setEditClient(null);

        setFormData({
            name: '',
            email: '',
            company: ''
        });
    }

    const filteredClients = clients.filter(client => {
        const query = searchTerm.toLowerCase().trim();

        const matchesSearch =
            client.name.toLowerCase().includes(query) ||
            client.company.toLowerCase().includes(query) ||
            client.email.toLowerCase().includes(query);

        const matchesStatus =
            statusFilter === 'All' ||
            client.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <PageLayout
            title="Clients"
            description="Manage your client database and business relationships."
            actions={
                <div className="w-full sm:w-auto min-w-0">
                    <Button
                        onClick={handleOpenCreate}
                        disabled={isViewer}
                        variant="primary"
                        className="
                            w-full sm:w-auto
                            h-11 sm:h-12
                            px-5 sm:px-8
                            rounded-xl
                            font-bold
                            text-[13px] sm:text-[14px]
                            flex items-center justify-center
                            gap-2 sm:gap-3
                            shadow-shell-sm
                            whitespace-nowrap
                        "
                    >
                        <Plus className="w-5 h-5 shrink-0" />
                        Add Client
                    </Button>
                </div>
            }
        >
            <div className="w-full min-w-0 flex flex-col gap-6 sm:gap-8 pb-16 sm:pb-20">

                {/* =========================================================
                    KPI GRID
                ========================================================== */}
                <div
                    className="
                        w-full
                        min-w-0
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        lg:grid-cols-3
                        gap-4
                        sm:gap-6
                        lg:gap-8
                    "
                >
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
                        value={
                            clients.filter(
                                client => client.status === 'Active'
                            ).length
                        }
                        sub="Currently active"
                        accent="brand-gradient"
                    />

                    <StatMetric
                        icon={<Globe className="w-5 h-5" />}
                        label="Recent"
                        value={
                            clients.filter(client => {
                                const created =
                                    new Date(client.created_at).getTime();

                                const thirtyDaysAgo =
                                    Date.now() -
                                    30 * 24 * 60 * 60 * 1000;

                                return created > thirtyDaysAgo;
                            }).length
                        }
                        sub="Last 30 days"
                        accent="brand-gradient"
                    />
                </div>

                {/* =========================================================
                    MAIN LEDGER
                ========================================================== */}
                <div
                    className="
                        w-full
                        min-w-0
                        bg-surface
                        rounded-2xl sm:rounded-[24px]
                        shadow-shell-sm
                        border border-border
                        overflow-hidden
                        flex flex-col
                    "
                >
                    {/* =====================================================
                        SEARCH + FILTERS
                    ====================================================== */}
                    <div
                        className="
                            w-full
                            min-w-0
                            px-4 sm:px-6 lg:px-8
                            py-4 sm:py-5 lg:py-6
                            border-b border-border
                            flex flex-col
                            lg:flex-row
                            gap-4
                            items-stretch
                            lg:items-center
                            justify-between
                            bg-surface
                        "
                    >
                        {/* Search */}
                        <div
                            className="
                                relative
                                group/search
                                w-full
                                min-w-0
                                lg:max-w-[420px]
                            "
                        >
                            <Search
                                className="
                                    w-5 h-5
                                    absolute
                                    left-4 sm:left-5
                                    top-1/2
                                    -translate-y-1/2
                                    text-text-muted
                                    group-focus-within/search:text-primary
                                    transition-colors
                                    pointer-events-none
                                "
                            />

                            <input
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={e =>
                                    setSearchTerm(e.target.value)
                                }
                                className="
                                    w-full
                                    min-w-0
                                    h-11 sm:h-12
                                    pl-12 sm:pl-14
                                    pr-4 sm:pr-6
                                    bg-surface-solid
                                    border border-border
                                    rounded-xl
                                    text-[13px] sm:text-[14px]
                                    font-medium
                                    text-text-main
                                    placeholder:text-text-muted/60
                                    outline-none
                                    focus:border-primary
                                    shadow-shell-sm
                                    focus:shadow-shell
                                    transition-all
                                    duration-300
                                "
                            />
                        </div>

                        {/* Status Filters */}
                        <div
                            className="
                                w-full
                                min-w-0
                                lg:w-auto
                                overflow-x-auto
                                custom-scrollbar
                            "
                        >
                            <div
                                className="
                                    w-max
                                    min-w-full
                                    lg:min-w-0
                                    bg-surface
                                    border border-border
                                    p-1
                                    sm:p-1.5
                                    rounded-xl sm:rounded-2xl
                                    flex items-center
                                    shadow-shell-sm
                                "
                            >
                                {['All', 'Active', 'Inactive'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() =>
                                            setStatusFilter(status)
                                        }
                                        className={clsx(
                                            `
                                                flex-1 lg:flex-none
                                                whitespace-nowrap
                                                px-4 sm:px-6
                                                py-2 sm:py-2.5
                                                rounded-lg sm:rounded-xl
                                                text-[12px] sm:text-[13px]
                                                font-bold
                                                transition-all
                                            `,
                                            statusFilter === status
                                                ? 'bg-slate-900 text-white shadow-shell-sm'
                                                : 'text-text-muted hover:text-slate-900 hover:bg-surface-hover'
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* =====================================================
                        TABLE
                    ====================================================== */}
                    <div
                        className="
                            w-full
                            min-w-0
                            overflow-x-auto
                            custom-scrollbar
                        "
                    >
                        <table
                            className="
                                w-full
                                min-w-[760px]
                                text-left
                                border-collapse
                            "
                        >
                            <thead>
                                <tr className="bg-surface-hover/50 border-b border-border">
                                    <th className="pl-5 sm:pl-8 pr-5 sm:pr-8 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-text-muted tracking-[0.15em] sm:tracking-[0.2em] uppercase">
                                        Client
                                    </th>

                                    <th className="px-5 sm:px-8 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-text-muted tracking-[0.15em] sm:tracking-[0.2em] uppercase">
                                        Email
                                    </th>

                                    <th className="px-5 sm:px-8 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-text-muted tracking-[0.15em] sm:tracking-[0.2em] uppercase">
                                        Status
                                    </th>

                                    <th className="pr-5 sm:pr-8 py-4 sm:py-6 text-[10px] sm:text-[11px] font-bold text-text-muted tracking-[0.15em] sm:tracking-[0.2em] uppercase text-right min-w-[150px]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-20 text-center text-text-muted"
                                        >
                                            <LoadingState message="Loading clients..." />
                                        </td>
                                    </tr>
                                ) : filteredClients.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="py-16 sm:py-20"
                                        >
                                            <EmptyState
                                                icon={
                                                    <Building2 className="w-10 h-10 sm:w-12 sm:h-12 text-text-muted/20" />
                                                }
                                                title="No clients found"
                                                description="Your client list is currently empty."
                                                action={
                                                    !isViewer && (
                                                        <Button
                                                            onClick={
                                                                handleOpenCreate
                                                            }
                                                            variant="secondary"
                                                            size="sm"
                                                        >
                                                            Add First Client
                                                        </Button>
                                                    )
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map(client => (
                                        <tr
                                            key={client.id}
                                            className="
                                                hover:bg-surface-hover/50
                                                transition-all
                                                group
                                            "
                                        >
                                            {/* CLIENT */}
                                            <td className="pl-5 sm:pl-8 pr-5 sm:pr-8 py-4 sm:py-5">
                                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                                    <div
                                                        className="
                                                            w-10 h-10
                                                            sm:w-14 sm:h-14
                                                            rounded-xl sm:rounded-2xl
                                                            border border-border
                                                            bg-primary/5
                                                            text-primary
                                                            border-primary/10
                                                            flex items-center justify-center
                                                            font-bold
                                                            text-base sm:text-xl
                                                            shrink-0
                                                            shadow-shell-sm
                                                            transition-all
                                                            duration-300
                                                            group-hover:scale-105
                                                        "
                                                    >
                                                        {client.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div
                                                        className="
                                                            min-w-0
                                                            flex flex-col
                                                            gap-1 sm:gap-2
                                                        "
                                                    >
                                                        <span
                                                            className="
                                                                text-[14px]
                                                                sm:text-[18px]
                                                                font-bold
                                                                text-text-main
                                                                tracking-tight
                                                                break-words
                                                                max-w-[220px]
                                                                sm:max-w-[300px]
                                                            "
                                                        >
                                                            {client.name}
                                                        </span>

                                                        <span
                                                            className="
                                                                text-[11px]
                                                                sm:text-[13px]
                                                                font-bold
                                                                text-text-muted
                                                                flex
                                                                items-center
                                                                gap-1.5
                                                                min-w-0
                                                            "
                                                        >
                                                            <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />

                                                            <span className="truncate max-w-[180px] sm:max-w-[260px]">
                                                                {client.company}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* EMAIL */}
                                            <td className="px-5 sm:px-8 py-4 sm:py-5">
                                                <div className="min-h-[48px] sm:h-14 flex items-center">
                                                    <div
                                                        className="
                                                            inline-flex
                                                            max-w-full
                                                            items-center
                                                            gap-2
                                                            px-3 sm:px-4
                                                            py-2
                                                            bg-surface
                                                            border border-border
                                                            rounded-xl
                                                            text-[11px] sm:text-[13px]
                                                            font-semibold
                                                            text-text-muted
                                                            shadow-shell-sm
                                                        "
                                                    >
                                                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted/60 shrink-0" />

                                                        <span className="truncate max-w-[220px] sm:max-w-[300px]">
                                                            {client.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* STATUS */}
                                            <td className="px-5 sm:px-8 py-4 sm:py-5">
                                                <div className="h-12 sm:h-14 flex items-center">
                                                    <button
                                                        onClick={() =>
                                                            toggleStatus(client)
                                                        }
                                                        disabled={isViewer}
                                                    >
                                                        <StatusBadge
                                                            variant={
                                                                client.status ===
                                                                'Active'
                                                                    ? 'success'
                                                                    : 'default'
                                                            }
                                                            className={clsx(
                                                                `
                                                                    px-3
                                                                    py-1
                                                                    text-[11px]
                                                                    sm:text-[12px]
                                                                    font-bold
                                                                    rounded-lg
                                                                    border
                                                                `,
                                                                !isViewer &&
                                                                    'cursor-pointer active:scale-95 transition-all'
                                                            )}
                                                        >
                                                            {client.status}
                                                        </StatusBadge>
                                                    </button>
                                                </div>
                                            </td>

                                            {/* ACTIONS */}
                                            <td className="pr-5 sm:pr-8 py-4 sm:py-5 text-right">
                                                <div
                                                    className="
                                                        h-12 sm:h-14
                                                        flex items-center
                                                        justify-end
                                                        gap-1.5 sm:gap-2
                                                        opacity-100
                                                        lg:opacity-0
                                                        lg:group-hover:opacity-100
                                                        transition-all
                                                    "
                                                >
                                                    <Button
                                                        onClick={() =>
                                                            handleOpenEdit(
                                                                client
                                                            )
                                                        }
                                                        variant="ghost"
                                                        size="sm"
                                                        className="
                                                            w-8 h-8
                                                            sm:w-9 sm:h-9
                                                            p-0
                                                            rounded-lg
                                                            text-text-muted
                                                            hover:text-primary
                                                            hover:bg-surface-hover
                                                            hover:border
                                                            hover:border-slate-200
                                                            flex
                                                            items-center
                                                            justify-center
                                                            transition-all
                                                        "
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>

                                                    <Button
                                                        onClick={() => {
                                                            if (!isViewer) {
                                                                setDeletingClient(
                                                                    client
                                                                );
                                                            }
                                                        }}
                                                        disabled={isViewer}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="
                                                            w-8 h-8
                                                            sm:w-9 sm:h-9
                                                            p-0
                                                            rounded-lg
                                                            text-text-muted
                                                            hover:text-rose-600
                                                            hover:bg-rose-50
                                                            flex
                                                            items-center
                                                            justify-center
                                                            transition-all
                                                        "
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

                    {/* =====================================================
                        FOOTER
                    ====================================================== */}
                    <div
                        className="
                            px-4 sm:px-6 lg:px-8
                            py-4 sm:py-6
                            border-t border-border
                            flex flex-col
                            sm:flex-row
                            items-center
                            justify-between
                            gap-4
                            bg-surface
                            shrink-0
                        "
                    >
                        <p className="text-[11px] sm:text-[13px] font-semibold text-text-muted text-center sm:text-left">
                            Total {clients.length} clients registered.
                        </p>

                        {clients.length > 5 && (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="
                                        flex-1 sm:flex-none
                                        rounded-xl
                                        px-4 py-2
                                        font-bold
                                        text-[12px] sm:text-[13px]
                                    "
                                >
                                    Previous
                                </Button>

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="
                                        flex-1 sm:flex-none
                                        rounded-xl
                                        px-4 py-2
                                        font-bold
                                        text-[12px] sm:text-[13px]
                                    "
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* =============================================================
                CREATE / EDIT MODAL
            ============================================================== */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={editClient ? 'Edit Client' : 'Add Client'}
                subtitle={
                    editClient
                        ? 'Update client details and information'
                        : 'Create a new client record'
                }
            >
                <form
                    onSubmit={handleSubmit}
                    className="w-full min-w-0 space-y-5 sm:space-y-6"
                >
                    <Input
                        label="Client Name"
                        required
                        value={formData.name}
                        onChange={e =>
                            setFormData({
                                ...formData,
                                name: e.target.value
                            })
                        }
                        placeholder="e.g., Jane Cooper"
                        leftIcon={
                            <Building2 className="w-4 h-4" />
                        }
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        required
                        value={formData.email}
                        onChange={e =>
                            setFormData({
                                ...formData,
                                email: e.target.value
                            })
                        }
                        placeholder="e.g., jane@example.com"
                        leftIcon={
                            <Mail className="w-4 h-4" />
                        }
                    />

                    <Input
                        label="Company Name"
                        required
                        value={formData.company}
                        onChange={e =>
                            setFormData({
                                ...formData,
                                company: e.target.value
                            })
                        }
                        placeholder="e.g., Acme Inc"
                        leftIcon={
                            <Globe className="w-4 h-4" />
                        }
                    />

                    {/* Modal Actions */}
                    <div
                        className="
                            pt-3 sm:pt-4
                            flex
                            flex-col-reverse
                            sm:flex-row
                            gap-2.5 sm:gap-3
                            w-full
                        "
                    >
                        <Button
                            type="button"
                            onClick={handleCloseModal}
                            variant="secondary"
                            className="
                                flex-1
                                min-w-0
                                h-11
                            "
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={saving || isViewer}
                            variant="primary"
                            className="
                                flex-1
                                min-w-0
                                h-11
                            "
                        >
                            {saving
                                ? 'Saving...'
                                : editClient
                                    ? 'Save Changes'
                                    : 'Add Client'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* =============================================================
                DELETE MODAL
            ============================================================== */}
            {deletingClient && (
                <Modal
                    isOpen={!!deletingClient}
                    onClose={() => setDeletingClient(null)}
                    title="Delete Client"
                    subtitle="Are you sure you want to remove this client?"
                    maxWidth="max-w-md"
                >
                    <div className="w-full min-w-0 text-center space-y-5 sm:space-y-6">
                        <div
                            className="
                                w-14 h-14
                                sm:w-16 sm:h-16
                                bg-rose-50
                                text-rose-500
                                rounded-2xl
                                flex items-center justify-center
                                mx-auto
                                border border-rose-100
                            "
                        >
                            <Trash2 className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>

                        <div className="space-y-2">
                            <p
                                className="
                                    text-[13px]
                                    sm:text-sm
                                    text-text-secondary
                                    leading-relaxed
                                    break-words
                                "
                            >
                                This will permanently remove{' '}
                                <span className="font-bold text-text-primary break-words">
                                    "{deletingClient.name}"
                                </span>
                                . This action cannot be undone.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                flex-col-reverse
                                sm:flex-row
                                gap-2.5 sm:gap-3
                                pt-3 sm:pt-4
                            "
                        >
                            <Button
                                onClick={() =>
                                    setDeletingClient(null)
                                }
                                variant="secondary"
                                className="flex-1 min-w-0 h-11"
                            >
                                Cancel
                            </Button>

                            <Button
                                onClick={handleDelete}
                                variant="danger"
                                className="
                                    flex-1
                                    min-w-0
                                    h-11
                                    shadow-shell-sm
                                    shadow-rose-100
                                "
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
