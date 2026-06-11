import { supabase } from '../lib/supabase';

export interface LeadPermissions {
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

export interface Team {
    id: string;
    name: string;
    description: string;
    manager_id: string | null;
    manager_name?: string;
    member_count: number;
    created_at: string;
    memberIds?: string[];
    leadIds?: string[];
    projectIds?: string[];
}

export const teamService = {
  async fetchTeams(): Promise<Team[]> {
    const { data, error } = await supabase.from('teams').select(`
        *, 
        members!teams_manager_id_fkey(full_name), 
        team_members(member_id, is_lead),
        project_teams(project_id)
    `).order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((t: any) => ({
        ...t,
        manager_name: t.members?.full_name,
        member_count: t.team_members?.length || 0,
        memberIds: t.team_members?.map((tm: any) => tm.member_id) || [],
        leadIds: t.team_members?.filter((tm: any) => tm.is_lead).map((tm: any) => tm.member_id) || [],
        projectIds: t.project_teams?.map((pt: any) => pt.project_id) || []
    }));
  },

  async fetchTeamLeadPermissions(teamId: string): Promise<Record<string, LeadPermissions>> {
    const { data, error } = await supabase
        .from('team_lead_permissions')
        .select('*')
        .eq('team_id', teamId);

    if (error) throw error;

    const permsMap: Record<string, LeadPermissions> = {};
    data?.forEach((p: any) => {
        const { id, team_id, member_id, created_at, updated_at, ...rest } = p;
        permsMap[member_id] = rest;
    });

    return permsMap;
  },

  async saveTeam(payload: {
    id?: string;
    name: string;
    description: string;
    manager_id: string | null;
    organization_id?: string;
    selectedMemberIds: Set<string>;
    selectedLeadIds: Set<string>;
    selectedProjectIds: Set<string>;
    leadPermissions: Record<string, LeadPermissions>;
    defaultPermissions: LeadPermissions;
  }): Promise<void> {
    let teamId = payload.id;
    const teamPayload = {
        name: payload.name,
        description: payload.description,
        manager_id: payload.manager_id,
        organization_id: payload.organization_id
    };

    if (teamId) {
        const { error } = await supabase.from('teams').update(teamPayload).eq('id', teamId);
        if (error) throw error;
    } else {
        const { data, error } = await supabase.from('teams').insert(teamPayload).select().single();
        if (error) throw error;
        teamId = data.id;
    }

    if (!teamId) return;

    // 1. Sync Members
    await supabase.from('team_members').delete().eq('team_id', teamId);
    if (payload.selectedMemberIds.size > 0) {
        const memberInserts = Array.from(payload.selectedMemberIds).map(mid => ({
            team_id: teamId,
            member_id: mid,
            is_lead: payload.selectedLeadIds.has(mid)
        }));
        await supabase.from('team_members').insert(memberInserts);
    }

    // 2. Sync Projects
    await supabase.from('project_teams').delete().eq('team_id', teamId);
    if (payload.selectedProjectIds.size > 0) {
        const projectInserts = Array.from(payload.selectedProjectIds).map(pid => ({
            team_id: teamId,
            project_id: pid
        }));
        await supabase.from('project_teams').insert(projectInserts);
    }

    // 3. Sync Lead Permissions
    await supabase.from('team_lead_permissions').delete().eq('team_id', teamId);
    if (payload.selectedLeadIds.size > 0) {
        const permInserts = Array.from(payload.selectedLeadIds).map(mid => ({
            team_id: teamId,
            member_id: mid,
            ...(payload.leadPermissions[mid] || payload.defaultPermissions)
        }));
        await supabase.from('team_lead_permissions').insert(permInserts);
    }
  },

  async deleteTeam(id: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  }
};
