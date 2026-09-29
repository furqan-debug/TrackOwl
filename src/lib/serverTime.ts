// src/lib/serverTime.ts
// Single source of truth for Server Time & Organization Business Date.
//
// Solves:
// 1. Reps in different time zones around the world (Jamaica, Pakistan, Nigeria, Philippines, US)
//    must all have their work, timesheets, and daily limit resets anchored to the
//    Organization's configured timezone.
// 2. Physical laptop clock drift or manual clock manipulation (e.g. tester moving system
//    clock to future dates like Oct 1st) must NEVER affect the organization's business date.

let serverClockOffsetMs = 0;
let lastSyncTimestamp = 0;

/**
 * Update the offset between the local device clock and the authoritative Supabase server.
 * Uses the standard HTTP 'Date' response header returned by Supabase on every request.
 */
export function updateServerClockOffset(serverDateStrOrMs: string | number | Date | null | undefined): void {
  if (!serverDateStrOrMs) return;
  try {
    const serverMs = typeof serverDateStrOrMs === 'number' 
      ? serverDateStrOrMs 
      : new Date(serverDateStrOrMs).getTime();
    
    if (Number.isFinite(serverMs) && serverMs > 0) {
      serverClockOffsetMs = serverMs - Date.now();
      lastSyncTimestamp = Date.now();
    }
  } catch (err) {
    console.warn('[serverTime] Failed to parse server date:', err);
  }
}

/**
 * Pings Supabase REST API via a lightweight HEAD request to sync the server clock offset.
 */
export async function syncServerTime(supabaseUrl: string, anonKey: string): Promise<number> {
  try {
    const t0 = Date.now();
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${anonKey}`, { method: 'HEAD' });
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverMs = new Date(dateHeader).getTime();
      const t1 = Date.now();
      const rtt = t1 - t0;
      // Adjust for half of round-trip time
      serverClockOffsetMs = (serverMs + Math.round(rtt / 2)) - t1;
      lastSyncTimestamp = Date.now();
      console.log(`[serverTime] Clock synced with server. Offset: ${serverClockOffsetMs}ms (RTT: ${rtt}ms)`);
    }
  } catch (err) {
    console.warn('[serverTime] Background clock sync error:', err);
  }
  return serverClockOffsetMs;
}

/**
 * Returns a Date object representing the authoritative current UTC instant,
 * corrected for any local device clock drift or manipulation.
 */
export function getTrueServerNow(): Date {
  return new Date(Date.now() + serverClockOffsetMs);
}

/**
 * Returns the current calendar date string (YYYY-MM-DD) in the Organization's Configured Timezone.
 * This is the single source of truth for:
 * - Daily hours limit enforcement
 * - Payroll day rollover (midnight reset)
 * - Block record business_date stamping
 */
export function getOrgBusinessDate(orgTimezone?: string | null): string {
  const tz = orgTimezone || 'UTC';
  try {
    return getTrueServerNow().toLocaleDateString('en-CA', { timeZone: tz });
  } catch (_) {
    return getTrueServerNow().toLocaleDateString('en-CA', { timeZone: 'UTC' });
  }
}

/**
 * Returns the clock offset in seconds (positive if server is ahead of device, negative if device is ahead of server).
 * Passed to Rust backend so BlockAccumulator stamps blocks with true server-synchronized timestamps.
 */
export function getServerOffsetSecs(): number {
  return Math.round(serverClockOffsetMs / 1000);
}

/**
 * Returns the raw offset in milliseconds.
 */
export function getServerOffsetMs(): number {
  return serverClockOffsetMs;
}

export function getLastSyncTimestamp(): number {
  return lastSyncTimestamp;
}
