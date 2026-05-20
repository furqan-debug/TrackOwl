import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_DIR = 'c:/dev/DigiReps Tracker';

// 1. Read version dynamically from package.json
let VERSION;
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'package.json'), 'utf8'));
  VERSION = pkg.version;
} catch (err) {
  console.error('ERROR: Could not read package.json version:', err.message);
  process.exit(1);
}

const TAG = `v${VERSION}`;
const OWNER = 'furqan-debug';
const REPO = 'TrackOwl';
const KEY_PATH = path.join(BASE_DIR, 'src-tauri/signing.key');
const RELEASE_DIR = path.join(BASE_DIR, `releases/v${VERSION}`);

// 2. Read GITHUB_TOKEN from env or .env file
let TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  try {
    const env = fs.readFileSync(path.join(BASE_DIR, '.env'), 'utf8');
    const match = env.match(/GITHUB_TOKEN[=:]([^\r\n]+)/);
    if (match) TOKEN = match[1].trim();
  } catch {}
}

const ASSETS = [
  {
    name: `TrackOwl_${VERSION}_x64-setup.exe`,
    url: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/TrackOwl_${VERSION}_x64-setup.exe`,
    platform: 'windows-x86_64'
  },
  {
    name: `TrackOwl_aarch64.app.tar.gz`,
    url: `https://github.com/${OWNER}/${REPO}/releases/download/${TAG}/TrackOwl_aarch64.app.tar.gz`,
    platform: 'darwin-aarch64'
  }
];

function log(msg) { console.log(`\n\x1b[36m[*] ${msg}\x1b[0m`); }
function ok(msg) { console.log(`\x1b[32m[+] ${msg}\x1b[0m`); }
function fail(msg) { console.error(`\x1b[31m[!] ${msg}\x1b[0m`); process.exit(1); }

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: status ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function apiRequest(method, apiPath, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'TrackOwl-Release-Script/1.1',
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
        'User-Agent': 'TrackOwl-Release-Script/1.1',
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

function extractSignature(signerOutput) {
  if (signerOutput.includes('Public signature:')) {
    const lines = signerOutput.split('\n');
    const startIdx = lines.findIndex(line => line.includes('Public signature:')) + 1;
    const endIdx = lines.findIndex(line => line.includes('Make sure to include'));
    if (startIdx > 0 && endIdx > startIdx) {
      return lines.slice(startIdx, endIdx).join('\n').trim();
    }
  }
  return signerOutput.trim();
}

function sign(filePath) {
  if (!fs.existsSync(KEY_PATH)) {
    fail(`Signing key not found at ${KEY_PATH}`);
  }
  const encodedKey = fs.readFileSync(KEY_PATH, 'utf8').trim();
  const env = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: encodedKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || 'TrackOwl2026!'
  };
  const cmd = `npx tauri signer sign "${filePath}"`;
  log(`Signing: ${path.basename(filePath)}`);
  try {
    const stdout = execSync(cmd, { env, encoding: 'utf8', cwd: BASE_DIR });
    ok(`Signed: ${path.basename(filePath)}`);
    return extractSignature(stdout);
  } catch (err) {
    console.error('Tauri signer failed:');
    if (err.stdout) console.error('STDOUT:', err.stdout);
    if (err.stderr) console.error('STDERR:', err.stderr);
    throw err;
  }
}

// ── MAIN EXECUTION ────────────────────────────────────────────────────────────
const command = process.argv[2];

if (command !== 'process-local' && command !== 'upload-only' && command !== 'all') {
  console.log(`
TrackOwl Release Helper v${VERSION}
Usage:
  node scripts/release_helper.js <command>

Commands:
  process-local   Downloads latest release assets from GitHub, signs them locally,
                  and generates updated latest.json manifests in releases/v${VERSION}/
  upload-only     Uploads the signatures (.sig) and latest.json back to the GitHub Release.
                  Requires GITHUB_TOKEN to be set in environment or .env.
  all             Runs 'process-local' followed by 'upload-only'.
`);
  process.exit(0);
}

