import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Paths
const BASE_DIR = 'H:/DigiReps/DigiReps Tracker';
const KEY_PATH = `${BASE_DIR}/src-tauri/signing.key`;
const MSI_DIR = `${BASE_DIR}/src-tauri/target/release/bundle/msi`;
const ORIGINAL_MSI_NAME = 'TrackOwl_1.0.9_x64_en-US.msi';
const TEMP_MSI_NAME = 'v109.msi';
const TEMP_KEY_NAME = 'k.key';

try {
  console.log('--- Fixing Empty MSI Signature ---');
  
  // 1. Prepare key
  console.log('Reading and decoding signing key...');
  const encodedKey = fs.readFileSync(KEY_PATH, 'utf8').trim();
  const rawKeyData = Buffer.from(encodedKey, 'base64');
  fs.writeFileSync(`${BASE_DIR}/src-tauri/${TEMP_KEY_NAME}`, rawKeyData);

  // 2. Rename MSI
  console.log('Renaming MSI to temporary name...');
  const originalMsiPath = `${MSI_DIR}/${ORIGINAL_MSI_NAME}`;
  const tempMsiPath = `${MSI_DIR}/${TEMP_MSI_NAME}`;
  if (fs.existsSync(originalMsiPath)) {
    fs.renameSync(originalMsiPath, tempMsiPath);
  } else if (!fs.existsSync(tempMsiPath)) {
    throw new Error('MSI file not found at ' + originalMsiPath);
  }

  // 3. Sign
  console.log('Signing MSI file with temp key file (no spaces)...');
  const stdout = execSync(`npx tauri signer sign -k "${TEMP_KEY_NAME}" "target/release/bundle/msi/${TEMP_MSI_NAME}"`, {
    cwd: `${BASE_DIR}/src-tauri`,
    env: {
      ...process.env,
      TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'TrackOwl2026!'
    }
  });

  // 4. Save and Restore
  const finalSigPath = `${originalMsiPath}.sig`;
  fs.writeFileSync(finalSigPath, stdout);
  console.log('MSI successfully signed.');

  fs.renameSync(tempMsiPath, originalMsiPath);
  console.log('Restored MSI filename.');

  // Cleanup
  fs.unlinkSync(`${BASE_DIR}/src-tauri/${TEMP_KEY_NAME}`);
  console.log('Cleaned up temp key.');

  const content = fs.readFileSync(finalSigPath, 'utf8');
  if (content.length > 20) {
    console.log('SUCCESS! MSI signature is now populated (' + content.length + ' bytes).');
  } else {
    throw new Error('Produced signature is suspiciously short.');
  }
} catch (error) {
  console.error('--- EXCEPTION ---');
  console.error('MESSAGE:', error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout.toString());
  if (error.stderr) console.error('STDERR:', error.stderr.toString());
  
  // Try to restore filename if it was moved
  const tempMsiPath = `${MSI_DIR}/${TEMP_MSI_NAME}`;
  const originalMsiPath = `${MSI_DIR}/${ORIGINAL_MSI_NAME}`;
  if (fs.existsSync(tempMsiPath)) fs.renameSync(tempMsiPath, originalMsiPath);
  
  // Cleanup key
  const tempKeyPath = `${BASE_DIR}/src-tauri/${TEMP_KEY_NAME}`;
  if (fs.existsSync(tempKeyPath)) fs.unlinkSync(tempKeyPath);
  
  process.exit(1);
}
