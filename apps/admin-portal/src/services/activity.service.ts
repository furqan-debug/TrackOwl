import { supabase } from '../lib/supabase';
import { fetchAllActivitySamples } from '../lib/dataUtils';

export interface AppEntry {
    app: string;
    raw_app: string;
    domain: string;
    window_title: string;
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
        const minifiedMembers = members.map(m => ({ id: m.id, auth_user_id: m.auth_user_id, idle_limit: m.idle_limit }));

        const { data, error } = await supabase.functions.invoke('get-app-usage', {
            body: { organizationId, start, end, members: minifiedMembers, selectedMemberId }
        });

        if (error || !data) {
            console.error("Error invoking get-app-usage function:", error);
            return [];
        }

        let total = 0;
        const mapped = data.map((r: any) => {
            total += r.count;
            return {
                ...r,
                category: categorizeApp(r.raw_app)
            };
        });

        return mapped.map((r: any) => ({
            ...r,
            percent: total > 0 ? (r.count / total) * 100 : 0
        })).sort((a: any, b: any) => b.count - a.count);
    },

    async fetchDomains(
        organizationId: string,
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
            'session_id, domain, window_title, recorded_at',
            { organizationId }
        );

        const sessionIdsSet = new Set(sessionIds);
        const data = (rawSamples || []).filter((r: any) => {
            if (!sessionIdsSet.has(r.session_id)) return false;
            return (r.domain || '').trim() !== '' || (r.window_title || '').trim() !== '';
        });

        const minuteMap = new Map<string, any>();
        data.forEach((s: any) => {
            const minute = `${s.session_id}_${new Date(s.recorded_at).toISOString().substring(0, 16)}`;
            minuteMap.set(minute, s);
        });
        const uniqueData = Array.from(minuteMap.values());

        const domainMap: Record<string, number> = {};
        const hourMap: Record<number, number> = {};

        uniqueData.forEach((row: any) => {
            const domainVal = (row.domain || '').trim();
            const displayUrl = domainVal !== '' ? domainVal : (row.window_title || '').trim();
            if (!displayUrl) return;

            domainMap[displayUrl] = (domainMap[displayUrl] || 0) + 1;
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

        const [rawActData, { data: ssData, count: totalSS }, { data: statsData }] = await Promise.all([
            fetchAllActivitySamples(
                supabase as any,
                start,
                end,
                'id, session_id, recorded_at, mouse_clicks, key_presses, app_name, window_title, idle, activity_percent',
                { organizationId }
            ),
            supabase.from('screenshots')
                .select('id, session_id, recorded_at, file_url', { count: 'exact' })
                .eq('organization_id', organizationId)
                .in('session_id', sessionIds)
                .gte('recorded_at', start)
                .lte('recorded_at', end)
                .order('recorded_at', { ascending: false })
                .limit(screenshotLimit),
            supabase.rpc('get_sessions_activity_stats', { p_session_ids: sessionIds })
        ]);

        const startMs = new Date(start).getTime();
        const endMs = new Date(end).getTime();

        const parseDbTimestamp = (ts: string | null | undefined) => {
            if (!ts) return null;
            const normalized = (ts.endsWith('Z') || ts.includes('+') || /-\d{2}:\d{2}$/.test(ts)) ? ts : ts + 'Z';
            return new Date(normalized).getTime();
        };

        const nowMs = new Date().getTime();
        const mins = sessions.reduce((acc, s) => {
            const startedAtMs = parseDbTimestamp(s.started_at) || new Date(s.started_at).getTime();
            
            // Timesheets and Reports ONLY attribute session durations to the day the session STARTED.
            // If the session started before startMs or after endMs, skip it for the daily total duration.
            if (startedAtMs < startMs || startedAtMs > endMs) {
                return acc;
            }

            const stats = (statsData || []).find((st: any) => st.session_id === s.id);
            const sampleCount = stats ? parseInt(stats.sample_count) : 0;
            const lastSampleTime = stats && stats.last_sample_at ? (parseDbTimestamp(stats.last_sample_at) || startedAtMs) : startedAtMs;

            const isTrulyActive = !s.ended_at && (nowMs - startedAtMs < 14 * 60 * 60 * 1000);

            let effectiveEndMs = nowMs;
            if (s.ended_at) {
                effectiveEndMs = parseDbTimestamp(s.ended_at) || new Date(s.ended_at).getTime();
            } else if (isTrulyActive) {
                effectiveEndMs = nowMs;
            } else if (sampleCount > 0) {
                effectiveEndMs = Math.max(lastSampleTime, startedAtMs);
            } else {
                effectiveEndMs = nowMs;
            }

            const overlapStartMs = Math.max(startedAtMs, startMs);
            const overlapEndMs = Math.min(effectiveEndMs, endMs);
            
            let durationMins = (overlapEndMs - overlapStartMs) / 60000;
            if (durationMins < 0) durationMins = 0;
            
            return acc + durationMins;
        }, 0);

        const sessionIdsSet = new Set(sessionIds);
        const filteredSamples = (rawActData || []).filter((s: any) => sessionIdsSet.has(s.session_id));

        return {
            samples: filteredSamples,
            screenshots: ssData || [],
            sessionMinutes: mins,
            hasMoreScreenshots: (totalSS || 0) > screenshotLimit
        };
    }
};
