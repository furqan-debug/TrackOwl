/**
 * Shared data utilities for standardized session and duration calculations.
 */

export const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
export const MAX_LIVE_SESSION_MS = 12 * 60 * 60 * 1000; // 12 hours (sanity cap for live sessions)

export interface TimeInterval {
    startMs: number;
    endMs: number;
    hasActivity: boolean;
}

export interface HubstaffBlock {
    id: string; // block identifier (e.g. "2024-03-20T09:00")
    startTime: string;
    endTime: string;
    minutesTracked: number;
    activityPercent: number;
    isIdle: boolean;
}

/**
 * Calculates a "safe" end time for a session.
 * Handles "ghost" sessions (unended sessions from the past) by capping them.
 */
export function getEffectiveEnd(startedAt: string, endedAt: string | null, lastSampleAt?: string | null) {
    const startMs = new Date(startedAt).getTime();
    
    // 1. If explicit end exists, use it.
    if (endedAt) {
        return { 
            endMs: new Date(endedAt).getTime(), 
            isLive: false, 
            isStale: false 
        };
    }

    const now = Date.now();
    const elapsed = now - startMs;

    // 2. If session is recent (< threshold), treat it as live.
    if (elapsed < STALE_THRESHOLD_MS) {
        return { 
            endMs: now, 
            isLive: true, 
            isStale: false 
        };
    }

    // 3. If session is older but we have a recent activity sample, use that as the end point.
    if (lastSampleAt) {
        const lastSampleMs = new Date(lastSampleAt).getTime();
        // Only use the sample if it's after the start point
        if (lastSampleMs > startMs) {
            return { 
                endMs: lastSampleMs + (5 * 60000), // Add 5 mins buffer
                isLive: false, 
                isStale: true 
            };
        }
    }

    // 4. Sanity cap: If it's a very old session with no end and no samples, 
    // it was likely a crash or forgotten start. Cap it to 1 minute to avoid 
    // inflating totals with hundreds of "empty" hours.
    return { 
        endMs: startMs + 60000, 
        isLive: false, 
        isStale: true 
    };
}

/**
 * Splits intervals that cross midnight into separate entries.
 */
export function splitIntervalsAtMidnight(intervals: TimeInterval[]): TimeInterval[] {
    const result: TimeInterval[] = [];
    
    for (const interval of intervals) {
        let currentStart = interval.startMs;
        const finalEnd = interval.endMs;
        
        while (currentStart < finalEnd) {
            const startDay = new Date(currentStart);
            const endOfDay = new Date(startDay);
            endOfDay.setHours(23, 59, 59, 999);
            const endOfDayMs = endOfDay.getTime();
            
            const currentEnd = Math.min(finalEnd, endOfDayMs + 1); // +1 to push to midnight 00:00:00.000
            
            result.push({
                ...interval,
                startMs: currentStart,
                endMs: currentEnd
            });
            
            currentStart = currentEnd;
        }
    }
    
    return result;
}

/**
 * Merges overlapping time intervals for the same user to avoid double-counting.
 * Also filters out intervals with no activity if required.
 */
export function flattenTimeRanges(intervals: TimeInterval[]): number {
    const activeIntervals = intervals.filter(i => i.hasActivity);
    if (activeIntervals.length === 0) return 0;
    
    // 1. Split any intervals that cross midnight
    const splitIntervals = splitIntervalsAtMidnight(activeIntervals);
    
    // Sort intervals by start time
    splitIntervals.sort((a, b) => a.startMs - b.startMs);
    
    if (splitIntervals.length === 0) return 0;

    const merged: { start: number, end: number }[] = [];
    let current = { start: splitIntervals[0].startMs, end: splitIntervals[0].endMs };
    
    for (let i = 1; i < splitIntervals.length; i++) {
        const next = splitIntervals[i];
        if (next.startMs < current.end) {
            // Overlapping - extend the current interval
            current.end = Math.max(current.end, next.endMs);
        } else {
            // Non-overlapping - push the current and start a new one
            merged.push({ ...current });
            current = { start: next.startMs, end: next.endMs };
        }
    }
    merged.push(current);
    
    // Sum the durations of unique intervals
    // Use Math.min to ensure no single day block exceeds 24 hours (86400000 ms)
    // although split logic already handles most of this.
    const totalMs = merged.reduce((acc, m) => acc + (m.end - m.start), 0);
    return totalMs / 60000; // Total in decimal minutes
}

