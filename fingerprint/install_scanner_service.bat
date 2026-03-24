@echo off
title Fingerprint Scanner Service - Installer
echo.
echo ============================================
echo   Fingerprint Scanner Service Installer
echo ============================================
echo.

:: Check for Administrator rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo Right-click this file and choose "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [1/3] Installing required Python packages...
pip install pywin32 flask flask-cors numpy opencv-python
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install packages. Is Python installed and in PATH?
    pause
    exit /b 1
)

echo.
echo [2/3] Installing Windows Service...
python "%~dp0scanner_windows_service.py" install
if %errorLevel% neq 0 (
    echo [ERROR] Service installation failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Service...
python "%~dp0scanner_windows_service.py" start
if %errorLevel% neq 0 (
    echo [ERROR] Service failed to start.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS!
echo   The Fingerprint Scanner Service is running
echo   and will start automatically on every boot.
echo.
echo   To manage: open services.msc
echo   Service name: Fingerprint Scanner Service
echo ============================================
echo.
pause
