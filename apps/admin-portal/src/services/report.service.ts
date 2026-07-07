import { supabase } from '../lib/supabase';
import { getDayIndexInTz, getEffectiveEnd, calculateActivityScore, getGroupingDateInTz } from '../lib/dataUtils';

export interface OwedRow {
    member_id: string;
    full_name: string;
    pay_rate: number;
    totalHours: number;
    amountOwed: number;
    lastTracked: string;
}

export interface DayTotal {
    member: string;
    totals: number[]; // 7 days (Mon-Sun)
    weeklyTotal: number;
}

export interface MemberFinancial {
    member_id: string;
    full_name: string;
    pay_rate: number;
    bill_rate: number;
    totalMinutes: number;
    totalCost: number;
    sessions: number;
}

export const reportService = {
  async fetchAmountsOwed(start: Date): Promise<OwedRow[]> {
    const { data: members, error: memberErr } = await supabase
        .from('members')
        .select('id, full_name, pay_rate, organization_id');

    if (memberErr || !members || members.length === 0) {
        return [];
    }

    const orgId = members[0].organization_id;
    const { data: stats, error: statsErr } = await supabase.rpc('get_amounts_owed_stats', {
        p_org_id: orgId,
        p_start_iso: start.toISOString()
    });

    if (statsErr) {
        console.error("Error fetching amounts owed stats:", statsErr);
        return [];
    }

    const memberMap: Record<string, { name: string; pay_rate: number }> = {};
    members.forEach((m: any) => {
        memberMap[m.id] = { name: m.full_name, pay_rate: m.pay_rate ?? 0 };
    });

    const result: OwedRow[] = (stats || [])
        .filter((s: any) => memberMap[s.user_id])
        .map((s: any) => {
            const hours = (s.productive_mins || 0) / 60;
            const payRate = memberMap[s.user_id].pay_rate;
            return {
                member_id: s.user_id,
                full_name: memberMap[s.user_id].name,
                pay_rate: payRate,
                totalHours: Math.round(hours * 100) / 100,
                amountOwed: Math.round(hours * payRate * 100) / 100,
                lastTracked: s.last_tracked ? new Date(s.last_tracked).toLocaleDateString() : 'Never'
            };
        }).sort((a: any, b: any) => b.amountOwed - a.amountOwed);

    return result;
  },

  async fetchDailyTotals(options: {
    start: Date;
    end: Date;
    organizationId?: string;
    selectedMemberId: string;
  }): Promise<{ data: DayTotal[]; members: any[] }> {
    const { start, end, organizationId, selectedMemberId } = options;

    const { data: members } = await supabase.from('members')
        .select('id, full_name, timezone, idle_limit')
        .eq('organization_id', organizationId)
        .order('full_name', { ascending: true });

    let sessQuery = supabase.from('sessions')
        .select('id, user_id, started_at, ended_at')
        .eq('organization_id', organizationId)
        .lt('started_at', end.toISOString())
        .or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`);
    
    if (selectedMemberId.toLowerCase() !== 'all') {
        sessQuery = sessQuery.eq('user_id', selectedMemberId);
    }
    
    const { data: sessions } = await sessQuery;

    const { data: samplesData, error: samplesErr } = await supabase.rpc('get_raw_activity_samples', {
        p_org_id: organizationId,
        p_start_iso: start.toISOString(),
        p_end_iso: end.toISOString(),
        p_member_ids: selectedMemberId.toLowerCase() !== 'all' ? [selectedMemberId] : null
    });
    if (samplesErr) {
        console.error("Error fetching daily totals samples:", samplesErr);
    }
    const samples = samplesData || [];

    if (!members || !sessions) {
        return { data: [], members: members || [] };
    }

    const memberMap: Record<string, {name: string, tz: string | null}> = {};
    members.forEach((m: any) => {
        memberMap[m.id] = { name: m.full_name, tz: m.timezone };
    });

    const sessionToUserId = new Map();
    (sessions || []).forEach((s: any) => sessionToUserId.set(s.id, s.user_id));

    const seen = new Set<string>();
    const dedupedSamples: any[] = [];
    const sortedSamples = [...(samples || [])].sort((a: any, b: any) => (b.activity_percent ?? 0) - (a.activity_percent ?? 0));

    sortedSamples.forEach((s: any) => {
        const uid = sessionToUserId.get(s.session_id);
        if (!uid || !memberMap[uid]) return;
        const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
        const key = `${uid}_${minute}`;
        if (seen.has(key)) return;
        seen.add(key);
        dedupedSamples.push(s);
    });

    const userSamples = new Map<string, any[]>();
    dedupedSamples.forEach(s => {
        const uid = sessionToUserId.get(s.session_id);
        if (!uid) return;
        if (!userSamples.has(uid)) userSamples.set(uid, []);
        userSamples.get(uid)!.push(s);
    });

    const stats: Record<string, number[]> = {};
    members.forEach((m: any) => stats[m.id] = [0,0,0,0,0,0,0]);

    const memberDetailMap = new Map(members.map((m: any) => [m.id, m]));

    userSamples.forEach((samples, uid) => {
        const limit = memberDetailMap.get(uid)?.idle_limit ?? 10;
        const sorted = samples.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
        
        const sampleByMinute = new Map();
        sorted.forEach(s => sampleByMinute.set(s.recorded_at.substring(0, 16), s));

        let currentBlock: any[] = [];
        const productiveMinutes = new Set<string>();

        for (let i = 0; i < sorted.length; i++) {
            const s = sorted[i];
            const prev = i > 0 ? sorted[i-1] : null;
            const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
            const isContiguous = prev && gapMs <= 125000;

            if (s.idle && isContiguous) {
                currentBlock.push(s);
            } else if (s.idle && !prev) {
                currentBlock = [s];
            } else if (s.idle && !isContiguous) {
                if (currentBlock.length < limit) {
                    currentBlock.forEach(b => productiveMinutes.add(b.recorded_at.substring(0, 16)));
                }
                currentBlock = [s];
            } else {
                productiveMinutes.add(s.recorded_at.substring(0, 16));
                if (currentBlock.length < limit) {
                    currentBlock.forEach(b => productiveMinutes.add(b.recorded_at.substring(0, 16)));
                }
                currentBlock = [];
            }
        }
        if (currentBlock.length < limit) {
            currentBlock.forEach(b => productiveMinutes.add(b.recorded_at.substring(0, 16)));
        }

        if (productiveMinutes.size > 0) {
            productiveMinutes.forEach(minuteStr => {
                const s = sampleByMinute.get(minuteStr);
                if (s) {
                    const dayIdxRaw = getDayIndexInTz(s.recorded_at, memberMap[uid].tz);
                    const dayIdx = (dayIdxRaw + 6) % 7; 
                    stats[uid][dayIdx] += (1 / 60);
                }
            });
        } else {
            const userSess = sessions.filter((s: any) => s.user_id === uid);
            userSess.forEach((s: any) => {
                const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
                const startMs = new Date(s.started_at).getTime();
                const durationHrs = (endMs - startMs) / (1000 * 60 * 60);
                
                const dayIdxRaw = getDayIndexInTz(s.started_at, memberMap[uid].tz);
                const dayIdx = (dayIdxRaw + 6) % 7; 
                stats[uid][dayIdx] += durationHrs;
            });
        }
    });

    const result: DayTotal[] = Object.entries(stats).map(([uid, totals]) => ({
        member: memberMap[uid].name,
        totals: totals.map(t => Math.round(t * 10) / 10),
        weeklyTotal: Math.round(totals.reduce((a, b) => a + b, 0) * 10) / 10
    })).sort((a, b) => b.weeklyTotal - a.weeklyTotal);

    return { data: result, members };
  },

  async fetchFinancials(start: string, end: string): Promise<MemberFinancial[]> {
    const [{ data: membersData, error: memberErr }, { data: sessions, error: sessionErr }] = await Promise.all([
        supabase.from('members').select('id, full_name, pay_rate, bill_rate, auth_user_id'),
        supabase.from('sessions')
            .select('id, user_id, started_at, ended_at')
            .gte('started_at', start)
            .lte('started_at', end),
    ]);

    if (memberErr) throw memberErr;
    if (sessionErr) throw sessionErr;

    const memberMap: Record<string, { name: string; pay_rate: number; bill_rate: number }> = {};
    (membersData || []).forEach((m: any) => {
        const info = { name: m.full_name, pay_rate: m.pay_rate ?? 0, bill_rate: m.bill_rate ?? 0 };
        memberMap[m.id] = info;
        if (m.auth_user_id) {
            memberMap[m.auth_user_id] = info;
        }
    });

    const statsMap: Record<string, { minutes: number; sessions: number }> = {};
    (sessions || []).forEach((s: any) => {
        const mid = s.user_id;
        if (!mid) return;
        if (!statsMap[mid]) statsMap[mid] = { minutes: 0, sessions: 0 };
        statsMap[mid].sessions++;
        const startMs = new Date(s.started_at).getTime();
        const endMs = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
        statsMap[mid].minutes += Math.max(0, Math.round((endMs - startMs) / 60000));
    });

    const result: MemberFinancial[] = Object.entries(statsMap).map(([uid, data]) => {
        const info = memberMap[uid];
        return {
            member_id: uid,
            full_name: info ? info.name : (uid.slice(0, 8) + '…'),
            pay_rate: info ? info.pay_rate : 0,
            bill_rate: info ? info.bill_rate : 0,
            totalMinutes: data.minutes,
            totalCost: info ? Math.round((data.minutes / 60) * info.pay_rate * 100) / 100 : 0,
            sessions: data.sessions,
        };
    }).sort((a, b) => b.totalCost - a.totalCost);

    return result;
  },

  async fetchReports(options: {
    start: string;
    end: string;
    organizationId?: string;
    selectedTeamId: string;
    selectedMemberId: string;
    membersForLookup: any[];
  }): Promise<{
    dailyActivityList: any[];
    appBreakdownList: any[];
    screenshotCount: number;
    totalSessions: number;
    calculatedTotalMins: number;
    calculatedAvgActivity: number;
    totalCosts: number;
    totalBilled: number;
    tableData: any;
  }> {
    const { start, end, organizationId, selectedTeamId, selectedMemberId, membersForLookup } = options;

    const allMemberSessionUserIds = Array.from(
        new Set(
            membersForLookup.flatMap((m: any) => [m.id, m.auth_user_id].filter(Boolean) as string[])
        )
    );

    let filteredSessionUserIds: string[] = [];

    if (selectedMemberId !== 'All') {
        const selectedMember = membersForLookup.find(m => m.id === selectedMemberId);
        filteredSessionUserIds = selectedMember
            ? Array.from(new Set([selectedMember.id, selectedMember.auth_user_id].filter(Boolean) as string[]))
            : [];
    } else if (selectedTeamId !== 'All') {
        const { data: tm } = await supabase.from('team_members').select('member_id').eq('team_id', selectedTeamId);
        const teamMemberIds = tm?.map(t => t.member_id) || [];

        if (teamMemberIds.length > 0) {
            const membersById = new Map(membersForLookup.map(m => [m.id, m]));
            filteredSessionUserIds = Array.from(
                new Set(
                    teamMemberIds.flatMap(memberId => {
                        const member = membersById.get(memberId);
                        return member ? Array.from(new Set([member.id, member.auth_user_id].filter(Boolean) as string[])) : [memberId];
                    })
                )
            );
        }
    }

    if ((selectedMemberId !== 'All' || selectedTeamId !== 'All') && filteredSessionUserIds.length === 0) {
        return {
            dailyActivityList: [], appBreakdownList: [], screenshotCount: 0,
            totalSessions: 0, calculatedTotalMins: 0, calculatedAvgActivity: 0,
            totalCosts: 0, totalBilled: 0, tableData: { dates: [], rows: [] }
        };
    }

    let sessionsQuery = supabase
        .from('sessions')
        .select('id, user_id, started_at, ended_at')
        .lt('started_at', end)
        .or(`ended_at.is.null,ended_at.gt.${start}`);
        
    if (organizationId) {
        sessionsQuery = sessionsQuery.eq('organization_id', organizationId);
    }

    const scopedUserIds = filteredSessionUserIds.length > 0 ? filteredSessionUserIds : allMemberSessionUserIds;
    if (scopedUserIds.length === 0) {
        return {
            dailyActivityList: [], appBreakdownList: [], screenshotCount: 0,
            totalSessions: 0, calculatedTotalMins: 0, calculatedAvgActivity: 0,
            totalCosts: 0, totalBilled: 0, tableData: { dates: [], rows: [] }
        };
    }
    sessionsQuery = sessionsQuery.in('user_id', scopedUserIds);

    const { data: sessionData } = await sessionsQuery;
    const filteredSessions = sessionData || [];
    if ((selectedMemberId !== 'All' || selectedTeamId !== 'All') && filteredSessions.length === 0) {
        return {
            dailyActivityList: [], appBreakdownList: [], screenshotCount: 0,
            totalSessions: 0, calculatedTotalMins: 0, calculatedAvgActivity: 0,
            totalCosts: 0, totalBilled: 0, tableData: { dates: [], rows: [] }
        };
    }

    const activeSessionIds = filteredSessions.map(s => s.id);

    let ssQuery = supabase
        .from('screenshots')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', start)
        .lte('recorded_at', end);

    if (activeSessionIds.length > 0) ssQuery = ssQuery.in('session_id', activeSessionIds);

    const [samplesResult, { count: ssCount }] = await Promise.all([
        supabase.rpc('get_raw_activity_samples', {
            p_org_id: organizationId,
            p_start_iso: start,
            p_end_iso: end,
            p_member_ids: scopedUserIds.length > 0 ? scopedUserIds : null
        }),
        ssQuery,
    ]);

    const samples = (samplesResult.data as any[]) || [];

    const allSamples = samples || [];
    const activeSessionIdsSet = new Set(activeSessionIds);
    const inScopeSamples = allSamples.filter(s => activeSessionIdsSet.has(s.session_id));

    const membersMap = new Map<string, any>();
    const memberTzs = new Map<string, string | undefined>();

    membersForLookup.forEach((m: any) => {
        membersMap.set(m.id, m);
        memberTzs.set(m.id, m.timezone);
        if (m.auth_user_id) {
            membersMap.set(m.auth_user_id, m);
            memberTzs.set(m.auth_user_id, m.timezone);
        }
    });

    const sessionToUserId = new Map(filteredSessions.map(sess => [sess.id, sess.user_id]));
    const seen = new Set<string>();
    const dedupedSamples: any[] = [];
    [...inScopeSamples].sort((a, b) => (b.activity_percent ?? 0) - (a.activity_percent ?? 0)).forEach(s => {
        const uid = sessionToUserId.get(s.session_id);
        if (!uid) return;
        const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
        const key = `${uid}_${minute}`;
        if (seen.has(key)) return;
        seen.add(key);
        dedupedSamples.push(s);
    });

    const dailyMap: Record<string, { activitySum: number; total_samples: number; total_minutes: number }> = {};
    let costs = 0;
    let billed = 0;
    const productiveSamples: any[] = [];

    const samplesByUser = new Map<string, any[]>();
    dedupedSamples.forEach(s => {
        const uid = sessionToUserId.get(s.session_id);
        if (!uid) return;
        if (!samplesByUser.has(uid)) samplesByUser.set(uid, []);
        samplesByUser.get(uid)!.push(s);
    });

    samplesByUser.forEach((userSamps, uid) => {
        const member = membersMap.get(uid);
        const limit = member?.idle_limit ?? 0;

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

    // Pre-group productive samples by session to quickly find session-specific samples
    const samplesBySession = new Map<string, any[]>();
    productiveSamples.forEach(sample => {
        if (!samplesBySession.has(sample.session_id)) {
            samplesBySession.set(sample.session_id, []);
        }
        samplesBySession.get(sample.session_id)!.push(sample);
    });

    const dateList: string[] = [];
    const curr = new Date(start);
    curr.setHours(12, 0, 0, 0); 
    const stop = new Date(end);

    while (curr <= stop) {
        dateList.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }

    const memberRows: Record<string, any> = {};

    membersForLookup.forEach(m => {
        if (selectedMemberId !== 'All' && m.id !== selectedMemberId) return;

        memberRows[m.id] = {
            memberId: m.id,
            fullName: m.full_name || m.email || 'Unknown',
            email: m.email || '',
            employeeId: m.employee_id || '',
            dailyMins: {},
            totalMins: 0,
            activitySum: 0,
            activitySamples: 0
        };
    });

    filteredSessions.forEach(sess => {
        const uid = sess.user_id;
        if (!uid) return;

        const member = membersMap.get(uid);
        const sessionSamples = samplesBySession.get(sess.id) || [];

        if (sessionSamples.length > 0) {
            // Process each sample for automated tracking sessions
            sessionSamples.forEach(s => {
                const day = getGroupingDateInTz(s.recorded_at, memberTzs.get(uid));
                if (!dailyMap[day]) dailyMap[day] = { activitySum: 0, total_samples: 0, total_minutes: 0 };

                dailyMap[day].activitySum += (s.activity_percent || 0);
                dailyMap[day].total_samples++;
                dailyMap[day].total_minutes++;

                if (member) {
                    costs += (1 / 60) * (member.pay_rate || 0);
                    billed += (1 / 60) * (member.bill_rate || 0);
                }

                if (member && memberRows[member.id]) {
                    const row = memberRows[member.id];
                    row.dailyMins[day] = (row.dailyMins[day] || 0) + 1;
                    row.totalMins++;

                    if (s.activity_percent !== undefined && s.activity_percent !== null) {
                        row.activitySum += s.activity_percent;
                        row.activitySamples++;
                    }
                }
            });
        } else {
            // Process manual/sampleless session duration
            const { endMs } = getEffectiveEnd(sess.started_at, sess.ended_at);
            const sessionMins = Math.max(0, Math.round((endMs - new Date(sess.started_at).getTime()) / 60000));

            if (sessionMins > 0) {
                const day = getGroupingDateInTz(sess.started_at, memberTzs.get(uid));
                if (!dailyMap[day]) dailyMap[day] = { activitySum: 0, total_samples: 0, total_minutes: 0 };

                dailyMap[day].total_minutes += sessionMins;

                if (member) {
                    costs += (sessionMins / 60) * (member.pay_rate || 0);
                    billed += (sessionMins / 60) * (member.bill_rate || 0);
                }

                if (member && memberRows[member.id]) {
                    const row = memberRows[member.id];
                    row.dailyMins[day] = (row.dailyMins[day] || 0) + sessionMins;
                    row.totalMins += sessionMins;
                }
            }
        }
    });

    const dailyActivityList = Object.entries(dailyMap).sort().map(([date, v]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        activity: v.total_samples > 0 ? Math.round(v.activitySum / v.total_samples) : 0,
        minutes: Math.round(v.total_minutes),
    }));

    const appMap: Record<string, number> = {};
    productiveSamples.forEach(s => {
        const app = s.app_name || 'Unknown';
        appMap[app] = (appMap[app] || 0) + 1;
    });
    const appBreakdownList = Object.entries(appMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

    let totalSessionMins = 0;
    filteredSessions.forEach(s => {
        const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
        totalSessionMins += (endMs - new Date(s.started_at).getTime()) / 60000;
    });

    const calculatedTotalMins = Math.max(productiveSamples.length, Math.round(totalSessionMins));
    const calculatedAvgActivity = calculateActivityScore(productiveSamples);

    const finalRows = Object.values(memberRows)
        .map((row: any) => ({
            memberId: row.memberId,
            fullName: row.fullName,
            email: row.email,
            employeeId: row.employeeId,
            dailyMins: row.dailyMins,
            totalMins: row.totalMins,
            activityScore: row.activitySamples > 0 ? Math.round(row.activitySum / row.activitySamples) : 0
        }))
        .filter(row => row.totalMins > 0) 
        .sort((a, b) => b.totalMins - a.totalMins);

    return {
        dailyActivityList,
        appBreakdownList,
        screenshotCount: ssCount || 0,
        totalSessions: filteredSessions.length,
        calculatedTotalMins,
        calculatedAvgActivity,
        totalCosts: costs,
        totalBilled: billed,
        tableData: { dates: dateList, rows: finalRows }
    };
  }
};
