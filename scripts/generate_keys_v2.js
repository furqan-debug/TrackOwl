import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const password = 'TrackOwl2026!';
console.log('Generating keys...');

try {
  const output = execSync(`npx tauri signer generate -p ${password}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  
  // Extract private key
  const privMatch = output.match(/dW50cnVzdGVkIGNvbW1lbnQ6IHJzaWduIGVuY3J5cHRlZCBzZWNyZXQga2V5[\s\S]*?/);
  // Wait, minisign keys have a specific structure. 
  // Let's just find the lines.
  const lines = output.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  let privKey = '';
  let pubKey = '';
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('rsign encrypted secret key')) {
      privKey = lines[i] + '\n' + lines[i+1];
    }
    if (lines[i].includes('minisign public key')) {
      pubKey = lines[i] + '\n' + lines[i+1];
    }
  }
  
  if (privKey) {
    writeFileSync('h:/DigiReps/v3.key', privKey);
    console.log('Private key saved');
  }
  if (pubKey) {
    writeFileSync('h:/DigiReps/v3.pub', pubKey);
    console.log('Public key saved');
  }
  
  writeFileSync('h:/DigiReps/v3_raw.txt', output);
} catch (e) {
  console.error('Error generating keys:', e.message);
}
