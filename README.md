# OmniDesk — Universal Desktop Multi-Tool Platform ⚡

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38b2ac?logo=tailwindcss)](https://tailwindcss.com/)
[![i18n Ally](https://img.shields.io/badge/i18n--Ally-Supported-success?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OmniDesk** is a modern, high-performance, all-in-one desktop workstation designed to replace dozens of single-purpose utilities. Built with **Tauri v2 (Rust backend)** and **React 19 / TypeScript / Vite / Tailwind CSS**, it operates primarily **100% offline** directly in device memory with zero server dependencies, while providing native OS hardware telemetry, local file system processing, and instant keyboard navigation (`Ctrl+K`).

---

## 🌟 Key Architectural Highlights

- **Ultra-Lightweight Desktop Footprint**: Uses the OS Webview via Tauri v2 instead of bundled Chromium, keeping the binary size under ~15 MB and RAM usage under ~35 MB (compared to 150+ MB / 400+ MB in Electron).
- **100% Offline-First Engine**: Document conversion (DOCX/MD/TXT to PDF), image transcoding (WebP/PNG/JPEG), cryptographic hash calculation (SHA-256), matrix algebra, unit conversions, and chemical molar mass computation run entirely in client-side WebAssembly / JS without sending a single byte to external servers.
- **Hybrid Online Mode**: Features like live cryptocurrency rates and machine translation detect network connectivity gracefully and cache data locally for seamless offline fallback.
- **Portable JSON Profiles**: Export your full workstation state (themes, widgets, city/currency preferences, daily tasks, and favorites) into an interchangeable `omnidesk-profile.json` file for instant migration across devices.
- **i18n Ally Localization Architecture**: Standardized JSON locale format (`src/locales/*.json`) configured with VS Code / Cursor i18n Ally for live translation editing across 5 languages (**Čeština**, **English**, **Русский**, **Deutsch**, **Español**).

---

## 🚀 How to Run OmniDesk as a Normal Application (3 Ways)

If you downloaded this repository from GitHub, **you do not need to open VS Code or write terminal commands**! Choose the method that suits you best:

### ⚡ 1. Fastest: One-Click Startup Script (`start.bat` for Windows / `start.sh` for Mac & Linux)
1. Extract the downloaded ZIP or open the repository folder.
2. Double-click **`start.bat`** on Windows (or run **`./start.sh`** on macOS/Linux).
3. The script automatically:
   - Verifies if [Node.js](https://nodejs.org) is installed on your computer.
   - Installs required dependencies on the very first run (takes ~30-60 seconds once).
   - Starts the local server and **automatically opens OmniDesk in your browser once the server is completely ready and listening** (eliminating connection-refused errors).
*(Prerequisite: Download and install free [Node.js LTS](https://nodejs.org) once if you don't have it yet).*

### 🖥️ 2. Install as a Standalone Desktop App (PWA — Desktop Icon)
1. Once OmniDesk opens in your browser (Google Chrome, Microsoft Edge, Brave, etc.):
2. Click the **"Install App"** button in the top right corner of the header (or click the install icon in your browser's address bar).
3. Click **Install**.
4. An **OmniDesk desktop shortcut and Start Menu launcher** will be created on your system.
5. From now on, you can launch OmniDesk directly from your desktop like any normal installed program — it opens in its own window without browser toolbars and works 100% offline.

### 📦 3. Compile a Standalone Native Installer (`.exe` / `.msi` via Tauri)
To package a standalone executable installer that can be shared with anyone without requiring Node.js:
```bash
npm run tauri build
```
The compiled native installer will be generated in:
`src-tauri/target/release/bundle/msi/` or `bundle/nsis/`.

---

## 🎨 Visual Themes & Appearance (6 Built-In Themes)

OmniDesk includes a dedicated theme engine that alters the entire UI in real time:
- 🌌 **Midnight Navy** — The default deep slate and navy palette with vibrant indigo accents.
- 🖤 **OLED Pure Black** — True `#000000` pitch black background designed for dark rooms and maximum power efficiency on OLED/AMOLED screens.
- 🩶 **Graphite Charcoal** — Matte technical dark grey styling tailored for developer focus.
- 🌲 **Cyber Emerald** — High-tech dark forest aesthetic inspired by classic green-screen terminal interfaces.
- 🔮 **Royal Twilight** — Luxurious deep violet and purple palette.
- ☀️ **Clean Light** — Modern, high-contrast daylight theme with crisp white panels and clear typography for brightly lit workspaces.

Themes can be switched in real time via the **Settings & Appearance** dialog (accessible via the sliders icon in the header or sidebar).

---

## 🧩 Customizable Sidebar Mini-Widgets

Beneath the tool categories in the left sidebar sits a configurable mini-dashboard:
1. **Live Clock & World Time**: Real-time digital clock displaying the date and exact local time for your chosen world city (**Prague, London, New York, Tokyo, Moscow, Dubai, Sydney, Singapore, Los Angeles, Paris, Berlin**).
2. **Quick Focus Timer / Pomodoro**: One-click 25-minute focus session, 5-minute break, live countdown progress bar, and pause/reset controls.
3. **Live Rates Ticker (Crypto & Fiat)**: Real-time price tracking for your chosen cryptocurrency (**BTC, ETH, SOL, TON, BNB, XRP, DOGE, AVAX**) and fiat currency (**CZK, EUR, USD, RUB, GBP, CHF, PLN, JPY**).
4. **Daily Tasks Checklist**: Quick daily priority tracker with interactive checkboxes, task counter, and one-click task addition/deletion.
5. **Quick Calculator & Unit Converter**: Single-line quick math evaluator (`25 * 4`, `20% of 600`, `2^8`) and instant unit/currency conversion (`50 km to mi`, `100 lbs to kg`, `25 c to f`, `100 eur to czk`).
6. **Quick Sticky Note (Scratchpad)**: Auto-saving notepad for temporary numbers, notes, and thoughts without leaving your current workspace.
7. **System Hardware Gauge**: Real-time CPU and RAM utilization meters.

*Each widget can be enabled or disabled in the Settings modal to fit your screen size.*

---

## 🛠️ Complete Integrated Tools Catalog (24 Tools)

### 📁 1. Files & Documents
1. **Multi-Format Converter**: Client-side document conversion (DOCX, Markdown, Plain Text to PDF), data transformation (CSV <-> JSON), and image transcoding (WebP, PNG, JPEG).
2. **DOCX to PDF Converter**: Local Word document rendering and vector PDF generation with zero server uploads.
3. **Text & File Diff Comparator**: Visual side-by-side and inline diff with line-by-line change detection.
4. **File Inspector & Hasher**: Instant SHA-256 cryptographic checksums, binary hex dump, and MIME detection.

### 📐 2. Mathematics & Calculators
5. **Standard & Scientific Calculator**: Trigonometry (sin, cos, tan), logarithms, powers, roots, memory controls (M+/MR), and history log.
6. **Dynamic Matrix Calculator**: Dynamic dimensions from $1 \times 1$ up to $6 \times 6$, matrix multiplication ($A \times B$ and $B \times A$), determinants ($\det$), inverses ($A^{-1}$), transposes ($A^T$), and trace ($\text{tr}$).
7. **2D Function Grapher & Plotter**: Interactive canvas plotting $f(x)$, $g(x)$, $h(x)$, mouse drag panning, smooth zooming, point inspection with tangent line, and PNG export.
8. **LaTeX Formula Visualizer**: Real-time mathematical formula rendering, quick-insert symbol palette, SVG/MathML export, and equation reference library.
9. **Statistics & Data Analysis**: Arithmetic mean, median, mode, sample variance, standard deviation, quartiles (Q1, Q3, IQR), and dynamic histogram generator.
10. **Combinatorics & Number Theory**: Permutations, combinations ($nCr$), variations, Euclidean algorithm (GCD / LCM), and prime factorization.

### 🔬 3. Science & Chemistry
11. **Chemistry & Molar Mass Calculator**: Chemical formula parser ($H_2O$, $C_6H_{12}O_6$, $Ca(OH)_2$), elemental mass percentage breakdown, interactive periodic table, and solution molarity calculator ($c = n/V$).
12. **Scientific Unit Converter**: SI and imperial conversions for length, mass, temperature, pressure, and digital data storage.

### 💰 4. Finance & Crypto
13. **Currency Converter & Crypto Tracker**: 19 fiat currencies with offline caching (including RUB, CZK, EUR, USD, GBP, CHF, PLN, JPY) and real-time live tracker for 14 major cryptocurrencies (BTC, ETH, SOL, TON, BNB, XRP, DOGE, etc.).
14. **Mortgage & Loan Calculator**: Annuity payment calculation, principal-to-interest breakdown, and downloadable CSV amortization schedule.

### ⚙️ 5. Utilities & System
15. **System Hardware Monitor**: Real-time CPU core telemetry, RAM usage, and disk partition monitoring via native Tauri `@tauri-apps/plugin-os` and Rust IPC (`sysinfo`).
16. **WCAG Contrast Validator**: Foreground and background color input, WCAG 2.1 compliance checking (Level AA and AAA), live typography preview, automated contrast tuner, and color vision deficiency simulator (Protanopia, Deuteranopia, Tritanopia, Achromatopsia).
17. **Color Palette Generator**: Harmonic palette generation, HEX/RGB/HSL conversion, and color harmony schemes.
18. **Cryptographic Password Generator**: Passwords with custom character sets and memorable Diceware-style passphrases with bit-entropy scoring.
19. **Offline QR Code Generator**: Vector QR code generation for URLs, Wi-Fi credentials, and plain text with PNG download.
20. **RegEx Tester & Base64 / URL Encoder**: Regular expression evaluation with capture groups and bidirectional Base64/URL encoding.
21. **Pomodoro & Focus Timer**: Dedicated Pomodoro cycles (25/5/15 min), custom countdown timer, and split-lap stopwatch.
22. **World Timezones & Meeting Planner**: Interactive world clock with 28 world cities across all continents and meeting time scrubber slider.
23. **JSON Formatter & Validator**: Beautify, minify, and validate JSON data structures with syntax error locator.
24. **Hybrid Online Translator**: Translation tool with automatic network status detection and offline fallback notification.

---

## 💾 JSON Backup & Profile Migration

All user data and settings are stored locally on your device:
- **Export Backup `.json` (`omnidesk-profile.json`)**: Download your complete configuration with a single click.
- **Copy JSON to Clipboard**: Easily transfer your settings as text.
- **Upload & Restore from `.json`**: Select a backup file to instantly restore your workstation preferences on any new machine.
- **Paste JSON**: Direct text paste with automatic schema validation.
- **Factory Reset**: Restore default settings at any time with confirmation.

---

## 🌍 i18n Ally Localization Architecture

OmniDesk features native multi-language localization supporting 5 languages:
- 🇨🇿 **Čeština** (`cs`) — Default / Source language
- 🇬🇧 **English** (`en`)
- 🇷🇺 **Русский** (`ru`)
- 🇩🇪 **Deutsch** (`de`)
- 🇪🇸 **Español** (`es`)

### VS Code Integration via i18n Ally:
Pre-configured in `.vscode/settings.json`:
```json
{
  "i18n-ally.localesPaths": ["src/locales"],
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sourceLanguage": "cs",
  "i18n-ally.displayLanguage": "en",
  "i18n-ally.enabledParsers": ["json"],
  "i18n-ally.extract.autoDetect": true
}
```

When opened in VS Code or Cursor with the [i18n Ally extension](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally):
1. **Inline Annotations**: Translations appear as subtle labels right next to `t('...')` calls.
2. **Translation Matrix**: Shows key coverage across all 5 languages.
3. **Key Extraction**: Extract any hardcoded string into all locale files automatically.

---

## 🛠️ Developer Setup & Commands

For developers wanting to inspect or modify the source code:

```bash
# 1. Install dependencies
npm install

# 2. Run in web development mode
npm run dev

# 3. Type check & build
npm run build
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📤 Publishing to Your Remote Git Repository

To connect your local OmniDesk clone with your GitHub repository:

```bash
# 1. Add your remote GitHub repository URL (replace with your URL):
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 2. Rename default branch to main:
git branch -M main

# 3. Push all commits to your repository:
git push -u origin main --force
```

---

## 🤝 Contribution Guidelines

We welcome community contributions, new tools, and translation improvements!
- **Offline First**: Tools must perform heavy processing (parsing, calculation, hashing, conversion) locally without cloud dependencies.
- **Modern Desktop Aesthetic**: Sleek dark/light UI with high contrast and zero telemetry.
- **Strict Typing**: All code must pass `tsc --noEmit` with zero errors.

---

## 📁 Repository Structure

```text
├── .vscode/
│   ├── settings.json       # i18n Ally & VS Code preferences
│   └── extensions.json     # Recommended extensions (i18n Ally, Tauri, Rust)
├── public/                 # Static assets, logos, and manifest
├── src/
│   ├── components/
│   │   ├── layout/         # Header, Sidebar, ToolGrid, CommandPalette, SidebarWidgets
│   │   └── ui/             # ConfigModal, PWAInstallButton
│   ├── i18n/               # Reactive translation context & autoTranslate engine
│   ├── locales/            # Translation dictionaries (cs, en, ru, de, es)
│   ├── services/           # Storage, theme definitions, and tauriBridge
│   ├── tools/              # 24 Modular tool implementations
│   │   ├── files/          # DOCX converter, Diff checker, Inspector, Multi-Format
│   │   ├── math/           # Calculator, Matrix, Grapher, LaTeX, Stats, Combinatorics
│   │   ├── science/        # Chemistry molar mass, Unit converter
│   │   ├── finance/        # Currency & Crypto tracker, Loan calculator
│   │   └── utilities/      # Hardware monitor, WCAG, Passwords, QR, RegEx, Pomodoro, Timezones
│   ├── types/              # TypeScript interfaces
│   ├── App.tsx             # Root desktop workspace layout
│   └── index.css           # Tailwind CSS styles & theme overrides
├── package.json
├── start.bat               # Windows one-click launcher
├── start.sh                # macOS/Linux one-click launcher
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 📄 License
This project is open-source and released under the **MIT License**.
