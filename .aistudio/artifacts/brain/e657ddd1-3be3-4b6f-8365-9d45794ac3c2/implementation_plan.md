# OmniDesk: Moderní Desktopová Multi-Tool Platforma

Univerzální, modulární "all-in-one" desktopová aplikace postavená na frameworku Tauri v2 (Rust backend) a moderní webové vrstvě (React 19, TypeScript, Vite, Tailwind CSS). Nabízí plnohodnotné offline zpracování souborů a dokumentů (Word do PDF, manipulace s PDF a obrázky), vědecké i finanční kalkulačky, hybridní detekci online služeb a lokální správu oblíbených nástrojů.

## User Review & Critical Decisions

> [!IMPORTANT]
> Na základě vašich odpovědí v úvodním rozhovoru byla schválena následující klíčová architektonická rozhodnutí:
> 
> - **Platforma**: **Tauri v2 + Rust** zvoleno místo Electronu pro bleskový start, minimální spotřebu RAM (~35 MB vs ~250+ MB) a nativní systémový přístup přes bezpečný IPC most.
> - **Mechanismus konverze dokumentů**: **Lokální knihovny a WebAssembly (WASM)** zajišťující 100% offline běh bez nutnosti instalovat externí systémové binárky typu LibreOffice.
> - **Uživatelské rozhraní**: **Moderní desktopové studio** s postranním panelem kategorií, vyhledáváním (Command palette `Ctrl/Cmd + K`), indikátorem offline/online stavu a možností připínat oblíbené nástroje do lokální JSON konfigurace.

---

## 1. Přehled a klíčové koncepty

### Co aplikace řeší
Běžný uživatel i profesionál denně otevírá desítky jednoúčelových webových stránek pro převod Wordu do PDF, kompresi obrázků, formátování JSONu, výpočet splátek nebo vědecké vzorce. Většina těchto webů však vyžaduje odesílání citlivých dokumentů na cizí servery a nefunguje offline.

**OmniDesk** integruje tyto nástroje do jediného nativního rozhraní, kde:
- Všechny souborové a výpočetní operace probíhají **lokálně přímo na vašem počítači**.
- Nástroje vyžadující internet (překladač, směnné kurzy) automaticky detekují konektivitu s jasným vizuálním označením.
- Každý nástroj je samostatný, nezávislý modul (plug-and-play architektura).

---

## 2. Uživatelské rozhraní a vizuální design

### Vizuální identita a styl (Desktop Native Aesthetic)
- **Barevná paleta (60-30-10)**:
  - 60 % Podklad: Hluboký tmavý slate (`#0B0F17`) a neutrální plátno (`#0F172A`)
  - 30 % Strukturální povrchy: Jemně ohraničené panely (`border-slate-800/80 bg-slate-900/60`), postranní panel s hierarchií
  - 10 % Akcenty: Svěží indigo/fialová (`#6366F1`) pro aktivní stavy a fokusní kroužky
- **Typografie**:
  - Nadpisy a navigace: `Plus Jakarta Sans`
  - Tělo textu: `DM Sans`
  - Všechna čísla, kalkulátory a datové tabulky: striktně `font-mono tabular-nums`
- **Rozvržení**:
  - Levý panel (260 px): Logo, globální vyhledávání (`Ctrl+K`), kategorie (Oblíbené, Soubory, Věda, Finance, Utility), systémový status konektivity (Online/Offline přepínač a detekce).
  - Hlavní pracovní plocha: Contextual header s drobečkovou navigací a akcemi, dynamické zobrazení vybraného nástroje nebo katalogu karet.
  - Rychlé přepínání: Podpora klávesových zkratek, plynulé přechody mezi nástroji bez znovunačítání.

---

## 3. Klíčová rozhodnutí a porovnání technologií

### Srovnání Tauri v2 vs. Electron

