import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Use the current directory correctly 
const BASE_DIR = 'c:/Users/Furqan/DigiReps/DigiReps Tracker';
const KEY_PATH = `${BASE_DIR}/src-tauri/signing.key`;
const RELEASE_DIR = `${BASE_DIR}/src-tauri/target/release/bundle`;
const TEMP_KEY_NAME = 'k.key';

try {
  console.log('--- Step 1: Prepare Key ---');
  const encodedKey = fs.readFileSync(KEY_PATH, 'utf8').trim();
  const rawKeyData = Buffer.from(encodedKey, 'base64');
  fs.writeFileSync(`${BASE_DIR}/src-tauri/${TEMP_KEY_NAME}`, rawKeyData);

  const env = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TrackOwl2026!'
  };

  console.log('--- Step 2: Sign Binary (NSIS) ---');
  const nsisRelPath = 'target/release/bundle/nsis/TrackOwl_1.2.4_x64-setup.exe';
  const nsisAbsPath = `${BASE_DIR}/src-tauri/${nsisRelPath}`;

  const stdoutNsis = execSync(`npx tauri signer sign -k "${encodedKey}" "${nsisRelPath}"`, {
    cwd: `${BASE_DIR}/src-tauri`,
    env,
    encoding: 'utf8'
  });
  fs.writeFileSync(nsisAbsPath + '.sig', stdoutNsis.trim());
  console.log('NSIS Signature generated.');

  console.log('--- Step 3: Sign Binary (MSI) ---');
  const msiRelPath = 'target/release/bundle/msi/TrackOwl_1.2.4_x64_en-US.msi';
  const msiAbsPath = `${BASE_DIR}/src-tauri/${msiRelPath}`;

  const stdoutMsi = execSync(`npx tauri signer sign -k "${encodedKey}" "${msiRelPath}"`, {
    cwd: `${BASE_DIR}/src-tauri`,
    env,
    encoding: 'utf8'
  });
  fs.writeFileSync(msiAbsPath + '.sig', stdoutMsi.trim());
  console.log('MSI Signature generated.');

  console.log('--- Step 4: Update latest.json ---');
  const latestJsonPath = `${BASE_DIR}/latest.json`;
  const latest = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));

  latest.version = '1.2.4';
  latest.notes = 'TrackOwl v1.2.4 - Performance and Stability Release: Single-instance protection, optimized input tracking, and fixed auto-updater progress reporting.';
  latest.pub_date = new Date().toISOString();
  latest.platforms['windows-x86_64'].signature = stdoutNsis.trim();
  latest.platforms['windows-x86_64'].url = `https://github.com/furqan-debug/TrackOwl/releases/download/v1.2.4/TrackOwl_1.2.4_x64-setup.exe`;

  fs.writeFileSync(latestJsonPath, JSON.stringify(latest, null, 2));
  console.log('latest.json updated!');

  // Cleanup
  fs.unlinkSync(`${BASE_DIR}/src-tauri/${TEMP_KEY_NAME}`);
  console.log('--- SUCCESS ---');

} catch (error) {
  console.error('--- FAILED ---');
  if (error.stdout) console.error('STDOUT:', error.stdout.toString());
  if (error.stderr) console.error('STDERR:', error.stderr.toString());

  const tempKeyPath = `${BASE_DIR}/src-tauri/${TEMP_KEY_NAME}`;
  if (fs.existsSync(tempKeyPath)) fs.unlinkSync(tempKeyPath);
  process.exit(1);
}
