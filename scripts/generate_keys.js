import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

// Use environment variable for password to avoid hardcoding secrets
const password = process.env.TAURI_SIGNER_PASSWORD;
if (!password) {
  console.error('Error: TAURI_SIGNER_PASSWORD environment variable is not set.');
  process.exit(1);
}

// Default to .temp/keys if no output directory specified
const outputDir = process.env.TAURI_SIGNER_OUTPUT_DIR || resolve('.temp', 'keys');

try {
  mkdirSync(outputDir, { recursive: true });
} catch (err) {
  console.error(`Error creating output directory: ${err.message}`);
}

console.log(`Using output directory: ${outputDir}`);

const child = spawn('npx', ['tauri', 'signer', 'generate', '-p', password], { stdio: 'pipe', shell: true });

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
});
child.stderr.on('data', (data) => {
  output += data.toString();
});

child.on('close', (code) => {
  console.log(`Tauri process exited with code ${code}`);
  
  const pubMatch = output.match(/dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6 [a-zA-Z0-9+/=]*(\r?\n)([a-zA-Z0-9+/=]{40,})/);
  const privMatch = output.match(/dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5(\r?\n)([a-zA-Z0-9+/=]{80,})/);
  
  if (pubMatch) {
    const pubKey = pubMatch[0].replace(/\r/g, '').trim();
    const pubKeyPath = join(outputDir, 'new_v4.pub');
    writeFileSync(pubKeyPath, pubKey);
    console.log(`Public key saved to ${pubKeyPath}`);
  } else {
    console.log('Public key NOT found in output');
  }
  
  if (privMatch) {
    const privKey = privMatch[0].replace(/\r/g, '').trim();
    const privKeyPath = join(outputDir, 'new_v4.key');
    writeFileSync(privKeyPath, privKey);
    console.log(`Private key saved to ${privKeyPath}`);
  } else {
    console.log('Private key NOT found in output');
  }
  
  const rawOutputPath = join(outputDir, 'new_v4_raw_output.txt');
  writeFileSync(rawOutputPath, output);
  console.log(`Raw output saved to ${rawOutputPath}`);
});
