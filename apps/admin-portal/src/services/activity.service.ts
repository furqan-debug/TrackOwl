import { supabase } from '../lib/supabase';
import { fetchAllActivitySamples } from '../lib/dataUtils';

export interface AppEntry {
    app: string;
    count: number;
    percent: number;
    category: string;
}

export interface DomainEntry {
    domain: string;
    count: number;
    percent: number;
    category: string;
}

export interface ActivityData {
    samples: any[];
    screenshots: any[];
    sessionMinutes: number;
    hasMoreScreenshots: boolean;
}

const CATEGORIES: Record<string, string> = {
    'github.com': 'Development', 'stackoverflow.com': 'Development', 'localhost': 'Development',
    'google.com': 'Search', 'bing.com': 'Search',
    'youtube.com': 'Media', 'netflix.com': 'Media',
    'slack.com': 'Communication', 'teams.microsoft.com': 'Communication', 'discord.com': 'Communication',
    'notion.so': 'Productivity', 'figma.com': 'Productivity', 'linear.app': 'Productivity',
    'twitter.com': 'Social', 'x.com': 'Social', 'linkedin.com': 'Social', 'facebook.com': 'Social',
};

function categorizeDomain(domain: string): string {
    const match = Object.keys(CATEGORIES).find(k => domain.includes(k));
    return match ? CATEGORIES[match]! : 'Other';
}

function categorizeApp(appName: string) {
    const l = appName.toLowerCase();
    if (l.includes('code') || l.includes('studio') || l.includes('intellij')) return 'Dev';
    if (l.includes('chrome') || l.includes('edge') || l.includes('firefox') || l.includes('safari')) return 'Web';
    if (l.includes('slack') || l.includes('teams') || l.includes('discord') || l.includes('zoom')) return 'Chat';
    if (l.includes('word') || l.includes('excel') || l.includes('powerpoint') || l.includes('office')) return 'Ops';
    if (l.includes('figma') || l.includes('photoshop') || l.includes('illustrator')) return 'Art';
    return 'Misc';
}

