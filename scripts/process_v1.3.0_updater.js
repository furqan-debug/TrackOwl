import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

const VERSION = '1.3.0';
const BASE_DIR = 'c:/dev/DigiReps Tracker';
const KEY_PATH = path.join(BASE_DIR, 'src-tauri/signing.key');
const RELEASE_DIR = path.join(BASE_DIR, `releases/v${VERSION}`);

const ASSETS = [
  {
    name: `TrackOwl_${VERSION}_x64-setup.exe`,
    url: `https://github.com/furqan-debug/TrackOwl/releases/download/v${VERSION}/TrackOwl_${VERSION}_x64-setup.exe`,
    platform: 'windows-x86_64'
  },
  {
    name: `TrackOwl_aarch64.app.tar.gz`,
    url: `https://github.com/furqan-debug/TrackOwl/releases/download/v${VERSION}/TrackOwl_aarch64.app.tar.gz`,
    platform: 'darwin-aarch64'
  }
];

function log(msg) { console.log(`\n\x1b[36m[*]  ${msg}\x1b[0m`); }
function ok(msg) { console.log(`\x1b[32m[+] ${msg}\x1b[0m`); }
function fail(msg) { console.error(`\x1b[31m[!] ${msg}\x1b[0m`); process.exit(1); }

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
  const encodedKey = fs.readFileSync(KEY_PATH, 'utf8').trim();
  const env = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: encodedKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'Trackora2026!'
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

(async () => {
  try {
    log(`Creating folder: ${RELEASE_DIR}`);
    fs.mkdirSync(RELEASE_DIR, { recursive: true });

    const platformsData = {};

    for (const asset of ASSETS) {
      const destPath = path.join(RELEASE_DIR, asset.name);
      if (!fs.existsSync(destPath)) {
        log(`Downloading ${asset.name} from GitHub...`);
        await downloadFile(asset.url, destPath);
        ok(`Downloaded ${asset.name}`);
      } else {
        ok(`${asset.name} already downloaded`);
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

    log('Generating latest.json...');
    const latest = {
      version: VERSION,
      notes: `TrackOwl v${VERSION} — macOS Notification Branding & Bundle ID Fix.\n\n- ✅ Fixes macOS notification banner names and logos by transitioning bundle ID to com.digireps.trackowl.\n- ✅ Ensures all local systems receive the fully branded TrackOwl notification system.\n- ✅ General performance stability and optimizations.`,
      pub_date: new Date().toISOString(),
      platforms: platformsData
    };

    const latestStr = JSON.stringify(latest, null, 2) + '\n';
    fs.writeFileSync(path.join(BASE_DIR, 'latest.json'), latestStr);
    ok('Root latest.json updated');
    fs.writeFileSync(path.join(RELEASE_DIR, 'latest.json'), latestStr);
    ok(`releases/v${VERSION}/latest.json written`);

    console.log('\n\x1b[32m================================================================================');
    console.log(`  SUCCESS! TrackOwl v${VERSION} updater files generated!`);
    console.log('================================================================================\x1b[0m');
    console.log('\nFiles prepared and signed locally. Now they are ready to be uploaded to GitHub.');

  } catch (err) {
    fail(err.message);
  }
})();
