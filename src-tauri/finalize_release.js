import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const baseDir = 'h:/DigiReps/DigiReps Tracker';
const nsisPath = path.join(baseDir, 'src-tauri/target/release/bundle/nsis/TrackOwl_1.0.9_x64-setup.exe');
const keyEncodedPath = path.join(baseDir, 'src-tauri/signing.key');
const latestJsonPath = path.join(baseDir, 'latest.json');

try {
  console.log('--- Step 1: Decode key ---');
  const encodedKey = fs.readFileSync(keyEncodedPath, 'utf8').trim();
  const rawKey = Buffer.from(encodedKey, 'base64').toString();
  
  // Extract just the base64 part of the encrypted key if needed, or use the whole thing.
  // Actually, the minisign format is what Tauri's sign command handles.
  
  console.log('--- Step 2: Sign binary using env var ---');
  // We use the env var TAURI_SIGNING_PRIVATE_KEY which should contain the minisign file content.
  const env = { 
    ...process.env, 
    TAURI_SIGNING_PRIVATE_KEY: rawKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TrackOwl2026!' 
  };
  
  const cmd = `npx tauri signer sign "${nsisPath}"`;
  console.log(`Executing: ${cmd}`);
  
  const output = execSync(cmd, { env, encoding: 'utf8' });
  console.log('Signature output obtained.');

  // The output contains the signature in 4 lines.
  // Example: 
  // untrusted comment: signature from tauri secret key
  // RU...
  // trusted comment: ...
  // yA...

  // Let's parse it and base64 encode it for latest.json.
  const signatureBase64 = Buffer.from(output.trim()).toString('base64');
  console.log('Final signature base64 generated.');

  console.log('--- Step 3: Update latest.json ---');
  const latest = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
  
  latest.version = '1.0.9';
  latest.notes = 'TrackOwl v1.0.9 - Time Tracking Logic Refinement & Password Privacy';
  latest.pub_date = new Date().toISOString();
  
  if (!latest.platforms) latest.platforms = {};
  if (!latest.platforms['windows-x86_64']) latest.platforms['windows-x86_64'] = {};
  
  latest.platforms['windows-x86_64'].signature = signatureBase64;
  latest.platforms['windows-x86_64'].url = `https://github.com/furqan-debug/TrackOwl/releases/download/v1.0.9/TrackOwl_1.0.9_x64-setup.exe`;

  fs.writeFileSync(latestJsonPath, JSON.stringify(latest, null, 2));
  console.log('latest.json updated successfully!');

} catch (err) {
  console.error('Error during finalization:');
  if (err.stdout) console.error('STDOUT:', err.stdout);
  if (err.stderr) console.error('STDERR:', err.stderr);
  process.exit(1);
}
