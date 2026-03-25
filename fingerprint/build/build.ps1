# Brainography Scanner — Windows Build Script
# Handles spaces in paths. Run via: build\build.bat (or right-click → Run with PowerShell)
$ErrorActionPreference = 'Stop'

# ── Resolve absolute paths ────────────────────────────────────────────────────
$BUILD_DIR      = $PSScriptRoot                                    # fingerprint\build\
$FINGERPRINT    = Split-Path $BUILD_DIR -Parent                    # fingerprint\
$REPO_ROOT      = Split-Path $FINGERPRINT -Parent                  # Brainography\
$DIST_DIR       = Join-Path $BUILD_DIR "dist\BrainographyScanner"  # fingerprint\build\dist\BrainographyScanner\
$WORK_DIR       = Join-Path $BUILD_DIR "work"                      # fingerprint\build\work\
$SPEC_FILE      = Join-Path $BUILD_DIR "scanner_service.spec"
$ISS_FILE       = Join-Path $BUILD_DIR "setup.iss"
$SCANNER_PY     = Join-Path $FINGERPRINT "scanner_service.py"
$FUTRONICS_DIR  = Join-Path $FINGERPRINT "futronics"
$DLL_SCAN       = Join-Path $FUTRONICS_DIR "ftrScanAPI.dll"
$DLL_MATH       = Join-Path $FUTRONICS_DIR "ftrMathAPI.dll"
$DLL_WSQ        = Join-Path $FUTRONICS_DIR "ftrWSQ.dll"
$DOWNLOADS_DIR  = Join-Path $REPO_ROOT "frontend\public\downloads"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Brainography Scanner - Windows Installer Build" -ForegroundColor Cyan
Write-Host "============================================================"
Write-Host ""
Write-Host "  Fingerprint folder : $FINGERPRINT"
Write-Host "  Dist output        : $DIST_DIR"
Write-Host "  Final installer    : $DOWNLOADS_DIR\BrainographyScanner_Setup.exe"
Write-Host ""

# ── Pre-checks ────────────────────────────────────────────────────────────────
Write-Host "[0/4] Checking prerequisites..."

if (-not (Test-Path $DLL_SCAN)) { throw "Missing: $DLL_SCAN" }
if (-not (Test-Path $DLL_MATH)) { throw "Missing: $DLL_MATH" }
if (-not (Test-Path $DLL_WSQ))  { throw "Missing: $DLL_WSQ" }
Write-Host "  Futronic DLLs: OK"

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { throw "Python not found. Install Python 3 and ensure it is in PATH." }
Write-Host "  Python: $($py.Source)"

# ── Step 1: Install Python dependencies ──────────────────────────────────────
Write-Host ""
Write-Host "[1/4] Installing Python dependencies..." -ForegroundColor Yellow
& python -m pip install flask flask-cors numpy opencv-python pyinstaller pystray pillow --quiet
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
Write-Host "  Done." -ForegroundColor Green

# ── Step 2: Clean previous build artifacts ───────────────────────────────────
Write-Host ""
Write-Host "[2/4] Cleaning previous build files..."
if (Test-Path (Join-Path $BUILD_DIR "dist")) {
    Remove-Item (Join-Path $BUILD_DIR "dist") -Recurse -Force
    Write-Host "  Deleted old dist/"
}
if (Test-Path $WORK_DIR) {
    Remove-Item $WORK_DIR -Recurse -Force
    Write-Host "  Deleted old work/"
}

# ── Step 3: Build with PyInstaller ───────────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Building .exe with PyInstaller..." -ForegroundColor Yellow
Write-Host "  This takes 3-7 minutes. Please wait..."
Write-Host ""

# Pass all paths as environment variables so the spec file can read them
$env:BRAINOGRAPHY_SCANNER_PY     = $SCANNER_PY
$env:BRAINOGRAPHY_FUTRONICS_DIR  = $FUTRONICS_DIR
$env:BRAINOGRAPHY_DIST_DIR       = Join-Path $BUILD_DIR "dist"
$env:BRAINOGRAPHY_WORK_DIR       = $WORK_DIR

& pyinstaller `
    "$SPEC_FILE" `
    --distpath "$($BUILD_DIR)\dist" `
    --workpath "$WORK_DIR" `
    --noconfirm `
    --clean

if ($LASTEXITCODE -ne 0) { throw "PyInstaller build failed" }

# ── Verify DLLs made it into dist ────────────────────────────────────────────
# PyInstaller 6.x places all binaries inside _internal\ next to the .exe
$dllInDist = Join-Path $DIST_DIR "_internal\futronics\ftrScanAPI.dll"
if (-not (Test-Path $dllInDist)) {
    # Fallback: older PyInstaller puts them directly in dist root
    $dllInDist = Join-Path $DIST_DIR "futronics\ftrScanAPI.dll"
}
if (-not (Test-Path $dllInDist)) {
    Write-Host ""
    Write-Host "ERROR: DLL verification failed." -ForegroundColor Red
    Write-Host "  Searched: $DIST_DIR\_internal\futronics\ftrScanAPI.dll"
    Write-Host "  Also searched: $DIST_DIR\futronics\ftrScanAPI.dll"
    Write-Host "  Actual dist contents:" -ForegroundColor Yellow
    if (Test-Path $DIST_DIR) {
        Get-ChildItem $DIST_DIR -Recurse -Name | Where-Object { $_ -like "*.dll" } | ForEach-Object { Write-Host "    $_" }
    } else {
        Write-Host "  DIST DIR DOES NOT EXIST: $DIST_DIR" -ForegroundColor Red
    }
    throw "DLL missing from dist"
}
Write-Host "  EXE + DLLs: OK" -ForegroundColor Green

# ── Step 4: Package with Inno Setup ──────────────────────────────────────────
Write-Host ""
Write-Host "[4/4] Packaging with Inno Setup..." -ForegroundColor Yellow

$iscc = $null
@(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
) | ForEach-Object { if (Test-Path $_) { $iscc = $_ } }

if (-not $iscc) {
    Write-Host ""
    Write-Host "ERROR: Inno Setup 6 not found." -ForegroundColor Red
    Write-Host "  Download from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "  After installing, run build.bat again." -ForegroundColor Yellow
    exit 1
}

# Ensure downloads folder exists
New-Item -ItemType Directory -Path $DOWNLOADS_DIR -Force | Out-Null

& "$iscc" "$ISS_FILE" "/O$DOWNLOADS_DIR" "/DDIST_DIR=$DIST_DIR"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed" }

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " SUCCESS!" -ForegroundColor Green
Write-Host " Installer: $DOWNLOADS_DIR\BrainographyScanner_Setup.exe" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
