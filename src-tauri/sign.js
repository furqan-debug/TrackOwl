import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileToSign = process.argv[2];

if (!fileToSign) {
  console.error('Error: No file path provided to sign.');
  process.exit(1);
}

// 1. Check for eSigner environment variables
const ES_USERNAME = process.env.ES_USERNAME;
const ES_PASSWORD = process.env.ES_PASSWORD;
const CREDENTIAL_ID = process.env.CREDENTIAL_ID;
const ES_TOTP_SECRET = process.env.ES_TOTP_SECRET;

if (!ES_USERNAME || !ES_PASSWORD || !CREDENTIAL_ID || !ES_TOTP_SECRET) {
  console.log('--- Windows Code Signing ---');
  console.log('eSigner credentials (ES_USERNAME, ES_PASSWORD, CREDENTIAL_ID, ES_TOTP_SECRET) are not set.');
  console.log('Skipping code signing for:', fileToSign);
  process.exit(0);
}

console.log('--- Windows Code Signing Starting ---');
console.log('Target file:', fileToSign);

const toolDir = path.join(__dirname, 'CodeSignTool');
const zipPath = path.join(__dirname, 'CodeSignTool.zip');

// Recursive search helper to find CodeSignTool.bat
function findCodeSignToolBat(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findCodeSignToolBat(fullPath);
      if (found) return found;
    } else if (file.toLowerCase() === 'codesigntool.bat') {
      return fullPath;
    }
  }
  return null;
}

// 2. Ensure CodeSignTool is downloaded and extracted
let batPath = findCodeSignToolBat(toolDir);

if (!batPath) {
  console.log('CodeSignTool not found locally. Downloading from SSL.com...');
  const downloadUrl = 'https://www.ssl.com/download/codesigntool-for-windows/';
  
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipPath);
    https.get(downloadUrl, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(zipPath, () => {});
      reject(err);
    });
  });

  console.log('Extracting CodeSignTool.zip...');
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }

  // Use PowerShell Expand-Archive (built-in on Windows)
  const psCommand = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${toolDir}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  
  // Cleanup Zip
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  batPath = findCodeSignToolBat(toolDir);
  if (!batPath) {
    console.error('Error: CodeSignTool.bat could not be found after extraction.');
    process.exit(1);
  }
  console.log('CodeSignTool successfully set up at:', batPath);
} else {
  console.log('Using cached CodeSignTool at:', batPath);
}

// 3. Execute signing using CodeSignTool.bat
try {
  console.log(`Signing file: ${fileToSign}`);
  
  // Normalize path for Windows cmd/bat execution
  const normalizedFile = path.resolve(fileToSign);
  
  // Call CodeSignTool.bat
  const signCmd = `"${batPath}" sign -username "${ES_USERNAME}" -password "${ES_PASSWORD}" -credential_id "${CREDENTIAL_ID}" -totp_secret "${ES_TOTP_SECRET}" -input_file_path "${normalizedFile}"`;
  
  console.log('Running CodeSignTool sign command...');
  const output = execSync(signCmd, { encoding: 'utf8' });
  console.log(output);
  console.log('Windows Code Signing SUCCESSful!');
} catch (error) {
  console.error('Error occurred during signing:');
  if (error.stdout) console.error('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
  process.exit(1);
}
