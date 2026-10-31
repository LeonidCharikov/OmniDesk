# OmniDesk — Universal Desktop Multi-Tool Platform ⚡

[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38b2ac?logo=tailwindcss)](https://tailwindcss.com/)
[![i18n Ally](https://img.shields.io/badge/i18n--Ally-Supported-success?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**OmniDesk** je moderní, vysoce výkonná a všestranná desktopová pracovní stanice sdružující **31 integrovaných nástrojů** do jednoho přehledného prostředí. Je postavena na technologiích **Tauri v2 (Rust backend)** a **React 19 / TypeScript / Vite / Tailwind CSS**. Běží primárně **100% offline** přímo v paměti zařízení s nulovou závislostí na cloudu, podporuje nativní telemetrii OS, zpracování lokálních souborů, průhledný horní panel sladěný s aktivním motivem a bleskovou navigaci klávesnicí (`Ctrl+K`).

---

## 🚀 Jak spustit OmniDesk / How to Run OmniDesk

Aplikaci OmniDesk můžete spustit několika způsoby:

### 📦 1. Stažení hotového instalátoru z GitHubu (Releases)
Nejjednodušší způsob pro běžné uživatele bez nutnosti instalace vývojářských nástrojů:
1. Přejděte na záložku **Releases** na GitHubu daného repozitáře.
2. Stáhněte nejnovější sestavený instalátor (`.exe` nebo `.msi` pro Windows, případně balíček pro macOS / Linux).
3. Spusťte instalátor a OmniDesk se nainstaluje jako standardní aplikace do systému.

---

### 💻 2. Spuštění ve Visual Studio Code / PowerShell (Tauri Dev s MSVC)
Pokud projekt vyvíjíte nebo spouštíte ze zdrojových kódů v PowerShellu / VS Code na Windows s MSVC Build Tools a Windows SDK:

Zkopírujte a vložte následující příkaz do **PowerShell** terminálu ve VS Code:

```powershell
$msvc="C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\VC\Tools\MSVC\14.44.35207"
$sdk="C:\Program Files (x86)\Windows Kits\10"
$sdkver="10.0.26100.0"

$env:Path="$msvc\bin\HostX64\x64;$env:Path"
$env:INCLUDE="$msvc\include;$sdk\Include\$sdkver\ucrt;$sdk\Include\$sdkver\shared;$sdk\Include\$sdkver\um"
$env:LIB="$msvc\lib\x64;$sdk\Lib\$sdkver\ucrt\x64;$sdk\Lib\$sdkver\um\x64"

cd "C:\OmniDesk-main\OmniDesk-main"
npm run tauri dev
```

*(Cesty k `msvc` a `sdk` můžete případně upravit podle verze Visual Studio a Windows SDK nainstalované na vašem počítači).*

---

### ⚡ 3. Jedno-klikové spuštění skriptem (`start.bat` pro Windows / `start.sh` pro Linux & Mac)
1. Dvakrát klikněte na soubor **`start.bat`** ve Windows (nebo spusťte `./start.sh` na macOS/Linuxu).
2. Skript automaticky ověří přítomnost Node.js, při prvním spuštění doinstaluje závislosti a spustí lokální server.
3. Jakmile je server připraven, automaticky otevře OmniDesk ve výchozím prohlížeči.

---

### 🌐 4. Spuštění ve webovém režimu (Web Dev)
```bash
npm install
npm run dev
```
Otevřete [http://localhost:3000](http://localhost:3000) ve vašem prohlížeči. Odtud můžete aplikaci nainstalovat také jako **PWA (Desktopovou aplikaci)** jedním kliknutím na tlačítko *Instalovat aplikaci* v záhlaví.

---

## 🌟 Novinky a nedávné aktualizace v OmniDesk

- 🧪 **Plná periodická tabulka prvků (všech 118 prvků)**:
  - Kompletní periodická tabulka v oficiálním standardu IUPAC (periody 1–7, skupiny 1–18, včetně oddělených řad lanthanoidů a aktinoidů).
  - Přehledné barevné odlišení orbitalových bloků (*s, p, d, f*) a chemických skupin (alkalické kovy, halogeny, vzácné plyny atd.).
  - Interaktivní detail prvků: protonové číslo, molární hmotnost, elektronegativita, elektronová konfigurace, skupenství a hustota.
- 💱 **Vždy aktuální živé kurzy měn a kryptoměn**:
  - Přímé živé propojení s CoinGecko API pro ceny kryptoměn (BTC, ETH, SOL, TON, BNB, XRP, ADA, DOGE, AVAX atd.) s manuálním i automatickým osvěžením.
  - Volba výchozí měny uživatelem v Nastavení (CZK, EUR, USD, GBP, CHF, PLN, JPY, RUB) – vybraná měna se promítá jak do kalkulaček a převodníků, tak do widgetů v postranním panelu.
- 📝 **Pokročilý textový editor & poznámkový blok (.txt / .md)**:
  - Vytváření, otevírání a ukládání textových souborů s kódováním UTF-8.
  - Změna velikosti písma i formátování velkých/malých písmen **pouze pro konkrétní vybraný text**.
  - Tvorba nadpisů (H1, H2, H3), zarovnání textu (vlevo, na střed, vpravo).
  - Vyhledávání a nahrazování s podporou regulárních výrazů, živé statistiky (znaky, slova, řádky, čas čtení) a automatické ukládání.
- 🗂️ **Kategorizovaná hlavní obrazovka**:
  - Všechny nástroje jsou na hlavní ploše uspořádány do logických bloků s přehlednými nadpisy kategorií (Soubory & Dokumenty, Matematika, Věda, Finance, Plánování, Utility).
- 🪟 **Průhledný horní pruh aplikace**:
  - Horní panel okna s tlačítky pro zavření, minimalizaci a maximalizaci má adaptivní průhledný vzhled sladěný s aktuálně aktivním motivem barev.
- 🌐 **Plná multijazyčnost bez pevné vazby na češtinu**:
  - Dynamická lokalizace do 5 jazyků (**čeština, angličtina, němčina, španělština, ruština**) s plným pokrytím všech popisků, nápověd, tlačítek a jednotek.

---

## 🛠️ Kompletní katalog 31 integrovaných nástrojů

### 📁 1. Soubory & Dokumenty (`files`)
1. **Textový Editor & Poznámkový blok (.txt / .md)**: Úprava a tvorba souborů, selektivní velikost a transformace vybraného textu, nadpisy H1-H3, zarovnání, vyhledávání a nahrazování.
2. **Rychlý offline diktafon & Hlasové poznámky**: Záznam hlasových poznámek přímo z mikrofonu, živý audio vizualizér, přehrávání, přejmenování a stažení ve formátu WebM.
3. **Jednoduchý skicák & Podpisový arch**: Kreslicí plátno na bázi HTML5 Canvas (pero, guma, volba tloušťky a barev), linka pro podpis, průhledné/bílé pozadí, Undo a export do PNG.
4. **Multi-Formátový Konvertor**: Univerzální převod dokumentů (DOCX, MD, TXT -> PDF), datových formátů (CSV <-> JSON) a obrázků (WebP, PNG, JPG).
5. **DOCX do PDF Konvertor**: Klientský offline převod Word dokumentů do PDF přímo v paměti zařízení bez nahrávání na server.
6. **Porovnávač Textů a Souborů (Diff Checker)**: Vizuální side-by-side a inline porovnání s detekcí změn řádek po řádku.
7. **Inspektor Souborů & Kontrolní Součty**: Výpočet kryptografických hashů (SHA-256), binární hex dump a MIME analýza souboru.

### 📐 2. Matematika & Výpočty (`math`)
8. **Vědecká Kalkulačka**: Trigonometrické funkce (sin, cos, tan), logaritmy, mocniny, odmocniny, paměť (M+/MR) a historie výpočtů.
9. **Maticová Kalkulačka**: Dynamické matice od $1 \times 1$ do $6 \times 6$, násobení ($A \times B$, $B \times A$), determinanty, inverze, transpozice a stopa matice.
10. **2D Vykreslovač Funkcí & Grafů**: Interaktivní plátno pro funkce $f(x)$, $g(x)$, $h(x)$, plynulý zoom, posun tažením, tečny a export do PNG.
11. **LaTeX Editor & Vykreslovač Vzorců**: Real-time renderování matematických vzorců s paletou symbolů, knihovnou rovnic a exportem SVG/MathML.
12. **Statistika a Analýza Dat**: Aritmetický průměr, medián, modus, rozptyl, směrodatná odchylka, kvartily a generátor histogramů.
13. **Kombinatorika & Teorie Čísel**: Permutace, kombinace, variace, Eukleidův algoritmus (NSD / NSN) a rozklad na prvočísla.

### 🔬 3. Věda & Přírodní Vědy (`science`)
14. **Chemie & Periodická Tabulka Prvků**: Kompletní periodická tabulka všech 118 prvků (IUPAC), kalkulačka molární hmotnosti sloučenin, hmotnostní podíly a výpočet molarity roztoků ($c = n/V$).
15. **Převodník Fyzikálních Jednotek**: Převody pro délku, hmotnost, teplotu, tlak, plochu, objem, rychlost a digitální datové kapacity.

### 💰 4. Finance & Slevy (`finance`)
16. **Kalkulačka slev, DPH a spropitného**:
    - Výpočet procentuálních slev a akcí typu 2+1 zdarma (BOGO).
    - Obousměrná kalkulačka DPH (přidání DPH k základu i vyjmutí daně z celkové ceny s kopií rekapitulace).
    - Výpočet spropitného a rozpočítání útraty v restauraci na jednotlivé osoby se zaokrouhlováním.
17. **Kurzy Měn & Krypto Tracker**: 19 světových měn (CZK, EUR, USD, GBP, CHF, PLN, JPY, RUB atd.) a 14 kryptoměn s živými cenami a volbou uživatelské výchozí měny.
18. **Úvěrová a Hypoteční Kalkulačka**: Výpočet anuitních splátek, poměr jistiny a úroků, amortizační tabulka s exportem do CSV.

### 📋 5. Plánování & Organizace (`planning`)
19. **Chytrý nákupní lístek & Čeklist**: Kategorizovaný nákupní seznam s odhadem celkové ceny a ceny zboží v košíku, 1-klikové rychlé šablony (mléko, pečivo, káva...) a export do schránky.
20. **Interaktivní Kalendář & Plánovač**: Měsíční zobrazení, přepínání roků a měsíců, zvýraznění dnešního dne a rychlé plánování událostí.

### ⚙️ 6. Utility & Běžné Použití (`utilities`)
21. **Převodník velikostí oblečení a obuvi**: Mezinárodní převod velikostí pro pánskou a dámskou obuv (EU, US, UK, CM, palce) s vyhledáním podle délky chodidla a převodník konfekčních velikostí oděvů (XS–3XL).
22. **Systémový & Hardwarový Monitor**: Využití CPU jader, spotřeba RAM a diskové oddíly přes nativní Tauri IPC.
23. **WCAG Kontrastní Validátor**: Validace přístupnosti dle WCAG 2.1 (úrovně AA a AAA), simulace poruch barvocitu (protanopie, deuteranopie, tritanopie) a automatické ladění kontrastu.
24. **Generátor Barevných Palet**: Harmonické palety barev, převody mezi HEX, RGB a HSL, generování schémat.
25. **Generátor Bezpečných Hesel**: Náhodná hesla s volitelnými sadami znaků a mnemotechnické Diceware fráze s výpočtem entropie.
26. **Offline QR Kód Generátor**: Vektorové generování QR kódů pro webové odkazy, Wi-Fi přihlášení i libovolný text s exportem do PNG.
27. **RegEx Tester & Base64 / URL Kodér**: Testování regulárních výrazů se zvýrazněním skupin a obousměrné kódování Base64/URL.
28. **Pomodoro & Stopky**: Nastavitelné cykly soustředění a přestávek, odpočítávací časovač a mezičasové stopky.
29. **Světové Časy & Plánovač Schůzek**: Světové hodiny s 28 metropolemi a posuvník pro plánování mezinárodních hovorů v různých časových pásmech.
30. **JSON Formátovač & Validátor**: Formátování, zmenšení (minifikace) a kontrola syntaktických chyb v JSON struktuře.
31. **Online Překladač**: Rychlý překladač s automatickou detekcí stavu připojení k internetu.

---

## 🎨 Vzhled & Motivy (6 integrovaných témat)

V nastavení vzhledu (ikona posuvníků) lze okamžitě přepínat mezi 6 kompletními barevnými paletami:
- 🌌 **Midnight Navy** — Výchozí hluboká břidlicová a námořnická paleta s indigovými akcenty.
- 🖤 **OLED Pure Black** — Černočerné pozadí (`#000000`) optimalizované pro OLED/AMOLED displeje a šetření energie.
- 🩶 **Graphite Charcoal** — Matná technická tmavě šedá pro maximální soustředění.
- 🌲 **Cyber Emerald** — Futuristická tmavě zelená paleta inspirovaná terminálovým stylem.
- 🔮 **Royal Twilight** — Fialový a ametystový odstín s elegantním kontrastem.
- ☀️ **Clean Light** — Světlý denní režim s vysokým kontrastem pro práci v jasně osvětlených prostorech.

---

## 🧩 Přizpůsobitelné Mini-Widgety v Postranním Panelu

V levém postranním panelu si můžete zapnout nebo vypnout tyto widgety:
1. **Světový čas a datum** — Hodiny pro vybrané světové město.
2. **Rychlý Pomodoro časovač** — Spuštění 25minutového bloku jedním kliknutím.
3. **Živý ticker kurzů měn a kryptoměn** — Přepínatelná výchozí měna a live cena BTC, ETH, SOL atd.
4. **Denní úkoly (To-Do checklist)** — Rychlý odškrtávací seznam úkolů dne.
5. **Rychlá kalkulačka a převodník** — Vyhodnocení jednoduchých výrazů (`25 * 4`, `100 EUR to CZK`).
6. **Rychlé poznámky (Scratchpad)** — Automaticky ukládaný textový zápisník.
7. **Stav systému (CPU & RAM)** — Okamžitý přehled zatížení počítače.

---

## 💾 Zálohování a přenos profilu v JSON

Veškerá data a nastavení zůstávají lokálně ve vašem počítači:
- **Export do souboru `omnidesk-profile.json`**: Uložení kompletní konfigurace včetně oblíbených položek, úkolů a nastavení jedním kliknutím.
- **Kopírování a vložení JSON**: Možnost přenosu nastavení přes schránku.
- **Obnova ze zálohy**: Nahrání souboru a okamžité načtení pracovního prostředí na novém počítači.
- **Reset do továrního nastavení**: Bezpečné obnovení výchozího stavu po potvrzení.

---

## 🌍 Podporované Jazyky (i18n)

OmniDesk plně podporuje přepínání mezi 5 jazyky:
- 🇨🇿 **Čeština** (`cs`)
- 🇬🇧 **English** (`en`)
- 🇩🇪 **Deutsch** (`de`)
- 🇪🇸 **Español** (`es`)
- 🇷🇺 **Русский** (`ru`)

Lokalizační slovníky jsou uloženy ve standardním formátu v `src/locales/*.json` a jsou plně kompatibilní s rozšířením **i18n Ally** pro VS Code / Cursor.

---

## 📄 Licence

Tento projekt je otevřený open-source software pod licencí **MIT License**.
