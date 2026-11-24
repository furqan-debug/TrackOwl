import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus,
    Check,
    Trash2, Archive,
    Building2, Briefcase, Layers,
    ArrowUpRight,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import {
    PageLayout,
    EmptyState,
    LoadingState,
    StatMetric,
    RowMenu
} from '../components/ui';
import { SecureImage } from '../components/ui/SecureImage';
import { useNavigate } from 'react-router-dom';
import { readProjectsCache, writeProjectsCache, invalidateProjectsCache } from '../lib/projectsCache';

type ProjectStatus = 'Active' | 'Archived';
type BudgetType = 'No budget' | 'Total hours' | 'Total amount' | 'Monthly hours' | 'Monthly amount';

export interface ProjectMemberInfo {
    id: string;
    fullName?: string;
    avatarUrl?: string | null;
}

interface Project {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    color: string;
    client_id?: string;
    client_name?: string;
    billable: boolean;
    disable_activity: boolean;
    allow_tracking: boolean;
    disable_idle_time: boolean;
    budget_type: BudgetType;
    budget_limit: number | null;
    budget_notifications: boolean;
    member_limit: number | null;
    memberCount: number;
    teamCount: number;
    todoCount: number;
    memberIds: string[];
    members?: ProjectMemberInfo[];
    teamIds: string[];
    created_at: string;
    tracked_seconds?: number;
}


// Module-level cache
// The cache lives in lib/projectsCache so the project form can invalidate it.

