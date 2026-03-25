#!/bin/bash
# Brainography Scanner — Mac .pkg Build Script
# Run on a Mac from the fingerprint/ folder:  bash build/build_mac.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DOWNLOADS="$(cd "$ROOT/../frontend/public/downloads" && pwd)"

echo "============================================================"
echo " Brainography Scanner — Mac Installer Build"
echo "============================================================"
echo ""

# ── Pre-check: Mac SDK ─────────────────────────────────────────
if [ ! -f "$ROOT/futronics/libScanAPI.dylib" ]; then
    echo "ERROR: libScanAPI.dylib not found in fingerprint/futronics/"
    echo "Expected path: $ROOT/futronics/libScanAPI.dylib"
    exit 1
fi

# ── Step 1: Install Python dependencies ───────────────────────
echo "[1/4] Installing Python dependencies..."
pip3 install flask flask-cors numpy opencv-python pyinstaller

# ── Step 2: Build .app with PyInstaller ───────────────────────
echo ""
echo "[2/4] Building .app with PyInstaller..."
cd "$ROOT"
pyinstaller build/scanner_service_mac.spec \
    --distpath build/dist \
    --workpath build/work \
    --noconfirm

echo ""
echo "[3/4] Embedding LaunchDaemon plist for auto-start on boot..."
mkdir -p build/pkg_scripts

# postinstall script: install app + load the LaunchDaemon
cat > build/pkg_scripts/postinstall << 'EOF'
#!/bin/bash
# Copy app to /Library/Application Support/
mkdir -p "/Library/Application Support/BrainographyScanner"
cp -R "/private/tmp/BrainographyScanner.app" "/Library/Application Support/BrainographyScanner/"

# Install LaunchDaemon to auto-start on boot
cat > /Library/LaunchDaemons/com.brainography.scanner.plist << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>              <string>com.brainography.scanner</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Library/Application Support/BrainographyScanner/BrainographyScanner.app/Contents/MacOS/BrainographyScanner</string>
    </array>
    <key>RunAtLoad</key>          <true/>
    <key>KeepAlive</key>          <true/>
    <key>StandardOutPath</key>    <string>/var/log/brainography-scanner.log</string>
    <key>StandardErrorPath</key>  <string>/var/log/brainography-scanner.log</string>
</dict>
</plist>
PLIST

chmod 644 /Library/LaunchDaemons/com.brainography.scanner.plist
launchctl load /Library/LaunchDaemons/com.brainography.scanner.plist
EOF

chmod +x build/pkg_scripts/postinstall

# preinstall script: stop existing service before upgrade
cat > build/pkg_scripts/preinstall << 'EOF'
#!/bin/bash
launchctl unload /Library/LaunchDaemons/com.brainography.scanner.plist 2>/dev/null || true
EOF

chmod +x build/pkg_scripts/preinstall

# Copy .app to staging area for pkgbuild
mkdir -p build/pkg_payload/private/tmp
cp -R build/dist/BrainographyScanner.app build/pkg_payload/private/tmp/

# ── Step 4: Build .pkg ────────────────────────────────────────
echo ""
echo "[4/4] Building .pkg installer..."
pkgbuild \
    --root build/pkg_payload \
    --scripts build/pkg_scripts \
    --identifier com.brainography.scanner \
    --version 1.0 \
    "$FRONTEND_DOWNLOADS/BrainographyScanner.pkg"

echo ""
echo "============================================================"
echo " SUCCESS! Installer written to:"
echo " frontend/public/downloads/BrainographyScanner.pkg"
echo "============================================================"
