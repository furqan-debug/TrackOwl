import { supabase } from '../lib/supabase';
import type { Member } from '../types';

export const memberService = {
  async fetchMembers(): Promise<Member[]> {
    const { data, error } = await supabase
        .from('members')
        .select('*, project_members(count), sessions(count)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (!data) return [];

    return data.map((d: any) => ({
        ...d,
        projectsCount: d.project_members?.[0]?.count || 0,
        sessionCount: d.sessions?.[0]?.count || 0
    }));
  },

  async deleteMember(id: string): Promise<void> {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) throw error;
  },

  async reactivateMember(id: string): Promise<void> {
    const { error } = await supabase.from('members').update({ status: 'Active' }).eq('id', id);
    if (error) throw error;
  },

  async bulkDeleteMembers(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.deleteMember(id);
    }
  }
};
