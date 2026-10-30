@echo off
title OmniDesk Launcher
echo ========================================================
echo             Spousteni aplikace OmniDesk
echo ========================================================
echo.

:: 1. Kontrola pritomnosti Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [CHYBA] Node.js nebyl nalezen v tomto pocitaci!
    echo Prosim stahnete si bezplatny instalator Node.js:
    echo https://nodejs.org
    echo Po jednoduche instalaci spustte tento soubor znovu.
    echo.
    pause
    exit /b 1
)

:: 2. Jednorazova instalace balicku, pokud jeste neprobehla
if not exist node_modules (
    echo [1/2] Prvni spusteni: Pripravuji aplikaci a instaluji komponenty...
    call npm install
    if %errorlevel% neq 0 (
        echo [CHYBA] Nepodarilo se nainstalovat knihovny. Zkontrolujte pripojeni k internetu.
        pause
        exit /b 1
    )
) else (
    echo [1/2] Aplikace je pripravena.
)

echo.
echo [2/2] Spoustim aplikaci OmniDesk...
echo OmniDesk se automaticky otevre v samostatnem okne prohlizece.
echo (Toto cerne okno muzete minimalizovat, zavrenim okna aplikaci ukoncite.)
echo.

:: 3. Otevreni okna a start serveru
start "" http://localhost:3000
call npm run dev
