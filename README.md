# OmniDesk — Universal Desktop Multi-Tool Platform ⚡

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38b2ac?logo=tailwindcss)](https://tailwindcss.com/)
[![i18n Ally](https://img.shields.io/badge/i18n--Ally-Supported-success?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OmniDesk** is a modern, high-performance, all-in-one desktop workstation designed to replace dozens of single-purpose utilities. Built with **Tauri v2 (Rust backend)** and **React 19 / TypeScript / Vite / Tailwind CSS**, it operates primarily **100% offline** directly in device memory with zero server dependencies, while providing native OS hardware telemetry, file system access, and instant keyboard navigation (Ctrl+K).

---

## 🌟 Key Architectural Highlights

- **Ultra-Lightweight Desktop Footprint**: Uses OS Webview via Tauri v2 instead of bundled Chromium, keeping binary size under ~15 MB and RAM usage under ~35 MB (compared to 150+ MB / 400+ MB in Electron).
- **100% Offline-First Engine**: Document conversion (DOCX/MD/TXT to PDF), image transcoding (WebP/PNG/JPEG), cryptographic hash calculation (SHA-256), matrix algebra, and chemical molar mass computation run entirely in client-side WebAssembly / JS without sending a single byte to external servers.
- **Hybrid Online Mode**: Features like live cryptocurrency rates and machine translation gracefully detect online/offline state and cache data locally.
- **Zero-Cloud Local Configuration**: User favorites, recent history, and application preferences are persisted directly to local storage / JSON configurations.
- **i18n Ally Integration**: Standardized JSON locale format (`src/locales/*.json`) configured via `.vscode/settings.json` for live in-editor translation editing and linting across 5 languages (**Čeština**, **English**, **Русский**, **Deutsch**, **Español**).

---

## 🛠️ Integrated Tools Catalog (22 Tools)

### 📁 1. Files & Documents (Soubory & Dokumenty)
1. **Multi-Format Converter**: Client-side document conversion (DOCX, Markdown, Plain Text to PDF), data transformation (CSV <-> JSON) and image re-encoding (WebP, PNG, JPEG).
2. **DOCX to PDF Converter**: Local Word document rendering and vector PDF generation with zero cloud uploads.
3. **Text & File Diff Checker**: Visual side-by-side diff with line-by-line change detection and unified view.
4. **File Inspector & Hasher**: Instant SHA-256 cryptographic checksums, binary hex dump, and MIME detection.

### 📐 2. Mathematics & Calculators (Matematika & Kalkulačky)
5. **Standard & Scientific Calculator**: Trigonometry (sin, cos, tan), logarithms, powers, roots, memory (M+/MR) and calculation history.
6. **Dynamic Matrix Calculator**: Custom dimensions from $1 \times 1$ up to $6 \times 6$, matrix multiplication ($A \times B$ and $B \times A$), determinants ($\det$), inverses ($A^{-1}$), transposes ($A^T$), and trace ($\text{tr}$).
7. **2D Function Grapher & Plotter**: Interactive canvas plotting $f(x)$, $g(x)$, $h(x)$, pan & zoom, tangent line inspection, and PNG export.
8. **LaTeX Formula Visualizer**: Real-time rendering, symbol quick-insertion palette, SVG/MathML export, and reference equations library.
9. **Statistics & Data Analysis**: Mean, median, mode, sample variance, standard deviation, quartiles, and dynamic histogram generator.
10. **Combinatorics & Number Theory**: Permutations, combinations ($nCr$), variations, Euclidean algorithm (GCD / LCM), and prime factorization.

### 🔬 3. Science & Chemistry (Věda & Chemie)
11. **Chemistry & Molar Mass Calculator**: Compound parser ($H_2O$, $C_6H_{12}O_6$, $Ca(OH)_2$), elemental mass breakdown, interactive periodic table, and solution molarity calculator ($c = n/V$).
12. **Scientific Unit Converter**: SI and imperial conversions for length, mass, temperature, pressure, and digital storage.

### 💰 4. Finance & Crypto (Finance & Kryptoměny)
13. **Currency Converter & Crypto Tracker**: Fiat currency exchange with offline cached rates and real-time live tracker for top cryptocurrencies (BTC, ETH, SOL, BNB, etc.).
14. **Mortgage & Loan Calculator**: Annuity payment calculation, principal-to-interest breakdown, and downloadable CSV amortization schedule.

### ⚙️ 5. Utilities & System (Utility & Nástroje)
15. **System Hardware Monitor**: Real-time CPU core telemetry, RAM usage, and disk partition monitoring via native Tauri Rust IPC (`sysinfo`).
16. **Color Palette & WCAG Validator**: Color palette generation, HEX/RGB/HSL conversion, and WCAG 2.1 AA/AAA accessibility contrast auditing.
17. **Cryptographic Password Generator**: Passwords with custom character sets and memorable Diceware-style passphrases with bit-entropy scoring.
18. **Offline QR Code Generator**: Generate vector QR codes for URLs, Wi-Fi networks, and text with PNG download.
19. **RegEx Tester & Base64 / URL Encoder**: Regular expression evaluation with capture groups and bidirectional Base64/URL encoding.
20. **World Clock & Pomodoro Timer**: Global time zone clocks and customizable Pomodoro focus timer with Web Audio API sound signals.
21. **JSON Formatter & Validator**: Beautify, minify, and validate JSON data structures with syntax error locator.
22. **Hybrid Online Translator**: Translation tool with automatic connectivity status detection and offline fallback notification.

---

## 🌍 i18n Ally & Localization Architecture

OmniDesk features first-class multi-language localization supporting 5 languages:
- 🇨🇿 **Čeština** (`cs`) — Source / default language
- 🇬🇧 **English** (`en`)
- 🇷🇺 **Русский** (`ru`)
- 🇩🇪 **Deutsch** (`de`)
- 🇪🇸 **Español** (`es`)

### VS Code Integration via i18n Ally:
The project is pre-configured with `.vscode/settings.json`:
```json
{
  "i18n-ally.localesPaths": ["src/locales"],
  "i18n-ally.keystyle": "nested",
  "i18n-ally.sourceLanguage": "cs",
  "i18n-ally.displayLanguage": "ru",
  "i18n-ally.enabledParsers": ["json"],
  "i18n-ally.extract.autoDetect": true
}
```

When you open this repository in VS Code or Cursor with the [i18n Ally extension](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally):
1. **Inline Annotation**: Translated strings appear as subtle inline labels directly next to your `t('...')` calls.
2. **Translation Matrix**: The sidebar shows key coverage and highlights untranslated strings across languages.
3. **Key Extraction**: Select any hardcoded string, click the lightbulb, and extract it to all 5 locale files automatically.

---

## 🚀 Setup & Installation Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [Rust & Cargo](https://rustup.rs/) (required only if building desktop binaries with Tauri)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/omnidesk.git
cd omnidesk

# Install npm dependencies
npm install
```

### 2. Run in Web Development Mode (Vite)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run in Desktop Development Mode (Tauri + Rust Window)
```bash
npm run tauri dev
```

### 4. Build Production Desktop Installer (.exe, .dmg, .deb, .AppImage)
```bash
npm run tauri build
```
Stand-alone platform installers are output to `src-tauri/target/release/bundle/`.

---

## 📤 Publishing to Your Remote Git Repository

The project repository is fully initialized with clean git history. To link it with your GitHub or GitLab remote:

```bash
# 1. Add your remote repository URL (replace with your URL):
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# 2. Rename default branch to main:
git branch -M main

# 3. Push all commits and branches:
git push -u origin main
```

---

## 🤝 Contribution Guidelines

We welcome community contributions, new tools, and translation improvements! Please follow these standards:

### 1. General Principles
- **Offline First**: All tools must perform heavy tasks (parsing, calculation, hashing, conversion) locally in client memory or Rust without server dependencies.
- **Zero Pill Discipline & Modern Desktop Aesthetic**: Follow existing sleek dark-mode UI with high contrast, crisp borders (`border-slate-800`), and zero telemetry.
- **Strict Typing**: All code must pass `tsc --noEmit` with zero errors.

### 2. How to Add a New Tool
1. **Create the Tool Component**:
   Create a new file in the appropriate category directory: `src/tools/<category>/MyNewTool.tsx`.
   Ensure all user-facing labels use the `useI18n()` hook:
   ```tsx
   import React from 'react';
   import { useI18n } from '../../i18n/context';

   export const MyNewTool: React.FC = () => {
     const { t } = useI18n();
     return (
       <div className="space-y-6">
         <h2 className="text-lg font-semibold text-white">
           {t('tool_my_new_tool_title', 'My Tool Title')}
         </h2>
       </div>
     );
   };
   ```

2. **Register in Tool Registry (`src/tools/registry.ts`)**:
   Add the tool configuration to `TOOLS_REGISTRY`:
   ```ts
   {
     id: 'my-new-tool',
     title: 'My Tool Title',
     shortDesc: 'Short description of what the tool does.',
     category: 'utilities',
     icon: 'Sparkles',
     requiresOnline: false,
     component: MyNewTool,
     tags: ['custom', 'tool', 'keywords'],
   }
   ```

3. **Add Translation Keys (`src/locales/*.json`)**:
   Add `tool_my_new_tool_title` and `tool_my_new_tool_desc` across `cs.json`, `en.json`, `ru.json`, `de.json`, and `es.json` (or use i18n Ally's auto-sync).

### 3. Submitting Pull Requests
1. Create a feature branch: `git checkout -b feat/add-my-tool`.
2. Verify TypeScript compilation: `npm run build` or `npx tsc --noEmit`.
3. Commit with conventional commit messages: `feat: add my new tool`.
4. Push to your branch and open a Pull Request.

---

## 📁 Repository File Tree

```text
├── .vscode/
│   ├── settings.json       # i18n Ally & VS Code preferences
│   └── extensions.json     # Recommended extensions (i18n Ally, Tauri, Rust)
├── public/                 # Static assets, logos, and screenshots
├── src/
│   ├── components/
│   │   ├── layout/         # Header, Sidebar, ToolGrid, CommandPalette
│   │   ├── modals/         # GitRepoModal, ConfigModal
│   │   └── ui/             # Reusable UI primitives
│   ├── i18n/
│   │   └── context.tsx     # Reactive multi-language provider & hook
│   ├── locales/            # Translation dictionaries (i18n Ally)
│   │   ├── cs.json         # Čeština (Source)
│   │   ├── en.json         # English
│   │   ├── ru.json         # Русский
│   │   ├── de.json         # Deutsch
│   │   └── es.json         # Español
│   ├── services/
│   │   ├── storage.ts      # Local JSON configuration management
│   │   └── tauriBridge.ts  # Tauri Rust IPC bridge & fallbacks
│   ├── tools/              # 22 Modular tool implementations
│   │   ├── files/          # DOCX converter, Diff checker, Inspector
│   │   ├── math/           # Calculator, Matrix, Grapher, LaTeX, Stats
│   │   ├── science/        # Chemistry molar mass, Unit converter
│   │   ├── finance/        # Currency & Crypto tracker, Loan calculator
│   │   ├── utilities/      # Hardware monitor, WCAG color, Passwords, QR
│   │   └── registry.ts     # Central registry of all tools
│   ├── types/              # TypeScript interfaces
│   ├── App.tsx             # Root desktop workspace layout
│   ├── main.tsx            # Application DOM entrypoint
│   └── index.css           # Tailwind CSS styles
├── src-tauri/              # Rust desktop native layer
│   ├── src/main.rs         # Tauri commands, file access, and sysinfo
│   └── tauri.conf.json     # Tauri window configuration & permissions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 📄 License
This project is open-source and released under the **MIT License**.
