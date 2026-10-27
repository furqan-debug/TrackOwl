import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '../lib/projectColors';
import { invalidateProjectsCache } from '../lib/projectsCache';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
    Check, Users, Target, Info, Clock,
    Search, RefreshCw, AlertTriangle,
    Building2, CircleDot, Wallet, Users2
} from 'lucide-react';
import { 
    PageLayout, 
    LoadingState,
    FormSelect,
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
    const [notice, setNotice] = useState<'warning' | 'error'>('error');

    // Form State
    const [name, setName] = useState('');
    const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
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
                    setColor(project.color || DEFAULT_PROJECT_COLOR);
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
            setNotice('error');
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!name.trim()) {
            setNotice('warning');
            setError('Project name is required');
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
                budget_limit: budgetLimit ? Math.max(0, parseFloat(budgetLimit)) : null,
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
                const { error: delMemErr } = await supabase.from('project_members').delete().eq('project_id', projectId);
                if (delMemErr) throw delMemErr;
                
                if (userIds.size > 0) {
                    const { error: insMemErr } = await supabase.from('project_members').insert(
                        Array.from(userIds).map(mid => ({ 
                            project_id: projectId, 
                            member_id: mid,
                            organization_id: profile?.organization_id
                        }))
                    );
                    if (insMemErr) throw insMemErr;
                }

                // Update Teams
                const { error: delTeamErr } = await supabase.from('project_teams').delete().eq('project_id', projectId);
                if (delTeamErr) throw delTeamErr;
                
                if (teamIds.size > 0) {
                    const { error: insTeamErr } = await supabase.from('project_teams').insert(
                        Array.from(teamIds).map(tid => ({ 
                            project_id: projectId, 
                            team_id: tid
                        }))
                    );
                    if (insTeamErr) throw insTeamErr;
                }
            }

            invalidateProjectsCache();
            navigate('/dashboard/projects');
        } catch (err: any) {
            setNotice('error');
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

    const selectAllMembers = () => {
        setUserIds(new Set(allMembers.map(m => m.id)));
    };

    const clearAllMembers = () => {
        setUserIds(new Set());
    };

    return (
        <PageLayout
            maxWidth="wide"
            title={isEdit ? "Edit Project" : "New Project"}
            description={isEdit ? "Update project settings, tracking configuration, and team assignments." : "Set up a new project for time tracking, budgeting, and team assignments."}
            showFavorite={false}
            actions={
                <div className="flex items-center gap-3">
                    {error && (
                        <div
                            className={clsx(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs animate-in fade-in",
                                notice === 'warning'
                                    ? "bg-warning/10 border-warning/30 text-amber-500"
                                    : "bg-error/10 border-error/30 text-rose-500"
                            )}
                        >
                            {notice === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Info className="w-3.5 h-3.5 shrink-0" />}
                            <span>{error}</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/projects')}
                        className="h-10 px-4 rounded-xl border border-border bg-surface text-text-muted hover:text-text-main hover:bg-surface-hover text-xs font-semibold transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={clsx(
                            "h-10 px-6 bg-primary text-white rounded-xl font-semibold text-xs shadow-glow-primary hover:brightness-110 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
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
            <div className="pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* 🛠️ Main Configuration (Left Column) */}
                    <div className="lg:col-span-8 space-y-6">
                        
                        {/* Project Details */}
                        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
                            <div className="flex items-center gap-4 mb-6">
                                <div 
                                    className="w-11 h-11 rounded-xl flex items-center justify-center border font-bold text-lg shrink-0 transition-colors shadow-xs"
                                    style={{ 
                                        backgroundColor: `${color}15`, 
                                        color,
                                        borderColor: `${color}30` 
                                    }}
                                >
                                    {(name || 'P').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-text-main tracking-tight">Project Details</h3>
                                    <p className="text-xs text-text-muted mt-0.5">Basic identification, client association, and status</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-muted">Project Name</label>
                                    <input 
                                        type="text" 
                                        value={name} 
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Website Redesign"
                                        className="w-full h-10 px-3.5 bg-surface border border-border rounded-xl text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-muted/40"
                                    />
                                </div>
                                
                                <FormSelect
                                    label="Client"
                                    value={clientId}
                                    onChange={setClientId}
                                    icon={<Building2 className="w-4 h-4 text-text-muted" />}
                                    options={[
                                        { label: 'No Client (Internal)', value: '' },
                                        ...clients.map(c => ({ label: c.name, value: c.id })),
                                    ]}
                                />

                                <FormSelect
                                    label="Status"
                                    hideScrollbar
                                    value={status}
                                    onChange={(val: string) => setStatus(val as any)}
                                    icon={<CircleDot className="w-4 h-4 text-text-muted" />}
                                    options={['Active', 'Archived', 'Completed'].map(s => ({ label: s, value: s }))}
                                />

                                <div className="flex items-center justify-between p-3.5 bg-surface-subtle border border-border/80 rounded-xl">
                                    <div className="space-y-0.5">
                                        <span className="text-xs font-semibold text-text-main block">Billable Project</span>
                                        <p className="text-[11px] text-text-muted">Track time and financial allocation for billing</p>
                                    </div>
                                    <button 
                                        type="button"
                                        role="switch"
                                        aria-checked={billable}
                                        onClick={() => setBillable(!billable)}
                                        className={clsx(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20",
                                            billable ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                                        )}
                                    >
                                        <span className={clsx(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                                            billable ? 'translate-x-5' : 'translate-x-0'
                                        )} />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-border/70">
                                <label className="text-xs font-medium text-text-muted mb-3 block">Color Accent</label>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    {PROJECT_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={clsx(
                                                "w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer",
                                                color === c 
                                                    ? "ring-2 ring-offset-2 ring-primary scale-110 shadow-xs" 
                                                    : "opacity-80 hover:opacity-100 hover:scale-105"
                                            )}
                                            style={{ backgroundColor: c }}
                                            aria-label={`Select color ${c}`}
                                        >
                                            {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Budget & Constraints */}
                        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs shrink-0">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-text-main tracking-tight">Budget & Constraints</h3>
                                        <p className="text-xs text-text-muted mt-0.5">Operational limits, alerts, and time tracking metrics</p>
                                    </div>
                                </div>

                                {isEdit && (
                                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{(trackedSeconds / 3600).toFixed(1)} hrs tracked</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                                <FormSelect
                                    label="Budget Type"
                                    value={budgetType}
                                    onChange={(val: string) => setBudgetType(val as BudgetType)}
                                    icon={<Wallet className="w-4 h-4 text-text-muted" />}
                                    options={['No budget', 'Total hours', 'Total amount', 'Monthly hours', 'Monthly amount'].map(t => ({ label: t, value: t }))}
                                />
                                
                                {budgetType !== 'No budget' && (
                                    <div className="space-y-1.5 animate-in fade-in duration-200">
                                        <label className="text-xs font-medium text-text-muted">
                                            {budgetType.includes('amount') ? 'Budget Amount ($)' : 'Budget Hours'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-xs flex items-center pointer-events-none">
                                                {budgetType.includes('amount') ? '$' : <Clock className="w-3.5 h-3.5" />}
                                            </div>
                                            <input 
                                                type="number" 
                                                min="0"
                                                step="any"
                                                value={budgetLimit} 
                                                onChange={e => {
                                                    const next = e.target.value;
                                                    if (next === '' || parseFloat(next) >= 0) setBudgetLimit(next);
                                                }}
                                                className="w-full h-10 pl-8 pr-3.5 bg-surface border border-border rounded-xl text-sm font-semibold text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-text-muted/40"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-text-muted flex items-center gap-2 mt-4 pt-4 border-t border-border/70">
                                <Info className="w-3.5 h-3.5 text-text-muted shrink-0" />
                                <span>Automated alerts are dispatched to project managers when budget utilization reaches <strong>80%</strong> and <strong>100%</strong>.</span>
                            </p>
                        </div>
                    </div>

                    {/* 👥 Assignment Matrix (Right Column - Non-Sticky, unified document flow) */}
                    <div className="lg:col-span-4 space-y-6">
                        
                        {/* Members Card */}
                        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Users className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-text-main">Assigned Members</h4>
                                </div>
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border text-text-muted">
                                    {userIds.size} / {allMembers.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input 
                                        type="text" 
                                        placeholder="Search members..."
                                        value={memberSearch}
                                        onChange={e => setMemberSearch(e.target.value)}
                                        className="w-full h-8.5 pl-8.5 pr-3 bg-surface-subtle border border-border/80 rounded-lg text-xs font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted/40"
                                    />
                                </div>
                                {allMembers.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={userIds.size === allMembers.length ? clearAllMembers : selectAllMembers}
                                        className="text-[11px] font-medium text-primary hover:underline px-1 py-1 cursor-pointer shrink-0"
                                    >
                                        {userIds.size === allMembers.length ? 'Clear all' : 'Select all'}
                                    </button>
                                )}
                            </div>

                            <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {filteredMembers.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-text-muted">
                                        No members found
                                    </div>
                                ) : (
                                    filteredMembers.map(m => {
                                        const isSelected = userIds.has(m.id);
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    const next = new Set(userIds);
                                                    if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                                                    setUserIds(next);
                                                }}
                                                className={clsx(
                                                    "w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left border",
                                                    isSelected 
                                                        ? "bg-primary/10 border-primary/25 text-text-main shadow-2xs" 
                                                        : "border-transparent hover:bg-surface-subtle text-text-muted"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={clsx(
                                                        "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                                                        isSelected 
                                                            ? "bg-primary text-white" 
                                                            : "bg-surface-subtle border border-border text-text-muted"
                                                    )}>
                                                        {m.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-semibold text-text-main leading-none truncate mb-0.5">{m.full_name}</p>
                                                        <p className="text-[10px] text-text-muted leading-tight">{m.role}</p>
                                                    </div>
                                                </div>
                                                <div className={clsx(
                                                    "w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all",
                                                    isSelected 
                                                        ? "bg-primary border-primary text-white" 
                                                        : "border-border/80 bg-surface"
                                                )}>
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Teams Card */}
                        <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Users2 className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-text-main">Team Assignment</h4>
                                </div>
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-subtle border border-border text-text-muted">
                                    {teamIds.size} / {teams.length}
                                </span>
                            </div>

                            {teams.length === 0 ? (
                                <p className="text-xs text-text-muted py-3">No teams created yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {teams.map(t => {
                                        const isSelected = teamIds.has(t.id);
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => {
                                                    const next = new Set(teamIds);
                                                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                                                    setTeamIds(next);
                                                }}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                                    isSelected 
                                                        ? "bg-primary/10 border-primary/25 text-text-main shadow-2xs font-semibold" 
                                                        : "bg-surface border-border text-text-muted hover:border-border/80 hover:bg-surface-subtle text-xs font-medium"
                                                )}
                                            >
                                                <span className="text-xs truncate">{t.name}</span>
                                                <div className={clsx(
                                                    "w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ml-2",
                                                    isSelected 
                                                        ? "bg-primary border-primary text-white" 
                                                        : "border-border/80 bg-surface"
                                                )}>
                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* Bottom Action Footer Bar */}
                <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/projects')}
                        className="h-10 px-5 rounded-xl border border-border bg-surface text-text-muted hover:text-text-main hover:bg-surface-hover text-xs font-semibold transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className={clsx(
                            "h-10 px-6 bg-primary text-white rounded-xl font-semibold text-xs shadow-glow-primary hover:brightness-110 active:scale-98 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
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
            </div>
        </PageLayout>
    );
}
