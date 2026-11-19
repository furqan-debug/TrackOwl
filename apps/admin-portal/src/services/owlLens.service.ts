import { supabase } from '../lib/supabase';

/**
 * Owl Lens reads highlights the database job has already worked out
 * (see supabase/migrations/20261119000001_owl_lens.sql). Nothing is
 * calculated here: the page only lists, filters and reviews them.
 */

export type HighlightKind =
    | 'not_started'
    | 'long_day'
    | 'idle'
    | 'low_input'
    | 'input_pattern'
    | 'app_mix'
    | 'focus';

export type HighlightSeverity = 'critical' | 'warning' | 'info' | 'positive';

/** 'resolved' is the job's own "no longer true" and never reaches the page. */
export type HighlightStatus = 'active' | 'acknowledged' | 'dismissed' | 'expected';

export type BaselineSource = 'personal' | 'team' | 'organization' | 'rule';

export interface OwlLensHighlight {
    id: string;
    member_id: string;
    member_name: string;
    member_avatar: string | null;
    business_date: string;
    kind: HighlightKind;
    severity: HighlightSeverity;
    detail: string;
    baseline_source: BaselineSource;
    window_start: string | null;
    window_end: string | null;
    status: HighlightStatus;
    status_reason: string | null;
    status_by_name: string | null;
    status_at: string | null;
    detected_at: string;
    updated_at: string;
}

export interface OwlLensRunState {
    last_run_at: string | null;
    last_error_at: string | null;
    /** During the quiet trial only Owners and Admins see Owl Lens. */
    trial_until: string | null;
}

/** One row as PostgREST returns it, with the two member joins. */
interface HighlightRow extends Omit<OwlLensHighlight, 'member_name' | 'member_avatar' | 'status_by_name'> {
    member: { full_name: string | null; avatar_url: string | null } | null;
    reviewer: { full_name: string | null } | null;
}

export const owlLensService = {
    /** Every highlight for one organisation day that the signed-in person may see. */
    async fetchHighlights(organizationId: string, date: string): Promise<OwlLensHighlight[]> {
        const { data, error } = await supabase
            .from('owl_lens_highlights')
            .select(`
                id, member_id, business_date, kind, severity, detail, baseline_source,
                window_start, window_end, status, status_reason, status_at, detected_at, updated_at,
                member:members!owl_lens_highlights_member_id_fkey(full_name, avatar_url),
                reviewer:members!owl_lens_highlights_status_by_fkey(full_name)
            `)
            .eq('organization_id', organizationId)
            .eq('business_date', date)
            .neq('status', 'resolved');

        if (error) throw error;

        return ((data || []) as unknown as HighlightRow[]).map(h => ({
            id: h.id,
            member_id: h.member_id,
            member_name: h.member?.full_name || 'Unknown member',
            member_avatar: h.member?.avatar_url || null,
            business_date: h.business_date,
            kind: h.kind,
            severity: h.severity,
            detail: h.detail,
            baseline_source: h.baseline_source,
            window_start: h.window_start,
            window_end: h.window_end,
            status: h.status,
            status_reason: h.status_reason,
            status_by_name: h.reviewer?.full_name || null,
            status_at: h.status_at,
            detected_at: h.detected_at,
            updated_at: h.updated_at,
        }));
    },

    /** Acknowledge, dismiss, mark as expected, or put back ('active'). */
    async setStatus(id: string, status: HighlightStatus, reason?: string): Promise<void> {
        const { error } = await supabase.rpc('owl_lens_set_status', {
            p_id: id,
            p_status: status,
            p_reason: reason ?? null,
        });
        if (error) throw error;
    },

    /** When the background check last ran, for the "checked N min ago" line. */
    async fetchRunState(organizationId: string): Promise<OwlLensRunState | null> {
        const { data, error } = await supabase
            .from('owl_lens_org_state')
            .select('last_run_at, last_error_at, trial_until')
            .eq('organization_id', organizationId)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    /** Owners and Admins: end the quiet trial now, so Managers and Viewers see Owl Lens. */
    async endTrial(organizationId: string): Promise<void> {
        const { error } = await supabase.rpc('owl_lens_end_trial', { p_org: organizationId });
        if (error) throw error;
    },
};
