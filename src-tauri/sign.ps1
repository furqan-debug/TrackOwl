param (
    [string]$fileToSign
)

# 1. Check for eSigner environment variables
$ES_USERNAME = $env:ES_USERNAME
$ES_PASSWORD = $env:ES_PASSWORD
$CREDENTIAL_ID = $env:CREDENTIAL_ID
$ES_TOTP_SECRET = $env:ES_TOTP_SECRET

if (-not $ES_USERNAME -or -not $ES_PASSWORD -or -not $CREDENTIAL_ID -or -not $ES_TOTP_SECRET) {
    Write-Host "--- Windows Code Signing ---"
    Write-Host "eSigner credentials (ES_USERNAME, ES_PASSWORD, CREDENTIAL_ID, ES_TOTP_SECRET) are not set."
    Write-Host "Skipping code signing for: $fileToSign"
    exit 0
}

Write-Host "--- Windows Code Signing Starting ---"
Write-Host "Target file: $fileToSign"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ToolDir = Join-Path $ScriptDir "CodeSignTool"
$ZipPath = Join-Path $ScriptDir "CodeSignTool.zip"

# Helper to find CodeSignTool.bat recursively
function Find-CodeSignToolBat ($dir) {
    if (-not (Test-Path $dir)) { return $null }
    $bat = Get-ChildItem -Path $dir -Filter "CodeSignTool.bat" -Recurse -File | Select-Object -First 1
    if ($bat) { return $bat.FullName }
    return $null
}

# 2. Ensure CodeSignTool is downloaded and extracted
$batPath = Find-CodeSignToolBat $ToolDir

if (-not $batPath) {
    Write-Host "CodeSignTool not found locally. Downloading from SSL.com..."
    $downloadUrl = "https://www.ssl.com/download/codesigntool-for-windows/"
    
    # Download with TLS 1.2
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $ZipPath
    
    Write-Host "Extracting CodeSignTool.zip..."
    if (-not (Test-Path $ToolDir)) {
        New-Item -ItemType Directory -Path $ToolDir | Out-Null
    }
    
    Expand-Archive -Path $ZipPath -DestinationPath $ToolDir -Force
    Remove-Item $ZipPath -Force
    
    $batPath = Find-CodeSignToolBat $ToolDir
    if (-not $batPath) {
        Write-Error "Error: CodeSignTool.bat could not be found after extraction."
        exit 1
    }
    Write-Host "CodeSignTool successfully set up at: $batPath"
} else {
    Write-Host "Using cached CodeSignTool at: $batPath"
}

# 3. Execute signing
try {
    Write-Host "Signing file: $fileToSign"
    $normalizedFile = [System.IO.Path]::GetFullPath($fileToSign)
    
    # Execute batch file
    & "$batPath" sign -username "$ES_USERNAME" -password "$ES_PASSWORD" -credential_id "$CREDENTIAL_ID" -totp_secret "$ES_TOTP_SECRET" -input_file_path "$normalizedFile"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "CodeSignTool failed with exit code $LASTEXITCODE"
        exit 1
    }
    Write-Host "Windows Code Signing SUCCESSful!"
} catch {
    Write-Error "Error occurred during signing: $_"
    exit 1
}