(async () => {
  try {
    let platformsData = {};

    if (command === 'process-local' || command === 'all') {
      log(`Starting processing for Release ${TAG}...`);
      log(`Creating folder: ${RELEASE_DIR}`);
      fs.mkdirSync(RELEASE_DIR, { recursive: true });

      for (const asset of ASSETS) {
        const destPath = path.join(RELEASE_DIR, asset.name);
        if (!fs.existsSync(destPath)) {
          log(`Downloading ${asset.name} from GitHub Release tag...`);
          try {
            await downloadFile(asset.url, destPath);
            ok(`Downloaded ${asset.name}`);
          } catch (err) {
            console.warn(`[!] Warning: Could not download ${asset.name} (perhaps build hasn't finished?). Details: ${err.message}`);
            continue;
          }
        } else {
          ok(`${asset.name} already exists locally`);
        }

        const sigOutput = sign(destPath);
        const sigPath = `${destPath}.sig`;
        fs.writeFileSync(sigPath, sigOutput + '\n');
        ok(`Wrote signature file: ${path.basename(sigPath)}`);

        platformsData[asset.platform] = {
          signature: sigOutput,
          url: asset.url
        };
      }

      // Read notes from previous release or make generic ones
      let notes = `TrackOwl v${VERSION} — Stability and feature improvements release.`;
      
      log('Generating latest.json...');
      const latest = {
        version: VERSION,
        notes,
        pub_date: new Date().toISOString(),
        platforms: platformsData
      };

      const latestStr = JSON.stringify(latest, null, 2) + '\n';
      fs.writeFileSync(path.join(BASE_DIR, 'latest.json'), latestStr);
      ok('Root latest.json updated');
      fs.writeFileSync(path.join(RELEASE_DIR, 'latest.json'), latestStr);
      ok(`releases/v${VERSION}/latest.json written`);
    }

    if (command === 'upload-only' || command === 'all') {
      if (!TOKEN) {
        fail('GITHUB_TOKEN not found. Cannot upload assets to GitHub Release.');
      }
      log(`Fetching existing GitHub release info for tag ${TAG}...`);
      const getRes = await apiRequest('GET', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`);
      
      if (getRes.status !== 200) {
        fail(`Could not fetch GitHub release: ${JSON.stringify(getRes.body)}`);
      }

      const release = getRes.body;
      ok(`Found release: ${release.html_url}`);

      const assetsToUpload = [
        `TrackOwl_${VERSION}_x64-setup.exe.sig`,
        `TrackOwl_aarch64.app.tar.gz.sig`,
        'latest.json'
      ];

      // Delete existing matching assets first to avoid conflicts
      log('Checking for existing signatures/manifests to overwrite...');
      for (const assetName of assetsToUpload) {
        const existing = release.assets.find(a => a.name === assetName);
        if (existing) {
          process.stdout.write(`  Deleting old asset ${assetName}... `);
          const delRes = await apiRequest('DELETE', `/repos/${OWNER}/${REPO}/releases/assets/${existing.id}`);
          if (delRes.status === 204) {
            console.log('\x1b[32m✔\x1b[0m (Deleted)');
          } else {
            console.log(`\x1b[31m✘ HTTP ${delRes.status}\x1b[0m`);
          }
        }
      }

      log('Uploading new signature assets and manifest...');
      for (const asset of assetsToUpload) {
        const filePath = path.join(RELEASE_DIR, asset);
        if (!fs.existsSync(filePath)) {
          console.warn(`  ⚠ Skipping (not found locally): ${asset}`);
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
      console.log(`  GitHub Release ${TAG} Auto-Updater is LIVE!`);
      console.log('════════════════════════════════════════════════\x1b[0m');
    }

  } catch (err) {
    fail(err.message);
  }
})();