export function Projects() {
    const { profile, managedProjectIds, isRep } = useAuth();
    const isViewer = profile?.role === 'Viewer' || profile?.role === 'User' || profile?.role === 'Client';
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ProjectStatus>('Active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchProjects = useCallback(async (isSilent = false, forceRefresh = false) => {
        const cacheKey = `${profile?.id}_${activeTab}`;
        const cached = forceRefresh ? null : readProjectsCache(cacheKey);
        if (cached) {
            setProjects(cached);
            setLoading(false);
            return;
        }

        // isSilent means no loader: a refresh behind the scenes, after an
        // archive or a delete, should not blank the table.
        if (!isSilent) setLoading(true);

        try {
            let query = supabase
                .from('projects')
                .select(`
                    *,
                    clients (name),
                    project_members (
                        member_id,
                        members (id, full_name, avatar_url)
                    ),
                    project_teams (team_id),
                    todos (id)
                `)
                .eq('status', activeTab)
                .order('created_at', { ascending: false });
                
            const isScoped = (profile?.role === 'Manager' || profile?.role === 'Client' || isRep) && managedProjectIds !== null;
            if (isScoped) {
                if (managedProjectIds && managedProjectIds.length > 0) {
                    query = query.in('id', managedProjectIds);
                } else {
                    query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
                }
            }

            const { data, error } = await query;

            if (error) throw error;

            const formatted = (data || []).map((p: any) => {
                const members: ProjectMemberInfo[] = (p.project_members || [])
                    .map((pm: any) => ({
                        id: pm.member_id || pm.members?.id,
                        fullName: pm.members?.full_name,
                        avatarUrl: pm.members?.avatar_url
                    }))
                    .filter((m: any) => Boolean(m.id));

                return {
                    ...p,
                    client_name: p.clients?.name,
                    memberCount: Math.max(p.project_members?.length || 0, members.length),
                    teamCount: p.project_teams?.length || 0,
                    todoCount: p.todos?.length || 0,
                    memberIds: members.map((m: any) => m.id),
                    members,
                    teamIds: p.project_teams?.map((t: any) => t.team_id) || []
                };
            });

            setProjects(formatted);

            writeProjectsCache(cacheKey, formatted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, profile?.id, profile?.role, isRep, managedProjectIds]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const filteredProjects = projects.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Paging, the same as the People page: 20 rows to start, 10 / 20 / 50 to choose from.
    const [requestedPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);
    const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));

    // Another tab or a new search starts again on page 1.
    const pagingKey = `${activeTab}|${searchQuery}`;
    const [pagedFor, setPagedFor] = useState(pagingKey);
    if (pagedFor !== pagingKey) {
        setPagedFor(pagingKey);
        setCurrentPage(1);
    }

    // Fewer rows (after archiving, say): stay on the last page that still exists.
    const currentPage = Math.min(requestedPage, totalPages);

    const pagedProjects = filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const pageNumbers = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages: (number | string)[] = [1];
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
        return pages;
    }, [totalPages, currentPage]);

    const scrollToPageTop = () => {
        const mainEl = document.querySelector('main');
        if (mainEl) {
            mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageChange = (newPage: number) => {
        if (newPage === currentPage) return;
        setCurrentPage(newPage);
        scrollToPageTop();
    };

    const handlePageSizeChange = (newSize: number) => {
        if (newSize === pageSize) return;
        setPageSize(newSize);
        setCurrentPage(1);
        scrollToPageTop();
    };

    // The header checkbox covers the rows you can see, so a bulk archive never
    // reaches projects on another page.
    const allOnPageSelected = pagedProjects.length > 0 && pagedProjects.every(p => selectedIds.has(p.id));

    const toggleSelectAll = () => {
        const next = new Set(selectedIds);
        if (allOnPageSelected) {
            pagedProjects.forEach(p => next.delete(p.id));
        } else {
            pagedProjects.forEach(p => next.add(p.id));
        }
        setSelectedIds(next);
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    async function handleBulkArchive() {
        if (selectedIds.size === 0 || isViewer) return;
        const newStatus = activeTab === 'Active' ? 'Archived' : 'Active';
        setLoading(true);
        try {
            await supabase.from('projects').update({ status: newStatus }).in('id', Array.from(selectedIds));
            setSelectedIds(new Set());
            invalidateProjectsCache();
            await fetchProjects();
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }

    const stats = useMemo(() => {
        const total = projects.length;
        const overBudget = projects.filter(p => ((p.tracked_seconds || 0) / 3600) > (p.budget_limit || Infinity)).length;
        const uniqueClients = new Set(projects.map(p => p.client_id).filter(Boolean)).size;

        return { total, overBudget, uniqueClients };
    }, [projects]);

    return (
        <PageLayout
            maxWidth="full"
            eyebrow="PORTFOLIO & ASSETS"
            title="Projects"
            description={isRep ? "Projects and allocations assigned to you." : "Strategic oversight of workspace projects and team allocations."}
            actions={
                <div className="flex items-center gap-4">
                    <div className="bg-surface border border-border p-1.5 rounded-2xl flex items-center shadow-shell-sm">
                        {(['Active', 'Archived'] as ProjectStatus[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                                className={clsx(
                                    "px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                                    activeTab === tab
                                        ? "bg-[var(--text-main)] text-[var(--bg-surface)] shadow-shell-sm"
                                        : "text-text-muted hover:text-text-main hover:bg-surface-hover"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    {!isViewer && (
                        <button
                            onClick={() => navigate('/dashboard/projects/new')}
                            className="h-12 px-8 bg-primary text-white rounded-xl font-bold text-[14px] shadow-shell-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <Plus className="w-5 h-5" />
                            New Project
                        </button>
                    )}
                </div>
            }
        >
            {/* Inside the layout, not in place of it: the heading and the toolbar
                stay put while the content area loads. */}
            {loading ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                    <LoadingState />
                </div>
            ) : (
                <div className="flex flex-col gap-8 pb-20">

                    {/* KPI Row: Operational Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
                        <StatMetric
                            icon={<Briefcase className="w-5 h-5" />}
                            label="Total Projects"
                            value={stats.total}
                            sub={`${activeTab} status`}
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Building2 className="w-5 h-5" />}
                            label="Active Clients"
                            value={stats.uniqueClients}
                            sub="Managed entities"
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Check className="w-5 h-5" />}
                            label="In Budget"
                            value={`${projects.length - stats.overBudget}`}
                            sub="Operational health"
                            accent="brand-gradient"
                        />
                        <StatMetric
                            icon={<Layers className="w-5 h-5" />}
                            label="Pending Tasks"
                            value={projects.reduce((acc, p) => acc + p.todoCount, 0)}
                            sub="Total deliverables"
                            accent="brand-gradient"
                        />
                    </div>

                    {/* 🏗️ Main Ledger */}
                    <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="relative group/search w-[420px]">
                                    <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search project or client..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-surface-hover/50 border border-border rounded-2xl pl-14 pr-6 py-4 text-[15px] font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner"
                                    />
                                </div>

                            </div>

                            <div className="flex items-center gap-3">
                                {selectedIds.size > 0 && (
                                    <button
                                        onClick={handleBulkArchive}
                                        className="h-10 px-5 bg-slate-900 text-white rounded-xl text-[11px] font-bold flex items-center gap-2 shadow-shell-sm transition-all hover:brightness-110"
                                    >
                                        <Archive className="w-4 h-4" />
                                        {activeTab === 'Active' ? 'Archive' : 'Restore'} ({selectedIds.size})
                                    </button>
                                )}
                                
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[720px]">
                                <thead>
                                    <tr className="bg-surface-hover/50 border-b border-border">
                                        <th className="pl-8 py-3 w-10">
                                            <button
                                                onClick={toggleSelectAll}
                                                className={clsx(
                                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                                    allOnPageSelected
                                                        ? "bg-slate-900 border-slate-900 text-white"
                                                        : "bg-surface border-border hover:border-primary/40"
                                                )}
                                            >
                                                {allOnPageSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-600 tracking-[0.2em] min-w-[220px]">Project</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-600 tracking-[0.2em] whitespace-nowrap min-w-[160px]">Tracking</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-600 tracking-[0.2em] text-center whitespace-nowrap min-w-[80px]">Team</th>
                                        <th className="px-6 py-4 text-[11px] font-semibold text-slate-600 tracking-[0.2em] whitespace-nowrap min-w-[200px]">Budget & Configuration</th>
                                        <th className="pr-8 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {pagedProjects.map(p => (
                                        <ProjectRow
                                            key={p.id}
                                            project={p}
                                            isSelected={selectedIds.has(p.id)}
                                            onSelect={() => toggleSelect(p.id)}
                                            onEdit={() => navigate(`/dashboard/projects/${p.id}/edit`)}
                                            isViewer={isViewer}
                                            onRefresh={() => { invalidateProjectsCache(); fetchProjects(true); }}
                                        />
                                    ))}
                                    {filteredProjects.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="py-24">
                                                <EmptyState
                                                    icon={<Briefcase className="w-6 h-6" />}
                                                    title="No Projects Found"
                                                    description="Refine your search or create a new project to get started."
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {filteredProjects.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                            {/* Left: Summary & Segmented Page Size Control */}
                            <div className="flex flex-wrap items-center gap-4 text-[12px] text-text-muted">
                                <span>
                                    Showing{' '}
                                    <strong className="text-text-main font-semibold tabular-nums">
                                        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredProjects.length)}
                                    </strong>{' '}
                                    of{' '}
                                    <strong className="text-text-main font-semibold tabular-nums">{filteredProjects.length}</strong>{' '}
                                    projects
                                </span>

                                {filteredProjects.length > 10 && (
                                    <div className="flex items-center gap-2 pl-3 border-l border-border/80">
                                        <span className="text-[11px] font-medium text-text-muted">Rows:</span>
                                        <div className="inline-flex items-center bg-surface border border-border rounded-xl p-0.5 shadow-shell-sm">
                                            {[10, 20, 50].map(sz => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    onClick={() => handlePageSizeChange(sz)}
                                                    className={clsx(
                                                        "px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums transition-all cursor-pointer",
                                                        pageSize === sz
                                                            ? "bg-primary text-white shadow-shell-sm"
                                                            : "text-text-muted hover:text-text-main hover:bg-surface-hover"
                                                    )}
                                                >
                                                    {sz}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Prev, Page Numbers, Next */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-surface text-[12px] font-bold text-text-muted hover:bg-surface-hover hover:text-text-main hover:border-border/80 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-shell-sm cursor-pointer"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span>Prev</span>
                                </button>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        {pageNumbers.map((pg, idx) =>
                                            pg === '...' ? (
                                                <span key={`ellipsis-${idx}`} className="w-7 text-center text-xs font-bold text-text-muted select-none">
                                                    …
                                                </span>
                                            ) : (
                                                <button
                                                    key={pg}
                                                    type="button"
                                                    onClick={() => handlePageChange(pg as number)}
                                                    className={clsx(
                                                        "w-9 h-9 rounded-xl text-[12px] font-bold tabular-nums transition-all flex items-center justify-center cursor-pointer shadow-shell-sm",
                                                        currentPage === pg
                                                            ? "bg-primary text-white font-black shadow-md"
                                                            : "bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text-main hover:border-border/80"
                                                    )}
                                                >
                                                    {pg}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-surface text-[12px] font-bold text-text-muted hover:bg-surface-hover hover:text-text-main hover:border-border/80 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-shell-sm cursor-pointer"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </PageLayout>
    );
}

const avatarColors = [
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
    { bg: 'bg-emerald-100',text: 'text-emerald-700'},
    { bg: 'bg-amber-100',  text: 'text-amber-700'  },
    { bg: 'bg-rose-100',   text: 'text-rose-700'   },
    { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
    { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700'},
    { bg: 'bg-orange-100', text: 'text-orange-700' },
];

function getAvatarColor(seed: string) {
    const hash = (seed || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return avatarColors[hash % avatarColors.length];
}

function getInitials(nameOrEmail?: string) {
    if (!nameOrEmail) return '?';
    const clean = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
    const parts = clean.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
}

function MemberAvatarItem({ member }: { member: ProjectMemberInfo }) {
    const c = getAvatarColor(member.fullName || member.id);
    const initials = getInitials(member.fullName || member.id);

    return (
        <div
            key={member.id}
            title={member.fullName || undefined}
            className={clsx(
                "w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold shadow-sm ring-1 ring-black/5 overflow-hidden shrink-0",
                c.bg, c.text
            )}
        >
            {member.avatarUrl ? (
                <SecureImage
                    path={member.avatarUrl}
                    bucket="avatars"
                    alt={member.fullName || 'Member'}
                    className="w-full h-full object-cover"
                    fallback={<span>{initials}</span>}
                />
            ) : (
                <span>{initials}</span>
            )}
        </div>
    );
}

function ProjectRow({ project, isSelected, onSelect, onEdit, onRefresh, isViewer }: { project: Project; isSelected: boolean; onSelect: () => void; onEdit: () => void; onRefresh: () => void; isViewer: boolean }) {
    async function handleArchive() {
        try {
            const newStatus = project.status === 'Active' ? 'Archived' : 'Active';
            await supabase.from('projects').update({ status: newStatus }).eq('id', project.id);
            onRefresh();
        } catch { }
    }

    async function handleDelete() {
        if (!confirm('Delete this project?')) return;
        try {
            await supabase.from('projects').delete().eq('id', project.id);
            onRefresh();
        } catch { }
    }

    const limit = project.budget_limit || 0;

    return (
        <tr 
            onClick={onEdit}
            className={clsx(
                "group/row transition-all cursor-pointer",
                isSelected ? "bg-surface-hover" : "hover:bg-surface-hover/50"
            )}
        >
            <td className="pl-8 py-3" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className={clsx(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        isSelected
                            ? "bg-[var(--text-main)] border-[var(--text-main)] text-[var(--bg-surface)] shadow-shell-sm"
                            : "bg-surface border-border group-hover/row:border-primary/40"
                    )}
                >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
            </td>
            <td className="px-6 py-3">
                <div className="flex items-center gap-4">
                    <div
                        className="w-11 h-11 rounded-2xl border border-border flex items-center justify-center font-bold text-lg shrink-0 shadow-shell-sm transition-all duration-300 group-hover/row:scale-110"
                        style={{
                            backgroundColor: `${project.color}10`,
                            color: project.color,
                            borderColor: `${project.color}20`
                        }}
                    >
                        {(project.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="text-[18px] font-bold text-text-main hover:text-primary transition-all truncate block max-w-[280px] tracking-tight"
                            >
                                {project.name}
                            </button>
                            <div className="flex items-center gap-3">
                                <span className="text-[13px] font-bold text-slate-500 ">
                                    {project.client_name || 'Internal'}
                                </span>
                                {project.billable && (
                                    <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 tracking-tight">Billable Asset</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-3">
                <div className="h-10 flex flex-col justify-center gap-1.5 whitespace-nowrap">
                    <div className="flex items-start gap-2">
                        {project.allow_tracking ? (
                            <span className="text-[12px] font-bold text-emerald-500 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md tracking-tight">Tracking Enabled</span>
                        ) : (
                            <span className="text-[12px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md tracking-tight">Tracking Disabled</span>
                        )}
                    </div>
                    {project.allow_tracking && !project.disable_idle_time && (
                        <span className="text-[12px] font-bold text-slate-500 tracking-tight">Idle tracking active</span>
                    )}
                </div>
            </td>
            <td className="px-6 py-3 text-center">
                <div className="h-10 flex items-center justify-center">
                    {(project.memberCount || 0) > 0 ? (
                        <div className="flex items-center gap-2">
                            {/* Overlapping avatar stack — up to 3 */}
                            <div className="flex -space-x-2">
                                {((project.members && project.members.length > 0)
                                    ? project.members
                                    : project.memberIds.map(id => ({ id }))
                                ).slice(0, 3).map((m) => (
                                    <MemberAvatarItem key={m.id} member={m} />
                                ))}
                            </div>
                            {/* +N overflow pill */}
                            {project.memberCount > 3 && (
                                <span className="text-[11px] font-bold text-slate-500">
                                    +{project.memberCount - 3}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="text-[11px] font-bold text-slate-500 italic">Unassigned</div>
                    )}
                </div>
            </td>
            <td className="px-6 py-3 min-w-[200px]">
                <div className="h-10 flex flex-col justify-center gap-1 whitespace-nowrap">
                    <span className="text-[13px] font-bold text-text-main">
                        {project.budget_type && project.budget_type !== 'No budget' ? project.budget_type : 'No budget limits'}
                    </span>
                    {limit > 0 && project.budget_type && project.budget_type !== 'No budget' && (
                        <span className="text-[12px] font-bold text-slate-500 tracking-tight">
                            Limit: <span className="text-primary">{limit}</span> {project.budget_type.includes('hours') ? 'hrs' : project.budget_type.includes('amount') ? 'USD' : ''}
                        </span>
                    )}
                    {project.budget_notifications && (
                        <span className="text-[11px] font-bold text-[var(--chart-gold)] tracking-tight">Alerts enabled</span>
                    )}
                </div>
            </td>
            <td className="pr-8 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <RowMenu
                    items={[
                        {
                            label: 'Edit Project',
                            icon: <ArrowUpRight className="w-4 h-4 text-text-muted" />,
                            onClick: onEdit,
                        },
                        {
                            label: project.status === 'Active' ? 'Archive' : 'Restore',
                            icon: <Archive className="w-4 h-4 text-text-muted" />,
                            onClick: handleArchive,
                            disabled: isViewer,
                        },
                        {
                            label: 'Delete',
                            icon: <Trash2 className="w-4 h-4" />,
                            onClick: handleDelete,
                            danger: true,
                            disabled: isViewer,
                        },
                    ]}
                />
            </td>
        </tr>
    );
}
