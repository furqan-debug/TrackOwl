#!/usr/bin/env node
/**
 * Remove avatar files that no member row points at.
 *
 * Uploading a picture and never saving used to leave the file behind, and
 * replacing a picture never removed the one it replaced. Both are fixed in the
 * app now; this clears what accumulated before that.
 *
 * WHY NOT PLAIN SQL: deleting from storage.objects removes the row but leaves
 * the actual file in the storage backend, so the space is never reclaimed and
 * the image can still be fetched by anyone holding a signed URL. The Storage
 * API removes both. That is what this script uses.
 *
 * DRY RUN BY DEFAULT. Nothing is deleted until you pass --delete.
 *
 *   node scripts/cleanup-orphan-avatars.mjs              # list what would go
 *   node scripts/cleanup-orphan-avatars.mjs --delete     # actually remove
 *   node scripts/cleanup-orphan-avatars.mjs --delete --min-age-hours=0
 *
 * Needs a SERVICE ROLE key — the anon key cannot see every member row, so it
 * would mistake other people's avatars for orphans and delete them.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
 *   node scripts/cleanup-orphan-avatars.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DELETE = args.includes('--delete');
const minAgeArg = args.find(a => a.startsWith('--min-age-hours='));
// Anything uploaded in the last day might belong to a save still in flight.
const MIN_AGE_HOURS = minAgeArg ? Number(minAgeArg.split('=')[1]) : 24;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}
if (!Number.isFinite(MIN_AGE_HOURS) || MIN_AGE_HOURS < 0) {
  console.error('--min-age-hours must be a non-negative number.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const BUCKET = 'avatars';
const PAGE = 100;

/** Every file in the bucket, walking the folder tree the Storage API exposes. */
async function listAllFiles(prefix = '') {
  const found = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw new Error(`list('${prefix}'): ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A directory placeholder has no id; recurse into it.
      if (entry.id === null || entry.id === undefined) {
        found.push(...await listAllFiles(path));
      } else {
        found.push({ path, created_at: entry.created_at, size: entry.metadata?.size ?? 0 });
      }
    }

    if (data.length < PAGE) break;
  }
  return found;
}

function human(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${bytes} B`;
}

const { data: members, error: memberErr } = await db
  .from('members')
  .select('avatar_url')
  .not('avatar_url', 'is', null);

if (memberErr) {
  console.error('Could not read members:', memberErr.message);
  process.exit(1);
}

const referenced = new Set(
  (members || []).map(m => m.avatar_url).filter(v => typeof v === 'string' && v !== '')
);

console.log(`Members pointing at a file: ${referenced.size}`);

const files = await listAllFiles();
console.log(`Files in bucket "${BUCKET}": ${files.length}`);

// Guard: if no member references anything, something is wrong with the query
// rather than with the data. Deleting the whole bucket on a bad read would be
// unrecoverable, so refuse.
if (referenced.size === 0 && files.length > 0) {
  console.error('\nRefusing to continue: not a single member references a file.');
  console.error('That usually means the key lacks permission to read members.');
  process.exit(1);
}

const cutoff = Date.now() - MIN_AGE_HOURS * 3600 * 1000;
const orphans = files.filter(f =>
  !referenced.has(f.path) && new Date(f.created_at).getTime() < cutoff
);
const tooNew = files.filter(f =>
  !referenced.has(f.path) && new Date(f.created_at).getTime() >= cutoff
);

const totalBytes = orphans.reduce((s, f) => s + Number(f.size || 0), 0);

console.log(`\nOrphaned and older than ${MIN_AGE_HOURS}h: ${orphans.length} (${human(totalBytes)})`);
if (tooNew.length) {
  console.log(`Orphaned but too recent to touch: ${tooNew.length} (re-run later, or --min-age-hours=0)`);
}

for (const f of orphans) {
  console.log(`  ${f.created_at.slice(0, 10)}  ${human(Number(f.size || 0)).padStart(8)}  ${f.path}`);
}

if (!orphans.length) {
  console.log('\nNothing to remove.');
  process.exit(0);
}

if (!DELETE) {
  console.log('\nDry run. Re-run with --delete to remove these.');
  process.exit(0);
}

// The API caps how many paths one call accepts; go in batches.
let removed = 0;
for (let i = 0; i < orphans.length; i += 50) {
  const batch = orphans.slice(i, i + 50).map(f => f.path);
  const { error } = await db.storage.from(BUCKET).remove(batch);
  if (error) {
    console.error(`\nBatch starting at ${i} failed: ${error.message}`);
    console.error(`Removed ${removed} file(s) before this point. Re-run to continue.`);
    process.exit(1);
  }
  removed += batch.length;
  console.log(`Removed ${removed}/${orphans.length}...`);
}

console.log(`\nDone. Removed ${removed} file(s), freeing ${human(totalBytes)}.`);
