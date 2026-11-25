const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

function main() {
  if (process.platform !== 'win32') {
    console.log(
      '[sign-inner-binary] Skipping: platform is not Windows (' +
        process.platform +
        ')'
    );
    return;
  }

  const {
    ES_USERNAME,
    ES_PASSWORD,
    CREDENTIAL_ID,
    ES_TOTP_SECRET,
  } = process.env;

  if (!ES_USERNAME || !ES_PASSWORD || !CREDENTIAL_ID || !ES_TOTP_SECRET) {
    if (process.env.CI === 'true') {
      console.error(
        '[sign-inner-binary] ERROR: CodeSignTool credentials are missing in CI.'
      );
      process.exit(1);
    }
    console.log(
      '[sign-inner-binary] CodeSignTool credentials not set. ' +
      'Skipping inner binary signing (local/dev build).'
    );
    return;
  }

  console.log(
    '[sign-inner-binary] Credentials found. ' +
    'Locating digireps-tracker.exe...'
  );

  const candidates = [
    path.join(
      __dirname,
      '..',
      'src-tauri',
      'target',
      'release',
      'digireps-tracker.exe'
    ),
    path.join(
      __dirname,
      '..',
      'src-tauri',
      'target',
      'x86_64-pc-windows-msvc',
      'release',
      'digireps-tracker.exe'
    ),
    path.join(
      __dirname,
      '..',
      'src-tauri',
      'target',
      'aarch64-pc-windows-msvc',
      'release',
      'digireps-tracker.exe'
    ),
  ];

  let targetExe = null;

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      targetExe = candidate;
      console.log('[sign-inner-binary] Found binary at:', candidate);
      break;
    }
  }

  if (!targetExe) {
    console.error(
      '[sign-inner-binary] ERROR: digireps-tracker.exe was not found.'
    );

    console.error('[sign-inner-binary] Checked locations:');
    for (const candidate of candidates) {
      console.error('  -', candidate);
    }

    console.error(
      '[sign-inner-binary] Searching target directory for the executable...'
    );

    try {
      const targetDir = path.join(
        __dirname,
        '..',
        'src-tauri',
        'target'
      );

      if (fs.existsSync(targetDir)) {
        const entries = execSync(
          `dir /s "${targetDir}" /b | findstr /i "digireps-tracker.exe"`,
          { encoding: 'utf8' }
        );

        console.error('[sign-inner-binary] Found files:', entries);
      }
    } catch (error) {
      console.error(
        '[sign-inner-binary] Could not search target directory.'
      );
    }

    process.exit(1);
  }

  console.log('[sign-inner-binary] Target binary:', targetExe);

  let cstBat = null;

  const searchDirs = [
    process.env.CODESIGNTOOL_DIR,
    'C:\\CodeSignTool',
    path.join(process.env.RUNNER_TEMP || '', 'CodeSignTool'),
  ].filter(Boolean);

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const found = findFileRecursive(dir, 'CodeSignTool.bat');

      if (found) {
        cstBat = found;
        break;
      }
    }
  }

  if (!cstBat) {
    console.error(
      '[sign-inner-binary] ERROR: CodeSignTool.bat not found.'
    );
    console.error(
      '[sign-inner-binary] Search locations:',
      searchDirs
    );
    process.exit(1);
  }

  const cstDir = path.dirname(cstBat);

  console.log(
    '[sign-inner-binary] CodeSignTool.bat found at:',
    cstBat
  );

  const env = {
    ...process.env,
    CODE_SIGN_TOOL_PATH: cstDir,
    CST_BAT: cstBat,
    TARGET_EXE: targetExe,
  };

  console.log(
    '[sign-inner-binary] Executing SSL.com CodeSignTool via PowerShell...'
  );

  // Invoke via PowerShell env vars so cmd.exe never mangles special chars in secrets
  const psSignScript = `
    & $env:CST_BAT sign \`
      -username="$env:ES_USERNAME" \`
      -password="$env:ES_PASSWORD" \`
      -credential_id="$env:CREDENTIAL_ID" \`
      -totp_secret="$env:ES_TOTP_SECRET" \`
      -input_file_path="$env:TARGET_EXE" \`
      -override
    if ($LASTEXITCODE -ne 0) {
      Write-Error "CodeSignTool failed with exit code $LASTEXITCODE"
      exit $LASTEXITCODE
    }
  `;

  try {
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psSignScript],
      {
        env,
        stdio: 'inherit',
      }
    );
  } catch (error) {
    console.error(
      '[sign-inner-binary] CodeSignTool execution failed:',
      error.message
    );
    process.exit(1);
  }

  console.log(
    '[sign-inner-binary] Verifying Authenticode signature...'
  );

  try {
    const rawOutput = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '$sig = Get-AuthenticodeSignature -FilePath $env:TARGET_EXE; [PSCustomObject]@{ Status = $sig.Status.ToString(); StatusMessage = $sig.StatusMessage; Subject = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { $null } } | ConvertTo-Json -Compress',
      ],
      {
        env,
        encoding: 'utf8',
      }
    ).trim();

    const sigInfo = JSON.parse(rawOutput);
    console.log('[sign-inner-binary] Signature info:', sigInfo);

    if (sigInfo.Status !== 'Valid') {
      console.error(
        `[sign-inner-binary] ERROR: Signature verification failed. Status="${sigInfo.Status}", Message="${sigInfo.StatusMessage}" (expected "Valid").`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(
      '[sign-inner-binary] ERROR: Could not verify Authenticode signature:',
      error.message
    );
    process.exit(1);
  }

  console.log(
    '[sign-inner-binary] Inner binary successfully signed and verified before bundling!'
  );
}

function findFileRecursive(dir, filename) {
  try {
    const entries = fs.readdirSync(dir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const result = findFileRecursive(fullPath, filename);

        if (result) {
          return result;
        }
      } else if (
        entry.name.toLowerCase() === filename.toLowerCase()
      ) {
        return fullPath;
      }
    }
  } catch (_) {}

  return null;
}

main();
