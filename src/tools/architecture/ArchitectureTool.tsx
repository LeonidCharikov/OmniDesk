import React, { useState } from 'react';
import { Terminal, Cpu, Shield, Copy, Check, ExternalLink, Code2 } from 'lucide-react';
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

  const terminalInitCommands = `# 1. Vytvoření nového projektu s Tauri v2 a Reactem
npm create tauri-app@latest omnidesk -- --template react-ts

# 2. Přejděte do složky projektu
cd omnidesk

# 3. Instalace produkčních knihoven pro UI a offline manipulaci
npm install lucide-react clsx tailwindcss @tailwindcss/vite mammoth pdf-lib

# 4. Spuštění lokálního vývojového serveru s Tauri desktopovým oknem
npm run tauri dev`;

  const rustIpcCode = `// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;

// Rust command pro bezpečný zápis do lokální JSON konfigurace
#[tauri::command]
fn save_user_config(app_handle: tauri::AppHandle, config_json: String) -> Result<String, String> {
    use tauri::Manager;
    let config_dir = app_handle.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    
    let file_path = config_dir.join("omnidesk-config.json");
    fs::write(&file_path, config_json).map_err(|e| e.to_string())?;
    Ok(format!("Uloženo do: {:?}", file_path))
}

// Rust command pro offline čtení souboru z disku
#[tauri::command]
fn read_local_file(file_path: String) -> Result<Vec<u8>, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("Soubor neexistuje".into());
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
        .expect("Chyba při startu aplikace Tauri");
}`;

  const reactBridgeCode = `// src/services/fileSystemService.ts
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, readFile, writeTextFile, writeFile } from '@tauri-apps/plugin-fs';

/**
 * 1. Otevření nativního systémového dialogu na hostitelském počítači
 */
export async function pickFileOnHost(): Promise<string | null> {
  const selected = await open({
    title: 'Vyberte dokument k lokálnímu zpracování',
    multiple: false,
    filters: [{ name: 'Dokumenty', extensions: ['docx', 'md', 'txt', 'csv', 'json'] }]
  });
  return selected as string | null;
}

/**
 * 2. Přímé čtení souboru z disku hostitele přes Tauri FS plugin
 */
export async function readHostFile(filePath: string): Promise<Uint8Array> {
  return await readFile(filePath);
}

/**
 * 3. Zápis převedeného souboru (PDF, WebP) přímo na disk
 */
export async function saveConvertedFile(targetPath: string, data: Uint8Array): Promise<void> {
  await writeFile(targetPath, data);
}`;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">Architektura, Tauri Blueprint & Integrace</h2>
        <p className="text-sm text-slate-400 mt-1">
          Kompletní průvodce pro export tohoto řešení do 100% nativní desktopové aplikace (Windows, macOS, Linux).
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
          Srovnání: Tauri v2 vs. Electron
        </button>
        <button
          onClick={() => setActiveTab('structure')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'structure' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Modulární struktura složek
        </button>
        <button
          onClick={() => setActiveTab('commands')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'commands' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Inicializační příkazy
        </button>
        <button
          onClick={() => setActiveTab('ipc')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'ipc' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Propojení UI & Rust Backend (IPC)
        </button>
        <button
          onClick={() => setActiveTab('build')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'build' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Desktop (.exe / .dmg) vs. Web
        </button>
      </div>

      {/* Tab 1: Compare */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Tauri v2 (Doporučená volba)</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Vítěz pro OmniDesk
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>Paměť RAM:</strong> ~35 MB (využívá nativní WebView2 na Windows / WebKit na macOS).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>Velikost binárky:</strong> 8–15 MB místo 120+ MB u Electronu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>Výkon pro soubory:</strong> Rust má bezkonkurenční rychlost a bezpečnost paměti pro binární konverze dokumentů.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>Bezpečnost:</strong> Detailní oprávnění (permissions) pro přístup k souborům a oknům.</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-300">Electron</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  Alternativa
                </span>
              </div>
              <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&#8226;</span>
                  <span><strong>Paměť RAM:</strong> 180–400+ MB (přibaluje celý Chromium browser a instanci Node.js).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&#8226;</span>
                  <span><strong>Velikost instalátoru:</strong> 90–160 MB.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&#10003;</span>
                  <span><strong>Ekosystém:</strong> Přímý přístup k libovolným Node.js modulům přes `npm` i na backendu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&#8226;</span>
                  <span><strong>Závěr:</strong> Pro aplikaci, která má tiše běžet na pozadí jako rychlý pomocník, je zbytečně těžkopádný.</span>
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
├── src-tauri/                 # Rust Tauri backend
│   ├── Cargo.toml             # Rust závislosti (serde, tauri, pdfium/docx crates)
│   ├── src/
│   │   ├── main.rs            # Inicializace Tauri a registrace IPC příkazů
│   │   ├── commands/          # Rust příkazy oddělené podle domén
│   │   │   ├── file_ops.rs    # Bezpečné čtení/zápis souborů, nativní dialogy
│   │   │   ├── converter.rs   # Backendová konverze a manipulace
│   │   │   └── config.rs      # Ukládání a čtení JSON konfigurace na disku
│   │   └── lib.rs
│   └── tauri.conf.json        # Konfigurace oken, oprávnění a bezpečnostních politik
├── src/                       # Frontendová vrstva (React + TypeScript + Vite)
│   ├── main.tsx               # Vstupní bod aplikace
│   ├── App.tsx                # Hlavní shell aplikace (layout, stav aktivního nástroje)
│   ├── index.css              # Globální styly, Tailwind CSS
│   ├── types/
│   │   └── tool.ts            # ToolDefinition, Category, UserConfig typy
│   ├── services/              # Abstrakce komunikace s backendem / lokálním během
│   │   ├── storage.ts         # Hybridní úložiště (Tauri fs API vs localStorage fallback)
│   │   ├── tauriBridge.ts     # Wrapper kolem @tauri-apps/api
│   │   └── networkStatus.ts   # Detekce online/offline stavu
│   ├── components/            # Globální sdílené komponenty
│   │   ├── layout/            # Sidebar, Header, CommandPalette
│   │   └── ui/                # Tlačítka, dialogy, indikátory stavu, dropzóny
│   └── tools/                 # MODULÁRNÍ NÁSTROJE (každý ve své složce)
│       ├── registry.ts        # Centrální registr všech dostupných modulů
│       ├── files/
│       │   ├── docx-to-pdf/   # Lokální převod DOCX do PDF
│       │   └── file-inspector/# Hashování a binární inspekce
│       ├── science/
│       │   └── unit-converter/# Převodník jednotek (SI, imperiální, fyzika)
│       ├── finance/
│       │   └── loan-calc/     # Úvěrová a hypotéční kalkulačka s amortizací
│       └── utilities/
│           ├── json-formatter/# Formátovač, validátor a linter JSONu
│           └── translator/    # Hybridní překladač (online)
└── package.json`}</pre>
        </div>
      )}

      {/* Tab 3: Commands */}
      {activeTab === 'commands' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Příkazy pro terminál (Bash / PowerShell)
            </span>
            <button
              onClick={() => copyCode(terminalInitCommands, 1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedIndex === 1 ? 'Zkopírováno' : 'Kopírovat příkazy'}
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
                1. Rust Backend: Implementace IPC příkazů (`src-tauri/src/main.rs`)
              </span>
              <button
                onClick={() => copyCode(rustIpcCode, 2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIndex === 2 ? 'Zkopírováno' : 'Kopírovat Rust'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto max-h-64">
              <pre>{rustIpcCode}</pre>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                2. React Frontend: Volání příkazů (`src/services/tauriBridge.ts`)
              </span>
              <button
                onClick={() => copyCode(reactBridgeCode, 3)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedIndex === 3 ? 'Zkopírováno' : 'Kopírovat TypeScript'}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 leading-relaxed overflow-x-auto max-h-64">
              <pre>{reactBridgeCode}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Build Desktop App (.exe / .dmg) */}
      {(activeTab as string) === 'build' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <h3 className="text-base font-semibold text-white">
              Jak z tohoto kódu vznikne instalovatelná počítačová aplikace (.exe, .dmg, .deb)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              To, co vidíte v tomto okně, <strong>není jen webová stránka</strong>. V moderním desktopovém vývoji (Tauri i Electron) je uživatelské rozhraní vždy psáno ve webových technologiích (React, HTML5, CSS).
              Když na svém počítači spustíte příkaz <code>npm run tauri build</code>, stane se následující:
            </p>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed pl-1">
              <li><strong>Vite zkompiluje React UI:</strong> Vygeneruje statickou složku <code>dist/</code> s bleskově rychlým JS a CSS kódem.</li>
              <li><strong>Rust zkompiluje nativní jádro:</strong> Vytvoří binární soubor, který komunikuje přímo s operačním systémem (Windows, macOS nebo Linux) a připojí k němu systémový WebView.</li>
              <li><strong>Vytvoření instalátoru:</strong> Tauri automaticky zabalí vše dohromady a vytvoří hotový instalátor:
                <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 font-mono text-indigo-300">
                  <li>Windows: <code>src-tauri/target/release/bundle/nsis/omnidesk_setup.exe</code></li>
                  <li>macOS: <code>src-tauri/target/release/bundle/dmg/omnidesk.dmg</code></li>
                  <li>Linux: <code>src-tauri/target/release/bundle/deb/omnidesk.deb</code> nebo <code>.AppImage</code></li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Obrovská výhoda hybridní architektury (2 v 1)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-emerald-400 block">&#10003; 1. Nativní desktop aplikace</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Funguje bez internetu, má přímý přístup k disku, systémovým oknům a souborovým asociacím (např. dvojklik na .docx otevře OmniDesk).
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-semibold text-indigo-400 block">&#10003; 2. Webová SaaS verze</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Tentýž kód můžete nahrát na libovolný webhosting a kdokoliv jej může používat přímo v prohlížeči bez instalace (jako na tomto odkazu).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
