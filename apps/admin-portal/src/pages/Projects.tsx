import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Search, Plus, MoreHorizontal,
    Check, Users,
    Trash2, Archive, 
    Building2, Briefcase, Layers,
    RefreshCw, 
    ArrowUpRight
} from 'lucide-react';
import clsx from 'clsx';
import { 
    Button, 
    PageLayout, 
    EmptyState, 
    LoadingState, 
    StatMetric
} from '../components/ui';
import { useNavigate } from 'react-router-dom';

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
    tracked_seconds?: number;
}


export function Projects() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<ProjectStatus>('Active');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchProjects = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        
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
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const filteredProjects = projects.filter(p =>
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProjects.length && filteredProjects.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProjects.map(p => p.id)));
        }
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

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><LoadingState /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Projects"
            description="Manage workspace projects, client allocations, and team assignments."
            actions={
                <div className="flex items-center gap-4">
                    <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
                        {(['Active', 'Archived'] as ProjectStatus[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                                className={clsx(
                                    "px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all",
                                    activeTab === tab 
                                        ? "bg-slate-900 text-white shadow-sm" 
                                        : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    {!isViewer && (
                        <button 
                            onClick={() => navigate('/dashboard/projects/new')} 
                            className="h-10 px-6 bg-primary text-white rounded-xl font-bold text-[12px] shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-8 pb-20">
                
                {/* 📊 KPI Row: Operational Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatMetric 
                        icon={<Briefcase className="w-4 h-4" />} 
                        label="Total Projects" 
                        value={stats.total} 
                        sub={`${activeTab} status`} 
                        accent="primary"
                    />
                    <StatMetric 
                        icon={<Building2 className="w-4 h-4" />} 
                        label="Active Clients" 
                        value={stats.uniqueClients} 
                        sub="Managed entities" 
                        accent="amber"
                    />
                    <StatMetric 
                        icon={<Check className="w-4 h-4" />} 
                        label="In Budget" 
                        value={`${projects.length - stats.overBudget}`} 
                        sub="Operational health" 
                        accent="emerald"
                    />
                    <StatMetric 
                        icon={<Layers className="w-4 h-4" />} 
                        label="Pending Tasks" 
                        value={projects.reduce((acc, p) => acc + p.todoCount, 0)} 
                        sub="Total deliverables" 
                        accent="rose"
                    />
                </div>

                {/* 🏗️ Main Ledger */}
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="relative group/search w-[320px]">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-primary transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search project or client..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-11 pr-5 py-2.5 text-[13px] font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner"
                                />
                            </div>
                            
                            <button 
                                onClick={() => fetchProjects(true)} 
                                className={clsx(
                                    "w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl transition-all",
                                    refreshing ? "text-primary bg-primary/5" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {selectedIds.size > 0 && (
                                <button 
                                    onClick={handleBulkArchive}
                                    className="h-10 px-5 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all hover:brightness-110"
                                >
                                    <Archive className="w-4 h-4" />
                                    {activeTab === 'Active' ? 'Archive' : 'Restore'} ({selectedIds.size})
                                </button>
                            )}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="pl-8 py-4 w-12">
                                        <button 
                                            onClick={toggleSelectAll} 
                                            className={clsx(
                                                "w-5 h-5 rounded-md border flex items-center justify-center transition-all", 
                                                selectedIds.size === filteredProjects.length && filteredProjects.length > 0 
                                                    ? "bg-slate-900 border-slate-900 text-white" 
                                                    : "bg-white border-slate-300 hover:border-primary/40"
                                            )}
                                        >
                                            {selectedIds.size === filteredProjects.length && filteredProjects.length > 0 && <Check className="w-3 h-3 stroke-[3]" />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Team</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget Utilization</th>
                                    <th className="pr-8 py-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProjects.map(p => (
                                    <ProjectRow 
                                        key={p.id} 
                                        project={p} 
                                        isSelected={selectedIds.has(p.id)} 
                                        onSelect={() => toggleSelect(p.id)} 
                                        onEdit={() => navigate(`/dashboard/projects/${p.id}/edit`)} 
                                        isViewer={isViewer} 
                                        onRefresh={() => fetchProjects(true)} 
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
            </div>
        </PageLayout>
    );
}

function ProjectRow({ project, isSelected, onSelect, onEdit, onRefresh, isViewer }: { project: Project; isSelected: boolean; onSelect: () => void; onEdit: () => void; onRefresh: () => void; isViewer: boolean }) {
    const [showMenu, setShowMenu] = useState(false);
    const dropRef = useRef<HTMLTableCellElement>(null);

    useEffect(() => {
        function h(e: MouseEvent) { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowMenu(false); }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

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
    const trackedHours = (project.tracked_seconds || 0) / 3600;
    const progress = limit > 0 ? Math.min(100, (trackedHours / limit) * 100) : 0;
    const isOverBudget = limit > 0 && trackedHours > limit;

    return (
        <tr className={clsx(
            "group/row transition-all", 
            isSelected ? "bg-slate-50" : "hover:bg-slate-50/50"
        )}>
            <td className="pl-8 py-5">
                <button 
                    onClick={onSelect} 
                    className={clsx(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all", 
                        isSelected 
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                            : "bg-white border-slate-300 group-hover/row:border-primary/40"
                    )}
                >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                    <div 
                        className="w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center font-bold text-lg shrink-0 shadow-sm" 
                        style={{ 
                            backgroundColor: `${project.color}10`, 
                            color: project.color,
                            borderColor: `${project.color}20`
                        }}
                    >
                        {(project.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <button 
                            onClick={onEdit} 
                            className="text-[14px] font-bold text-slate-900 hover:text-primary transition-all truncate block max-w-[240px] tracking-tight"
                        >
                            {project.name}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {project.client_name || 'Internal'}
                            </span>
                            {project.billable && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tight">Billable</span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-slate-700">{project.teamCount} Teams</span>
                    </div>
                    <span className="text-[10px] font-bold text-primary/70">{project.todoCount} Tasks</span>
                </div>
            </td>
            <td className="px-6 py-5 text-center">
                <div className="flex items-center justify-center -space-x-2">
                    {project.memberCount > 0 ? (
                        <>
                            {[0, 1, 2].slice(0, project.memberCount).map((_, i) => (
                                <div 
                                    key={i} 
                                    className="w-8 h-8 rounded-lg border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm"
                                >
                                    <Users className="w-3 h-3" />
                                </div>
                            ))}
                            {project.memberCount > 3 && (
                                <div className="w-8 h-8 rounded-lg border-2 border-white bg-slate-900 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                                    +{project.memberCount - 3}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Unassigned</div>
                    )}
                </div>
            </td>
            <td className="px-6 py-5 min-w-[200px]">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                            <span className={clsx("text-[14px] font-bold tracking-tight", isOverBudget ? "text-rose-500" : "text-slate-900")}>
                                {trackedHours.toFixed(1)}h
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">/ {project.budget_limit || '∞'}</span>
                        </div>
                        <span className={clsx("text-[10px] font-bold", isOverBudget ? "text-rose-500" : "text-slate-500")}>
                            {progress.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={clsx(
                                "h-full transition-all duration-1000", 
                                isOverBudget ? "bg-rose-500" : "bg-primary"
                            )} 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>
            </td>
            <td className="pr-8 py-5 text-right relative" ref={dropRef}>
                <button 
                    onClick={() => setShowMenu(!showMenu)} 
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-slate-900 hover:bg-white hover:border hover:border-slate-200 transition-all"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
                {showMenu && (
                    <div className="absolute right-8 top-12 w-48 bg-white shadow-xl z-50 py-2 rounded-xl overflow-hidden border border-slate-200 text-left">
                        <button 
                            onClick={() => { setShowMenu(false); onEdit(); }} 
                            className="w-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-primary flex items-center gap-3 transition-all"
                        >
                            <ArrowUpRight className="w-3.5 h-3.5" /> Edit Project
                        </button>
                        <button 
                            onClick={() => { if (!isViewer) { setShowMenu(false); handleArchive(); } }} 
                            className={clsx(
                                "w-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all", 
                                isViewer ? "opacity-30 cursor-not-allowed" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <Archive className="w-3.5 h-3.5" /> {project.status === 'Active' ? 'Archive' : 'Restore'}
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        <button 
                            onClick={() => { if (!isViewer) { setShowMenu(false); handleDelete(); } }} 
                            className={clsx(
                                "w-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all text-rose-500 hover:bg-rose-50", 
                                isViewer ? "opacity-30 cursor-not-allowed" : ""
                            )}
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}
