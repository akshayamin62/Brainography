# PyInstaller spec for Brainography Scanner Service (Mac)
# Run on a Mac from the fingerprint/ folder: pyinstaller build/scanner_service_mac.spec

import sys
import os

block_cipher = None

# SPECPATH = fingerprint/build/ → ROOT = fingerprint/
ROOT = os.path.abspath(os.path.join(SPECPATH, '..'))
FUTRONICS = os.path.join(ROOT, 'futronics')

a = Analysis(
    [os.path.join(ROOT, 'scanner_service.py')],
    pathex=[ROOT],
    binaries=[
        # Futronic Mac SDK — both libs required
        (os.path.join(FUTRONICS, 'libScanAPI.dylib'), 'futronics'),
        (os.path.join(FUTRONICS, 'ftrapi.dylib'),     'futronics'),
    ],
    datas=[],
    hiddenimports=[
        'numpy',
        'cv2',
        'flask',
        'flask_cors',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['pystray'],   # pystray not needed on Mac (no system tray)
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='BrainographyScanner',
    debug=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='BrainographyScanner',
)

app = BUNDLE(
    coll,
    name='BrainographyScanner.app',
    icon=None,
    bundle_identifier='com.brainography.scanner',
    info_plist={
        'LSBackgroundOnly': True,        # No Dock icon — runs silently
        'LSUIElement': True,
        'NSHighResolutionCapable': True,
    },
)