/**
 * Formats decimal minutes into "Xh Ym" string.
 */
export function formatDuration(minutes: number): string {
    const totalMinutes = Math.max(0, Math.round(minutes));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (h > 0) {
        return `${h}h ${m < 10 ? '0' : ''}${m}m`;
    }
    return `${m}m`;
}

/**
 * Calculates activity percentage from samples.
 * If there are no samples, it returns 0.
 */
export function calculateActivityScore(samples: { idle?: boolean, activity_percent?: number }[]): number {
    if (!samples.length) return 0;
    
    // Method 1: Based on activity_percent field (more precise if available)
    const hasPercent = samples.some(s => s.activity_percent !== undefined);
    if (hasPercent) {
        const sum = samples.reduce((acc, s) => acc + (s.activity_percent || 0), 0);
        return Math.round(sum / samples.length);
    }
    
    // Method 2: Based on idle boolean
    const activeCount = samples.filter(s => !s.idle).length;
    return Math.round((activeCount / samples.length) * 100);
}

/**
 * Formats a Date or ISO string to the given timezone string.
 * Example targetTz: "America/New_York"
 */
export function formatDateInTz(date: string | Date | number, targetTz?: string | null): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    try {
        return d.toLocaleDateString('en-US', { 
            timeZone: targetTz || undefined,
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        // Fallback for invalid/empty timezone uses admin's local TZ
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

/**
 * Returns a sortable date string (YYYY-MM-DD) for a specific timezone
 * so we can group events logically by the member's day.
 */
export function getGroupingDateInTz(date: string | Date | number, targetTz?: string | null): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: targetTz || undefined,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(d);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        if (year && month && day) {
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        // Fallback
    }
    // Fallback using en-CA directly if parts fail
    try {
        return d.toLocaleDateString('en-CA', { timeZone: targetTz || undefined });
    } catch (e) {
        return d.toISOString().split('T')[0];
    }
}

/**
 * Gets the localized day index (0=Monday...6=Sunday) for a date in a specific timezone
 */
export function getDayIndexInTz(date: string | Date | number, targetTz?: string | null): number {
    const d = new Date(date);
    try {
        // Extract day string 'Sun', 'Mon' etc using the timezone
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: targetTz || undefined });
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const index = days.indexOf(dayStr);
        if (index !== -1) return index;
        return d.getDay();
    } catch (e) {
        return d.getDay();
    }
}

/**
 * Hubstaff Logic: Groups samples into 10-minute blocks.
 */