export const activityService = {
    async fetchAppUsage(
        organizationId: string,
        start: string,
        end: string,
        members: any[],
        selectedMemberId: string
    ): Promise<AppEntry[]> {
        const selectedMember = members.find(m => m.id === selectedMemberId);
        const scopedUserIds = selectedMemberId.toLowerCase() !== 'all'
            ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean) as string[]))
            : Array.from(new Set(members.flatMap(m => [m.id, m.auth_user_id].filter(Boolean) as string[])));

        if (scopedUserIds.length === 0) {
            return [];
        }

        let sessionsQuery = supabase.from('sessions').select('id, user_id').eq('organization_id', organizationId).lt('started_at', end).or(`ended_at.is.null,ended_at.gt.${start}`);
        if (scopedUserIds.length > 0) sessionsQuery = sessionsQuery.in('user_id', scopedUserIds);

        const { data: userSessions } = await sessionsQuery;
        const sessionIds = userSessions?.map(s => s.id) || [];

        if (sessionIds.length === 0) {
            return [];
        }

        const samples = await fetchAllActivitySamples(supabase, start, end, 'session_id, app_name, recorded_at, idle', {
            organizationId: organizationId,
            sessionIds: sessionIds.length > 0 ? sessionIds : undefined
        });

        if (!samples) return [];

        const membersMap = new Map(members.map(m => [m.id, m]));
        const samplesByUser = new Map<string, any[]>();
        samples.forEach((s: any) => {
            const uid = userSessions?.find(sess => sess.id === s.session_id)?.user_id;
            if (!uid) return;
            if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
            samplesByUser.get(uid)!.push(s);
        });

        const appCounts: Record<string, number> = {};
        let total = 0;

        const productiveSamples: any[] = [];
        samplesByUser.forEach((userSamps, uid) => {
            const limit = membersMap.get(uid)?.idle_limit ?? 0;
            if (limit <= 1) {
                productiveSamples.push(...userSamps);
            } else {
                const sorted = userSamps.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
                let currentBlock: any[] = [];
                for (let i = 0; i < sorted.length; i++) {
                    const s = sorted[i];
                    const prev = i > 0 ? sorted[i - 1] : null;
                    const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
                    const isContiguous = prev && gapMs <= 125000;

                    if (s.idle && isContiguous) {
                        currentBlock.push(s);
                    } else if (s.idle && !prev) {
                        currentBlock = [s];
                    } else if (s.idle && !isContiguous) {
                        if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                        currentBlock = [s];
                    } else {
                        productiveSamples.push(s);
                        if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
                        currentBlock = [];
                    }
                }
                if (currentBlock.length < limit) productiveSamples.push(...currentBlock);
            }
        });

        productiveSamples.forEach(s => {
            const name = s.app_name?.trim();
            if (!name || name.toLowerCase() === 'program manager') return;
            appCounts[name] = (appCounts[name] || 0) + 1;
            total++;
        });

        return Object.entries(appCounts).map(([app, count]) => ({
            app,
            count,
            percent: total > 0 ? (count / total) * 100 : 0,
            category: categorizeApp(app)
        })).sort((a, b) => b.count - a.count);
    },

    async fetchDomains(
        start: string,
        end: string,
        members: any[],
        selectedMemberId: string
    ): Promise<{ domains: DomainEntry[], hourlyData: { hour: string; count: number }[] }> {
        const selectedMember = members.find(m => m.id === selectedMemberId);
        
        const scopedUserIds = selectedMemberId.toLowerCase() !== 'all'
            ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean) as string[]))
            : Array.from(new Set(members.flatMap(m => [m.id, m.auth_user_id].filter(Boolean) as string[])));

        if (scopedUserIds.length === 0) {
            return {
                domains: [],
                hourlyData: Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }))
            };
        }

        const { data: userSessions } = await supabase
            .from('sessions')
            .select('id')
            .in('user_id', scopedUserIds)
            .lt('started_at', end)
            .or(`ended_at.is.null,ended_at.gt.${start}`);

        const sessionIds = userSessions?.map(s => s.id) || [];

        if (sessionIds.length === 0) {
            return {
                domains: [],
                hourlyData: Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }))
            };
        }

        const rawSamples = await fetchAllActivitySamples(
            supabase as any,
            start,
            end,
            'domain, recorded_at',
            { sessionIds }
        );

        const data = (rawSamples || []).filter((r: any) => (r.domain || '').trim() !== '');

        const domainMap: Record<string, number> = {};
        const hourMap: Record<number, number> = {};

        data.forEach((row: any) => {
            if (!row.domain) return;
            domainMap[row.domain] = (domainMap[row.domain] || 0) + 1;
            const h = new Date(row.recorded_at).getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
        });

        const total = Object.values(domainMap).reduce((a, b) => a + b, 0) || 1;
        const sorted: DomainEntry[] = Object.entries(domainMap)
            .sort((a, b) => b[1] - a[1])
            .map(([domain, count]) => ({
                domain,
                count,
                percent: Math.round((count / total) * 100),
                category: categorizeDomain(domain),
            }));

        const hourlyData = Array.from({ length: 24 }, (_, h) => ({
            hour: `${h}:00`,
            count: hourMap[h] || 0,
        }));

        return { domains: sorted, hourlyData };
    },

    async fetchActivity(
        organizationId: string,
        start: string,
        end: string,
        members: any[],
        selectedMemberId: string,
        screenshotLimit: number
    ): Promise<ActivityData> {
        const selectedMember = members.find(m => m.id === selectedMemberId);
        
        const memberUserIds = selectedMemberId.toLowerCase() !== 'all'
            ? Array.from(new Set([selectedMember?.id, selectedMember?.auth_user_id].filter(Boolean) as string[]))
            : Array.from(new Set(members.flatMap(m => [m.id, m.auth_user_id].filter(Boolean) as string[])));

        if (memberUserIds.length === 0) {
            return { samples: [], screenshots: [], sessionMinutes: 0, hasMoreScreenshots: false };
        }

        let sessionsQuery = supabase
            .from('sessions')
            .select('id, user_id, started_at, ended_at')
            .eq('organization_id', organizationId)
            .lt('started_at', end)
            .or(`ended_at.is.null,ended_at.gt.${start}`);

        if (memberUserIds.length > 0) {
            sessionsQuery = sessionsQuery.in('user_id', memberUserIds);
        }

        const { data: sessionRows } = await sessionsQuery;
        const sessions = sessionRows || [];
        const sessionIds = sessions.map(s => s.id);

        if (sessionIds.length === 0) {
            return { samples: [], screenshots: [], sessionMinutes: 0, hasMoreScreenshots: false };
        }

        const [{ data: actData }, { data: ssData, count: totalSS }] = await Promise.all([
            supabase.from('activity_samples')
                .select('id, session_id, recorded_at, mouse_clicks, key_presses, app_name, window_title, idle, activity_percent')
                .eq('organization_id', organizationId)
                .in('session_id', sessionIds)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .order('recorded_at', { ascending: true }),
            supabase.from('screenshots')
                .select('id, session_id, recorded_at, file_url', { count: 'exact' })
                .eq('organization_id', organizationId)
                .in('session_id', sessionIds)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .order('recorded_at', { ascending: false })
                .limit(screenshotLimit)
        ]);

        const startMs = new Date(start).getTime();
        const endMs = new Date(end).getTime();
        const mins = sessions.reduce((acc, s) => {
            const sStart = new Date(s.started_at).getTime();
            const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
            const overlap = Math.max(0, Math.min(sEnd, endMs) - Math.max(sStart, startMs));
            return acc + overlap / 60000;
        }, 0);

        return {
            samples: actData || [],
            screenshots: ssData || [],
            sessionMinutes: mins,
            hasMoreScreenshots: (totalSS || 0) > screenshotLimit
        };
    }
};
