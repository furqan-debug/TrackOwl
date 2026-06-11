import { supabase } from '../lib/supabase';
import type { Project, ProjectStatus } from '../types';

export const projectService = {
  async fetchProjects(status: ProjectStatus): Promise<Project[]> {
    const { data, error } = await supabase
        .from('projects')
        .select(`
            *,
            clients (name),
            project_members (member_id),
            project_teams (team_id),
            todos (id)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((p: any) => ({
        ...p,
        client_name: p.clients?.name,
        memberCount: p.project_members?.length || 0,
        teamCount: p.project_teams?.length || 0,
        todoCount: p.todos?.length || 0,
        memberIds: p.project_members?.map((m: any) => m.member_id) || [],
        teamIds: p.project_teams?.map((t: any) => t.team_id) || []
    }));
  },

  async updateProjectStatus(id: string, status: ProjectStatus): Promise<void> {
    const { error } = await supabase.from('projects').update({ status }).eq('id', id);
    if (error) throw error;
  },

  async updateBulkProjectStatus(ids: string[], status: ProjectStatus): Promise<void> {
    const { error } = await supabase.from('projects').update({ status }).in('id', ids);
    if (error) throw error;
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  }
};
