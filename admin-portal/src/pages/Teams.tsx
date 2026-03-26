import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Users, Search, Trash2, Shield, LayoutGrid, List,
    UsersRound, Plus, Pencil, Check,
    Briefcase
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { 
    PageHeader, Card, Button, Input, Modal, 
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
        <div className="min-h-screen bg-background pb-20">
            <PageHeader
                title="Teams"
                description="Organize and manage your team and departments"
                icon={<UsersRound className="w-8 h-8" />}
                actions={
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white border border-border rounded-xl p-1 shadow-sm mr-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'grid' ? "bg-primary/10 text-primary shadow-inner" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'list' ? "bg-primary/10 text-primary shadow-inner" : "text-text-muted hover:text-text-primary"
                                )}
                            >
                                <List className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>
                        <Button
                            onClick={openCreateModal}
                            disabled={isViewer}
                            leftIcon={<Plus className="w-4 h-4" strokeWidth={3} />}
                        >
                            Create Team
                        </Button>
                    </div>
                }
                stats={
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="!p-6">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 font-mono">Total Teams</p>
                            <h2 className="text-4xl font-bold text-text-primary tracking-tight font-mono">{teams.length}</h2>
                        </Card>
                        <Card className="!p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 font-mono">Total Members</p>
                                    <h2 className="text-4xl font-bold text-text-primary tracking-tight font-mono">
                                        {teams.reduce((acc, t) => acc + (t.member_count || 0), 0)}
                                    </h2>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-600">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                        </Card>
                        <Card className="!p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2 font-mono">Avg. Team Size</p>
                                    <h2 className="text-4xl font-bold text-text-primary tracking-tight font-mono">
                                        {teams.length > 0 ? (teams.reduce((acc, t) => acc + (t.member_count || 0), 0) / teams.length).toFixed(1) : '0'}
                                    </h2>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-600">
                                    <Shield className="w-5 h-5" />
                                </div>
                            </div>
                        </Card>
                    </div>
                }
            />

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
                title={editingTeam ? 'Edit Team' : 'Create Team'}
                subtitle={`Step ${wizardStep} of 4`}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="secondary"
                            onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowModal(false)}
                        >
                            {wizardStep === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5 mr-4">
                                {[1, 2, 3, 4].map((s) => (
                                    <div
                                        key={s}
                                        className={clsx(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            wizardStep === s ? "bg-primary w-6" : "bg-border"
                                        )}
                                    />
                                ))}
                            </div>
                            {wizardStep < 4 ? (
                                <Button
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    disabled={wizardStep === 1 && !name}
                                >
                                    Next Step
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSave}
                                    loading={loading}
                                    disabled={isViewer}
                                >
                                    {editingTeam ? 'Save Changes' : 'Finish & Create'}
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                <div className="min-h-[400px]">
                    {wizardStep === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <Input
                                label="Team Name *"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Engineering, Marketing..."
                                autoFocus
                            />
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] ml-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Brief description of the team's purpose..."
                                    rows={4}
                                    className="w-full bg-white border border-border rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all shadow-sm font-mono resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {wizardStep === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Select Teammates</p>
                                <StatusBadge variant={selectedMemberIds.size > 0 ? "success" : "default"}>
                                    {selectedMemberIds.size} Selected
                                </StatusBadge>
                            </div>
                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                                isSelected ? "bg-primary/5 border-primary/30" : "bg-surface-subtle border-border hover:border-text-muted/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold font-mono",
                                                    isSelected ? "bg-primary text-white" : "bg-border text-text-muted"
                                                )}>
                                                    {m.full_name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-primary uppercase leading-none mb-1">{m.full_name}</p>
                                                    <p className="text-[10px] font-mono text-text-muted">{m.email}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                                isSelected ? "bg-primary border-primary" : "border-border"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {wizardStep === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Assign Team Leads</p>
                                <StatusBadge variant={selectedLeadIds.size > 0 ? "success" : "default"}>
                                    {selectedLeadIds.size} Leads
                                </StatusBadge>
                            </div>
                            
                            {selectedMemberIds.size === 0 ? (
                                <div className="text-center py-12 bg-surface-subtle border border-dashed border-border rounded-2xl">
                                    <Shield className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
                                    <p className="text-sm font-bold text-text-muted uppercase tracking-wider font-mono">No teammates selected yet</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {Array.from(selectedMemberIds).map(mid => {
                                        const member = members.find(m => m.id === mid);
                                        const isLead = selectedLeadIds.has(mid);
                                        if (!member) return null;

                                        return (
                                            <div key={mid} className={clsx(
                                                "rounded-2xl border transition-all overflow-hidden",
                                                isLead ? "bg-primary/[0.02] border-primary/20" : "bg-surface-subtle border-border"
                                            )}>
                                                <div className="p-4 flex items-center justify-between border-b border-border/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className={clsx(
                                                            "w-10 h-10 rounded-lg flex items-center justify-center",
                                                            isLead ? "bg-primary text-white" : "bg-border text-text-muted"
                                                        )}>
                                                            <Shield className="w-5 h-5" />
                                                        </div>
                                                        <p className="font-bold text-text-primary uppercase text-sm font-mono">{member.full_name}</p>
                                                    </div>
                                                    <Button 
                                                        variant={isLead ? "primary" : "secondary"}
                                                        size="sm"
                                                        onClick={() => toggleLead(mid)}
                                                    >
                                                        {isLead ? 'Lead Assigned' : 'Make Lead'}
                                                    </Button>
                                                </div>

                                                {isLead && (
                                                    <div className="p-4 bg-surface-solid/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        {(Object.keys(DEFAULT_PERMISSIONS) as Array<keyof LeadPermissions>).map(key => (
                                                            <button
                                                                key={key}
                                                                onClick={() => updateLeadPermission(mid, key, !leadPermissions[mid]?.[key])}
                                                                className="flex items-center gap-3 text-left group"
                                                            >
                                                                <div className={clsx(
                                                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                                                    leadPermissions[mid]?.[key] ? "bg-emerald-500 border-emerald-500" : "border-border group-hover:border-text-muted/30"
                                                                )}>
                                                                    {leadPermissions[mid]?.[key] && <Check className="w-3 h-3 text-white stroke-[4]" />}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider group-hover:text-text-primary transition-colors">
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
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em]">Assign Projects</p>
                                <StatusBadge variant={selectedProjectIds.size > 0 ? "success" : "default"}>
                                    {selectedProjectIds.size} Projects
                                </StatusBadge>
                            </div>
                            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                                                isSelected ? "bg-primary/5 border-primary/30" : "bg-surface-subtle border-border hover:border-text-muted/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                    isSelected ? "bg-primary/10 text-primary" : "bg-border text-text-muted"
                                                )}>
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <p className="text-sm font-bold text-text-primary uppercase font-mono">{p.name}</p>
                                            </div>
                                            <div className={clsx(
                                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                                isSelected ? "bg-primary border-primary" : "border-border"
                                            )}>
                                                {isSelected && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
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
                title="Delete Team?"
                maxWidth="max-w-md"
                footer={
                    <div className="flex gap-3 w-full">
                        <Button variant="secondary" className="flex-1" onClick={() => setDeletingTeam(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" className="flex-[2]" onClick={handleDelete}>
                            Confirm Delete
                        </Button>
                    </div>
                }
            >
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-inner">
                        <Trash2 className="w-10 h-10 text-rose-500" />
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed font-bold uppercase tracking-wider font-mono">
                        This will permanently delete <span className="text-rose-600">"{deletingTeam?.name}"</span>.
                        All assignments associated with this team will be removed.
                    </p>
                </div>
            </Modal>
        </div>
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
            <div className="px-10 py-6 flex items-center group/row hover:bg-primary/[0.02] transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold text-base mr-6 font-mono shadow-inner">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary tracking-tight text-lg mb-0.5 group-hover/row:text-primary transition-colors">{team.name}</h3>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest font-mono truncate max-w-md">{team.description || 'No description'}</p>
                </div>
                <div className="px-10 shrink-0 border-x border-border">
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1 font-mono">Members</p>
                    <div className="flex items-center gap-2 text-primary font-bold font-mono">
                        <UsersRound className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span className="text-xs">{team.member_count}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-auto opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={onEdit} disabled={isViewer}>
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} className="text-rose-500 hover:bg-rose-50" disabled={isViewer}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="h-full flex flex-col group/card hover:border-primary/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center font-bold text-primary text-2xl font-mono shadow-inner group-hover/card:scale-105 transition-transform">
                    {initials}
                </div>
                <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={onEdit} disabled={isViewer}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDelete} className="text-rose-500 hover:bg-rose-50" disabled={isViewer}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-text-primary tracking-tight mb-2 group-hover/card:text-primary transition-colors uppercase font-mono">{team.name}</h3>
            <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-8 h-8">
                {team.description || "No description available for this team."}
            </p>

            <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Shield className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1 font-mono">Lead</p>
                        <p className="text-xs font-bold text-text-primary uppercase font-mono truncate max-w-[120px]">{team.manager_name || 'Unassigned'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg">
                    <UsersRound className="w-4 h-4 text-text-muted" />
                    <span className="text-xs font-bold text-text-primary font-mono tracking-tighter">{team.member_count}</span>
                </div>
            </div>
        </Card>
    );
}