export function getHubstaffBlocks(samples: any[], targetTz?: string | null): HubstaffBlock[] {
    const blocks: Map<string, any[]> = new Map();

    samples.forEach(s => {
        const date = new Date(s.recorded_at);
        
        // Convert to target timezone for grouping if provided
        let localizedDate = date;
        if (targetTz) {
            try {
                // This is a simple way to get the localized minutes/hours
                const tzString = date.toLocaleString('en-US', { timeZone: targetTz });
                localizedDate = new Date(tzString);
            } catch (e) {
                // Fallback to original date
            }
        }

        const minutes = localizedDate.getMinutes();
        const blockStartMin = Math.floor(minutes / 10) * 10;
        
        const blockKey = new Date(localizedDate);
        blockKey.setMinutes(blockStartMin, 0, 0);
        blockKey.setSeconds(0, 0);
        
        // Use a stable key for grouping
        const key = blockKey.toISOString().substring(0, 16);

        if (!blocks.has(key)) blocks.set(key, []);
        blocks.get(key)!.push(s);
    });

    const result: HubstaffBlock[] = [];
    const sortedKeys = Array.from(blocks.keys()).sort();

    sortedKeys.forEach(key => {
        const blockSamples = blocks.get(key)!;
        // Activity rate for a 10-minute segment is: Active seconds / 600
        // Since each activity_percent is (active seconds in 1 min / 60), 
        // sum(activity_percent) / 10 is equivalent to (total active seconds / 600).
        const totalActivity = blockSamples.reduce((acc, s) => acc + (s.activity_percent || 0), 0);
        const avgActivity = Math.round(totalActivity / 10);
        
        // Duration is number of 1-minute samples in this block
        const minutes = blockSamples.length;

        const start = new Date(key);
        const end = new Date(start.getTime() + 10 * 60000);

        result.push({
            id: key,
            startTime: start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            endTime: end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            minutesTracked: minutes,
            activityPercent: avgActivity,
            isIdle: avgActivity === 0
        });
    });

    return result;
}

/**
 * Calculates total productive and idle minutes from activity samples.
 * Deduplicates by minute to ensure accuracy if multiple samples exist for the same minute.
 * 
 * Threshold-aware: Only counts idle minutes if they form a contiguous block
 * >= idleLimit (in minutes).
 */
