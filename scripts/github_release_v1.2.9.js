import fs from 'fs';
import path from 'path';
import https from 'https';

// ── Config ────────────────────────────────────────────────────────────────────
const VERSION     = '1.2.9';
const TAG         = `v${VERSION}`;
const OWNER       = 'furqan-debug';
const REPO        = 'TrackOwl';
const BASE_DIR    = 'c:/dev/DigiReps Tracker';
const RELEASE_DIR = path.join(BASE_DIR, `releases/v${VERSION}`);

// Read token from env or .env file
let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  try {
    const env = fs.readFileSync(path.join(BASE_DIR, '.env'), 'utf8');
    const match = env.match(/GITHUB_TOKEN[=:]([^\r\n]+)/);
    if (match) TOKEN = match[1].trim();
  } catch {}
}
if (!TOKEN) {
  console.error('ERROR: GITHUB_TOKEN not found in env, process.env, or .env file');
  console.log('\nPlease run the command with your GITHUB_TOKEN environment variable set, for example:');
  console.log(`  $env:GITHUB_TOKEN="your_token"; node scripts/github_release_v1.2.9.js`);
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function apiRequest(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'TrackOwl-Release-Script/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...extraHeaders
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadAsset(uploadUrl, filePath) {
  const baseUrl = uploadUrl.replace(/\{.*\}/, '');
  const filename = path.basename(filePath);
  const fileData = fs.readFileSync(filePath);
  const isSig = filename.endsWith('.sig');
  const contentType = isSig ? 'text/plain' : filename.endsWith('.json') ? 'application/json' : 'application/octet-stream';

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}?name=${encodeURIComponent(filename)}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'TrackOwl-Release-Script/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': contentType,
        'Content-Length': fileData.length
      }
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
function log(msg) { console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`); }
function ok(msg)  { console.log(`\x1b[32m✔ ${msg}\x1b[0m`); }
function fail(msg){ console.error(`\x1b[31m✘ ${msg}\x1b[0m`); process.exit(1); }

(async () => {
  log(`Fetching existing GitHub release for tag ${TAG}...`);
  const getRes = await apiRequest('GET', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
  
  if (getRes.status !== 200) {
    fail(`Could not fetch release: ${JSON.stringify(getRes.body)}`);
  }

  const release = getRes.body;
  ok(`Found release: ${release.html_url}`);
  console.log(`  Upload URL: ${release.upload_url}`);

  // We want to upload:
  // 1. latest.json
  // 2. TrackOwl_1.2.9_x64-setup.exe.sig
  // 3. TrackOwl_aarch64.app.tar.gz.sig
  const assets = [
    `TrackOwl_${VERSION}_x64-setup.exe.sig`,
    `TrackOwl_aarch64.app.tar.gz.sig`,
    'latest.json'
  ];

  // If the assets already exist on GitHub, we delete them first to avoid duplicates or 422 errors
  log('Checking for existing assets to overwrite...');
  for (const assetName of assets) {
    const existing = release.assets.find(a => a.name === assetName);
    if (existing) {
      process.stdout.write(`  Deleting existing asset ${assetName}... `);
      const delRes = await apiRequest('DELETE', `/repos/${OWNER}/${REPO}/releases/assets/${existing.id}`);
      if (delRes.status === 204) {
        console.log('\x1b[32m✔\x1b[0m (Deleted)');
      } else {
        console.log(`\x1b[31m✘ HTTP ${delRes.status}\x1b[0m`);
      }
    }
  }

  log('Uploading new assets...');
  for (const asset of assets) {
    const filePath = path.join(RELEASE_DIR, asset);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Skipping (not found): ${asset}`);
      continue;
    }
    process.stdout.write(`  Uploading ${asset}... `);
    const res = await uploadAsset(release.upload_url, filePath);
    if (res.status === 201) {
      console.log(`\x1b[32m✔\x1b[0m (${(fs.statSync(filePath).size / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`\x1b[31m✘ HTTP ${res.status}\x1b[0m`);
      console.error('  Error:', JSON.stringify(res.body?.errors || res.body?.message || res.body));
    }
  }

  console.log('\n\x1b[32m════════════════════════════════════════════════');
  console.log(`  GitHub Release v${VERSION} Updater Assets are LIVE!`);
  console.log('════════════════════════════════════════════════\x1b[0m');
  console.log(`\n  URL: ${release.html_url}\n`);
})();
