import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
    Check,
    Layout, Users, Target, Info, Clock,
    ChevronDown, Search, RefreshCw
} from 'lucide-react';
import { 
    PageLayout, 
    LoadingState,
} from '../components/ui';
import clsx from 'clsx';

type BudgetType = 'No budget' | 'Total hours' | 'Total amount' | 'Monthly hours' | 'Monthly amount';

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

export function ProjectFormPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');
    const [clientId, setClientId] = useState('');
    const [billable, setBillable] = useState(true);
    const [budgetType, setBudgetType] = useState<BudgetType>('No budget');
    const [budgetLimit, setBudgetLimit] = useState('');
    
    const [status, setStatus] = useState<'Active' | 'Archived' | 'Completed'>('Active');
    const [trackedSeconds, setTrackedSeconds] = useState(0);
    
    // Selection Sets
    const [userIds, setUserIds] = useState<Set<string>>(new Set());
    const [teamIds, setTeamIds] = useState<Set<string>>(new Set());

    // Data Lists
    const [clients, setClients] = useState<Client[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [memberSearch, setMemberSearch] = useState('');

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#f59e0b', '#ef4444', 'var(--color-chart-main)', '#84cc16'];

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [cRes, mRes, tRes] = await Promise.all([
                supabase.from('clients').select('id, name').eq('status', 'Active'),
                supabase.from('members').select('id, full_name, email, role').in('status', ['Active', 'Pending']),
                supabase.from('teams').select('id, name'),
            ]);

            if (cRes.data) setClients(cRes.data);
            if (mRes.data) setAllMembers(mRes.data as Member[]);
            if (tRes.data) setTeams(tRes.data);

            if (isEdit && id) {
                const { data: project, error: pError } = await supabase
                    .from('projects')
                    .select(`
                        *,
                        project_members (member_id),
                        project_teams (team_id)
                    `)
                    .eq('id', id)
                    .single();

                if (pError) throw pError;
                if (project) {
                    setName(project.name);
                    setColor(project.color || '#3b82f6');
                    setClientId(project.client_id || '');
                    setBillable(project.billable);
                    setBudgetType(project.budget_type || 'No budget');
                    setBudgetLimit(project.budget_limit?.toString() || '');
                    setStatus(project.status || 'Active');
                    setTrackedSeconds(project.tracked_seconds || 0);
                    setUserIds(new Set(project.project_members?.map((m: any) => m.member_id) || []));
                    setTeamIds(new Set(project.project_teams?.map((t: any) => t.team_id) || []));
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!name.trim()) {
            setError('Project name is mandatory');
            return;
        }
        setSaving(true);
        setError(null);

        try {
            const payload = {
                name: name.trim(),
                color,
                client_id: clientId || null,
                organization_id: profile?.organization_id ?? null,
                billable,
                budget_type: budgetType,
                budget_limit: budgetLimit ? parseFloat(budgetLimit) : null,
                status,
            };

            let projectId = id;
            if (isEdit) {
                const { error: e } = await supabase.from('projects').update(payload).eq('id', id);
                if (e) throw e;
            } else {
                const { data, error: e } = await supabase.from('projects').insert(payload).select('id').single();
                if (e) throw e;
                projectId = data?.id;
            }

            if (projectId) {
                // Update Members
                await supabase.from('project_members').delete().eq('project_id', projectId);
                if (userIds.size > 0) {
                    await supabase.from('project_members').insert(
                        Array.from(userIds).map(mid => ({ project_id: projectId, member_id: mid }))
                    );
                }

                // Update Teams
                await supabase.from('project_teams').delete().eq('project_id', projectId);
                if (teamIds.size > 0) {
                    await supabase.from('project_teams').insert(
                        Array.from(teamIds).map(tid => ({ project_id: projectId, team_id: tid }))
                    );
                }
            }

            navigate('/dashboard/projects');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingState message="Loading project details..." /></div>;

    const filteredMembers = allMembers.filter(m => 
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <PageLayout
            maxWidth="full"
            title={isEdit ? "Edit Project" : "New Project"}
            description="Configure project settings, budget limits, and team assignments."
            backButton={{ onClick: () => navigate('/dashboard/projects'), label: 'Back to Projects' }}
            actions={
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={clsx(
                            "h-10 px-8 bg-primary text-white rounded-xl font-bold text-[12px] shadow-shell-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none",
                            saving && "animate-pulse"
                        )}
                    >
                        {saving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        {isEdit ? 'Save Changes' : 'Create Project'}
                    </button>
                </div>
            }
        >
            <div className="max-w-6xl mx-auto pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* 🛠️ Main Configuration */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Project Details */}
                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border p-8">
                            <div className="flex items-center gap-6 mb-10">
                                <div 
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-shell-sm shrink-0"
                                    style={{ 
                                        backgroundColor: `${color}10`, 
                                        color,
                                        borderColor: `${color}20` 
                                    }}
                                >
                                    <span className="font-bold text-2xl">{(name || 'P').charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-main tracking-tight">Project Details</h3>
                                    <p className="text-[11px] font-bold text-text-muted mt-1">Basic identification and status</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted ml-1">Project Name</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Website Redesign"
                                        className="w-full px-5 py-3 bg-surface-hover/50 border border-border rounded-xl text-[14px] font-semibold text-text-main outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted ml-1">Client</label>
                                    <div className="relative">
                                        <select 
                                            value={clientId} 
                                            onChange={e => setClientId(e.target.value)}
                                            className="w-full px-5 py-3 bg-surface-hover/50 border border-border rounded-xl text-[14px] font-semibold text-text-main outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner appearance-none cursor-pointer"
                                        >
                                            <option value="">No Client (Internal)</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted ml-1">Status</label>
                                    <div className="relative">
                                        <select 
                                            value={status} 
                                            onChange={e => setStatus(e.target.value as any)}
                                            className="w-full px-5 py-3 bg-surface-hover/50 border border-border rounded-xl text-[14px] font-semibold text-text-main outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner appearance-none cursor-pointer"
                                        >
                                            {['Active', 'Archived', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-5 bg-surface-hover border border-border rounded-xl">
                                    <div>
                                        <span className="text-[13px] font-bold text-text-main block">Billable</span>
                                        <p className="text-[10px] text-text-muted font-bold mt-0.5">Track financial allocation</p>
                                    </div>
                                    <button 
                                        onClick={() => setBillable(!billable)}
                                        className={clsx(
                                            "relative w-12 h-6 rounded-full transition-all duration-300",
                                            billable ? 'bg-primary' : 'bg-slate-300'
                                        )}
                                    >
                                        <div className={clsx(
                                            "absolute top-1 w-4 h-4 bg-surface rounded-full transition-all duration-300 shadow-shell-sm",
                                            billable ? 'left-7' : 'left-1'
                                        )} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-10 pt-8 border-t border-border">
                                <label className="text-[10px] font-bold text-text-muted ml-1 mb-4 block">Project Color</label>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={clsx(
                                                "w-10 h-10 rounded-xl transition-all border-2 flex items-center justify-center",
                                                color === c ? "scale-110 border-slate-900 shadow-shell-md" : "border-transparent hover:scale-105"
                                            )}
                                            style={{ backgroundColor: c }}
                                        >
                                            {color === c && <div className="w-1.5 h-1.5 rounded-full bg-surface shadow-shell-sm" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Budget & Constraints */}
                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border p-8">
                            <div className="flex items-center gap-6 mb-10">
                                <div className="w-12 h-12 rounded-xl bg-main border border-border flex items-center justify-center text-text-muted shadow-shell-sm">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-main tracking-tight">Budget & Constraints</h3>
                                    <p className="text-[11px] font-bold text-text-muted mt-1">Operational limits and tracking</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted ml-1">Budget Type</label>
                                        <div className="relative">
                                            <select 
                                                value={budgetType} 
                                                onChange={e => setBudgetType(e.target.value as BudgetType)}
                                                className="w-full px-5 py-3 bg-surface-hover/50 border border-border rounded-xl text-[14px] font-semibold text-text-main outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner appearance-none cursor-pointer"
                                            >
                                                {['No budget', 'Total hours', 'Total amount', 'Monthly hours', 'Monthly amount'].map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                        </div>
                                    </div>
                                    
                                    {budgetType !== 'No budget' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                            <label className="text-[10px] font-bold text-text-muted ml-1">Budget Limit</label>
                                            <div className="relative">
                                                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <span className="text-text-muted font-bold text-sm">
                                                        {budgetType.includes('amount') ? '$' : <Clock className="w-4 h-4" />}
                                                    </span>
                                                    <div className="w-px h-4 bg-slate-200 mx-1" />
                                                </div>
                                                <input 
                                                    type="number" 
                                                    value={budgetLimit} 
                                                    onChange={e => setBudgetLimit(e.target.value)}
                                                    className="w-full pl-16 pr-5 py-3 bg-surface-hover/50 border border-border rounded-xl text-[16px] font-bold text-text-main outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="bg-surface-hover border border-border rounded-2xl p-6">
                                        <div className="flex items-start gap-4">
                                            <Info className="w-5 h-5 text-text-muted shrink-0 mt-0.5" />
                                            <p className="text-[12px] text-text-muted font-medium leading-relaxed">
                                                Alerts will be sent to project managers when budget utilization reaches <span className="font-bold text-text-main">80% and 100%</span>.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isEdit && (
                                        <div className="p-6 bg-surface border border-border rounded-2xl shadow-shell-sm flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-bold text-text-muted block mb-1">Time Tracked</span>
                                                <div className="flex items-end gap-1.5">
                                                    <span className="text-2xl font-bold text-text-main">{(trackedSeconds / 3600).toFixed(1)}</span>
                                                    <span className="text-[11px] font-bold text-text-muted mb-1">Hours</span>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shadow-shell-sm">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 👥 Assignment Matrix */}
                    <div className="lg:col-span-4 h-fit sticky top-8 space-y-8">
                        <div className="bg-surface rounded-[24px] shadow-shell-sm border border-border overflow-hidden flex flex-col max-h-[800px]">
                            <div className="p-8 border-b border-border shrink-0">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-main border border-border flex items-center justify-center text-text-muted shadow-shell-sm">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-text-main tracking-tight">Members</h3>
                                        <p className="text-[10px] font-bold text-text-muted ">Assign individuals</p>
                                    </div>
                                </div>
                                
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input 
                                        type="text" 
                                        placeholder="Search members..."
                                        value={memberSearch}
                                        onChange={e => setMemberSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-surface-hover/50 border border-border rounded-xl text-[12px] font-semibold text-text-main outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-1.5">
                                {filteredMembers.map(m => {
                                    const isSelected = userIds.has(m.id);
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                const next = new Set(userIds);
                                                if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                                                setUserIds(next);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                                                isSelected 
                                                    ? "bg-slate-900 text-white shadow-shell-md" 
                                                    : "hover:bg-surface-hover text-text-muted border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 text-left">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 transition-all shadow-shell-sm",
                                                    isSelected 
                                                        ? "bg-surface/10 border-white/20 text-white" 
                                                        : "bg-surface border-border text-text-muted"
                                                )}>
                                                    {m.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className={clsx(
                                                        "text-[12px] font-bold leading-none mb-1",
                                                        isSelected ? "text-white" : "text-text-main"
                                                    )}>{m.full_name}</p>
                                                    <p className={clsx(
                                                        "text-[9px] font-bold opacity-60",
                                                        isSelected ? "text-white/70" : "text-text-muted"
                                                    )}>{m.role}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                                isSelected 
                                                    ? "bg-surface border-white text-text-main shadow-shell-sm" 
                                                    : "border-border group-hover:border-slate-300"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 stroke-[4]" />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="p-8 border-t border-border bg-surface-hover/30 shrink-0">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-main border border-border flex items-center justify-center text-text-muted shadow-shell-sm">
                                        <Layout className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-text-muted ">Team Assignment</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {teams.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                const next = new Set(teamIds);
                                                if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                                                setTeamIds(next);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all",
                                                teamIds.has(t.id) 
                                                    ? "bg-surface border-slate-900 text-text-main shadow-shell-sm" 
                                                    : "bg-surface/50 border-border text-text-muted hover:border-slate-200"
                                            )}
                                        >
                                            <span className="text-[12px] font-bold tracking-tight">{t.name}</span>
                                            {teamIds.has(t.id) && <Check className="w-3.5 h-3.5 text-primary" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-rose-50 border border-rose-200 p-6 rounded-[24px] flex items-center gap-4 animate-in slide-in-from-top-2 shadow-shell-sm">
                                <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-shell-sm shrink-0">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold text-rose-500 block mb-0.5">Error</span>
                                    <p className="text-xs font-bold text-rose-900 leading-tight">{error}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
