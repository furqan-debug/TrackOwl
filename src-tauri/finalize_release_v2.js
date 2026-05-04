import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const baseDir = 'h:/DigiReps/DigiReps Tracker';
const nsisPath = path.join(baseDir, 'src-tauri/target/release/bundle/nsis/TrackOwl_1.0.9_x64-setup.exe');
const keyEncodedPath = path.join(baseDir, 'src-tauri/signing.key');

try {
  console.log('--- Step 1: Prepare signing environment ---');
  const encodedKey = fs.readFileSync(keyEncodedPath, 'utf8').trim();
  const rawKey = Buffer.from(encodedKey, 'base64').toString();
  
  // Ensure the minisign key has LF newlines for the CLI
  const lfKey = rawKey.replace(/\r\n/g, '\n');

  console.log('--- Step 2: Sign binary ---');
  // We pass the key via env var. Tauri CLI should handle this.
  const env = { 
    ...process.env, 
    TAURI_SIGNING_PRIVATE_KEY: lfKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TrackOwl2026!'
  };
  
  // Note: We don't use -k here, just let it pick up the env var
  const cmd = `npx tauri signer sign "${nsisPath}"`;
  console.log(`Executing: ${cmd}`);
  
  const stdout = execSync(cmd, { env, encoding: 'utf8' });
  console.log('Successfully signed!');
  console.log(stdout);

  // Update latest.json
  const latestJsonPath = path.join(baseDir, 'latest.json');
  const latest = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
  
  latest.version = '1.0.9';
  latest.notes = 'TrackOwl v1.0.9 - Official Release with Time Tracking Fixes';
  latest.pub_date = new Date().toISOString();
  
  // Encode the 4-line signature as base64 for latest.json
  latest.platforms['windows-x86_64'].signature = Buffer.from(stdout.trim()).toString('base64');
  latest.platforms['windows-x86_64'].url = `https://github.com/furqan-debug/TrackOwl/releases/download/v1.0.9/TrackOwl_1.0.9_x64-setup.exe`;

  fs.writeFileSync(latestJsonPath, JSON.stringify(latest, null, 2));
  console.log('latest.json updated!');

} catch (err) {
  console.error('FAILED TO FINALIZE RELEASE');
  if (err.stdout) console.error('STDOUT:', err.stdout);
  if (err.stderr) console.error('STDERR:', err.stderr);
  process.exit(1);
}
