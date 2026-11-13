import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const ArchitectureTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'compare' | 'structure' | 'commands' | 'ipc' | 'build'>('compare');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const terminalInitCommands = `# ${t('arch_step_1', '1. Create a new project with Tauri v2 and React')}
npm create tauri-app@latest omnidesk -- --template react-ts

# ${t('arch_step_2', '2. Navigate to the project directory')}
cd omnidesk

# ${t('arch_step_3', '3. Install production libraries for UI and offline file processing')}
npm install lucide-react clsx tailwindcss @tailwindcss/vite mammoth pdf-lib

# ${t('arch_step_4', '4. Start the local dev server with a native Tauri desktop window')}
npm run tauri dev`;

  const rustIpcCode = `// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;

// ${t('arch_rust_comment_1', 'Rust command for safely writing local JSON configuration')}
#[tauri::command]
fn save_user_config(app_handle: tauri::AppHandle, config_json: String) -> Result<String, String> {
    use tauri::Manager;
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    
    let file_path = config_dir.join("omnidesk-config.json");
    fs::write(&file_path, config_json).map_err(|e| e.to_string())?;
    Ok(format!("${t('saved_to_prefix', 'Saved to:')} {:?}", file_path))
}

// ${t('arch_rust_comment_2', 'Rust command for reading a local file from disk offline')}
#[tauri::command]
fn read_local_file(file_path: String) -> Result<Vec<u8>, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("${t('file_not_found', 'File does not exist')}".into());
    }
    fs::read(path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_user_config,
            read_local_file
        ])
        .run(tauri::generate_context!())
        .expect("${t('tauri_start_error', 'Error while running Tauri application')}");
}`;

  const reactBridgeCode = `// src/services/fileSystemService.ts
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, readFile, writeTextFile, writeFile } from '@tauri-apps/plugin-fs';

/**
 * ${t('arch_bridge_step_1', '1. Open native OS file picker dialog on the host machine')}
 */
export async function pickFileOnHost(): Promise<string | null> {
  const selected = await open({
    title: '${t('arch_pick_doc_title', 'Select a document for local processing')}',
    multiple: false,
    filters: [{ name: '${t('documents', 'Documents')}', extensions: ['docx', 'md', 'txt', 'csv', 'json'] }]
  });
  return selected as string | null;
}

/**
 * ${t('arch_bridge_step_2', '2. Read a file directly from host disk via Tauri FS plugin')}
 */
export async function readHostFile(filePath: string): Promise<Uint8Array> {
  return await readFile(filePath);
}

/**
 * ${t('arch_bridge_step_3', '3. Write converted file output (PDF, WebP) directly to disk')}
 */
export async function saveConvertedFile(targetPath: string, data: Uint8Array): Promise<void> {
  await writeFile(targetPath, data);
}`;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">{t('architecture_title', 'Architecture, Tauri Blueprint & Integration')}</h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('architecture_desc', 'Complete guide to exporting this workspace as a 100% native desktop application (Windows, macOS, Linux).')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'compare' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('compare_tauri_electron', 'Comparison: Tauri v2 vs. Electron')}
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'structure' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('modular_structure', 'Modular Folder Structure')}
        </button>
        <button
          onClick={() => setActiveTab('commands')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'commands' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('initialization_commands', 'Initialization Commands')}
        </button>
        <button
          onClick={() => setActiveTab('ipc')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'ipc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('ui_rust_ipc', 'UI & Rust Backend Bridge (IPC)')}
        </button>
        <button
          onClick={() => setActiveTab('build')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'build' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          {t('desktop_vs_web', 'Desktop (.exe / .dmg) vs. Web')}
        </button>
      </div>

      {/* Tab 1: Compare */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{t('tauri_recommended', 'Tauri v2 (Recommended)')}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {t('winner_for_omnidesk', 'Best Fit for OmniDesk')}
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>{t('ram_memory', 'RAM Usage')}:</strong> ~35 MB ({t('tauri_webview_desc', 'uses native WebView2 on Windows / WebKit on macOS')}).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>{t('binary_size', 'Binary Size')}:</strong> 8–15 MB {t('instead_of_electron', 'compared to 120+ MB with Electron')}.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>{t('file_performance', 'File Performance')}:</strong> {t('rust_performance_desc', 'Rust delivers unmatched speed and memory safety for binary document conversions.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>{t('security', 'Security')}:</strong> {t('security_desc', 'Granular capability permissions for file system and window access.')}</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-300">Electron</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {t('alternative', 'Alternative')}
                </span>
              </div>
              <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&#8226;</span>
                  <span><strong>{t('ram_memory', 'RAM Usage')}:</strong> 180–400+ MB ({t('electron_ram_desc', 'bundles a full Chromium browser and Node.js runtime')}).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&#8226;</span>
                  <span><strong>{t('installer_size', 'Installer Size')}:</strong> 90–160 MB.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>{t('ecosystem', 'Ecosystem')}:</strong> {t('ecosystem_desc', 'Direct access to any Node.js packages via npm on the backend process.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&#8226;</span>
                  <span><strong>{t('conclusion', 'Summary')}:</strong> {t('electron_conclusion_desc', 'Too heavy for a lightweight utility companion designed to stay fast and unobtrusive.')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Structure */}
      {activeTab === 'structure' && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
          <pre>{`omnidesk/
├── src-tauri/                 # Tauri Rust backend
│   ├── Cargo.toml             # Rust dependencies (serde, tauri, pdfium/docx crates)
│   ├── src/
│   │   ├── main.rs            # Tauri initialization & IPC command registration
│   │   ├── commands/          # Rust commands separated by domain
│   │   │   ├── file_ops.rs    # File operations & native dialogs
│   │   │   ├── converter.rs   # Backend conversion & manipulation
│   │   │   └── config.rs      # JSON configuration persistence
│   │   └── lib.rs
│   └── tauri.conf.json        # Windows, permissions & security policies
├── src/                       # Frontend layer (React + TypeScript + Vite)
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Main shell (layout, active tool state)
│   ├── index.css              # Global styles, Tailwind CSS
│   ├── types/
│   │   └── tool.ts            # ToolDefinition, Category, UserConfig types
│   ├── services/              # Backend abstraction & storage
│   │   ├── storage.ts         # Hybrid storage (Tauri fs API vs localStorage fallback)
│   │   ├── tauriBridge.ts     # Wrapper around @tauri-apps/api
│   │   └── networkStatus.ts   # Online/offline detection
│   ├── components/            # Shared components
│   │   ├── layout/            # Sidebar, Header, CommandPalette
│   │   └── ui/                # Buttons, dialogs, status indicators, dropzones
│   └── tools/                 # Modular tools (each in its own directory)
│       ├── registry.ts        # Central tool registry
│       ├── files/
│       │   ├── docx-to-pdf/   # Local DOCX to PDF converter
│       │   └── file-inspector/# Hashing & binary inspection
│       ├── science/
│       │   └── unit-converter/# Unit converter (SI, imperial, physics)
│       ├── finance/
│       │   └── loan-calc/     # Loan & mortgage calculator with amortization
│       └── utilities/
│           ├── json-formatter/# JSON formatter, validator & linter
│           └── translator/    # Hybrid translator (online/offline)
└── package.json`}</pre>
        </div>
      )}

      {/* Tab 3: Commands */}
      {activeTab === 'commands' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('terminal_commands', 'Terminal Commands (Bash / PowerShell)')}
            </span>
            <button
              onClick={() => copyCode(terminalInitCommands, 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedIndex === 1 ? t('copied', 'Copied') : t('copy_commands', 'Copy Commands')}
            </button>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <pre>{terminalInitCommands}</pre>
          </div>
        </div>
      )}

      {/* Tab 4: IPC */}
      {activeTab === 'ipc' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('rust_ipc_heading', '1. Rust Backend: IPC Command Handlers (`src-tauri/src/main.rs`)')}
              </span>
              <button
                onClick={() => copyCode(rustIpcCode, 2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIndex === 2 ? t('copied', 'Copied') : t('copy_rust', 'Copy Rust')}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto max-h-64">
              <pre>{rustIpcCode}</pre>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('react_bridge_heading', '2. React Frontend: Invoking Native Bridges (`src/services/tauriBridge.ts`)')}
              </span>
              <button
                onClick={() => copyCode(reactBridgeCode, 3)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIndex === 3 ? t('copied', 'Copied') : t('copy_typescript', 'Copy TypeScript')}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 leading-relaxed overflow-x-auto max-h-64">
              <pre>{reactBridgeCode}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Build Desktop App (.exe / .dmg) */}
      {activeTab === 'build' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <h3 className="text-base font-semibold text-white">
              {t('build_title', 'How this codebase becomes an installable desktop app (.exe, .dmg, .deb)')}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('build_intro', 'What you see in this window is not just a web page. In modern desktop engineering (Tauri and Electron), UI is authored with web technologies (React, HTML5, CSS). Running npm run tauri build performs three steps:')}
            </p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed pl-1">
              <li>{t('build_vite', 'Vite compiles the React UI: produces a fast static dist/ bundle with optimized JS and CSS.')}</li>
              <li>{t('build_rust', 'Rust compiles the native core: creates a binary that talks directly to the OS and attaches the system WebView.')}</li>
              <li>{t('build_installer', 'Installer packaging: Tauri bundles everything into ready-to-distribute installers:')}
                <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 font-mono text-indigo-300">
                  <li>{t('platform_windows', 'Windows')}: <code>src-tauri/target/release/bundle/nsis/omnidesk_setup.exe</code></li>
                  <li>{t('platform_macos', 'macOS')}: <code>src-tauri/target/release/bundle/dmg/omnidesk.dmg</code></li>
                  <li>{t('platform_linux', 'Linux')}: <code>src-tauri/target/release/bundle/deb/omnidesk.deb</code> {t('or', 'or')} <code>.AppImage</code></li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('hybrid_advantage', 'The Advantage of Hybrid Architecture (2-in-1)')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-400 block">&#10003; {t('native_desktop', '1. Native Desktop Application')}</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {t('native_desktop_desc', 'Works offline with direct disk access, native window controls, and OS file associations.')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-indigo-400 block">&#10003; {t('web_saas', '2. Web SaaS Deployment')}</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {t('web_saas_desc', 'Deploy the exact same codebase to any static web host so anyone can use it in a browser without installing.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