| Kritérium | Tauri v2 (Doporučeno) | Electron | Racionále pro OmniDesk |
| :--- | :--- | :--- | :--- |
| **Spotřeba paměti (RAM)** | **~30–50 MB** (využívá nativní WebView: WebKit/WebView2) | **~180–350+ MB** (celý Chromium + Node.js) | Tauri je mnohonásobně šetrnější pro "stále běžící" utilitní aplikaci. |
| **Velikost instalátoru** | **~5–15 MB** | **~85–150+ MB** | Okamžité stažení a minimální stopa na disku. |
| **Offline konverze souborů** | Přes Rust thready na pozadí nebo WebAssembly v UI vlákně | Přes Node.js worker vlákna nebo C++ addony | Rust poskytuje špičkovou paměťovou bezpečnost a extrémní rychlost pro parsování binárních formátů. |
| **Systémová bezpečnost** | Striktní RPC/IPC s definovaným seznamem povolených příkazů a cest | Vyžaduje pečlivé nastavení contextIsolation | Tauri má bezpečný model sandboxingu a přístupu k souborovému systému by-design. |
| **Podpora npm knihoven** | UI vrstva je standardní Vite/React, takže všechny npm balíčky fungují v UI | Nativní přístup k Node `fs`, `child_process` přímo z backendu | S WebAssembly knihovnami (`docx`, `pdf-lib`, `mammoth`) běží konverze v UI i v Rust backendu bleskově. |

> [!NOTE]
> **Doporučení**: Zvolili jsme **Tauri v2**. Pro uživatele multi-toolu je klíčové, aby aplikace startovala za zlomek sekundy a neobsadila půl gigabajtu paměti na pozadí.

---

## 4. Modulární struktura projektu a architektura

### Modulární architektura nástrojů (Plugin Contract)
Každý nástroj implementuje unifikované rozhraní `ToolDefinition`:
- `id`: unikátní identifikátor (např. `docx-to-pdf`)
- `title` a `description`: název a popis nástroje
- `category`: `'files' | 'science' | 'finance' | 'utilities'`
- `requiresOnline`: boolean příznak pro indikaci nutnosti internetu
- `icon`: vizuální ikona z Lucide
- `component`: React komponenta s implementací nástroje

```
┌────────────────────────────────────────────────────────────────────────┐
│                        OmniDesk Application                            │
│                                                                        │
│   ┌────────────────────┐          ┌────────────────────────────────┐   │
│   │   Sidebar & Nav    │          │     Workspace Viewport         │   │
│   │                    │          │                                │   │
│   │  · Oblíbené        │  Select  │  ┌──────────────────────────┐  │   │
│   │  · Soubory (DOCX)  ├─────────►│  │   Active Tool Module     │  │   │
│   │  · Věda (Fyz/Chem) │          │  │   (e.g., DocxToPdfTool)  │  │   │
│   │  · Finance         │          │  └────────────┬─────────────┘  │   │
│   │  · Utility         │          │               │                │   │
│   └────────────────────┘          └───────────────┼────────────────┘   │
│                                                   │                    │
│   ┌───────────────────────────────────────────────▼────────────────┐   │
│   │   Local Engine / Processing Layer                              │   │
│   │                                                                │   │
│   │   · WebAssembly / Mammoth / PDF-Lib (Client-Side In-Memory)    │   │
│   │   · Tauri IPC Bridge (invoke / listen) pro Rust backend        │   │
│   │   · LocalStorage / Tauri JSON FS pro oblíbené nástroje         │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Navržená stromová struktura složek (Folder Structure)

```
omnidesk/
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
│   │   ├── tauriBridge.ts     # Wrapper kolem `@tauri-apps/api`
│   │   └── networkStatus.ts   # Detekce online/offline stavu
│   ├── components/            # Globální sdílené komponenty
│   │   ├── layout/            # Sidebar, Header, CommandPalette
│   │   └── ui/                # Tlačítka, dialogy, indikátory stavu, dropzóny
│   └── tools/                 # MODULÁRNÍ NÁSTROJE (každý ve své složce)
│       ├── registry.ts        # Centrální registr všech dostupných modulů
│       ├── files/
│       │   ├── docx-to-pdf/   # Lokální převod DOCX do PDF
│       │   ├── pdf-merge/     # Slučování a extrakce PDF
│       │   └── image-opt/     # Optimalizace a konverze formátů
│       ├── science/
│       │   ├── unit-converter/# Převodník jednotek (SI, imperiální, fyzika)
│       │   └── formula-eval/  # Vyhodnocování vzorců a grafy funkcí
│       ├── finance/
│       │   ├── loan-calc/     # Úvěrová a hypotéční kalkulačka s amortizací
│       │   └── vat-calc/      # DPH a daňová kalkulačka
│       └── utilities/
│           ├── json-formatter/# Formátovač, validátor a linter JSONu
│           ├── text-diff/     # Porovnávání textů řádek po řádce
│           └── translator/    # Hybridní překladač (online)
└── package.json
```

---

## 5. První terminálové příkazy a postup inicializace

### 1. Inicializace projektu s Tauri v2 a Reactem

Pokud vytváříte nový projekt na svém počítači od nuly:

```bash
# 1. Spuštění oficiálního průvodce Tauri
npm create tauri-app@latest omnidesk

