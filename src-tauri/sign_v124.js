import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const baseDir = 'c:/Users/Furqan/DigiReps/DigiReps Tracker';
const nsisPath = path.join(baseDir, 'src-tauri/target/release/bundle/nsis/Trackora_1.2.4_x64-setup.exe');
const msiPath  = path.join(baseDir, 'src-tauri/target/release/bundle/msi/Trackora_1.2.4_x64_en-US.msi');
const keyDecodedPath = path.join(baseDir, 'src-tauri/decoded_signing.key');

try {
  console.log('--- Step 1: Prepare signing environment ---');
  const keyContent = "untrusted comment: rsign encrypted secret key\n" +
                     "RWRTY0IyZj2AwQdgWxzNHaxswBawu51ij4FjiIGxjBO+RhKotm8AABAAAAAAAAAAAAIAAAAAxpvOBfsKK8xQjLLt15Zw8UDCz8IA4fOJiu1VvE6CKHdTnkJ0v5U+CpAHJxxYW3R9fYfgt/pv6AGvahCC1QgNnyPiq0AzLq7hnwqxri4BYBKanhidJQ67Krw5iqRJbEBIpEsgf5oshfY=";
  
  const tempKeyPath = path.join(baseDir, 'src-tauri/temp_signing.key');
  fs.writeFileSync(tempKeyPath, keyContent);

  const env = { 
    ...process.env, 
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: 'Trackora2026!'
  };

  console.log('--- Step 2: Sign binaries ---');
  
  // Sign NSIS
  console.log(`Signing NSIS...`);
  const stdoutNsis = execSync(`npx tauri signer sign -f "${tempKeyPath}" "${nsisPath}"`, { env, encoding: 'utf8' });
  // The output of 'tauri signer sign' IS the base64 encoded signature file content.
  fs.writeFileSync(nsisPath + '.sig', stdoutNsis.trim());
  console.log('NSIS Signature generated.');

  // Sign MSI
  console.log(`Signing MSI...`);
  const stdoutMsi = execSync(`npx tauri signer sign -f "${tempKeyPath}" "${msiPath}"`, { env, encoding: 'utf8' });
  fs.writeFileSync(msiPath + '.sig', stdoutMsi.trim());
  console.log('MSI Signature generated.');

  // Update latest.json
  console.log('--- Step 3: Update latest.json ---');
  const latestJsonPath = path.join(baseDir, 'latest.json');
  const latest = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
  
  latest.version = '1.2.4';
  latest.notes = 'Trackora v1.2.4 - Performance and Stability Release: Single-instance protection, optimized input tracking, and fixed auto-updater progress reporting.';
  latest.pub_date = new Date().toISOString();
  
  // Use the NSIS signature for the windows-x86_64 platform
  latest.platforms['windows-x86_64'].signature = stdoutNsis.trim();
  latest.platforms['windows-x86_64'].url = `https://github.com/furqan-debug/Trackora/releases/download/v1.2.4/Trackora_1.2.4_x64-setup.exe`;

  fs.writeFileSync(latestJsonPath, JSON.stringify(latest, null, 2));
  console.log('latest.json updated with v1.2.4!');

  console.log('\n--- SUCCESS ---');
  console.log('Now upload the following files to GitHub:');
  console.log('1. ' + nsisPath);
  console.log('2. ' + nsisPath + '.sig');
  console.log('3. ' + latestJsonPath);

} catch (err) {
  console.error('FAILED TO SIGN RELEASE');
  if (err.stdout) console.error('STDOUT:', err.stdout);
  if (err.stderr) console.error('STDERR:', err.stderr);
  process.exit(1);
}
