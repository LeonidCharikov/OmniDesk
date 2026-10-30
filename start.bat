@echo off
setlocal enabledelayedexpansion
title OmniDesk Launcher

:: Always ensure working directory is the repository root
cd /d "%~dp0"

echo ========================================================
echo                OmniDesk Desktop Launcher
echo ========================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found on this computer!
    echo Please download and install the free Node.js LTS from:
    echo   https://nodejs.org
    echo.
    echo After installation is complete, run start.bat again.
    echo.
    pause
    exit /b 1
)

:: 2. Check and install npm dependencies if needed
if not exist node_modules (
    echo [1/2] First time launch: Installing dependencies...
    echo (This is a one-time setup and takes about 30-60 seconds)
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install packages. Please check your internet connection.
        pause
        exit /b 1
    )
    echo Dependencies successfully installed!
) else (
    echo [1/2] Dependencies verified.
)

echo.
echo [2/2] Starting OmniDesk workstation...
echo Browser window will open automatically as soon as the server is ready.
echo (You can minimize this window. Closing it will shut down the app.)
echo.

:: 3. Launch dev server with automatic browser opening
call npm run dev -- --open
