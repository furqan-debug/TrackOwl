import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Search,
    Trash2,
    LayoutGrid,
    List,
    UsersRound,
    Plus,
    Pencil,
    Check,
    Briefcase,
    Info,
    ChevronDown
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import {
    PageLayout,
    Card,
    Button,
    Input,
    Modal,
    StatusBadge,
    EmptyState,
    LoadingState
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
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
        new Set()
    );
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
        new Set()
    );
    const [leadPermissions, setLeadPermissions] = useState<
        Record<string, LeadPermissions>
    >({});
    const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(
        new Set()
    );
    const [allProjects, setAllProjects] = useState<Project[]>([]);

    const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setManagerDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);

        try {
            const [
                teamsData,
                { data: membersData, error: mErr },
                { data: projectsData, error: pErr }
            ] = await Promise.all([
                teamService.fetchTeams(),
                supabase
                    .from('members')
                    .select('id, full_name, email')
                    .eq('status', 'Active'),
                supabase
                    .from('projects')
                    .select('id, name')
                    .eq('status', 'Active')
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

    const filtered = teams.filter((t) => {
        const search = searchTerm.toLowerCase();

        return (
            t.name.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            (t.manager_name || '').toLowerCase().includes(search)
        );
    });

    const totalMembers = teams.reduce(
        (acc, t) => acc + (t.member_count || 0),
        0
    );

    const averageTeamSize =
        teams.length > 0
            ? (totalMembers / teams.length).toFixed(1)
            : '0';

    return (
        <PageLayout
            title="Teams"
            description="Manage organizational groups, assign members, and set lead permissions."
            actions={
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex bg-surface-hover p-1 rounded-lg border border-border shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                'p-2 rounded-md transition-all',
                                viewMode === 'grid'
                                    ? 'bg-surface shadow-shell-sm text-primary'
                                    : 'text-text-muted hover:text-text-primary'
                            )}
                            aria-label="Grid view"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                'p-2 rounded-md transition-all',
                                viewMode === 'list'
                                    ? 'bg-surface shadow-shell-sm text-primary'
                                    : 'text-text-muted hover:text-text-primary'
                            )}
                            aria-label="List view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {!isViewer && (
                        <Button
                            onClick={openCreateModal}
                            variant="primary"
                            className="shadow-shell-sm active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Team
                        </Button>
                    )}
                </div>
            }
        >
            <div className="w-full min-w-0 space-y-6 sm:space-y-8">

                {/* =====================================================
                    STATS + SEARCH
                    Mobile = everything in a column
                    Desktop = stats in a row
                ====================================================== */}
                <div className="w-full bg-surface-solid border border-border rounded-xl shadow-shell-sm p-4 sm:p-5">

                    {/* MOBILE STATS */}
                    <div className="flex flex-col gap-4 sm:hidden">

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                Total Teams
                            </span>

                            <span className="text-2xl font-bold text-text-primary">
                                {teams.length}
                            </span>
                        </div>

                        <div className="h-px w-full bg-border/60" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                Total Members
                            </span>

                            <span className="text-2xl font-bold text-text-primary">
                                {totalMembers}
                            </span>
                        </div>

                        <div className="h-px w-full bg-border/60" />

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                Average Team Size
                            </span>

                            <span className="text-2xl font-bold text-text-primary">
                                {averageTeamSize}
                            </span>
                        </div>
                    </div>

                    {/* DESKTOP STATS */}
                    <div className="hidden sm:flex items-stretch">

                        <div className="flex-1 min-w-0 pr-6">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                    Total Teams
                                </span>

                                <span className="text-2xl font-bold text-text-primary mt-1">
                                    {teams.length}
                                </span>
                            </div>
                        </div>

                        <div className="w-px bg-border/60 shrink-0" />

                        <div className="flex-1 min-w-0 px-6">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                    Total Members
                                </span>

                                <span className="text-2xl font-bold text-text-primary mt-1">
                                    {totalMembers}
                                </span>
                            </div>
                        </div>

                        <div className="w-px bg-border/60 shrink-0" />

                        <div className="flex-1 min-w-0 pl-6">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider leading-tight">
                                    Average Team Size
                                </span>

                                <span className="text-2xl font-bold text-text-primary mt-1">
                                    {averageTeamSize}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SEARCH — ALWAYS PRESENT */}
                    <div className="mt-5 pt-5 border-t border-border/60">
                        <Input
                            placeholder="Search teams or managers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={
                                <Search className="w-4 h-4 text-text-muted" />
                            }
                        />
                    </div>
                </div>

                {/* =====================================================
                    TEAM CONTENT
                ====================================================== */}
                {loading && teams.length === 0 ? (
                    <LoadingState message="Loading teams..." />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title="No Teams Found"
                        description={
                            searchTerm
                                ? 'No teams match your search criteria.'
                                : "You haven't created any teams yet."
                        }
                        icon={<UsersRound className="w-12 h-12" />}
                        action={
                            !searchTerm && (
                                <Button
                                    onClick={openCreateModal}
                                    disabled={isViewer}
                                >
                                    Create First Team
                                </Button>
                            )
                        }
                    />
                ) : (
                    <div
                        className={clsx(
                            'w-full min-w-0',
                            viewMode === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'
                                : 'bg-surface border border-border rounded-2xl sm:rounded-[32px] overflow-hidden divide-y divide-border shadow-shell-sm'
                        )}
                    >
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

            {/* =========================================================
                CREATION WIZARD MODAL
            ========================================================== */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingTeam ? 'Edit Team' : 'Create New Team'}
                maxWidth="max-w-2xl"
                subtitle={
                    <div className="flex items-center gap-3 mt-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={clsx(
                                        'h-1.5 rounded-full transition-all duration-500',
                                        wizardStep === s
                                            ? 'bg-primary w-6'
                                            : wizardStep > s
                                                ? 'bg-primary/40 w-4'
                                                : 'bg-border w-4'
                                    )}
                                />
                            ))}
                        </div>

                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap">
                            Step {wizardStep} of 3
                        </span>
                    </div>
                }
                footer={
                    <div className="flex items-center justify-between w-full gap-3">
                        <Button
                            variant="secondary"
                            onClick={() =>
                                wizardStep > 1
                                    ? setWizardStep(wizardStep - 1)
                                    : setShowModal(false)
                            }
                            className="px-5 sm:px-8"
                        >
                            {wizardStep === 1 ? 'Cancel' : 'Back'}
                        </Button>

                        <div className="flex items-center gap-2 sm:gap-4">
                            {wizardStep < 3 ? (
                                <Button
                                    onClick={() =>
                                        setWizardStep(wizardStep + 1)
                                    }
                                    disabled={wizardStep === 1 && !name}
                                    className="px-5 sm:px-8 shadow-shell-sm"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSave}
                                    loading={loading}
                                    disabled={isViewer}
                                    className="px-5 sm:px-8 shadow-shell-sm"
                                >
                                    {editingTeam
                                        ? 'Save Changes'
                                        : 'Create Team'}
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                <div className="min-h-[480px] min-w-0">

                    {/* =================================================
                        STEP 1
                    ================================================== */}
                    {wizardStep === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

                            <div className="flex items-center gap-3 mb-2">
                                <Info className="w-5 h-5 text-primary shrink-0" />

                                <p className="text-sm font-semibold text-text-primary">
                                    Team Details
                                </p>
                            </div>

                            <Input
                                label="Team Name *"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Engineering"
                                autoFocus
                            />

                            <div
                                className="space-y-2 relative"
                                ref={dropdownRef}
                            >
                                <label className="block text-xs font-semibold text-text-muted ml-1">
                                    Designated Manager
                                </label>

                                <div
                                    onClick={() =>
                                        setManagerDropdownOpen(
                                            !managerDropdownOpen
                                        )
                                    }
                                    className={clsx(
                                        'w-full flex items-center justify-between bg-surface-solid border rounded-xl px-4 py-3 cursor-pointer transition-all shadow-shell-sm min-w-0',
                                        managerDropdownOpen
                                            ? 'border-primary ring-2 ring-primary/20'
                                            : 'border-border hover:border-text-muted/30'
                                    )}
                                >
                                    {managerId ? (
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-[11px] font-bold shadow-shell-sm shrink-0">
                                                {members
                                                    .find(
                                                        (m) =>
                                                            m.id === managerId
                                                    )
                                                    ?.full_name?.[0]
                                                    ?.toUpperCase()}
                                            </div>

                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[13px] font-bold text-text-primary leading-none mb-0.5 truncate">
                                                    {
                                                        members.find(
                                                            (m) =>
                                                                m.id ===
                                                                managerId
                                                        )?.full_name
                                                    }
                                                </span>

                                                <span className="text-[10px] font-bold text-text-muted truncate">
                                                    {
                                                        members.find(
                                                            (m) =>
                                                                m.id ===
                                                                managerId
                                                        )?.email
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-[13px] font-medium text-text-muted truncate">
                                            Select a manager...
                                        </span>
                                    )}

                                    <ChevronDown
                                        className={clsx(
                                            'w-4 h-4 text-text-muted transition-transform duration-300 shrink-0 ml-2',
                                            managerDropdownOpen &&
                                                'rotate-180'
                                        )}
                                    />
                                </div>

                                {managerDropdownOpen && (
                                    <div className="absolute top-[100%] left-0 w-full mt-2 bg-surface border border-border rounded-2xl shadow-2xl z-[100] max-h-[260px] overflow-y-auto custom-scrollbar p-2 animate-in fade-in zoom-in-95 duration-200">
                                        {members.map((m) => (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    setManagerId(m.id);
                                                    setManagerDropdownOpen(
                                                        false
                                                    );
                                                }}
                                                className={clsx(
                                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group min-w-0',
                                                    managerId === m.id
                                                        ? 'bg-primary/10'
                                                        : 'hover:bg-surface-hover'
                                                )}
                                            >
                                                <div
                                                    className={clsx(
                                                        'w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-bold transition-all shadow-sm shrink-0',
                                                        managerId === m.id
                                                            ? 'bg-primary text-white shadow-primary/30'
                                                            : 'bg-surface-solid border border-border text-text-muted group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20'
                                                    )}
                                                >
                                                    {m.full_name[0].toUpperCase()}
                                                </div>

                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span
                                                        className={clsx(
                                                            'text-[13px] font-bold leading-none mb-1 truncate transition-colors',
                                                            managerId === m.id
                                                                ? 'text-primary'
                                                                : 'text-text-primary group-hover:text-primary'
                                                        )}
                                                    >
                                                        {m.full_name}
                                                    </span>

                                                    <span className="text-[10px] font-bold text-text-muted truncate opacity-80">
                                                        {m.email}
                                                    </span>
                                                </div>

                                                {managerId === m.id && (
                                                    <Check
                                                        className="w-4 h-4 text-primary shrink-0"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-semibold text-text-muted ml-1">
                                    Description
                                </label>

                                <textarea
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="Describe the team's purpose and responsibilities..."
                                    rows={5}
                                    className="w-full bg-surface-solid border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-primary transition-all resize-none shadow-shell-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* =================================================
                        STEP 2
                    ================================================== */}
                    {wizardStep === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

                            <div className="flex items-center justify-between gap-3 min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <UsersRound className="w-5 h-5 text-primary shrink-0" />

                                    <p className="text-sm font-semibold text-text-primary truncate">
                                        Select Team Members
                                    </p>
                                </div>

                                <StatusBadge
                                    variant={
                                        selectedMemberIds.size > 0
                                            ? 'success'
                                            : 'default'
                                    }
                                >
                                    {selectedMemberIds.size} Selected
                                </StatusBadge>
                            </div>

                            <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
                                {members.map((m) => {
                                    const isSelected =
                                        selectedMemberIds.has(m.id);

                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                const next = new Set(
                                                    selectedMemberIds
                                                );

                                                if (next.has(m.id)) {
                                                    next.delete(m.id);

                                                    const nextLeads = new Set(
                                                        selectedLeadIds
                                                    );

                                                    nextLeads.delete(m.id);

                                                    setSelectedLeadIds(
                                                        nextLeads
                                                    );
                                                } else {
                                                    next.add(m.id);
                                                }

                                                setSelectedMemberIds(next);
                                            }}
                                            className={clsx(
                                                'w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left group min-w-0',
                                                isSelected
                                                    ? 'bg-primary/[0.03] border-primary/40 shadow-shell-sm'
                                                    : 'bg-surface-solid border-border hover:border-text-muted/30'
                                            )}
                                        >
                                            <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                                                <div
                                                    className={clsx(
                                                        'w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] sm:rounded-[18px] flex items-center justify-center text-[16px] font-bold font-mono transition-transform group-hover:scale-105 shrink-0',
                                                        isSelected
                                                            ? 'bg-primary text-white shadow-shell-md shadow-primary/20'
                                                            : 'bg-border/40 text-text-muted'
                                                    )}
                                                >
                                                    {m.full_name[0].toUpperCase()}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-text-primary leading-none mb-1 truncate">
                                                        {m.full_name}
                                                    </p>

                                                    <p className="text-xs text-text-muted truncate">
                                                        {m.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <div
                                                className={clsx(
                                                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ml-3',
                                                    isSelected
                                                        ? 'bg-primary border-primary rotate-0'
                                                        : 'border-border rotate-45 group-hover:rotate-0'
                                                )}
                                            >
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-white stroke-[3.5]" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* =================================================
                        STEP 3
                    ================================================== */}
                    {wizardStep === 3 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">

                            <div className="flex items-center justify-between gap-3 min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Briefcase className="w-5 h-5 text-primary shrink-0" />

                                    <p className="text-sm font-semibold text-text-primary truncate">
                                        Link Projects
                                    </p>
                                </div>

                                <StatusBadge
                                    variant={
                                        selectedProjectIds.size > 0
                                            ? 'success'
                                            : 'default'
                                    }
                                >
                                    {selectedProjectIds.size} Linked
                                </StatusBadge>
                            </div>

                            <div className="flex flex-col gap-4 max-h-[420px] overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
                                {allProjects.map((p) => {
                                    const isSelected =
                                        selectedProjectIds.has(p.id);

                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                const next = new Set(
                                                    selectedProjectIds
                                                );

                                                if (next.has(p.id)) {
                                                    next.delete(p.id);
                                                } else {
                                                    next.add(p.id);
                                                }

                                                setSelectedProjectIds(next);
                                            }}
                                            className={clsx(
                                                'w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left group min-w-0',
                                                isSelected
                                                    ? 'bg-primary/[0.03] border-primary/40 shadow-shell-sm'
                                                    : 'bg-surface-solid border-border hover:border-text-muted/30'
                                            )}
                                        >
                                            <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                                                <div
                                                    className={clsx(
                                                        'w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] sm:rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105 shrink-0',
                                                        isSelected
                                                            ? 'bg-primary text-white shadow-shell-md shadow-primary/20'
                                                            : 'bg-border/40 text-text-muted'
                                                    )}
                                                >
                                                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-text-primary leading-none mb-1 truncate">
                                                        {p.name}
                                                    </p>

                                                    <p className="text-xs text-text-muted truncate">
                                                        Active Project
                                                    </p>
                                                </div>
                                            </div>

                                            <div
                                                className={clsx(
                                                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ml-3',
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border rotate-45 group-hover:rotate-0'
                                                )}
                                            >
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-white stroke-[3.5]" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* =========================================================
                DELETE MODAL
            ========================================================== */}
            <Modal
                isOpen={!!deletingTeam}
                onClose={() => setDeletingTeam(null)}
                title="Delete Team"
                maxWidth="max-w-md"
                footer={
                    <div className="flex gap-3 sm:gap-4 w-full">
                        <Button
                            variant="secondary"
                            className="flex-1 px-5 sm:px-8"
                            onClick={() => setDeletingTeam(null)}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="danger"
                            className="flex-[2] px-5 sm:px-8 shadow-shell-md shadow-rose-500/10"
                            onClick={handleDelete}
                        >
                            Delete Team
                        </Button>
                    </div>
                }
            >
                <div className="text-center py-8 sm:py-10">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-500/5 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 border border-rose-500/10">
                        <Trash2
                            className="w-10 h-10 sm:w-12 sm:h-12 text-rose-500"
                            strokeWidth={2}
                        />
                    </div>

                    <h4 className="text-xl font-bold text-text-primary tracking-tight mb-3 break-words">
                        Delete "{deletingTeam?.name}"?
                    </h4>

                    <p className="text-sm text-text-muted leading-relaxed px-2 sm:px-6">
                        This will permanently remove the team and all member
                        assignments. This action cannot be undone.
                    </p>
                </div>
            </Modal>
        </PageLayout>
    );
}

function TeamItem({
    team,
    mode,
    onEdit,
    onDelete,
    isViewer
}: {
    team: Team;
    mode: 'grid' | 'list';
    onEdit: () => void;
    onDelete: () => void;
    isViewer: boolean;
}) {
    /* ================================================================
       LIST VIEW
       Desktop: horizontal
       Mobile: completely vertical
    ================================================================= */
    if (mode === 'list') {
        return (
            <div className="group/row w-full min-w-0 px-4 sm:px-6 py-4 hover:bg-surface-hover transition-colors">

                {/* =====================================================
                    MOBILE — PURE COLUMN
                ====================================================== */}
                <div className="flex sm:hidden flex-col w-full min-w-0 gap-4">

                    {/* Team heading */}
                    <div className="w-full min-w-0">
                        <div className="flex items-start justify-between gap-3 w-full min-w-0">

                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border shrink-0">
                                    <Briefcase className="w-4 h-4 text-text-muted" />
                                </div>

                                <h3 className="font-bold text-text-primary text-sm tracking-tight truncate min-w-0">
                                    {team.name}
                                </h3>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={onEdit}
                                    disabled={isViewer}
                                    className="p-2 rounded-lg hover:bg-surface-solid text-text-muted hover:text-primary transition-colors"
                                    aria-label={`Edit ${team.name}`}
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={onDelete}
                                    disabled={isViewer}
                                    className="p-2 rounded-lg hover:bg-surface-solid text-text-muted hover:text-rose-500 transition-colors"
                                    aria-label={`Delete ${team.name}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="w-full min-w-0">
                        <p className="text-xs text-text-muted font-medium leading-relaxed break-words">
                            {team.description || 'No description provided'}
                        </p>
                    </div>

                    {/* Manager — separate column block */}
                    <div className="w-full min-w-0 border-t border-border/60 pt-3">
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                Manager
                            </span>

                            <span className="text-sm font-semibold text-text-primary break-words">
                                {team.manager_name || 'Unassigned'}
                            </span>
                        </div>
                    </div>

                    {/* Members — separate column block */}
                    <div className="w-full min-w-0 border-t border-border/60 pt-3">
                        <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                Members
                            </span>

                            <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                                <UsersRound className="w-4 h-4 text-text-muted shrink-0" />

                                <span>
                                    {team.member_count}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =====================================================
                    DESKTOP — HORIZONTAL
                ====================================================== */}
                <div className="hidden sm:flex items-center w-full min-w-0">

                    {/* Team */}
                    <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                            <h3 className="font-bold text-text-primary text-sm tracking-tight truncate">
                                {team.name}
                            </h3>
                        </div>

                        <p className="text-xs text-text-muted font-medium truncate opacity-80">
                            {team.description || 'No description provided'}
                        </p>
                    </div>

                    {/* Manager */}
                    <div className="w-44 lg:w-48 shrink-0 flex flex-col justify-center border-l border-border/50 pl-6">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                            Manager
                        </span>

                        <span className="text-sm font-semibold text-text-primary truncate">
                            {team.manager_name || 'Unassigned'}
                        </span>
                    </div>

                    {/* Members */}
                    <div className="w-28 lg:w-32 shrink-0 flex flex-col justify-center border-l border-border/50 px-5 lg:px-6">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
                            Members
                        </span>

                        <div className="flex items-center gap-1.5 text-text-primary font-semibold text-sm">
                            <UsersRound className="w-3.5 h-3.5 text-text-muted shrink-0" />

                            <span>
                                {team.member_count}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-20 shrink-0 flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button
                            onClick={onEdit}
                            disabled={isViewer}
                            className="p-1.5 rounded-md hover:bg-surface-solid text-text-muted hover:text-primary transition-colors"
                            aria-label={`Edit ${team.name}`}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>

                        <button
                            onClick={onDelete}
                            disabled={isViewer}
                            className="p-1.5 rounded-md hover:bg-surface-solid text-text-muted hover:text-rose-500 transition-colors"
                            aria-label={`Delete ${team.name}`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ================================================================
       GRID VIEW
    ================================================================= */
    return (
        <Card
            className="h-full flex flex-col group/card hover:border-text-muted/30 transition-colors bg-surface-solid border-border shadow-none min-w-0 overflow-hidden"
            noPadding
        >
            <div className="p-4 sm:p-5 pb-4 flex-1 min-w-0">

                {/* Header */}
                <div className="flex items-start justify-between mb-3 gap-2 min-w-0">

                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-border shrink-0">
                            <Briefcase className="w-4 h-4 text-text-muted" />
                        </div>

                        <h3 className="text-base font-bold text-text-primary tracking-tight leading-tight truncate min-w-0">
                            {team.name}
                        </h3>
                    </div>

                    <div className="flex gap-1 shrink-0 -mt-1 -mr-1">
                        <button
                            onClick={onEdit}
                            disabled={isViewer}
                            className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-primary transition-colors"
                            aria-label={`Edit ${team.name}`}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                            onClick={onDelete}
                            disabled={isViewer}
                            className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-rose-500 transition-colors"
                            aria-label={`Delete ${team.name}`}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs font-medium text-text-muted leading-relaxed line-clamp-2 break-words">
                    {team.description || 'No description provided.'}
                </p>
            </div>

            {/* Bottom information */}
            <div className="px-4 sm:px-5 py-3 border-t border-border bg-surface/50 flex flex-col gap-2 min-w-0">

                {/* Manager */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider shrink-0">
                        Manager
                    </span>

                    <span className="text-xs font-semibold text-text-primary truncate max-w-[55%] text-right">
                        {team.manager_name || 'Unassigned'}
                    </span>
                </div>

                {/* Members */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider shrink-0">
                        Members
                    </span>

                    <div className="flex items-center gap-1.5 text-text-primary font-semibold text-xs shrink-0">
                        <UsersRound className="w-3 h-3 text-text-muted" />

                        <span>
                            {team.member_count}
                        </span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