# Průvodce se zeptá na:
# ✔ Project name: omnidesk
# ✔ Choose which language to use for frontend: TypeScript / JavaScript
# ✔ Choose your package manager: npm
# ✔ Choose your UI template: React
# ✔ Choose your UI flavor: TypeScript

# 2. Přejděte do složky projektu
cd omnidesk

# 3. Instalace UI a utilitních závislostí
npm install lucide-react clsx tailwindcss @tailwindcss/vite mammoth pdf-lib
```

### 2. Propojení UI s backendem (Tauri IPC Bridge)

V Tauri probíhá komunikace mezi Reactem a backendem přes mechanismus `invoke`:

**V Rustu (`src-tauri/src/main.rs`):**
```rust
#[tauri::command]
fn convert_document(file_path: String, target_format: String) -> Result<String, String> {
    // Bezpečné zpracování souboru přímo v Rustu
    Ok(format!("Úspěšně převedeno: {}", file_path))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![convert_document])
        .run(tauri::generate_context!())
        .expect("Chyba při běhu Tauri aplikace");
}
```

**V Reactu (`src/services/tauriBridge.ts`):**
```typescript
import { invoke } from '@tauri-apps/api/core';

export async function convertDoc(filePath: string, format: string): Promise<string> {
  // Bezpečné volání Rust příkazu
  return await invoke('convert_document', { filePath, targetFormat: format });
}
```

---

## 6. Implementační kroky pro prototyp v tomto prostředí

V aktuálním prostředí AI Studio Build vytvoříme plně funkční desktopový frontend se všemi klíčovými nástroji, které budou schopné provádět reálné offline operace přímo v prohlížeči:
1. **Desktop Shell & Navigace**:
   - Moderní tmavý design s postranním panelem kategorií a vyhledáváním.
   - Stavový řádek s možností testovat Online vs. Offline režim.
   - Správa oblíbených nástrojů ukládaná do lokálního JSON úložiště.
2. **Plně funkční nástroje**:
   - **Offline Word do PDF / Text konvertor**: Parsování `.docx` souborů pomocí `mammoth` a generování PDF dokumentu v paměti pomocí `pdf-lib` s možností okamžitého stažení/náhledu.
   - **Vědecký a technický modul**: Fyzikální a matematický převodník jednotek s přesnou vizualizací.
   - **Finanční modul**: Hypotéční a úvěrová kalkulačka s interaktivním splátkovým kalendářem.
   - **Utility modul**: JSON formátovač s validací chyb a syntaxí.
   - **Hybridní modul**: Nástroj vyžadující online připojení s automatickým vypnutím při offline stavu.
3. **Dokumentace a šablony**: Vestavěná záložka s připravenými Rust/Tauri šablonami kódu pro snadné zkopírování do nativní desktopové aplikace.
