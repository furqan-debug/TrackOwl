import { supabase } from '../lib/supabase';
import type { Member } from '../types';

export const memberService = {
  async fetchMembers(managedMemberIds?: string[] | null): Promise<Member[]> {
    let query = supabase
        .from('members')
        .select('*, project_members(count), sessions(count)')
        .neq('status', 'Deleted')
        .order('created_at', { ascending: false });

    if (managedMemberIds) {
        query = query.in('id', managedMemberIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    if (!data) return [];

    return data.map((d: any) => ({
        ...d,
        projectsCount: d.project_members?.[0]?.count || 0,
        sessionCount: d.sessions?.[0]?.count || 0
    }));
  },

  async deleteMember(id: string): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('delete-member', {
        body: { memberId: id }
      });
      if (!error && data?.success) return;
      if (error) console.warn('Edge function delete-member failed, trying RPC fallback:', error);
    } catch (err) {
      console.warn('Edge function invoke exception, trying RPC fallback:', err);
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('rpc_delete_member', {
      p_member_id: id
    });
    if (rpcErr) throw rpcErr;
    if (rpcRes && (rpcRes as any).error) throw new Error((rpcRes as any).error);
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
