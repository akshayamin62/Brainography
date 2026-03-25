; Inno Setup Script — Brainography Scanner Service
; Invoked by build.ps1 — do not run ISCC.exe directly.

[Setup]
AppName=Brainography Scanner
AppVersion=1.0
AppPublisher=Brainography
DefaultDirName={autopf}\Brainography Scanner
DefaultGroupName=Brainography Scanner
OutputBaseFilename=BrainographyScanner_Setup
; OutputDir is set via /O command-line flag by build.ps1 (absolute path)
OutputDir={param:OutputDir|.}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
; Copy everything PyInstaller produced into Program Files
Source: "{#DIST_DIR}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Brainography Scanner"; Filename: "{app}\BrainographyScanner.exe"
Name: "{group}\Uninstall Brainography Scanner"; Filename: "{uninstallexe}"

[Registry]
; Auto-start when Windows boots (current user)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "BrainographyScanner"; \
  ValueData: """{app}\BrainographyScanner.exe"""; Flags: uninsdeletevalue

[Run]
; Launch the service immediately after install finishes
Filename: "{app}\BrainographyScanner.exe"; Description: "Start scanner service now"; \
  Flags: nowait postinstall skipifsilent

[UninstallRun]
; Kill the process before uninstalling
Filename: "taskkill.exe"; Parameters: "/F /IM BrainographyScanner.exe"; Flags: runhidden; \
  RunOnceId: "KillScanner"
