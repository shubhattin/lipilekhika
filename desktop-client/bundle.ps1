# Lipi Lekhika MSI Installer Build Script
# This script creates an MSI installer using WiX Toolset

param(
    [switch]$SkipBuild,
    [switch]$CI
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Paths
$BundleBuildDir = Join-Path $ScriptDir "bundle_build"
$StagingDir = Join-Path $BundleBuildDir "staging"
$InstallerDir = Join-Path $ScriptDir "Installer"
$OutputDir = Join-Path $BundleBuildDir "output"
$RootDir = Split-Path -Parent $ScriptDir

# Get version from Cargo.toml
$CargoToml = Join-Path $ScriptDir "Cargo.toml"
$VersionMatch = Select-String -Path $CargoToml -Pattern 'version\s*=\s*"(.*?)"' | Select-Object -First 1
if ($VersionMatch) {
    $Version = $VersionMatch.Matches[0].Groups[1].Value
} else {
    Write-Error "Could not find version in Cargo.toml"
    exit 1
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Lipi Lekhika MSI Installer Builder" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Create directories
Write-Host "`n[1/7] Creating directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Copy executables
Write-Host "`n[2/7] Copying executables..." -ForegroundColor Yellow
$TargetReleaseDir = Join-Path $RootDir "target\release"

# Copy from release build target
$LipilekikaExe = Join-Path $TargetReleaseDir "lipilekhika-ui.exe"
$LipiparivartakaExe = Join-Path $TargetReleaseDir "lipiparivartaka.exe"

if (-not (Test-Path $LipilekikaExe)) {
    Write-Error "lipilekhika-ui.exe not found at $LipilekikaExe"
    exit 1
}
if (-not (Test-Path $LipiparivartakaExe)) {
    Write-Error "lipiparivartaka.exe not found at $LipiparivartakaExe"
    exit 1
}

Copy-Item -Path $LipilekikaExe -Destination (Join-Path $StagingDir "lipilekhika.exe") -Force
Copy-Item -Path $LipiparivartakaExe -Destination (Join-Path $StagingDir "lipiparivartaka.exe") -Force


Write-Host "  - Copied lipilekhika.exe" -ForegroundColor Green
Write-Host "  - Copied lipiparivartaka.exe" -ForegroundColor Green

# Copy icon files
Write-Host "`n[3/7] Copying icon files..." -ForegroundColor Yellow
$LipilekhikaIcon = Join-Path $ScriptDir "assets\icon.ico"
$LipiparivartakaIcon = Join-Path $ScriptDir "lipiparivartaka\assets\icon.ico"

if (-not (Test-Path $LipilekhikaIcon)) {
    Write-Error "Lipi Lekhika icon not found at $LipilekhikaIcon"
    exit 1
}
if (-not (Test-Path $LipiparivartakaIcon)) {
    Write-Error "Lipi Parivartaka icon not found at $LipiparivartakaIcon"
    exit 1
}

Copy-Item -Path $LipilekhikaIcon -Destination (Join-Path $StagingDir "lipilekhika.ico") -Force
Copy-Item -Path $LipiparivartakaIcon -Destination (Join-Path $StagingDir "lipiparivartaka.ico") -Force

Write-Host "  - Copied lipilekhika.ico" -ForegroundColor Green
Write-Host "  - Copied lipiparivartaka.ico" -ForegroundColor Green

# Copy font files
Write-Host "`n[4/7] Copying font files..." -ForegroundColor Yellow
$FontsDir = Join-Path $ScriptDir "assets\fonts"
$StagingFontsDir = Join-Path $StagingDir "fonts"

if (Test-Path $FontsDir) {
    New-Item -ItemType Directory -Path $StagingFontsDir -Force | Out-Null
    $FontFiles = Get-ChildItem -Path $FontsDir -Filter "*.ttf"
    foreach ($font in $FontFiles) {
        Copy-Item -Path $font.FullName -Destination $StagingFontsDir -Force
        Write-Host "  - Copied $($font.Name)" -ForegroundColor Green
    }
} else {
    Write-Warning "Fonts directory not found at $FontsDir - skipping font files"
}

# Copy and convert license
Write-Host "`n[5/7] Preparing license files..." -ForegroundColor Yellow
$LicensePath = Join-Path $RootDir "LICENCE"
if (Test-Path $LicensePath) {
    # Copy plain text license
    Copy-Item -Path $LicensePath -Destination (Join-Path $StagingDir "LICENSE.txt") -Force
    Write-Host "  - Copied LICENSE.txt" -ForegroundColor Green
    
    # Create RTF version for WiX UI
    $LicenseContent = Get-Content $LicensePath -Raw
    $RtfContent = "{\rtf1\ansi\deff0{\fonttbl{\f0 Consolas;}}\fs20 "
    $LicenseContent = $LicenseContent -replace '\\', '\\\\'
    $LicenseContent = $LicenseContent -replace '\{', '\{'
    $LicenseContent = $LicenseContent -replace '\}', '\}'
    $LicenseContent = $LicenseContent -replace "`r`n", '\par '
    $LicenseContent = $LicenseContent -replace "`n", '\par '
    $RtfContent += $LicenseContent + "}"
    Set-Content -Path (Join-Path $StagingDir "License.rtf") -Value $RtfContent -Encoding ASCII
    Write-Host "  - Created License.rtf" -ForegroundColor Green
} else {
    Write-Error "LICENSE not found at $LicensePath"
    exit 1
}

# Find WiX Toolset
Write-Host "`n[6/7] Locating WiX Toolset..." -ForegroundColor Yellow
$WixPaths = @(
    "C:\Program Files (x86)\WiX Toolset v3.14\bin",
    "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    "C:\Program Files\WiX Toolset v3.14\bin",
    "C:\Program Files\WiX Toolset v3.11\bin"
)

$WixBinPath = $null
foreach ($path in $WixPaths) {
    if (Test-Path (Join-Path $path "candle.exe")) {
        $WixBinPath = $path
        break
    }
}

# Try to find candle in PATH
if (-not $WixBinPath) {
    $CandleInPath = Get-Command candle.exe -ErrorAction SilentlyContinue
    if ($CandleInPath) {
        $WixBinPath = Split-Path -Parent $CandleInPath.Source
    }
}

if (-not $WixBinPath) {
    Write-Error "WiX Toolset not found. Please install WiX Toolset v3.x"
    Write-Host "You can install it using: choco install wixtoolset" -ForegroundColor Yellow
    exit 1
}

Write-Host "  - Found WiX at: $WixBinPath" -ForegroundColor Green

$Candle = Join-Path $WixBinPath "candle.exe"
$Light = Join-Path $WixBinPath "light.exe"

# Compile and link MSI
Write-Host "`n[7/7] Building MSI installer..." -ForegroundColor Yellow
$WxsPath = Join-Path $InstallerDir "Product.wxs"
$WixObjPath = Join-Path $OutputDir "Product.wixobj"
$MsiName = "lipilekhika-$Version.msi"
$MsiPath = Join-Path $OutputDir $MsiName

# Candle (compile)
Write-Host "  - Compiling WiX source..." -ForegroundColor Gray
$CandleArgs = @(
    "-dProductVersion=$Version",
    "-dStagingPath=$StagingDir",
    "-ext", "WixUIExtension",
    "-out", $WixObjPath,
    $WxsPath
)

& $Candle @CandleArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Candle (WiX compiler) failed with exit code $LASTEXITCODE"
    exit 1
}
Write-Host "  - WiX compilation complete" -ForegroundColor Green

# Light (link)
Write-Host "  - Linking MSI..." -ForegroundColor Gray
$LightArgs = @(
    "-ext", "WixUIExtension",
    "-out", $MsiPath,
    $WixObjPath
)

& $Light @LightArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Light (WiX linker) failed with exit code $LASTEXITCODE"
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "MSI Installer built successfully!" -ForegroundColor Green
Write-Host "Output: $MsiPath" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Copy MSI to bundle_build root for easy access
Copy-Item -Path $MsiPath -Destination (Join-Path $BundleBuildDir $MsiName) -Force
Write-Host "`nMSI also copied to: $(Join-Path $BundleBuildDir $MsiName)" -ForegroundColor Gray

# Output values for CI (GitHub Actions)
if ($CI -and $env:GITHUB_OUTPUT) {
    "version=$Version" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
    "msi_path=$(Join-Path $BundleBuildDir $MsiName)" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
    "msi_name=$MsiName" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8
}