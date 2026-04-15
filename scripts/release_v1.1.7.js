import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const VERSION = '1.1.7';
const BASE_DIR = 'c:/Users/Furqan/DigiReps/DigiReps Tracker';
const KEY_PATH = path.join(BASE_DIR, 'src-tauri/signing.key');
const NSIS_PATH = path.join(BASE_DIR, `src-tauri/target/release/bundle/nsis/Trackora_${VERSION}_x64-setup.exe`);
const MSI_PATH  = path.join(BASE_DIR, `src-tauri/target/release/bundle/msi/Trackora_${VERSION}_x64_en-US.msi`);
const RELEASE_DIR = path.join(BASE_DIR, `releases/v${VERSION}`);

function log(msg) { console.log(`\n\x1b[36m[*]  ${msg}\x1b[0m`); }
function ok(msg)  { console.log(`\x1b[32m[+] ${msg}\x1b[0m`); }
function fail(msg){ console.error(`\x1b[31m[!] ${msg}\x1b[0m`); process.exit(1); }

function sign(filePath) {
  // TAURI_SIGNING_PRIVATE_KEY must be the raw base64-encoded key string
  const encodedKey = fs.readFileSync(KEY_PATH, 'utf8').trim();

  const env = {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: encodedKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'Trackora2026!'
  };

  const cmd = `npx tauri signer sign "${filePath}"`;
  log(`Signing: ${path.basename(filePath)}`);
  console.log(`  CMD: ${cmd}`);

  const stdout = execSync(cmd, { env, encoding: 'utf8', cwd: BASE_DIR });
  ok(`Signed: ${path.basename(filePath)}`);
  return stdout.trim();
}

try {
  // 1. Verify artifacts exist
  log('Checking built artifacts...');
  if (!fs.existsSync(NSIS_PATH)) fail(`NSIS exe not found:\n  ${NSIS_PATH}`);
  if (!fs.existsSync(MSI_PATH))  fail(`MSI not found:\n  ${MSI_PATH}`);
  ok('Both installers found');

  // 2. Sign .exe
  const exeSigOutput = sign(NSIS_PATH);
  console.log('  EXE sig output:', exeSigOutput.substring(0, 80) + '...');

  // 3. Sign .msi
  const msiSigOutput = sign(MSI_PATH);
  console.log('  MSI sig output:', msiSigOutput.substring(0, 80) + '...');

  // 4. Read .sig files
  const exeSigPath = `${NSIS_PATH}.sig`;
  const msiSigPath = `${MSI_PATH}.sig`;

  if (!fs.existsSync(exeSigPath)) {
    fs.writeFileSync(exeSigPath, exeSigOutput + '\n');
    ok('Wrote .exe.sig from stdout');
  }
  if (!fs.existsSync(msiSigPath)) {
    fs.writeFileSync(msiSigPath, msiSigOutput + '\n');
    ok('Wrote .msi.sig from stdout');
  }

  // 5. Build release directory
  log(`Creating releases/v${VERSION}/`);
  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  const filesToCopy = [
    NSIS_PATH,
    exeSigPath,
    MSI_PATH,
    msiSigPath,
  ];

  for (const src of filesToCopy) {
    const dest = path.join(RELEASE_DIR, path.basename(src));
    fs.copyFileSync(src, dest);
    ok(`Copied: ${path.basename(src)}`);
  }

  // 6. Build latest.json
  log('Generating latest.json...');
  const exeSigText = fs.readFileSync(exeSigPath, 'utf8').trim();

  const latest = {
    version: VERSION,
    notes: `Trackora v${VERSION} - Critical fix for screenshot encoding and storage. Upgraded to RGB JPEG with optimized downscaling.`,
    pub_date: new Date().toISOString(),
    platforms: {
      'windows-x86_64': {
        signature: exeSigText,
        url: `https://github.com/furqan-debug/Trackora/releases/download/v${VERSION}/Trackora_${VERSION}_x64-setup.exe`
      }
    }
  };

  const latestStr = JSON.stringify(latest, null, 2) + '\n';

  // Write to root
  fs.writeFileSync(path.join(BASE_DIR, 'latest.json'), latestStr);
  ok('Root latest.json updated');

  // Write into release dir
  fs.writeFileSync(path.join(RELEASE_DIR, 'latest.json'), latestStr);
  ok(`releases/v${VERSION}/latest.json written`);

  // 7. Done
  console.log('\n\x1b[32m================================================================================');
  console.log(`  SUCCESS! Trackora v${VERSION} release packaged!`);
  console.log('================================================================================\x1b[0m');
  console.log('\nFiles ready in: releases/v' + VERSION);
  console.log(`  [ ] Trackora_${VERSION}_x64-setup.exe`);
  console.log(`  [ ] Trackora_${VERSION}_x64-setup.exe.sig`);
  console.log(`  [ ] Trackora_${VERSION}_x64_en-US.msi`);
  console.log(`  [ ] Trackora_${VERSION}_x64_en-US.msi.sig`);
  console.log(`  [ ] latest.json`);

} catch (err) {
  console.error('\n\x1b[31mFAILED:\x1b[0m');
  if (err.stdout) console.error('STDOUT:', err.stdout);
  if (err.stderr) console.error('STDERR:', err.stderr);
  console.error(err.message);
  process.exit(1);
}
