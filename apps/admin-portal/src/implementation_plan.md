# Optimize Reports Page Performance

## Goal
Resolve the severe performance bottleneck on the Reports page where frontend processing takes ~5.5-27.3 seconds and network transfer of ~90k raw activity samples takes ~2.7-3.7 seconds. The goal is to move heavy deduplication and idle filtering to PostgreSQL and optimize frontend timezone formatting.

## Proposed Changes

### 1. Database Layer: `get_productive_activity_samples` RPC
We will create a new PostgreSQL RPC `get_productive_activity_samples` that pushes the heavy lifting down to the database:
- **Deduplication:** Groups by `user_id` and `date_trunc('minute', recorded_at)`, picking the sample with the highest activity_percent.
- **Idle Limit Filtering:** Uses SQL Window Functions (`LAG`, `SUM`) to identify contiguous blocks of idle time and strictly applies each member's `idle_limit` (dropping blocks that exceed the limit, keeping all other samples).
- **Network Reduction:** By only returning the deduplicated and non-rejected idle samples, the network payload will drop from ~90,000 to ~5,000-10,000 samples, slashing RPC execution and download time.

### 2. Frontend Layer: Fix `Intl.DateTimeFormat` CPU Bottleneck
The massive 27s frontend freeze is primarily caused by calling `new Intl.DateTimeFormat()` repeatedly inside large loops in `getGroupingDateInTz`.
- **Cache Formatter:** We will implement a `Map` in `dataUtils.ts` to cache `Intl.DateTimeFormat` instances by timezone. This alone reduces date formatting time from O(N) object instantiations to O(1) lookups, dropping CPU time from >10,000ms to <50ms.

### 3. Service Layer: Refactor `report.service.ts`
- Replace `get_raw_activity_samples` with `get_productive_activity_samples`.
- Remove the frontend deduplication loop (`bestSamplesMap`).
- Remove the frontend idle limit logic (the complex `idle_limit` array iteration block).
- Continue to perform the final fast aggregations (`dailyMap`, `memberRows`, `appBreakdown`) in the frontend, as they will now execute instantly on the reduced dataset.
- Keep manual session fallback calculation exactly as-is.

### 4. Optimize `fetchReports` Calls
- Investigate `Reports.tsx` dependency array (`[range, offset, selectedTeamId, selectedMemberId, members, orgTimezone]`) to prevent duplicate fetching on initial load when `members` or `orgTimezone` hydrate asynchronously. We can use a `loaded` flag or stable references.

## Verification Plan
1. Deploy the new SQL RPC to the database using `psql` or Supabase MCP.
2. Run the admin portal and navigate to the Reports page.
3. Observe the `[Reports Timing]` logs to confirm:
   - RPC transfer time drops significantly.
   - Returned samples are drastically reduced.
   - Frontend processing time drops to <100ms.
4. Verify the numerical totals on the Reports page exactly match the expected values for both manual and automated sessions.
