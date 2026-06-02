import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // 1. Build the Admin Portal
  console.log('>>> Building Admin Portal...');
  execSync('tsc -b && vite build', { stdio: 'inherit' });

  // 2. Build the Help Center
  console.log('\n>>> Building Help Center...');
  const helpCenterPath = path.resolve(__dirname, '../help-center');
  
  // Install dependencies if missing
  if (!fs.existsSync(path.join(helpCenterPath, 'node_modules'))) {
      execSync('npm install', { cwd: helpCenterPath, stdio: 'inherit' });
  }
  
  execSync('npm run build', { cwd: helpCenterPath, stdio: 'inherit' });

  // 3. Copy the Help Center build into the Admin Portal's dist directory
  console.log('\n>>> Copying Help Center to dist/help...');
  const helpDist = path.join(helpCenterPath, 'dist');
  const targetDir = path.join(__dirname, 'dist', 'help');

  fs.cpSync(helpDist, targetDir, { recursive: true });
  
  console.log('\n>>> Build Complete! Help Center integrated.');
} catch (error) {
  console.error('\n>>> Build Failed:', error.message);
  process.exit(1);
}
