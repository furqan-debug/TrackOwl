import { useEffect, useState, useRef } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, Filter, MoreHorizontal,
    X, Check, Users,
    ChevronDown, Trash2, Archive, Pencil,
    Building2, AlertCircle, Briefcase, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { 
    Button, 
    Card, 
    PageHeader, 
    EmptyState, 
    LoadingState, 
    StatusBadge
} from '../components/ui';

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

interface Client {
    id: string;
    name: string;
}

interface Member {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

interface Team {
    id: string;
    name: string;
}

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ─── Components ───────────────────────────────────────────────────────────────

export function Projects() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ProjectStatus>('Active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [modalInitialTab, setModalInitialTab] = useState<'GENERAL' | 'MEMBERS' | 'BUDGET & LIMITS' | 'TEAMS'>('GENERAL');

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
        <div className="flex flex-col h-full bg-surface-solid/30 min-h-screen">
            <PageHeader
                title="Projects"
                description="Manage active projects and resource allocation"
                icon={<Briefcase className="w-8 h-8" />}
                actions={
                    <Button
                        variant="primary"
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => { if (!isViewer) { setEditingProject(null); setShowModal(true); } }}
                        disabled={isViewer}
                    >
                        Create Project
                    </Button>
                }
                stats={
                    <div className="flex gap-10">
                        {(['Active', 'Archived'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                                className={clsx(
                                    "pb-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative font-mono",
                                    activeTab === tab ? "text-primary" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                {tab} Projects ({tab === 'Active' ? activeCount : archivedCount})
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(80,110,248,0.4)]" />
                                )}
                            </button>
                        ))}
                    </div>
                }
            />

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
                                className="w-full pl-12 pr-6 py-3.5 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-all font-mono"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="secondary"
                                leftIcon={<Filter className="w-4 h-4" />}
                                className="text-[10px] uppercase tracking-widest px-6"
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
                                    <th className="px-8 py-6 text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">Project Detail</th>
                                    <th className="px-8 py-6 text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">Teams</th>
                                    <th className="px-8 py-6 text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono text-center">Members</th>
                                    <th className="px-8 py-6 text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">Tasks</th>
                                    <th className="px-8 py-6 text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">Budget Progress</th>
                                    <th className="px-8 py-6 text-[11px] font-bold uppercase tracking-widest text-text-muted font-mono">Limits</th>
                                    <th className="pr-10 py-7 w-20"></th>
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
                                                    <Button variant="primary" onClick={() => setShowModal(true)}>
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
                                            onEdit={(tab) => { 
                                                setEditingProject(p); 
                                                setModalInitialTab(tab || 'GENERAL');
                                                setShowModal(true); 
                                            }}
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
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">
                        {filteredProjects.length} NODE{filteredProjects.length !== 1 ? 'S' : ''} ACTIVE
                    </p>
                </div>
            </div>

            {/* Project Modal */}
            {showModal && (
                <ProjectModal
                    project={editingProject}
                    initialTab={modalInitialTab}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => { setShowModal(false); fetchProjects(); }}
                />
            )}
        </div>
    );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ProjectRow({
    project, isSelected, onSelect, onEdit, onRefresh, isViewer
}: {
    project: Project; isSelected: boolean; onSelect: () => void; onEdit: (tab?: 'GENERAL' | 'MEMBERS' | 'BUDGET & LIMITS' | 'TEAMS') => void; onRefresh: () => void; isViewer: boolean
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
            <td className="pl-10 py-8 text-center">
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
                        <button onClick={() => onEdit('GENERAL')} className="text-[15px] font-bold text-text-primary hover:text-primary transition-colors truncate block max-w-[250px] tracking-tight mb-1 font-mono">
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
            <td className="px-8 py-8 text-center">
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
            <td className="px-8 py-8 min-w-[200px]">
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
            <td className="pr-10 py-8 text-right relative" ref={dropRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2.5 bg-surface-solid border border-border rounded-xl text-text-muted hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-90"
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>

                {showMenu && (
                    <div className="absolute right-10 top-20 w-56 bg-surface-solid border border-border shadow-2xl z-20 py-2 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => { setShowMenu(false); onEdit('GENERAL'); }} className="w-full px-5 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-text-muted hover:text-text-primary hover:bg-border/10 flex items-center gap-3 transition-colors font-mono">
                            <Pencil className="w-4 h-4 text-primary" /> {isViewer ? 'View' : 'Edit'}
                        </button>
                        <button 
                            onClick={() => { if (!isViewer) { setShowMenu(false); onEdit('MEMBERS'); } }} 
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


// ─── Helpers ──────────────────────────────────────────────────────────────────

function ToggleItem({ label, active, onToggle, hint }: { label: string; active: boolean; onToggle: () => void; hint?: string }) {
    return (
        <div className="flex items-center justify-between py-5 px-4 hover:bg-border/5 transition-colors">
            <div className="flex-1">
                <span className="text-[13px] font-bold text-text-primary tracking-tight block mb-1 font-mono uppercase italic">{label}</span>
                {hint && <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono opacity-60">{hint}</p>}
            </div>
            <button 
                type="button" 
                onClick={onToggle}
                className={clsx(
                    "relative w-11 h-5.5 rounded-full transition-all duration-300 focus:outline-none shadow-sm",
                    active ? 'bg-primary' : 'bg-border/40'
                )}
            >
                <span className={clsx(
                    "absolute top-1 w-3.5 h-3.5 bg-white rounded-full shadow-md transition-all duration-300",
                    active ? 'left-6.5' : 'left-1'
                )} />
            </button>
        </div>
    );
}
  function MemberPicker({ label, description, members, selectedIds, onToggle, memberSearch, color }: {
    label: string; description: string; members: Member[]; selectedIds: Set<string>;
    onToggle: (id: string) => void; memberSearch: string; color: string;
}) {
    const filtered = members.filter(m =>
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className={clsx("text-[10px] font-bold uppercase tracking-[0.2em] font-mono", color)}>{label}</h4>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 font-mono">{description}</p>
                </div>
                <span className="text-[10px] font-bold text-text-muted opacity-50 font-mono">{filtered.length} MEMBERS</span>
            </div>
            <div className="bg-surface-solid border border-border rounded-2xl overflow-hidden shadow-sm">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-border/10 rounded-2xl m-2">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono italic">No members detected in sector</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/20 max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filtered.map(m => {
                            const isSelected = selectedIds.has(m.id);
                            const initials = m.full_name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                            return (
                                <button 
                                    type="button" 
                                    key={m.id} 
                                    onClick={() => onToggle(m.id)}
                                    className={clsx(
                                        "w-full flex items-center justify-between px-5 py-4 transition-all group/member",
                                        isSelected ? "bg-primary/[0.03]" : "bg-surface-solid hover:bg-border/5"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm border border-border transition-all group-hover/member:scale-110",
                                            isSelected ? "bg-primary text-white" : "bg-border/10 text-text-primary"
                                        )}>
                                            {initials}
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-[13px] font-bold text-text-primary leading-none truncate mb-1">{m.full_name}</p>
                                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-tight font-mono truncate">{m.email}</p>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                        isSelected ? "bg-primary border-primary shadow-sm" : "border-border group-hover/member:border-primary/50"
                                    )}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProjectModal({ project, initialTab = 'GENERAL', onClose, onSuccess }: {
    project: Project | null;
    initialTab?: 'GENERAL' | 'MEMBERS' | 'BUDGET & LIMITS' | 'TEAMS';
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'MEMBERS' | 'BUDGET & LIMITS' | 'TEAMS'>(initialTab);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState(project?.name || '');
    const [color, setColor] = useState(project?.color || '#3b82f6');
    const [billable, setBillable] = useState(project?.billable ?? true);
    const [disableActivity, setDisableActivity] = useState(project?.disable_activity ?? false);
    const [allowTracking, setAllowTracking] = useState(project?.allow_tracking ?? true);
    const [disableIdle, setDisableIdle] = useState(project?.disable_idle_time ?? false);
    const [clientId, setClientId] = useState(project?.client_id || '');
    
    // Data Lists
    const [clients, setClients] = useState<Client[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    
    // Selection Sets
    const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
    const [userIds, setUserIds] = useState<Set<string>>(new Set(project?.memberIds || []));
    const [viewerIds, setViewerIds] = useState<Set<string>>(new Set());
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set(project?.teamIds || []));
    
    // Search
    const [memberSearch, setMemberSearch] = useState('');
    const [teamSearch, setTeamSearch] = useState('');
    
    // Budget & Limits
    const [budgetSubTab, setBudgetSubTab] = useState<'project' | 'member'>('project');
    const [budgetType, setBudgetType] = useState<BudgetType>(project?.budget_type || 'No budget');
    const [basedOn, setBasedOn] = useState('Pay rate');
    const [budgetCost, setBudgetCost] = useState(project?.budget_limit?.toString() || '');
    const [budgetNotify, setBudgetNotify] = useState(project?.budget_notifications ?? false);
    const [notifyAt, setNotifyAt] = useState('');
    const [notifyWho, setNotifyWho] = useState('Project members');
    const [stopTimers, setStopTimers] = useState(false);
    const [stopAt, setStopAt] = useState('');
    const [resets, setResets] = useState('Never');
    const [startDate, setStartDate] = useState('');
    const [includeNonBillable, setIncludeNonBillable] = useState(true);
    const [memberLimit, setMemberLimit] = useState(project?.member_limit?.toString() || '');

    const COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f97316','#10b981','#14b8a6','#f59e0b','#ef4444','#6366f1','#84cc16'];

    useEffect(() => {
        async function load() {
            try {
                const [cRes, mRes, tRes] = await Promise.all([
                    supabase.from('clients').select('id, name').eq('status', 'Active'),
                    supabase.from('members').select('id, full_name, email, role').in('status', ['Active','Pending']),
                    supabase.from('teams').select('id, name'),
                ]);
                if (cRes.data) setClients(cRes.data);
                if (mRes.data) setAllMembers(mRes.data as Member[]);
                if (tRes.data) setTeams(tRes.data);
            } catch (err) {
                console.error("Critical: Resource synchronization failure", err);
            }
        }
        load();
    }, []);

    const toggleId = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
        const next = new Set(set); 
        if (next.has(id)) next.delete(id); else next.add(id); 
        setFn(next);
    };

    async function handleSave() {
        if (!name.trim()) { setError('Project name is mandatory'); return; }
        setLoading(true); setError(null);
        try {
            const allMemberIds = [...new Set([...managerIds, ...userIds, ...viewerIds])];
            const payload = {
                name: name.trim(), 
                color, 
                client_id: clientId || null, 
                organization_id: profile?.organization_id ?? null, 
                status: 'Active',
            };
            
            let projectId = project?.id;
            if (project) {
                const { error: e } = await supabase.from('projects').update(payload).eq('id', project.id);
                if (e) throw new Error(e.message);
            } else {
                const { data, error: e } = await supabase.from('projects').insert(payload).select('id').single();
                if (e) throw new Error(e.message);
                projectId = data?.id;
            }
            
            if (projectId) {
                await supabase.from('project_members').delete().eq('project_id', projectId);
                if (allMemberIds.length > 0)
                    await supabase.from('project_members').insert(allMemberIds.map(mid => ({ project_id: projectId, member_id: mid })));
                
                await supabase.from('project_teams').delete().eq('project_id', projectId);
                if (selectedTeamIds.size > 0)
                    await supabase.from('project_teams').insert(Array.from(selectedTeamIds).map(tid => ({ project_id: projectId, team_id: tid })));
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally { setLoading(false); }
    }

    const managers = allMembers.filter(m => m.role === 'Manager' || m.role === 'Admin');
    const users    = allMembers.filter(m => m.role === 'User');
    const viewers  = allMembers.filter(m => m.role === 'Viewer');
    const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()));
    const modalTabs = ['GENERAL', 'MEMBERS', 'BUDGET & LIMITS', 'TEAMS'] as const;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto bg-text-primary/10 animate-in fade-in duration-300 backdrop-blur-sm">
            <div className="bg-surface-solid rounded-[32px] w-full max-w-[620px] shadow-2xl flex flex-col my-auto border border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                
                <div className="px-10 pt-10 pb-0 bg-border/5">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-border shadow-sm transform -rotate-3 hover:rotate-0 transition-transform duration-500 font-mono"
                                style={{ background: `linear-gradient(135deg, ${color}10 0%, ${color}30 100%)`, color, borderColor: `${color}20` }}>
                                <span className="font-bold text-2xl">{(name || 'P').charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary tracking-tighter leading-none mb-2">{project ? 'Update Project' : 'Initialize Project'}</h2>
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono">Mission parameters and resource allocation</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-border/20 hover:bg-border/40 rounded-2xl transition-all text-text-muted hover:text-text-primary shadow-sm active:scale-90"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex gap-2">
                        {modalTabs.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={clsx(
                                    "px-6 py-4 text-[10px] font-bold tracking-[0.2em] relative transition-all rounded-t-2xl font-mono overflow-hidden uppercase",
                                    activeTab === tab 
                                        ? "text-primary bg-surface-solid border-t border-l border-r border-border" 
                                        : "text-text-muted hover:text-text-primary hover:bg-border/10"
                                )}
                            >
                                {tab === 'BUDGET & LIMITS' ? 'QUOTA' : tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_12px_rgba(80,110,248,0.4)]" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-10 py-10 max-h-[65vh] overflow-y-auto custom-scrollbar bg-surface-solid">
                    {activeTab === 'GENERAL' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mb-3 text-primary/60">Project Designation *</label>
                                <input 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="Enter project name..."
                                    className="w-full bg-surface-solid border border-border rounded-2xl px-6 py-4 text-[13px] font-bold text-text-primary focus:border-primary transition-all font-mono placeholder:text-text-muted/20 uppercase" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mb-4 text-primary/60">Aesthetic Token</label>
                                <div className="flex gap-3.5 flex-wrap">
                                    {COLORS.map(c => (
                                        <button key={c} type="button" onClick={() => setColor(c)}
                                            className={clsx(
                                                "w-9 h-9 rounded-xl shadow-sm transition-all relative overflow-hidden border border-white/10",
                                                color===c ? "ring-[3px] ring-primary/30 scale-110 shadow-lg" : "hover:scale-110 grayscale-[30%] hover:grayscale-0"
                                            )}
                                            style={{ background: c }}
                                        >
                                            {color === c && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                                                    <Check className="w-5 h-5 text-white stroke-[4]" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mb-1 text-primary/60">Access & Core Logic</label>
                                <div className="bg-surface-solid border border-border rounded-3xl divide-y divide-border/40 overflow-hidden shadow-sm">
                                    <ToggleItem label="Billable Default" active={billable} onToggle={() => setBillable(!billable)} hint="MARK AS BILLABLE BY DEFAULT" />
                                    <ToggleItem label="Track Activity" active={!disableActivity} onToggle={() => setDisableActivity(!disableActivity)} hint="TELEMETRY CAPTURE ACTIVE" />
                                    <ToggleItem label="Manual Entries" active={allowTracking} onToggle={() => setAllowTracking(!allowTracking)} hint="ALLOW OVERRIDE TIME LOGS" />
                                    <ToggleItem label="Persistence Mode" active={!disableIdle} onToggle={() => setDisableIdle(!disableIdle)} hint="CONTINUE LOGGING DURING IDLE" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mb-3 text-primary/60">Client Affiliation</label>
                                <div className="relative group">
                                    <select 
                                        value={clientId} 
                                        onChange={e => setClientId(e.target.value)}
                                        className="w-full pl-6 pr-12 py-4 bg-surface-solid border border-border rounded-2xl text-[13px] font-bold text-text-primary appearance-none focus:border-primary transition-all font-mono uppercase cursor-pointer"
                                    >
                                        <option value="" className="bg-surface-solid">INDEPENDENT MISSION</option>
                                        {clients.map(c => <option key={c.id} value={c.id} className="bg-surface-solid">{c.name.toUpperCase()}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'MEMBERS' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                                <input 
                                    value={memberSearch} 
                                    onChange={e => setMemberSearch(e.target.value)} 
                                    placeholder="SYNCHRONIZE MEMBERS..."
                                    className="w-full pl-13 pr-6 py-4 bg-surface-solid border border-border rounded-2xl text-[12px] font-bold text-text-primary focus:border-primary transition-all font-mono placeholder:text-text-muted/20 uppercase" 
                                />
                            </div>
                            <div className="space-y-10">
                                <MemberPicker label="EXECUTIVE OVERSEERS" description="Full administrative authority" color="text-purple-500"
                                    members={managers} selectedIds={managerIds} onToggle={id => toggleId(managerIds, setManagerIds, id)} memberSearch={memberSearch} />
                                <MemberPicker label="FIELD OPERATIVES" description="Direct project contribution" color="text-primary"
                                    members={users} selectedIds={userIds} onToggle={id => toggleId(userIds, setUserIds, id)} memberSearch={memberSearch} />
                                <MemberPicker label="ANALYTIC VIEWERS" description="Observation rights only" color="text-emerald-500"
                                    members={viewers} selectedIds={viewerIds} onToggle={id => toggleId(viewerIds, setViewerIds, id)} memberSearch={memberSearch} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'BUDGET & LIMITS' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex p-1.5 bg-border/20 rounded-2xl">
                                {(['project','member'] as const).map(s => (
                                    <button key={s} onClick={() => setBudgetSubTab(s)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all font-mono",
                                            budgetSubTab===s ? "bg-surface-solid text-primary shadow-sm border border-border/40" : "text-text-muted hover:text-text-primary"
                                        )}
                                    >
                                        {s === 'project' ? 'TOTAL CAPACITY' : 'UNIT CONSTRAINTS'}
                                    </button>
                                ))}
                            </div>

                            {budgetSubTab === 'project' && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Metric Type</label>
                                            <div className="relative">
                                                <select 
                                                    value={budgetType} 
                                                    onChange={e => setBudgetType(e.target.value as BudgetType)}
                                                    className="w-full pl-4 pr-10 py-3.5 bg-surface-solid border border-border rounded-2xl text-[12px] font-bold text-text-primary appearance-none focus:border-primary transition-all font-mono uppercase"
                                                >
                                                    {['No budget','Total hours','Total amount','Monthly hours','Monthly amount'].map(t => <option key={t} value={t} className="bg-surface-solid">{t.toUpperCase()}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Rate Hub</label>
                                            <div className="relative">
                                                <select 
                                                    value={basedOn} 
                                                    onChange={e => setBasedOn(e.target.value)}
                                                    className="w-full pl-4 pr-10 py-3.5 bg-surface-solid border border-border rounded-2xl text-[12px] font-bold text-text-primary appearance-none focus:border-primary transition-all font-mono uppercase"
                                                >
                                                    {['Pay rate','Bill rate','Custom'].map(r => <option key={r} value={r} className="bg-surface-solid">{r.toUpperCase()}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Threshold *</label>
                                            <div className="flex bg-surface-solid border border-border rounded-2xl overflow-hidden focus-within:border-primary transition-all group">
                                                <span className="px-4 py-3.5 bg-border/10 text-[11px] font-bold text-primary border-r border-border font-mono">$</span>
                                                <input 
                                                    type="number" 
                                                    value={budgetCost} 
                                                    onChange={e => setBudgetCost(e.target.value)} 
                                                    placeholder="0.00" 
                                                    className="flex-1 min-w-0 bg-transparent px-4 py-3.5 text-[13px] font-bold text-text-primary focus:outline-none font-mono placeholder:text-text-muted/10" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-surface-solid border border-border rounded-[28px] overflow-hidden shadow-sm">
                                        <ToggleItem label="Automatic Alerts" active={budgetNotify} onToggle={() => setBudgetNotify(!budgetNotify)} hint="TRANSMIT STATUS UPDATES" />
                                        {budgetNotify && (
                                            <div className="p-6 border-t border-border/40 animate-in slide-in-from-top-4 duration-300">
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Trigger Point</label>
                                                        <div className="flex bg-surface-solid border border-border rounded-xl overflow-hidden shadow-sm">
                                                            <input type="number" value={notifyAt} onChange={e => setNotifyAt(e.target.value)} placeholder="80" className="flex-1 min-w-0 px-4 py-3 text-[13px] font-bold font-mono focus:outline-none" />
                                                            <span className="px-4 py-3 bg-border/10 text-[9px] font-bold text-text-muted border-l border-border font-mono uppercase">% LOAD</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Target</label>
                                                        <div className="relative">
                                                            <select value={notifyWho} onChange={e => setNotifyWho(e.target.value)}
                                                                className="w-full pl-4 pr-10 py-3 bg-surface-solid border border-border rounded-xl text-[12px] font-bold text-text-primary appearance-none focus:outline-none font-mono uppercase shadow-sm">
                                                                {['Project members','Managers only','Admins only'].map(t => <option key={t} value={t} className="bg-surface-solid">{t.toUpperCase()}</option>)}
                                                            </select>
                                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="border-t border-border/40">
                                            <ToggleItem label="Auto Termination" active={stopTimers} onToggle={() => setStopTimers(!stopTimers)} hint="CEASE OPS AT LIMIT" />
                                            {stopTimers && (
                                                <div className="p-6 border-t border-border/40 animate-in slide-in-from-top-4 duration-300">
                                                    <div className="space-y-3">
                                                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Kill Switch Threshold</label>
                                                        <div className="flex bg-surface-solid border border-border rounded-xl overflow-hidden max-w-[200px] shadow-sm">
                                                            <input type="number" value={stopAt} onChange={e => setStopAt(e.target.value)} placeholder="100" className="flex-1 min-w-0 px-4 py-3 text-[13px] font-bold font-mono focus:outline-none" />
                                                            <span className="px-4 py-3 bg-border/10 text-[9px] font-bold text-text-muted border-l border-border font-mono uppercase">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Reset Cycle</label>
                                            <div className="relative">
                                                <select value={resets} onChange={e => setResets(e.target.value)}
                                                    className="w-full pl-6 pr-12 py-4 bg-surface-solid border border-border rounded-2xl text-[12px] font-bold text-text-primary appearance-none focus:border-primary transition-all font-mono uppercase cursor-pointer">
                                                    {['Never','Weekly','Monthly','Yearly'].map(r => <option key={r} value={r} className="bg-surface-solid">{r.toUpperCase()}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Activation Datum</label>
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                                className="w-full px-6 py-4 bg-surface-solid border border-border rounded-2xl text-[12px] font-bold text-text-primary focus:border-primary transition-all font-mono text-center appearance-none" />
                                        </div>
                                    </div>

                                    <div className="bg-surface-solid border border-border rounded-[28px] overflow-hidden shadow-sm">
                                        <ToggleItem label="Strict Telemetry" active={includeNonBillable} onToggle={() => setIncludeNonBillable(!includeNonBillable)} hint="INCLUDE NON-BILLABLE SESSIONS" />
                                    </div>
                                </div>
                            )}

                            {budgetSubTab === 'member' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex gap-4 p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                                        <AlertCircle className="w-6 h-6 text-primary shrink-0" />
                                        <p className="text-[12px] font-bold text-primary uppercase tracking-wider font-mono leading-relaxed">Establish weekly temporal constraints for all field operatives on this project.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-primary/60">Weekly Hour Ceiling</label>
                                        <div className="relative group">
                                            <input 
                                                type="number" 
                                                value={memberLimit} 
                                                onChange={e => setMemberLimit(e.target.value)} 
                                                placeholder="0.0"
                                                className="w-full bg-surface-solid border border-border rounded-[24px] px-8 py-8 text-3xl font-bold text-primary placeholder:text-text-muted/10 outline-none focus:border-primary transition-all font-mono text-center tracking-tighter" 
                                            />
                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pointer-events-none group-focus-within:text-primary opacity-50 font-mono">
                                                HRS / WK
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'TEAMS' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-6">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
                                    <input 
                                        value={teamSearch} 
                                        onChange={e => setTeamSearch(e.target.value)} 
                                        placeholder="SEARCH TEAM CLUSTERS..."
                                        className="w-full pl-13 pr-6 py-4 bg-surface-solid border border-border rounded-2xl text-[12px] font-bold text-text-primary focus:border-primary transition-all font-mono placeholder:text-text-muted/20 uppercase" 
                                    />
                                </div>
                                {filteredTeams.length > 0 && (
                                    <button 
                                        onClick={() => setSelectedTeamIds(selectedTeamIds.size===filteredTeams.length ? new Set() : new Set(filteredTeams.map(t => t.id)))}
                                        className="text-[10px] font-bold text-primary hover:bg-primary/10 uppercase tracking-[0.2em] font-mono whitespace-nowrap px-6 py-3 border border-primary/20 rounded-xl transition-all active:scale-95 shadow-sm"
                                    >
                                        {selectedTeamIds.size===filteredTeams.length ? 'PURGE ALL' : 'SELECT ALL'}
                                    </button>
                                )}
                            </div>
                            {filteredTeams.length === 0 ? (
                                <div className="py-24 text-center border-2 border-dashed border-border/10 rounded-[32px]">
                                    <div className="w-16 h-16 bg-border/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <Users className="w-8 h-8 text-text-muted/30" />
                                    </div>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono italic">No cluster matches detected</p>
                                </div>
                            ) : (
                                <div className="bg-surface-solid border border-border rounded-[32px] overflow-hidden divide-y divide-border/20 shadow-lg">
                                    {filteredTeams.map(t => {
                                        const isSel = selectedTeamIds.has(t.id);
                                        return (
                                            <button key={t.id} onClick={() => toggleId(selectedTeamIds, setSelectedTeamIds, t.id)}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-8 py-6 transition-all group/team",
                                                    isSel ? "bg-primary/[0.03]" : "bg-surface-solid hover:bg-border/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className={clsx(
                                                        "w-12 h-12 rounded-[18px] flex items-center justify-center font-bold text-[13px] shadow-sm transform transition-all group-hover/team:scale-110 font-mono border border-border/40",
                                                        isSel ? "bg-primary text-white" : "bg-purple-100 text-purple-600"
                                                    )}>
                                                        {t.name.slice(0,2).toUpperCase()}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-base font-bold text-text-primary tracking-tight leading-none block mb-1">{t.name}</span>
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">CLUSTER NODE</span>
                                                    </div>
                                                </div>
                                                <div className={clsx(
                                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    isSel ? "bg-primary border-primary shadow-sm" : "border-border group-hover/team:border-primary/50"
                                                )}>
                                                    {isSel && <Check className="w-4 h-4 text-white stroke-[4]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-10 py-8 border-t border-border bg-border/5 flex items-center justify-between gap-10">
                    <div className="flex-1 min-w-0">
                        {error && (
                            <div className="flex items-center gap-3 text-rose-600 text-[11px] font-bold uppercase tracking-widest font-mono p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl animate-shake">
                                <AlertCircle className="w-5 h-5 shrink-0" /><span className="truncate">{error}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <Button variant="secondary" onClick={onClose} className="px-8 shadow-none border-border">DISMISS</Button>
                        <Button
                            variant={isViewer ? 'secondary' : 'primary'}
                            onClick={handleSave}
                            disabled={loading || isViewer}
                            loading={loading}
                            className="px-12"
                        >
                            {isViewer ? 'READ ONLY' : 'SAVE CHANGES'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Projects;
