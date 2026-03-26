import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Users, Search, Trash2, Shield, LayoutGrid, List,
    UsersRound, Plus, Pencil, Check,
    Briefcase, Info, User
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { 
    PageLayout, Card, Button, Input, Modal, 
    StatusBadge, EmptyState, LoadingState 
} from '../components/ui';

interface LeadPermissions {
    approve_timesheets: boolean;
    approve_time_modifications: boolean;
    approve_time_off: boolean;
    create_schedules: boolean;
    manage_projects: boolean;
    edit_roles: boolean;
    view_activity: boolean;
    manage_financials: boolean;
    receive_notifications: boolean;
}


interface Team {
    id: string;
    name: string;
    description: string;
    manager_id: string | null;
    manager_name?: string;
    member_count: number;
    created_at: string;
}

interface Member {
    id: string;
    full_name: string;
    email: string;
}

interface Project {
    id: string;
    name: string;
}

export function Teams() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const [teams, setTeams] = useState<Team[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal / Wizard states
    const [showModal, setShowModal] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [leadPermissions, setLeadPermissions] = useState<Record<string, LeadPermissions>>({});
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
    const [allProjects, setAllProjects] = useState<Project[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [
                { data: teamsData, error: tErr }, 
                { data: membersData, error: mErr },
                { data: projectsData, error: pErr }
            ] = await Promise.all([
                supabase.from('teams').select(`
                    *, 
                    members!teams_manager_id_fkey(full_name), 
                    team_members(member_id, is_lead),
                    project_teams(project_id)
                `).order('created_at', { ascending: false }),
                supabase.from('members').select('id, full_name, email').eq('status', 'Active'),
                supabase.from('projects').select('id, name').eq('status', 'Active')
            ]);
            if (tErr) throw tErr;
            if (mErr) throw mErr;
            if (pErr) throw pErr;

            const formattedTeams = (teamsData || []).map(t => ({
                ...t,
                manager_name: t.members?.full_name,
                member_count: t.team_members?.length || 0,
                memberIds: t.team_members?.map((tm: any) => tm.member_id) || [],
                leadIds: t.team_members?.filter((tm: any) => tm.is_lead).map((tm: any) => tm.member_id) || [],
                projectIds: t.project_teams?.map((pt: any) => pt.project_id) || []
            }));

            setTeams(formattedTeams);
            setMembers(membersData || []);
            setAllProjects(projectsData || []);
        } catch (e) {
            console.error('Fetch teams error:', e);
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingTeam(null);
        setName('');
        setDescription('');
        setSelectedMemberIds(new Set());
        setSelectedLeadIds(new Set());
        setSelectedProjectIds(new Set());
        setLeadPermissions({});
        setWizardStep(1);
        setShowModal(true);
    }

    async function openEditModal(team: Team) {
        setLoading(true);
        try {
            const { data: perms } = await supabase
                .from('team_lead_permissions')
                .select('*')
                .eq('team_id', team.id);

            const permsMap: Record<string, LeadPermissions> = {};
            perms?.forEach(p => {
                const { id, team_id, member_id, created_at, updated_at, ...rest } = p;
                permsMap[member_id] = rest;
            });

            setEditingTeam(team);
            setName(team.name);
            setDescription(team.description);
            setSelectedMemberIds(new Set((team as any).memberIds || []));
            setSelectedLeadIds(new Set((team as any).leadIds || []));
            setSelectedProjectIds(new Set((team as any).projectIds || []));
            setLeadPermissions(permsMap);
            setWizardStep(1);
            setShowModal(true);
        } catch (e) {
            console.error('Open edit modal error:', e);
        } finally {
            setLoading(false);
        }
    }

    const DEFAULT_PERMISSIONS: LeadPermissions = {
        approve_timesheets: true,
        approve_time_modifications: true,
        approve_time_off: true,
        create_schedules: true,
        manage_projects: true,
        edit_roles: true,
        view_activity: true,
        manage_financials: false,
        receive_notifications: true
    };

    function toggleLead(memberId: string) {
        const next = new Set(selectedLeadIds);
        if (next.has(memberId)) {
            next.delete(memberId);
            const nextPerms = { ...leadPermissions };
            delete nextPerms[memberId];
            setLeadPermissions(nextPerms);
        } else {
            next.add(memberId);
            setLeadPermissions({
                ...leadPermissions,
                [memberId]: { ...DEFAULT_PERMISSIONS }
            });
        }
        setSelectedLeadIds(next);
    }

    function updateLeadPermission(memberId: string, key: keyof LeadPermissions, value: boolean) {
        setLeadPermissions({
            ...leadPermissions,
            [memberId]: {
                ...leadPermissions[memberId],
                [key]: value
            }
        });
    }

    async function handleSave() {
        setLoading(true);
        try {
            const teamPayload = {
                name,
                description,
                organization_id: profile?.organization_id
            };

            let teamId = editingTeam?.id;

            if (editingTeam) {
                const { error } = await supabase.from('teams').update(teamPayload).eq('id', editingTeam.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('teams').insert(teamPayload).select().single();
                if (error) throw error;
                teamId = data.id;
            }

            if (!teamId) return;

            // 1. Sync Members
            await supabase.from('team_members').delete().eq('team_id', teamId);
            if (selectedMemberIds.size > 0) {
                const memberInserts = Array.from(selectedMemberIds).map(mid => ({
                    team_id: teamId,
                    member_id: mid,
                    is_lead: selectedLeadIds.has(mid)
                }));
                await supabase.from('team_members').insert(memberInserts);
            }

            // 2. Sync Projects
            await supabase.from('project_teams').delete().eq('team_id', teamId);
            if (selectedProjectIds.size > 0) {
                const projectInserts = Array.from(selectedProjectIds).map(pid => ({
                    team_id: teamId,
                    project_id: pid
                }));
                await supabase.from('project_teams').insert(projectInserts);
            }

            // 3. Sync Lead Permissions
            await supabase.from('team_lead_permissions').delete().eq('team_id', teamId);
            if (selectedLeadIds.size > 0) {
                const permInserts = Array.from(selectedLeadIds).map(mid => ({
                    team_id: teamId,
                    member_id: mid,
                    ...(leadPermissions[mid] || DEFAULT_PERMISSIONS)
                }));
                await supabase.from('team_lead_permissions').insert(permInserts);
            }

            setShowModal(false);
            fetchData();
        } catch (e) {
            console.error('Save team error:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!deletingTeam) return;
        try {
            const { error } = await supabase.from('teams').delete().eq('id', deletingTeam.id);
            if (error) throw error;
            setDeletingTeam(null);
            fetchData();
        } catch (e) {
            console.error('Delete team error:', e);
        }
    }

    const filtered = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <PageLayout
            title="Teams"
            description="Manage organizational groups, assign members, and set lead permissions."
            actions={
                <div className="flex items-center gap-4">
                    <div className="flex bg-surface-subtle p-1 rounded-lg border border-border">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={clsx("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-text-muted hover:text-text-primary")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={clsx("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-text-muted hover:text-text-primary")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    {!isViewer && (
                        <Button onClick={openCreateModal} variant="primary" className="shadow-sm active:scale-95">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Team
                        </Button>
                    )}
                </div>
            }
        >
            <div className="space-y-12">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <Card className="!p-8 bg-surface-solid border-border shadow-sm">
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">Total Teams</p>
                        <h2 className="text-4xl font-bold text-text-primary tracking-tight">{teams.length}</h2>
                    </Card>
                    <Card className="!p-8 bg-surface-solid border-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">Total Members</p>
                                <h2 className="text-4xl font-bold text-text-primary tracking-tight">
                                    {teams.reduce((acc, t) => acc + (t.member_count || 0), 0)}
                                </h2>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-sm mt-1">
                                <Users className="w-6 h-6" strokeWidth={2} />
                            </div>
                        </div>
                    </Card>
                    <Card className="!p-8 bg-surface-solid border-border shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">Avg. Team Size</p>
                                <h2 className="text-4xl font-bold text-text-primary tracking-tight">
                                    {teams.length > 0 ? (teams.reduce((acc, t) => acc + (t.member_count || 0), 0) / teams.length).toFixed(1) : '0'}
                                </h2>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-sm mt-1">
                                <Shield className="w-6 h-6" strokeWidth={2} />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="px-10 space-y-10">
                {/* Search Bar */}
                <div className="max-w-2xl">
                    <Input
                        placeholder="Search teams or managers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                    />
                </div>

                {loading && teams.length === 0 ? (
                    <LoadingState message="Loading teams..." />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title="No Teams Found"
                        description={searchTerm ? "No teams match your search criteria." : "You haven't created any teams yet."}
                        icon={<UsersRound className="w-12 h-12" />}
                        action={!searchTerm && (
                            <Button onClick={openCreateModal} disabled={isViewer}>
                                Create First Team
                            </Button>
                        )}
                    />
                ) : (
                    <div className={clsx(
                        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "bg-white border border-border rounded-[32px] overflow-hidden divide-y divide-border shadow-sm"
                    )}>
                        {filtered.map((team) => (
                            <TeamItem
                                key={team.id}
                                team={team}
                                mode={viewMode}
                                onEdit={() => openEditModal(team)}
                                onDelete={() => setDeletingTeam(team)}
                                isViewer={isViewer}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Creation Wizard Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingTeam ? 'Operational Node Configuration' : 'Initialize New Hierarchy'}
                subtitle={`Sequence Index ${wizardStep} of 4`}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="secondary"
                            onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowModal(false)}
                            className="px-8"
                        >
                            {wizardStep === 1 ? 'Abort' : 'Previous Vector'}
                        </Button>
                        <div className="flex items-center gap-6">
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map((s) => (
                                    <div
                                        key={s}
                                        className={clsx(
                                            "h-1.5 rounded-full transition-all duration-500",
                                            wizardStep === s ? "bg-primary w-8" : "bg-border w-4"
                                        )}
                                    />
                                ))}
                            </div>
                            {wizardStep < 4 ? (
                                <Button
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    disabled={wizardStep === 1 && !name}
                                    className="px-8"
                                >
                                    Next Phase
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSave}
                                    loading={loading}
                                    disabled={isViewer}
                                    className="px-8"
                                >
                                    {editingTeam ? 'Commit Changes' : 'Finalize Initialization'}
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                <div className="min-h-[480px]">
                    {wizardStep === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3 mb-2">
                                <Info className="w-5 h-5 text-primary" />
                                <p className="text-[12px] font-bold text-text-primary uppercase tracking-[0.3em] font-mono">Core Node Parameters</p>
                            </div>
                            <Input
                                label="Hierarchy Identity (Team Name) *"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. CORE-ENGINEERING"
                                autoFocus
                                className="font-mono"
                            />
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono ml-1">Operational Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Define the strategic objectives for this node..."
                                    rows={5}
                                    className="w-full bg-surface-solid border border-border rounded-2xl px-6 py-4 text-[14px] font-bold text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-primary transition-all font-mono resize-none shadow-sm"
                                />
                            </div>
                        </div>
                    )}

                    {wizardStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <UsersRound className="w-5 h-5 text-primary" />
                                    <p className="text-[12px] font-bold text-text-primary uppercase tracking-[0.3em] font-mono">Teammate Allocation</p>
                                </div>
                                <StatusBadge variant={selectedMemberIds.size > 0 ? "success" : "default"}>
                                    {selectedMemberIds.size} NODES ACTIVE
                                </StatusBadge>
                            </div>
                            <div className="grid grid-cols-1 gap-4 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
                                {members.map(m => {
                                    const isSelected = selectedMemberIds.has(m.id);
                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                const next = new Set(selectedMemberIds);
                                                if (next.has(m.id)) {
                                                    next.delete(m.id);
                                                    const nextLeads = new Set(selectedLeadIds);
                                                    nextLeads.delete(m.id);
                                                    setSelectedLeadIds(nextLeads);
                                                } else {
                                                    next.add(m.id);
                                                }
                                                setSelectedMemberIds(next);
                                            }}
                                            className={clsx(
                                                "flex items-center justify-between p-5 rounded-2xl border transition-all text-left group",
                                                isSelected ? "bg-primary/[0.03] border-primary/40 shadow-sm" : "bg-surface-solid border-border hover:border-text-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-[18px] flex items-center justify-center text-[16px] font-bold font-mono transition-transform group-hover:scale-105",
                                                    isSelected ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-border/40 text-text-muted"
                                                )}>
                                                    {m.full_name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-text-primary uppercase leading-none mb-1.5 font-mono">{m.full_name}</p>
                                                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">{m.email}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-primary border-primary rotate-0" : "border-border rotate-45 group-hover:rotate-0"
                                            )}>
                                                {isSelected && <Check className="w-4 h-4 text-white stroke-[3.5]" />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {wizardStep === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-primary" />
                                    <p className="text-[12px] font-bold text-text-primary uppercase tracking-[0.3em] font-mono">Lead Authority Matrix</p>
                                </div>
                                <StatusBadge variant={selectedLeadIds.size > 0 ? "success" : "default"}>
                                    {selectedLeadIds.size} LEADS DESIGNATED
                                </StatusBadge>
                            </div>
                            
                            {selectedMemberIds.size === 0 ? (
                                <div className="text-center py-20 bg-border/5 border border-dashed border-border rounded-3xl">
                                    <Shield className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono">No teammate nodes allocated for lead designation</p>
                                </div>
                            ) : (
                                <div className="space-y-6 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
                                    {Array.from(selectedMemberIds).map(mid => {
                                        const member = members.find(m => m.id === mid);
                                        const isLead = selectedLeadIds.has(mid);
                                        if (!member) return null;

                                        return (
                                            <div key={mid} className={clsx(
                                                "rounded-3xl border transition-all overflow-hidden",
                                                isLead ? "bg-surface-solid border-primary/30 shadow-md shadow-primary/5" : "bg-border/5 border-border"
                                            )}>
                                                <div className="p-5 flex items-center justify-between border-b border-border/40">
                                                    <div className="flex items-center gap-4">
                                                        <div className={clsx(
                                                            "w-12 h-12 rounded-[18px] flex items-center justify-center transition-all",
                                                            isLead ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-border/20 text-text-muted"
                                                        )}>
                                                            <User className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-text-primary uppercase text-[13px] font-mono leading-none mb-1">{member.full_name}</p>
                                                            <p className="text-[10px] text-text-muted font-mono uppercase tracking-widest">{isLead ? 'Lead Node' : 'Teammate Node'}</p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant={isLead ? "primary" : "secondary"}
                                                        size="sm"
                                                        onClick={() => toggleLead(mid)}
                                                        className="px-6"
                                                    >
                                                        {isLead ? 'De-assign Lead' : 'Designate Lead'}
                                                    </Button>
                                                </div>

                                                {isLead && (
                                                    <div className="p-6 bg-surface-solid grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-400">
                                                        {(Object.keys(DEFAULT_PERMISSIONS) as Array<keyof LeadPermissions>).map(key => (
                                                            <button
                                                                key={key}
                                                                onClick={() => updateLeadPermission(mid, key, !leadPermissions[mid]?.[key])}
                                                                className="flex items-center gap-4 text-left group"
                                                            >
                                                                <div className={clsx(
                                                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                                    leadPermissions[mid]?.[key] ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/20" : "border-border group-hover:border-text-muted/40"
                                                                )}>
                                                                    {leadPermissions[mid]?.[key] && <Check className="w-4 h-4 text-white stroke-[4]" />}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] group-hover:text-text-primary transition-colors font-mono">
                                                                    {key.replace(/_/g, ' ')}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {wizardStep === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="w-5 h-5 text-primary" />
                                    <p className="text-[12px] font-bold text-text-primary uppercase tracking-[0.3em] font-mono">Project Associations</p>
                                </div>
                                <StatusBadge variant={selectedProjectIds.size > 0 ? "success" : "default"}>
                                    {selectedProjectIds.size} PROJECTS LINKED
                                </StatusBadge>
                            </div>
                            <div className="grid grid-cols-1 gap-4 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
                                {allProjects.map(p => {
                                    const isSelected = selectedProjectIds.has(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                const next = new Set(selectedProjectIds);
                                                if (next.has(p.id)) next.delete(p.id);
                                                else next.add(p.id);
                                                setSelectedProjectIds(next);
                                            }}
                                            className={clsx(
                                                "flex items-center justify-between p-5 rounded-2xl border transition-all text-left group",
                                                isSelected ? "bg-primary/[0.03] border-primary/40 shadow-sm" : "bg-surface-solid border-border hover:border-text-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105",
                                                    isSelected ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-border/40 text-text-muted"
                                                )}>
                                                    <Briefcase className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-text-primary uppercase font-mono leading-none mb-1.5">{p.name}</p>
                                                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Active Project Vector</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-primary border-primary" : "border-border rotate-45 group-hover:rotate-0"
                                            )}>
                                                {isSelected && <Check className="w-4 h-4 text-white stroke-[3.5]" />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deletingTeam}
                onClose={() => setDeletingTeam(null)}
                title="Force Node Deletion"
                maxWidth="max-w-md"
                footer={
                    <div className="flex gap-4 w-full">
                        <Button variant="secondary" className="flex-1 px-8" onClick={() => setDeletingTeam(null)}>
                            Abort
                        </Button>
                        <Button variant="danger" className="flex-[2] px-8 shadow-md shadow-rose-500/10" onClick={handleDelete}>
                            Confirm Purge
                        </Button>
                    </div>
                }
            >
                <div className="text-center py-10">
                    <div className="w-24 h-24 bg-rose-500/5 rounded-[32px] flex items-center justify-center mx-auto mb-8 border border-rose-500/10 shadow-inner">
                        <Trash2 className="w-12 h-12 text-rose-500" strokeWidth={2} />
                    </div>
                    <h4 className="text-xl font-bold text-text-primary tracking-tight mb-3 uppercase font-mono">Irreversible Action</h4>
                    <p className="text-[11px] text-text-muted leading-relaxed font-bold uppercase tracking-[0.1em] font-mono px-6">
                        You are about to permanently purge <span className="text-rose-500">"{deletingTeam?.name}"</span> from the hierarchy.
                        All teammate allocations and project links will be severed.
                    </p>
                </div>
            </Modal>
        </PageLayout>
    );
}

function TeamItem({ team, mode, onEdit, onDelete, isViewer }: {
    team: Team;
    mode: 'grid' | 'list';
    onEdit: () => void;
    onDelete: () => void;
    isViewer: boolean;
}) {
    const initials = team.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    if (mode === 'list') {
        return (
            <div className="px-10 py-8 flex items-center group/row hover:bg-primary/[0.02] transition-all border-b last:border-0 border-border">
                <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold text-lg mr-8 shadow-sm">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary tracking-tight text-xl mb-1 group-hover/row:text-primary transition-colors">{team.name}</h3>
                    <p className="text-xs text-text-muted font-medium truncate max-w-xl opacity-80">{team.description || 'No description provided'}</p>
                </div>
                <div className="px-12 shrink-0 border-x border-border/60">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Members</p>
                    <div className="flex items-center gap-3 text-primary font-bold">
                        <UsersRound className="w-4 h-4" strokeWidth={2} />
                        <span className="text-sm">{team.member_count}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 ml-auto opacity-0 group-hover/row:opacity-100 transition-all translate-x-4 group-hover/row:translate-x-0">
                    <Button variant="secondary" size="sm" onClick={onEdit} disabled={isViewer} className="shadow-sm">
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={onDelete} disabled={isViewer} className="shadow-sm">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="h-full flex flex-col group/card hover:border-primary/40 transition-all duration-500 bg-surface-solid border-border shadow-sm hover:shadow-md" noPadding>
            <div className="p-8 pb-0">
                <div className="flex items-start justify-between mb-10">
                    <div className="w-16 h-16 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center font-bold text-primary text-2xl shadow-sm group-hover/card:scale-105 transition-transform duration-500">
                        {initials}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={onEdit} disabled={isViewer} className="shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="danger" size="sm" onClick={onDelete} disabled={isViewer} className="shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-text-primary tracking-tight mb-2 group-hover/card:text-primary transition-colors">{team.name}</h3>
                <p className="text-sm font-medium text-text-muted leading-relaxed line-clamp-2 h-10 mb-8 opacity-70">
                    {team.description || "No description provided for this team."}
                </p>
            </div>

            <div className="mt-auto p-8 pt-6 border-t border-border bg-border/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/5 flex items-center justify-center text-primary shadow-sm">
                        <Shield className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 opacity-60">Manager</p>
                        <p className="text-sm font-bold text-text-primary truncate max-w-[140px] tracking-tight">{team.manager_name || 'Unassigned'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2 bg-surface-solid border border-border rounded-xl shadow-sm">
                    <UsersRound className="w-4 h-4 text-primary" strokeWidth={2} />
                    <span className="text-sm font-bold text-text-primary">{team.member_count}</span>
                </div>
            </div>
        </Card>
    );
}
