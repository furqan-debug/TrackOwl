import { supabase } from '../lib/supabase';

/**
 * The list of non-productive sites (Settings → Telemetry).
 *
 * The list is kept in its own tables, never in organizations.settings, because
 * the desktop app reads those settings and this list must not change tracking.
 * The minutes themselves are worked out by the database
 * (nonproductive_compute_blocks in 20261120000001_non_productive_sites.sql);
 * nothing here calculates time.
 */

export type SiteCategory = 'social' | 'video' | 'music' | 'gaming' | 'entertainment';

export interface DefaultSite {
    domain: string;
    category: SiteCategory;
}

export interface SiteRule {
    id: string;
    /** null: everyone in the organisation. */
    member_id: string | null;
    domain: string;
    is_nonproductive: boolean;
}

/** Same rule as the database check, so a bad name is caught before saving. */
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * "https://www.YouTube.com/watch?v=1" -> "youtube.com". null when what is left
 * is not a site name. A leading "www." is dropped because a site always
 * covers its subdomains.
 */
export function normalizeDomain(input: string): string | null {
    let d = input.trim().toLowerCase();
    d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');   // scheme
    d = d.split(/[/?#]/)[0];                        // path, query
    d = d.split('@').pop() ?? d;                    // user@
    d = d.split(':')[0];                            // port
    d = d.replace(/\.+$/, '').replace(/^www\./, '');
    if (d.length === 0 || d.length > 253 || !DOMAIN_RE.test(d)) return null;
    return d;
}

export const nonProductiveService = {
    async fetchDefaults(): Promise<DefaultSite[]> {
        const { data, error } = await supabase
            .from('nonproductive_default_domains')
            .select('domain, category')
            .order('domain');
        if (error) throw error;
        return (data || []) as DefaultSite[];
    },

    /** Every rule in the organisation: its own and every member's. */
    async fetchRules(organizationId: string): Promise<SiteRule[]> {
        const { data, error } = await supabase
            .from('nonproductive_domain_rules')
            .select('id, member_id, domain, is_nonproductive')
            .eq('organization_id', organizationId)
            .order('domain');
        if (error) throw error;
        return (data || []) as SiteRule[];
    },

    async addRule(organizationId: string, memberId: string | null, domain: string, isNonproductive: boolean): Promise<SiteRule> {
        const { data, error } = await supabase
            .from('nonproductive_domain_rules')
            .insert({ organization_id: organizationId, member_id: memberId, domain, is_nonproductive: isNonproductive })
            .select('id, member_id, domain, is_nonproductive')
            .single();
        if (error) throw error;
        return data as SiteRule;
    },

    async updateRule(id: string, patch: Partial<Pick<SiteRule, 'domain' | 'is_nonproductive'>>): Promise<SiteRule> {
        const { data, error } = await supabase
            .from('nonproductive_domain_rules')
            .update(patch)
            .eq('id', id)
            .select('id, member_id, domain, is_nonproductive')
            .single();
        if (error) throw error;
        return data as SiteRule;
    },

    async deleteRule(id: string): Promise<void> {
        const { error } = await supabase.from('nonproductive_domain_rules').delete().eq('id', id);
        if (error) throw error;
    },
};