export function calculateStatsFromSamples(samples: any[], idleLimit: number = 0) {
    if (!samples || samples.length === 0) {
        return { totalMinutes: 0, productiveMinutes: 0, idleMinutes: 0 };
    }

    // 1. Deduplicate by minute (YYYY-MM-DDTHH:mm) and sort
    const minuteMap = new Map<string, any>();
    samples.forEach(s => {
        const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
        // If duplicates exist, prefer non-idle ones for accuracy
        if (!minuteMap.has(minute) || (minuteMap.get(minute).idle && !s.idle)) {
            minuteMap.set(minute, s);
        }
    });

    const dedupedSorted = Array.from(minuteMap.values()).sort((a, b) => 
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    const totalMinutes = dedupedSorted.length;
    let actualIdleMins = 0;

    if (idleLimit <= 1) {
        // If threshold is 1 or less, use standard logic
        actualIdleMins = dedupedSorted.filter(s => s.idle).length;
    } else {
        // Block-aware idle detection: Only subtract if idle for >= idleLimit
        let currentBlock: any[] = [];
        
        for (let i = 0; i < dedupedSorted.length; i++) {
            const s = dedupedSorted[i];
            const prev = i > 0 ? dedupedSorted[i - 1] : null;

            // Check if this sample is contiguous (within 2 minutes spread max to account for sync jitter)
            const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
            const isContiguous = prev && gapMs <= 125000; // 2 mins max to handle slight delays

            if (s.idle && isContiguous) {
                currentBlock.push(s);
            } else if (s.idle && !prev) {
                currentBlock = [s];
            } else if (s.idle && !isContiguous) {
                // New block started after a gap
                if (currentBlock.length >= idleLimit) actualIdleMins += currentBlock.length;
                currentBlock = [s];
            } else {
                // Not idle 
                if (currentBlock.length >= idleLimit) actualIdleMins += currentBlock.length;
                currentBlock = [];
            }
        }
        // Final block check
        if (currentBlock.length >= idleLimit) actualIdleMins += currentBlock.length;
    }

    return { 
        totalMinutes, 
        idleMinutes: actualIdleMins, 
        productiveMinutes: Math.max(0, totalMinutes - actualIdleMins) 
    };
}

export function calculateIdleMinutes(samples: any[], idleLimit: number = 0): number {
    const stats = calculateStatsFromSamples(samples, idleLimit);
    return stats.idleMinutes;
}

/**
 * Compatibility wrapper for productive minutes calculation.
 */
export function calculateProductiveMinutes(samples: any[], idleLimit: number = 0): number {
    const stats = calculateStatsFromSamples(samples, idleLimit);
    return stats.productiveMinutes;
}

/**
 * Fetches sessions while bypassing the standard 1000-row API limit.
 */
export async function fetchAllSessions(
    supabase: any,
    start: Date,
    end: Date,
    organizationId?: string,
    userId?: string
): Promise<any[]> {
    const PAGE_SIZE = 1000;
    
    // 1. Get total count
    let countQuery = supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .lt('started_at', end.toISOString())
        .or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`);

    if (organizationId) countQuery = countQuery.eq('organization_id', organizationId);
    if (userId && userId.toLowerCase() !== 'all') countQuery = countQuery.eq('user_id', userId);

    const { count, error: countErr } = await countQuery;
    if (countErr || count === null) {
        console.error("Error fetching session count:", countErr);
        return [];
    }

    if (count === 0) return [];

    const totalPages = Math.ceil(count / PAGE_SIZE);
    const BATCH_SIZE = 5;
    let allSessions: any[] = [];

    for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, totalPages); j++) {
            let query = supabase
                .from('sessions')
                .select('id, user_id, project_id, started_at, ended_at')
                .lt('started_at', end.toISOString())
                .or(`ended_at.is.null,ended_at.gt.${start.toISOString()}`)
                .order('started_at', { ascending: false })
                .range(j * PAGE_SIZE, (j + 1) * PAGE_SIZE - 1);

            if (organizationId) query = query.eq('organization_id', organizationId);
            if (userId && userId.toLowerCase() !== 'all') query = query.eq('user_id', userId);

            batchPromises.push(query);
        }

        const results = await Promise.all(batchPromises);
        results.forEach(res => {
            if (res.data) allSessions.push(...res.data);
            if (res.error) console.error("Error fetching session batch:", res.error);
        });
    }

    return allSessions;
}

/**
 * Fetches activity samples while bypassing the standard 1000-row API limit.
 * Uses range pagination to retrieve all samples within a given time window.
 */
export async function fetchAllActivitySamples(
    supabase: any,
    startIso: string,
    endIso: string,
    selectQuery: string = '*',
    filters?: {
        organizationId?: string;
        sessionIds?: string[];
        userId?: string;
    }
): Promise<any[]> {
    const PAGE_SIZE = 1000;
    
    // 1. First, get the total count efficiently
    let countQuery = supabase
        .from('activity_samples')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', startIso)
        .lte('recorded_at', endIso);

    if (filters?.organizationId) {
        countQuery = countQuery.eq('organization_id', filters.organizationId);
    }
    if (filters?.sessionIds && filters.sessionIds.length > 0) {
        countQuery = countQuery.in('session_id', filters.sessionIds);
    }

    const { count, error: countErr } = await countQuery;
    if (countErr || count === null) {
        console.error("Error fetching sample count:", countErr);
        return [];
    }

    if (count === 0) return [];

    const totalPages = Math.ceil(count / PAGE_SIZE);
    const BATCH_SIZE = 5; // Fetch 5 pages in parallel at a time
    let allSamples: any[] = [];

    for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, totalPages); j++) {
            let query = supabase
                .from('activity_samples')
                .select(selectQuery)
                .gte('recorded_at', startIso)
                .lte('recorded_at', endIso)
                .order('recorded_at', { ascending: true })
                .range(j * PAGE_SIZE, (j + 1) * PAGE_SIZE - 1);

            if (filters?.organizationId) {
                query = query.eq('organization_id', filters.organizationId);
            }
            if (filters?.sessionIds && filters.sessionIds.length > 0) {
                query = query.in('session_id', filters.sessionIds);
            }

            batchPromises.push(query);
        }

        const results = await Promise.all(batchPromises);
        results.forEach(res => {
            if (res.data) allSamples.push(...res.data);
            if (res.error) console.error("Error fetching batch page:", res.error);
        });
    }

    return allSamples;
}

