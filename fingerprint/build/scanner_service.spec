# PyInstaller spec for Brainography Scanner Service (Windows)
# Invoked by build/build.ps1 which sets absolute-path env vars.

import sys
import os

block_cipher = None

# Build.ps1 sets these env vars so there is zero path ambiguity,
# even with spaces in the workspace path ("Kareer Studio").
SCANNER_PY    = os.environ.get('BRAINOGRAPHY_SCANNER_PY')    or os.path.abspath(os.path.join(SPECPATH, '..', 'scanner_service.py'))
FUTRONICS_DIR = os.environ.get('BRAINOGRAPHY_FUTRONICS_DIR') or os.path.abspath(os.path.join(SPECPATH, '..', 'futronics'))

print(f"[spec] scanner_service.py : {SCANNER_PY}")
print(f"[spec] futronics dir      : {FUTRONICS_DIR}")

def dll(name):
    p = os.path.join(FUTRONICS_DIR, name)
    if not os.path.exists(p):
        raise FileNotFoundError(f"DLL not found: {p}")
    return p

a = Analysis(
    [SCANNER_PY],
    pathex=[os.path.dirname(SCANNER_PY)],
    binaries=[
        # Bundle all three Futronic DLLs into futronics/ subfolder in dist
        (dll('ftrScanAPI.dll'), 'futronics'),
        (dll('ftrMathAPI.dll'), 'futronics'),
        (dll('ftrWSQ.dll'),     'futronics'),
    ],
    datas=[],
    hiddenimports=[
        'pystray',
        'pystray._win32',
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'numpy',
        'cv2',
        'flask',
        'flask_cors',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
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
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,        # No console window — runs silently
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
    upx=True,
    upx_exclude=[],
    name='BrainographyScanner',
)
