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
            title="Projects Architecture"
            description="Structural management of client engagements and resource allocation."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        {(['Active', 'Archived'] as ProjectStatus[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                                className={clsx(
                                    "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    {!isViewer && (
                        <Button 
                            onClick={() => navigate('/dashboard/projects/new')} 
                            variant="primary" 
                            className="shadow-sm px-6"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Project
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-6 pb-20">
                
                {/* 📊 KPI Pulse */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatMetric icon={<Briefcase className="w-5 h-5" />} label="Live Portfolio" value={stats.total} sub={`${activeTab} engagements`} />
                    <StatMetric icon={<Building2 className="w-5 h-5" />} label="Client Partners" value={stats.uniqueClients} sub="Distinct organizations" />
                    <StatMetric icon={<Check className="w-5 h-5" />} label="Budget Integrity" value={`${projects.length - stats.overBudget}`} sub="Projects within limits" />
                </div>

                {/* 🏗️ Project Ledger */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                <Search className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="relative group min-w-[320px]">
                                <input
                                    type="text"
                                    placeholder="Search by name or client..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent border-none text-sm font-black text-slate-900 uppercase tracking-tight placeholder:text-slate-300 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-2 mr-2">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                                        {selectedIds.size} Selected
                                    </span>
                                    <button 
                                        onClick={handleBulkArchive}
                                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
                                        title={activeTab === 'Active' ? 'Archive' : 'Restore'}
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <button onClick={() => fetchProjects(true)} className={clsx("p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-slate-500 shadow-sm", refreshing && "animate-spin text-primary")}>
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="pl-10 py-4 w-12">
                                        <button onClick={toggleSelectAll} className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-all", selectedIds.size === filteredProjects.length && filteredProjects.length > 0 ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 hover:border-slate-400")}>
                                            {selectedIds.size === filteredProjects.length && filteredProjects.length > 0 && <Check className="w-3 h-3 stroke-[3]" />}
                                        </button>
                                    </th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Project Context</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Team Density</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Resources</th>
                                    <th className="px-8 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Budget Integrity</th>
                                    <th className="pr-10 py-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProjects.map(p => (
                                    <ProjectRow key={p.id} project={p} isSelected={selectedIds.has(p.id)} onSelect={() => toggleSelect(p.id)} onEdit={() => navigate(`/dashboard/projects/${p.id}/edit`)} isViewer={isViewer} onRefresh={() => fetchProjects(true)} />
                                ))}
                                {filteredProjects.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={6} className="py-24">
                                            <EmptyState icon={<Briefcase />} title="No projects detected" description="Initialize your first project to begin tracking resource allocation." />
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

function ProjectRow({ project, isSelected, onSelect, onEdit, onRefresh, isViewer }: { project: Project; isSelected: boolean; onSelect: () => void; onEdit: () => void; onRefresh: () => void; isHeadsUp?: boolean; isViewer: boolean }) {
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
        if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
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
        <tr className={clsx("group/row transition-all duration-200", isSelected ? "bg-slate-50/50" : "hover:bg-slate-50/30")}>
            <td className="pl-10 py-6">
                <button onClick={onSelect} className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-all", isSelected ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 group-hover/row:border-slate-400")}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center font-black text-lg shrink-0 shadow-sm transition-transform group-hover/row:scale-105" style={{ background: `linear-gradient(135deg, ${project.color}05 0%, ${project.color}20 100%)`, color: project.color, borderColor: `${project.color}30` }}>
                        {(project.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <button onClick={onEdit} className="text-[14px] font-black text-slate-900 hover:text-primary transition-colors truncate block max-w-[200px] tracking-tight uppercase">
                            {project.name}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                            {project.client_name ? (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{project.client_name}</span>
                            ) : (
                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Solo</span>
                            )}
                            {project.billable && (
                                <>
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Billable</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{project.teamCount} Teams</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-5">{project.todoCount} Open Tasks</span>
                </div>
            </td>
            <td className="px-8 py-6 text-center">
                <div className="flex items-center justify-center -space-x-2">
                    {project.memberCount > 0 ? (
                        <>
                            {[0, 1, 2].slice(0, project.memberCount).map((_, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm">
                                    <Users className="w-3.5 h-3.5" />
                                </div>
                            ))}
                            {project.memberCount > 3 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-900 flex items-center justify-center text-[9px] font-black text-white shadow-sm z-10">
                                    +{project.memberCount - 3}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                            <Plus className="w-3 h-3" />
                        </div>
                    )}
                </div>
            </td>
            <td className="px-8 py-6 min-w-[220px]">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <div className="flex items-center gap-1.5">
                            <span className={clsx("text-sm font-black tracking-tight", isOverBudget ? "text-rose-500" : "text-slate-900")}>
                                {trackedHours.toFixed(0)}h
                            </span>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">/ {project.budget_limit || '∞'}h</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={clsx("h-full transition-all duration-1000", isOverBudget ? "bg-rose-500" : "bg-primary")} style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </td>
            <td className="pr-10 py-6 text-right relative" ref={dropRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="p-2 transition-all text-slate-300 hover:text-slate-600">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
                {showMenu && (
                    <div className="absolute right-10 top-14 w-48 bg-white border border-slate-200 shadow-2xl z-50 py-2 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={() => { setShowMenu(false); onEdit(); }} className="w-full px-5 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Details
                        </button>
                        <button onClick={() => { if (!isViewer) { setShowMenu(false); handleArchive(); } }} className={clsx("w-full px-5 py-2.5 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors", isViewer ? "opacity-30 cursor-not-allowed" : "text-slate-600 hover:bg-slate-50")}>
                            <Archive className="w-3.5 h-3.5" /> {project.status === 'Active' ? 'Archive' : 'Restore'}
                        </button>
                        <div className="h-px bg-slate-50 my-1 mx-2" />
                        <button onClick={() => { if (!isViewer) { setShowMenu(false); handleDelete(); } }} className={clsx("w-full px-5 py-2.5 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-colors text-rose-500 hover:bg-rose-50", isViewer ? "opacity-30 cursor-not-allowed" : "")}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}
