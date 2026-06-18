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

import { teamService } from '../services/team.service';
import type { Team, LeadPermissions } from '../services/team.service';

interface Member {
    id: string;
    full_name: string;
    email: string;
}

interface Project {
    id: string;
    name: string;
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
    const [managerId, setManagerId] = useState<string>('');
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
            const [teamsData, { data: membersData, error: mErr }, { data: projectsData, error: pErr }] = await Promise.all([
                teamService.fetchTeams(),
                supabase.from('members').select('id, full_name, email').eq('status', 'Active'),
                supabase.from('projects').select('id, name').eq('status', 'Active')
            ]);
            if (mErr) throw mErr;
            if (pErr) throw pErr;

            setTeams(teamsData);
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
        setManagerId('');
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
            const permsMap = await teamService.fetchTeamLeadPermissions(team.id);

            setEditingTeam(team);
            setName(team.name);
            setDescription(team.description);
            setManagerId(team.manager_id || '');
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
            await teamService.saveTeam({
                id: editingTeam?.id,
                name,
                description,
                manager_id: managerId || null,
                organization_id: profile?.organization_id || undefined,
                selectedMemberIds,
                selectedLeadIds,
                selectedProjectIds,
                leadPermissions,
                defaultPermissions: DEFAULT_PERMISSIONS
            });

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
            await teamService.deleteTeam(deletingTeam.id);
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
                    <div className="flex bg-surface-hover p-1 rounded-lg border border-border">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={clsx("p-2 rounded-md transition-all", viewMode === 'grid' ? "bg-surface shadow-shell-sm text-primary" : "text-text-muted hover:text-text-primary")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={clsx("p-2 rounded-md transition-all", viewMode === 'list' ? "bg-surface shadow-shell-sm text-primary" : "text-text-muted hover:text-text-primary")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    {!isViewer && (
                        <Button onClick={openCreateModal} variant="primary" className="shadow-shell-sm active:scale-95">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Team
                        </Button>
                    )}
                </div>
            }
        >
            <div className="space-y-8">
                {/* Compact Stats & Search Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-solid border border-border p-4 rounded-xl shadow-shell-sm">
                    <div className="flex items-center gap-8 px-2">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Total Teams</span>
                            <span className="text-xl font-bold text-text-primary">{teams.length}</span>
                        </div>
                        <div className="w-px h-8 bg-border/60"></div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Total Members</span>
                            <span className="text-xl font-bold text-text-primary">{teams.reduce((acc, t) => acc + (t.member_count || 0), 0)}</span>
                        </div>
                        <div className="w-px h-8 bg-border/60"></div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Avg. Team Size</span>
                            <span className="text-xl font-bold text-text-primary">{teams.length > 0 ? (teams.reduce((acc, t) => acc + (t.member_count || 0), 0) / teams.length).toFixed(1) : '0'}</span>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-80">
                        <Input
                            placeholder="Search teams or managers..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            leftIcon={<Search className="w-4 h-4 text-text-muted" />}
                        />
                    </div>
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
                        viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "bg-surface border border-border rounded-[32px] overflow-hidden divide-y divide-border shadow-shell-sm"
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
                title={editingTeam ? 'Edit Team' : 'Create New Team'}
                subtitle={`Step ${wizardStep} of 3`}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <Button
                            variant="secondary"
                            onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowModal(false)}
                            className="px-8"
                        >
                            {wizardStep === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        <div className="flex items-center gap-6">
                            <div className="flex gap-2">
                                {[1, 2, 3].map((s) => (
                                    <div
                                        key={s}
                                        className={clsx(
                                            "h-1.5 rounded-full transition-all duration-500",
                                            wizardStep === s ? "bg-primary w-8" : "bg-border w-4"
                                        )}
                                    />
                                ))}
                            </div>
                            {wizardStep < 3 ? (
                                <Button
                                    onClick={() => setWizardStep(wizardStep + 1)}
                                    disabled={wizardStep === 1 && !name}
                                    className="px-8"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSave}
                                    loading={loading}
                                    disabled={isViewer}
                                    className="px-8"
                                >
                                    {editingTeam ? 'Save Changes' : 'Create Team'}
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
                                <p className="text-sm font-semibold text-text-primary">Team Details</p>
                            </div>
                            <Input
                                label="Team Name *"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Engineering"
                                autoFocus
                            />
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-text-muted ml-1 ">Designated Manager</label>
                                <select 
                                    value={managerId} 
                                    onChange={e => setManagerId(e.target.value)}
                                    className="w-full bg-surface-solid border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary transition-all shadow-shell-sm appearance-none"
                                >
                                    <option value="">Select a manager...</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-text-muted ml-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Describe the team's purpose and responsibilities..."
                                    rows={5}
                                    className="w-full bg-surface-solid border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-primary transition-all resize-none shadow-shell-sm"
                                />
                            </div>
                        </div>
                    )}

                    {wizardStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <UsersRound className="w-5 h-5 text-primary" />
                                    <p className="text-sm font-semibold text-text-primary">Select Team Members</p>
                                </div>
                                <StatusBadge variant={selectedMemberIds.size > 0 ? "success" : "default"}>
                                    {selectedMemberIds.size} Selected
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
                                                isSelected ? "bg-primary/[0.03] border-primary/40 shadow-shell-sm" : "bg-surface-solid border-border hover:border-text-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-[18px] flex items-center justify-center text-[16px] font-bold font-mono transition-transform group-hover:scale-105",
                                                    isSelected ? "bg-primary text-white shadow-shell-md shadow-primary/20" : "bg-border/40 text-text-muted"
                                                )}>
                                                    {m.full_name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary leading-none mb-1">{m.full_name}</p>
                                                    <p className="text-xs text-text-muted">{m.email}</p>
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
                                    <Briefcase className="w-5 h-5 text-primary" />
                                    <p className="text-sm font-semibold text-text-primary">Link Projects</p>
                                </div>
                                <StatusBadge variant={selectedProjectIds.size > 0 ? "success" : "default"}>
                                    {selectedProjectIds.size} Linked
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
                                                isSelected ? "bg-primary/[0.03] border-primary/40 shadow-shell-sm" : "bg-surface-solid border-border hover:border-text-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105",
                                                    isSelected ? "bg-primary text-white shadow-shell-md shadow-primary/20" : "bg-border/40 text-text-muted"
                                                )}>
                                                    <Briefcase className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-text-primary leading-none mb-1">{p.name}</p>
                                                    <p className="text-xs text-text-muted">Active Project</p>
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
                title="Delete Team"
                maxWidth="max-w-md"
                footer={
                    <div className="flex gap-4 w-full">
                        <Button variant="secondary" className="flex-1 px-8" onClick={() => setDeletingTeam(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" className="flex-[2] px-8 shadow-shell-md shadow-rose-500/10" onClick={handleDelete}>
                            Delete Team
                        </Button>
                    </div>
                }
            >
                <div className="text-center py-10">
                    <div className="w-24 h-24 bg-rose-500/5 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-rose-500/10">
                        <Trash2 className="w-12 h-12 text-rose-500" strokeWidth={2} />
                    </div>
                    <h4 className="text-xl font-bold text-text-primary tracking-tight mb-3">Delete "{deletingTeam?.name}"?</h4>
                    <p className="text-sm text-text-muted leading-relaxed px-6">
                        This will permanently remove the team and all member assignments. This action cannot be undone.
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
    if (mode === 'list') {
        return (
            <div className="px-6 py-4 flex items-center group/row hover:bg-surface-hover transition-colors border-b last:border-0 border-border">
                <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-text-primary text-sm tracking-tight truncate">{team.name}</h3>
                    </div>
                    <p className="text-xs text-text-muted font-medium truncate opacity-80">{team.description || 'No description provided'}</p>
                </div>
                
                <div className="w-48 shrink-0 flex flex-col justify-center border-l border-border/50 pl-6">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Manager</span>
                    <span className="text-sm font-semibold text-text-primary truncate">{team.manager_name || 'Unassigned'}</span>
                </div>
                
                <div className="w-32 shrink-0 flex flex-col justify-center border-l border-border/50 px-6">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Members</span>
                    <div className="flex items-center gap-1.5 text-text-primary font-semibold text-sm">
                        <UsersRound className="w-3.5 h-3.5 text-text-muted" />
                        {team.member_count}
                    </div>
                </div>

                <div className="w-20 shrink-0 flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button onClick={onEdit} disabled={isViewer} className="p-1.5 rounded-md hover:bg-surface-solid text-text-muted hover:text-primary transition-colors">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} disabled={isViewer} className="p-1.5 rounded-md hover:bg-surface-solid text-text-muted hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <Card className="h-full flex flex-col group/card hover:border-text-muted/30 transition-colors bg-surface-solid border-border shadow-none" noPadding>
            <div className="p-5 pb-4 flex-1">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border">
                            <Briefcase className="w-4 h-4 text-text-muted" />
                        </div>
                        <h3 className="text-base font-bold text-text-primary tracking-tight leading-tight">{team.name}</h3>
                    </div>
                    <div className="flex gap-1 -mt-1 -mr-1">
                        <button onClick={onEdit} disabled={isViewer} className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-primary transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onDelete} disabled={isViewer} className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-rose-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <p className="text-xs font-medium text-text-muted leading-relaxed line-clamp-2">
                    {team.description || "No description provided."}
                </p>
            </div>

            <div className="px-5 py-3 border-t border-border bg-surface/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Manager</span>
                    <span className="text-xs font-semibold text-text-primary truncate max-w-[120px]">{team.manager_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Members</span>
                    <div className="flex items-center gap-1.5 text-text-primary font-semibold text-xs">
                        <UsersRound className="w-3 h-3 text-text-muted" />
                        {team.member_count}
                    </div>
                </div>
            </div>
        </Card>
    );
}
