@echo off
title Fingerprint Scanner Service - Uninstaller
echo.
echo ============================================
echo   Fingerprint Scanner Service Uninstaller
echo ============================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo Right-click this file and choose "Run as administrator"
    pause
    exit /b 1
)

echo Stopping service...
python "%~dp0scanner_windows_service.py" stop

echo Removing service...
python "%~dp0scanner_windows_service.py" remove

echo.
echo Service removed successfully.
pause
