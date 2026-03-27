import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
    X, Check, ChevronLeft, Save, 
    Building2, Layouts, Users, Target, Info
} from 'lucide-react';
import { 
    Button, 
    Card, 
    PageLayout, 
    LoadingState,
    StatusBadge
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
    
    // Selection Sets
    const [userIds, setUserIds] = useState<Set<string>>(new Set());
    const [teamIds, setTeamIds] = useState<Set<string>>(new Set());

    // Data Lists
    const [clients, setClients] = useState<Client[]>([]);
    const [allMembers, setAllMembers] = useState<Member[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [memberSearch, setMemberSearch] = useState('');

    const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#84cc16'];

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
                status: 'Active',
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

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingState message="Synchronizing project parameters..." /></div>;

    const filteredMembers = allMembers.filter(m => 
        m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <PageLayout
            title={isEdit ? "Update Project" : "Initialize Project"}
            description="Adjust mission parameters and resource allocation"
            backButton={{ onClick: () => navigate('/dashboard/projects'), label: 'Back to Projects' }}
            actions={
                <Button 
                    variant="primary" 
                    onClick={handleSave} 
                    loading={saving}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="px-8 shadow-lg shadow-primary/20"
                >
                    {isEdit ? 'Save Changes' : 'Create Project'}
                </Button>
            }
        >
            <div className="max-w-5xl mx-auto pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Core Info */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="p-8 border-border/60 shadow-sm overflow-visible">
                            <div className="flex items-center gap-6 mb-8">
                                <div 
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center border border-border shadow-sm transform -rotate-2 font-mono"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`, 
                                        color,
                                        borderColor: `${color}20` 
                                    }}
                                >
                                    <span className="font-bold text-2xl">{(name || 'P').charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-text-primary tracking-tight mb-1">General Configuration</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Standard identity and billing parameters</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Project Brand Name</label>
                                        <input 
                                            type="text" 
                                            value={name} 
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Enter project designation..."
                                            className="w-full px-5 py-3.5 bg-surface-subtle border border-border rounded-xl text-sm font-semibold text-text-primary outline-none focus:border-primary transition-all placeholder:opacity-30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Associated Client</label>
                                        <select 
                                            value={clientId} 
                                            onChange={e => setClientId(e.target.value)}
                                            className="w-full px-5 py-3.5 bg-surface-subtle border border-border rounded-xl text-sm font-semibold text-text-primary outline-none focus:border-primary transition-all appearance-none"
                                        >
                                            <option value="">Independent / Internal</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Aesthetic Token</label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={clsx(
                                                    "w-10 h-10 rounded-xl transition-all duration-300 border-2 flex items-center justify-center",
                                                    color === c ? "scale-110 border-primary shadow-lg" : "border-transparent hover:scale-105"
                                                )}
                                                style={{ backgroundColor: c }}
                                            >
                                                {color === c && <Check className="w-5 h-5 text-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/40">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-bold text-text-primary block">Billable Default</span>
                                            <p className="text-[11px] text-text-muted font-medium mt-1">Mark all time entries as billable by default</p>
                                        </div>
                                        <button 
                                            onClick={() => setBillable(!billable)}
                                            className={clsx(
                                                "relative w-12 h-6 rounded-full transition-all duration-300",
                                                billable ? 'bg-primary' : 'bg-border'
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                                billable ? 'left-7' : 'left-1'
                                            )} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-8 border-border/60 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary tracking-tight">Resource Budgeting</h3>
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest font-mono">Control allocation limits and oversight</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Budget Type</label>
                                        <select 
                                            value={budgetType} 
                                            onChange={e => setBudgetType(e.target.value as BudgetType)}
                                            className="w-full px-5 py-3.5 bg-surface-subtle border border-border rounded-xl text-sm font-semibold text-text-primary outline-none focus:border-primary transition-all"
                                        >
                                            {['No budget', 'Total hours', 'Total amount', 'Monthly hours', 'Monthly amount'].map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {budgetType !== 'No budget' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2">
                                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Limit Value</label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                                                    {budgetType.includes('amount') ? '$' : 'H'}
                                                </span>
                                                <input 
                                                    type="number" 
                                                    value={budgetLimit} 
                                                    onChange={e => setBudgetLimit(e.target.value)}
                                                    className="w-full pl-10 pr-5 py-3.5 bg-surface-subtle border border-border rounded-xl text-sm font-semibold text-text-primary outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-primary/[0.02] border border-primary/5 rounded-2xl p-6 flex items-start gap-4">
                                    <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs text-text-muted leading-relaxed">
                                        Budget notifications will be dispatched to project managers when the utilization threshold reaches 80% and 100%.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Assignments */}
                    <div className="space-y-8">
                        <Card className="p-8 border-border/60 shadow-sm flex flex-col h-fit max-h-[1000px]">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary tracking-tight">Team Access</h3>
                            </div>
                            
                            <div className="relative mb-6">
                                <input 
                                    type="text" 
                                    placeholder="Search members..."
                                    value={memberSearch}
                                    onChange={e => setMemberSearch(e.target.value)}
                                    className="w-full pl-5 pr-5 py-3 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary outline-none focus:border-primary transition-all"
                                />
                            </div>

                            <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
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
                                                isSelected ? "bg-primary/5 text-primary" : "hover:bg-surface-subtle text-text-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 text-left">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 transition-transform group-hover:scale-105",
                                                    isSelected ? "bg-primary text-white border-primary shadow-sm" : "bg-white border-border text-text-muted"
                                                )}>
                                                    {m.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-xs font-bold leading-none mb-1">{m.full_name}</p>
                                                    <p className="text-[10px] opacity-60 font-mono tracking-tight">{m.role}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-primary border-primary shadow-sm" : "border-border"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white stroke-[4]" />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-border/40">
                                <div className="flex items-center gap-3 mb-4">
                                    <Layouts className="w-4 h-4 text-text-muted" />
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Global Teams</span>
                                </div>
                                <div className="space-y-2">
                                    {teams.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                const next = new Set(teamIds);
                                                if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                                                setTeamIds(next);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                                                teamIds.has(t.id) ? "bg-white border-primary text-primary shadow-sm" : "bg-surface-subtle border-transparent text-text-muted hover:border-border"
                                            )}
                                        >
                                            <span className="text-xs font-bold">{t.name}</span>
                                            {teamIds.has(t.id) && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {error && (
                    <div className="mt-8 bg-rose-500/5 border border-rose-500/10 p-6 rounded-[24px] flex items-center gap-4 animate-in slide-in-from-top-4">
                        <StatusBadge variant="danger">System Error</StatusBadge>
                        <p className="text-xs font-bold text-rose-600 uppercase tracking-widest font-mono">{error}</p>
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
