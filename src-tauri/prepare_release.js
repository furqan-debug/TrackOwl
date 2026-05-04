import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const baseDir = 'h:/DigiReps/DigiReps Tracker';
const nsisPath = path.join(baseDir, 'src-tauri/target/release/bundle/nsis/TrackOwl_1.0.9_x64-setup.exe');
const keyEncodedPath = path.join(baseDir, 'src-tauri/signing.key');
const rawKeyPath = path.join(baseDir, 'src-tauri/rsign_final.key');

try {
  console.log('--- Step 1: Decode key ---');
  const encodedKey = fs.readFileSync(keyEncodedPath, 'utf8').trim();
  const rawKeyContent = Buffer.from(encodedKey, 'base64');
  fs.writeFileSync(rawKeyPath, rawKeyContent);
  console.log('Decoded key written to rsign_final.key');

  console.log('--- Step 2: Sign binary ---');
  const env = { ...process.env, TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TrackOwl2026!' };
  
  // Try signing with npx tauri
  const cmd = `npx tauri signer sign -k "${rawKeyPath}" "${nsisPath}"`;
  console.log(`Executing: ${cmd}`);
  
  const output = execSync(cmd, { env, encoding: 'utf8' });
  console.log('Signature output:');
  console.log(output);

  const sigPath = nsisPath + '.sig';
  if (fs.existsSync(sigPath)) {
    const signature = fs.readFileSync(sigPath, 'utf8').trim();
    console.log('\n--- Final Result for latest.json ---');
    console.log('Version: 1.0.9');
    console.log('Signature:');
    console.log(signature);
  } else {
    console.error('Signature file was NOT created even though command finished.');
  }

} catch (err) {
  console.error('Error during release preparation:');
  if (err.stdout) console.error('STDOUT:', err.stdout);
  if (err.stderr) console.error('STDERR:', err.stderr);
  process.exit(1);
}
