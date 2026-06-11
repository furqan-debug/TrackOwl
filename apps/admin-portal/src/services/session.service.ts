import { supabase } from '../lib/supabase';
import type { Session } from '../types';

export interface FetchSessionsOptions {
  organizationId: string;
  fetchStart?: string;
  fetchEnd?: string;
  userIds?: string[];
  projectId?: string;
}

export const sessionService = {
  async fetchSessions(options: FetchSessionsOptions): Promise<Session[]> {
    let query = supabase.from('sessions')
        .select('id, user_id, project_id, started_at, ended_at, organization_id')
        .eq('organization_id', options.organizationId)
        .order('started_at', { ascending: false });

    if (options.fetchEnd) {
      query = query.lt('started_at', options.fetchEnd);
    }
    
    if (options.fetchStart) {
      query = query.or(`ended_at.is.null,ended_at.gt.${options.fetchStart}`);
    }

    if (options.userIds && options.userIds.length > 0) {
        query = query.in('user_id', options.userIds);
    }

    if (options.projectId && options.projectId !== 'all') {
        query = query.eq('project_id', options.projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data as Session[];
  },

  async createManualSession(data: { projectId: string; userId: string; startedAt: string; endedAt: string; organizationId?: string }): Promise<void> {
    const { error } = await supabase.from('sessions').insert({
        project_id: data.projectId,
        user_id: data.userId,
        started_at: data.startedAt,
        ended_at: data.endedAt,
        organization_id: data.organizationId,
        manual: true
    });
    if (error) throw error;
  }
};
