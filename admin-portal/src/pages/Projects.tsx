import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, Filter, MoreHorizontal,
    Check, Users,
    Trash2, Archive, Pencil,
    Building2, Briefcase, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { 
    Button, 
    Card, 
    PageLayout, 
    EmptyState, 
    LoadingState, 
    StatusBadge
} from '../components/ui';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type ProjectStatus = 'Active' | 'Archived';
type BudgetType = 'No budget' | 'Total hours' | 'Total amount' | 'Monthly hours' | 'Monthly amount';

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
    teamIds: string[];
    created_at: string;
    tracked_seconds?: number; // Added for budget progress
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ─── Components ───────────────────────────────────────────────────────────────

export function Projects() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ProjectStatus>('Active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchProjects();
    }, [activeTab]);

    async function fetchProjects() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    clients (name),
                    project_members (member_id),
                    project_teams (team_id),
                    todos (id)
                `)
                .eq('status', activeTab)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((p: any) => ({
                ...p,
                client_name: p.clients?.name,
                memberCount: p.project_members?.length || 0,
                teamCount: p.project_teams?.length || 0,
                todoCount: p.todos?.length || 0,
                memberIds: p.project_members?.map((m: any) => m.member_id) || [],
                teamIds: p.project_teams?.map((t: any) => t.team_id) || []
            }));

            setProjects(formatted);
        } catch (err) {
            console.error('Fetch projects error:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredProjects = projects.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    function toggleSelectAll() {
        if (selectedIds.size === filteredProjects.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProjects.map(p => p.id)));
        }
    }

    function toggleSelect(id: string) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    async function handleBulkArchive() {
        if (selectedIds.size === 0) return;
        const newStatus = activeTab === 'Active' ? 'Archived' : 'Active';
        setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update({ status: newStatus })
                .in('id', Array.from(selectedIds));
                
            if (error) throw error;
            setSelectedIds(new Set());
            await fetchProjects();
        } catch (err) {
            console.error('Bulk archive error:', err);
            setLoading(false);
        }
    }

    const activeCount = projects.filter(p => p.status === 'Active').length;
    const archivedCount = projects.filter(p => p.status === 'Archived').length;

    return (
        <PageLayout
            title="Projects"
            description="Manage client projects, track budgets, and assign team resources."
            actions={
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-surface-subtle p-1 rounded-lg border border-border shrink-0">
                        {(['Active', 'Archived'] as ProjectStatus[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-xs font-semibold transition-all",
                                    activeTab === tab ? "bg-white text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {tab} ({tab === 'Active' ? activeCount : archivedCount})
                            </button>
                        ))}
                    </div>
                    {!isViewer && (
                        <Button 
                            onClick={() => navigate('/dashboard/projects/new')} 
                            variant="primary" 
                            className="shadow-md active:scale-95 px-8"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Project
                        </Button>
                    )}
                </div>
            }
        >

            <div className="px-10 pb-10 flex-1 overflow-auto custom-scrollbar">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 mb-8">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 w-full lg:w-auto">
                        <div className="relative group lg:w-[400px]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-all duration-300" />
                            <input
                                type="text"
                                placeholder="Search by name or client..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-semibold text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="secondary"
                                leftIcon={<Filter className="w-4 h-4" />}
                                className="text-[11px] font-bold uppercase tracking-widest px-6"
                            >
                                Filters
                            </Button>

                            <div className="h-10 w-px bg-border mx-1" />

                            <div className="flex items-center gap-4">
                                <Button
                                    variant="secondary"
                                    leftIcon={<Archive className="w-4 h-4" />}
                                    disabled={selectedIds.size === 0 || isViewer}
                                    onClick={handleBulkArchive}
                                    className="text-[10px] uppercase tracking-widest px-6"
                                >
                                    {activeTab === 'Active' ? 'Archive Selected' : 'Restore Selected'}
                                </Button>
                                {selectedIds.size > 0 && (
                                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10 uppercase tracking-widest font-mono">
                                        {selectedIds.size} Selected
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <Card noPadding className="border border-border/60 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-border/5">
                                    <th className="pl-10 py-7 w-12 text-center">
                                        <button
                                            onClick={toggleSelectAll}
                                            className={clsx(
                                                "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                                                selectedIds.size === filteredProjects.length && filteredProjects.length > 0
                                                    ? "bg-primary border-primary text-white"
                                                    : "bg-surface-solid border-border hover:border-primary"
                                            )}
                                        >
                                            {selectedIds.size === filteredProjects.length && filteredProjects.length > 0 && <Check className="w-4 h-4 stroke-[4]" />}
                                        </button>
                                    </th>
                                    <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted">Project Detail</th>
                                    <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted">Teams</th>
                                    <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted text-center">Members</th>
                                    <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted">Tasks</th>
                                    <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted">Budget Progress</th>
                                    <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-widest text-text-muted">Limits</th>
                                    <th className="pr-10 py-4 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <LoadingState message="Synchronizing projects..." />
                                        </td>
                                    </tr>
                                ) : filteredProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <EmptyState
                                                icon={<Briefcase className="w-12 h-12" />}
                                                title="No projects detected"
                                                description="Initialize your first project to begin tracking resource allocation."
                                                action={
                                                    <Button variant="primary" onClick={() => navigate('/dashboard/projects/new')}>
                                                        Create Project
                                                    </Button>
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProjects.map(p => (
                                        <ProjectRow
                                            key={p.id}
                                            project={p}
                                            isSelected={selectedIds.has(p.id)}
                                            onSelect={() => toggleSelect(p.id)}
                                            onEdit={() => navigate(`/dashboard/projects/${p.id}/edit`)}
                                            isViewer={isViewer}
                                            onRefresh={fetchProjects}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="mt-8 flex items-center justify-between px-2">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
                        {filteredProjects.length} Project{filteredProjects.length !== 1 ? 's' : ''} total
                    </p>
                </div>
            </div>
        </PageLayout>
    );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ProjectRow({
    project, isSelected, onSelect, onEdit, onRefresh, isViewer
}: {
    project: Project; isSelected: boolean; onSelect: () => void; onEdit: () => void; onRefresh: () => void; isViewer: boolean
}) {
    const { session } = useAuth();
    const [showMenu, setShowMenu] = useState(false);
    const dropRef = useRef<HTMLTableCellElement>(null);

    useEffect(() => {
        function h(e: MouseEvent) { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowMenu(false); }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

    async function handleArchive() {
        try {
            const newStatus = project.status === 'Active' ? 'Archived' : 'Active';
            await fetch(`${API}/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            onRefresh();
        } catch { }
    }

    async function handleDelete() {
        if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
        try {
            await fetch(`${API}/api/projects/${project.id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${session?.access_token}`
                }
            });
            onRefresh();
        } catch { }
    }

    // Budget Progress logic
    const limit = project.budget_limit || 0;
    const trackedHours = (project.tracked_seconds || 0) / 3600;
    const progress = limit > 0 ? Math.min(100, (trackedHours / limit) * 100) : 0;
    const isOverBudget = limit > 0 && trackedHours > limit;

    return (
        <tr className={clsx(
            "group/row border-b border-border transition-all duration-300",
            isSelected ? "bg-primary/[0.02]" : "hover:bg-border/5"
        )}>
            <td className="pl-10 py-5 text-center">
                <button
                    onClick={onSelect}
                    className={clsx(
                        "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                        isSelected 
                            ? "bg-primary border-primary text-white shadow-primary/20" 
                            : "bg-surface-solid border-border group-hover/row:border-primary cursor-pointer"
                    )}
                >
                    {isSelected && <Check className="w-4 h-4 stroke-[4]" />}
                </button>
            </td>
            <td className="px-8 py-8">
                <div className="flex items-center gap-6">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-sm border border-border group-hover/row:scale-105 transition-transform duration-500 font-mono"
                        style={{ 
                            background: `linear-gradient(135deg, ${project.color}05 0%, ${project.color}15 100%)`, 
                            color: project.color,
                            borderColor: `${project.color}20`
                        }}
                    >
                        {(project.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <button onClick={() => onEdit()} className="text-[15px] font-bold text-text-primary hover:text-primary transition-colors truncate block max-w-[250px] tracking-tight mb-1 font-mono">
                            {project.name}
                        </button>
                        <div className="flex items-center gap-2">
                            {project.client_name ? (
                                <StatusBadge variant="default" className="text-[9px] px-2 py-0.5" icon={<Building2 className="w-3 h-3" />}>
                                    {project.client_name}
                                </StatusBadge>
                            ) : (
                                <span className="text-[9px] font-bold text-text-muted/40 uppercase tracking-widest font-mono italic">Independent</span>
                            )}
                            {project.billable && (
                                <StatusBadge variant="success" className="text-[9px] px-2 py-0.5">Billable</StatusBadge>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-8 py-8">
                {project.teamCount > 0 ? (
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {Array.from({ length: Math.min(2, project.teamCount) }).map((_, i) => (
                                <div key={i} className="w-8 h-8 rounded-lg bg-surface-solid border border-border flex items-center justify-center text-[10px] font-bold text-primary font-mono shadow-sm">
                                    <Layers className="w-4 h-4" />
                                </div>
                            ))}
                        </div>
                        <span className="text-[11px] font-bold text-text-primary font-mono ml-1">{project.teamCount} Teams</span>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-text-muted/40 uppercase font-mono tracking-widest">No Teams</span>
                )}
            </td>
            <td className="px-8 py-5 text-center">
                <div className="flex items-center justify-center">
                    <div className="flex items-center -space-x-3">
                        {project.memberCount > 0 ? (
                            <>
                                {Array.from({ length: Math.min(3, project.memberCount) }).map((_, i) => (
                                    <div key={i} className="w-9 h-9 rounded-xl border-2 border-surface-solid bg-surface-solid flex items-center justify-center text-[10px] font-bold text-primary shadow-sm group-hover/row:translate-y-[-2px] transition-transform duration-300 font-mono">
                                        <Users className="w-4 h-4" />
                                    </div>
                                ))}
                                {project.memberCount > 3 && (
                                    <div className="w-9 h-9 rounded-xl border-2 border-surface-solid bg-primary flex items-center justify-center text-[9px] font-bold text-white shadow-sm font-mono z-10">
                                        +{project.memberCount - 3}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-9 h-9 rounded-xl border-2 border-dashed border-border flex items-center justify-center group-hover/row:border-primary/50 transition-colors">
                                <Plus className="w-4 h-4 text-text-muted/40" />
                            </div>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-8 py-8">
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                        project.todoCount > 0 ? "bg-primary/5 text-primary border border-primary/10" : "bg-border/5 text-text-muted/30 border border-border"
                    )}>
                        <Check className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[14px] font-bold text-text-primary leading-none font-mono">{project.todoCount}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1 font-mono">Tasks</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-5 min-w-[200px]">
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono">
                            {trackedHours.toFixed(1)}h <span className="opacity-30">/</span> {project.budget_limit || '∞'}h
                        </span>
                        <span className={clsx(
                            "text-[10px] font-bold font-mono",
                            isOverBudget ? "text-rose-500" : "text-text-primary"
                        )}>
                            {progress.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-border/20 rounded-full overflow-hidden p-[1px]">
                        <div 
                            className={clsx(
                                "h-full transition-all duration-[1500ms] ease-out rounded-full shadow-sm",
                                isOverBudget ? "bg-rose-500" : "bg-primary"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </td>
            <td className="px-8 py-8">
                {project.member_limit ? (
                    <StatusBadge variant="warning" className="text-[9px] px-2 py-0.5">
                        Cap: {project.member_limit}
                    </StatusBadge>
                ) : (
                    <span className="text-[10px] font-bold text-text-muted/40 uppercase font-mono tracking-widest">Global</span>
                )}
            </td>
            <td className="pr-10 py-5 text-right relative" ref={dropRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2.5 bg-surface-solid border border-border rounded-xl text-text-muted hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-90"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMenu && (
                    <div className="absolute right-10 top-16 w-56 bg-surface-solid border border-border shadow-2xl z-20 py-2 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => { setShowMenu(false); onEdit(); }} className="w-full px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-text-muted hover:text-text-primary hover:bg-border/10 flex items-center gap-3 transition-colors font-mono">
                            <Pencil className="w-4 h-4 text-primary" /> {isViewer ? 'View' : 'Edit'}
                        </button>
                        <button 
                            onClick={() => { if (!isViewer) { setShowMenu(false); onEdit(); } }} 
                            className={clsx(
                                "w-full px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors font-mono",
                                isViewer ? "opacity-30 cursor-not-allowed" : "text-text-muted hover:text-text-primary hover:bg-border/10"
                            )}
                        >
                            <Users className="w-4 h-4 text-primary" /> Members
                        </button>
                        <div className="h-px bg-border my-2 mx-3" />
                        <button 
                            onClick={() => { if (!isViewer) { setShowMenu(false); handleArchive(); } }} 
                            className={clsx(
                                "w-full px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors font-mono",
                                isViewer ? "opacity-30 cursor-not-allowed" : "text-text-muted hover:text-text-primary hover:bg-border/10"
                            )}
                        >
                            <Archive className="w-4 h-4 text-primary" /> {project.status === 'Active' ? 'Archive' : 'Restore'}
                        </button>
                        <button 
                            onClick={() => { if (!isViewer) { setShowMenu(false); handleDelete(); } }} 
                            className={clsx(
                                "w-full px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors font-mono text-rose-500 hover:bg-rose-500/10",
                                isViewer ? "opacity-30 cursor-not-allowed" : ""
                            )}
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}


// ProjectModal and related components removed as they are moved to ProjectFormPage.tsx
