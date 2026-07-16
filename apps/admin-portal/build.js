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
  
  console.log('\n>>> Build Complete!');
} catch (error) {
  console.error('\n>>> Build Failed:', error.message);
  process.exit(1);
}
