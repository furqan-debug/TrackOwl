import { supabase } from '../lib/supabase';
import { getDayIndexInTz, getEffectiveEnd, getGroupingDateInTz } from '../lib/dataUtils';

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
        .select('id, user_id, started_at, ended_at, manual')
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

    // Process manual sessions first
    sessions.forEach((s: any) => {
        if (s.manual === true) {
            const uid = s.user_id;
            if (!uid || !memberMap[uid]) return;
            const { endMs } = getEffectiveEnd(s.started_at, s.ended_at);
            const startMs = new Date(s.started_at).getTime();
            const durationHrs = (endMs - startMs) / (1000 * 60 * 60);

            const dayIdxRaw = getDayIndexInTz(s.started_at, memberMap[uid].tz);
            const dayIdx = (dayIdxRaw + 6) % 7;
            stats[uid][dayIdx] += durationHrs;
        }
    });

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
            const userSess = sessions.filter((s: any) => s.user_id === uid && s.manual !== true);
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
    orgTimezone?: string;
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
        .select('id, user_id, started_at, ended_at, manual')
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

    const t0 = performance.now();
    const { data: sessionData } = await sessionsQuery;
    const t1 = performance.now();
    console.log(`[Reports Timing] Sessions Query took ${(t1 - t0).toFixed(2)}ms, found ${(sessionData || []).length} sessions`);
    const filteredSessions = sessionData || [];
    if ((selectedMemberId !== 'All' || selectedTeamId !== 'All') && filteredSessions.length === 0) {
        return {
            dailyActivityList: [], appBreakdownList: [], screenshotCount: 0,
            totalSessions: 0, calculatedTotalMins: 0, calculatedAvgActivity: 0,
            totalCosts: 0, totalBilled: 0, tableData: { dates: [], rows: [] }
        };
    }

    // activeSessionIds is no longer needed

    let ssQuery = supabase
        .from('screenshots')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('recorded_at', start)
        .lte('recorded_at', end);

    if (scopedUserIds.length > 0) {
        ssQuery = ssQuery.in('user_id', scopedUserIds);
    }

    const orgTz = (options as any).orgTimezone || 'UTC';

    const t2 = performance.now();
    const [samplesResult, { count: ssCount }] = await Promise.all([
        supabase.rpc('get_reports_aggregated_data', {
            p_org_id: organizationId,
            p_start_iso: start,
            p_end_iso: end,
            p_org_tz: orgTz,
            p_member_ids: scopedUserIds.length > 0 ? scopedUserIds : null
        }),
        ssQuery,
    ]);
    const t3 = performance.now();

    const aggregatedData = samplesResult.data as any || { daily_stats: [], user_daily_stats: [], app_stats: [] };
    const dbDailyStats = aggregatedData.daily_stats || [];
    const dbUserDailyStats = aggregatedData.user_daily_stats || [];
    const dbAppStats = aggregatedData.app_stats || [];

    console.log(`[Reports Timing] Aggregated RPC took ${(t3 - t2).toFixed(2)}ms`);

    const t4 = performance.now();

    const membersMap = new Map<string, any>();

    membersForLookup.forEach((m: any) => {
        membersMap.set(m.id, m);
        if (m.auth_user_id) {
            membersMap.set(m.auth_user_id, m);
        }
    });

    const dailyMap: Record<string, { activitySum: number; total_samples: number; total_minutes: number }> = {};
    let costs = 0;
    let billed = 0;

    // Build dateList from the UTC midnight boundaries returned by getDateRange().
    // We extract the date portion from the ISO string directly (which is already
    // expressed in org-timezone-aware UTC) rather than using new Date() which
    // would re-interpret the timestamp in the browser's local timezone and can
    // shift the date forward or backward by a day on non-UTC devices.
    function utcDatePart(isoStr: string): string {
        // isoStr is like "2026-07-16T07:00:00.000Z" — take the UTC date
        const d = new Date(isoStr);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // The org-local calendar dates that the org-tz boundaries span.
    // Because start is midnight and end is 23:59:59 in org-tz, converting those
    // UTC values back to org-local dates gives exactly the intended calendar days.
    function utcToOrgLocalDatePart(isoStr: string, tz: string): string {
        const d = new Date(isoStr);
        try {
            return d.toLocaleDateString('en-CA', { timeZone: tz });
        } catch {
            return utcDatePart(isoStr);
        }
    }

    const startLocalDate = utcToOrgLocalDatePart(start, orgTz);
    const endLocalDate = utcToOrgLocalDatePart(end, orgTz);

    const dateList: string[] = [];
    // Walk YYYY-MM-DD strings without touching Date hours (avoids DST/tz issues)
    let walkDate = startLocalDate;
    while (walkDate <= endLocalDate) {
        dateList.push(walkDate);
        // Advance by one calendar day using UTC noon to avoid DST edge cases
        const [y, m, d2] = walkDate.split('-').map(Number);
        const next = new Date(Date.UTC(y, m - 1, d2 + 1, 12, 0, 0));
        const ny = next.getUTCFullYear();
        const nm = String(next.getUTCMonth() + 1).padStart(2, '0');
        const nd = String(next.getUTCDate()).padStart(2, '0');
        walkDate = `${ny}-${nm}-${nd}`;
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

    const dateListSet = new Set(dateList);

    dbDailyStats.forEach((row: any) => {
        if (dateListSet.has(row.date)) {
            dailyMap[row.date] = {
                activitySum: row.activity_sum,
                total_samples: row.sample_count,   // sample count for activity % averaging
                total_minutes: row.total_minutes    // session-duration-based tracked time
            };
        }
    });

    // 2. Populate memberRows and calculate costs from DB aggregates
    dbUserDailyStats.forEach((row: any) => {
        const uid = row.user_id;
        const day = row.date;
        const mins = row.total_minutes;         // session-duration minutes
        const sampleCount = row.sample_count;   // sample count for activity averaging
        const actSum = row.activity_sum;

        if (dateListSet.has(day)) {
            const member = membersMap.get(uid);
            if (member && memberRows[member.id]) {
                const r = memberRows[member.id];
                r.dailyMins[day] = (r.dailyMins[day] || 0) + mins;
                r.totalMins += mins;
                r.activitySum += actSum;
                r.activitySamples += sampleCount; // use sample count, not duration

                costs += (mins / 60) * (member.pay_rate || 0);
                billed += (mins / 60) * (member.bill_rate || 0);
            }
        }
    });

    // 3. Process Manual Sessions
    filteredSessions.forEach(sess => {
        if (sess.manual === true) {
            const uid = sess.user_id;
            const member = uid ? membersMap.get(uid) : null;
            
            const { endMs } = getEffectiveEnd(sess.started_at, sess.ended_at);
            const clampedStartMs = Math.max(new Date(sess.started_at).getTime(), new Date(start).getTime());
            const clampedEndMs = Math.min(endMs, new Date(end).getTime());
            const sessionMins = Math.max(0, Math.round((clampedEndMs - clampedStartMs) / 60000));

            if (sessionMins > 0) {
                const day = getGroupingDateInTz(new Date(clampedStartMs).toISOString(), orgTz);
                if (dateListSet.has(day)) {
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
        }
    });

    const dailyActivityList = dateList.map(date => {
        const v = dailyMap[date] || { activitySum: 0, total_samples: 0, total_minutes: 0 };
        return {
            date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: orgTz }),
            activity: v.total_samples > 0 ? Math.round(v.activitySum / v.total_samples) : 0,
            minutes: Math.round(v.total_minutes),
        };
    });

    const appBreakdownList = dbAppStats.map((row: any) => ({
        name: row.app_name,
        value: row.total_minutes
    })).slice(0, 8);

    const calculatedTotalMins = Math.round(Object.values(dailyMap).reduce((sum, v) => sum + v.total_minutes, 0));
    
    let totalActSum = 0;
    let totalActSamples = 0;
    dbDailyStats.forEach((r: any) => {
        if (dateListSet.has(r.date)) {
            totalActSum += r.activity_sum;
            totalActSamples += r.sample_count; // use sample count for activity averaging
        }
    });
    const calculatedAvgActivity = totalActSamples > 0 ? Math.round(totalActSum / totalActSamples) : 0;

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

    const t5 = performance.now();
    console.log(`[Reports Timing] Frontend Processing took ${(t5 - t4).toFixed(2)}ms`);

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
