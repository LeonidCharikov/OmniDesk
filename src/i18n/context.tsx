import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'cs' | 'en' | 'de' | 'es' | 'ru';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  cs: {
    // Categories
    cat_all: 'Všechny nástroje',
    cat_favorites: 'Oblíbené',
    cat_files: 'Soubory & Dokumenty',
    cat_math: 'Matematika & Kalkulačky',
    cat_science: 'Věda & Chemie',
    cat_finance: 'Finance & Kryptoměny',
    cat_utilities: 'Utility & Nástroje',
    cat_architecture: 'Tauri & Kód',
    categories: 'Kategorie nástrojů',

    // Global
    search_placeholder: 'Rychlé hledání nástrojů... Ctrl+K',
    search_modal_placeholder: 'Hledat nástroj (např. docx, qr, heslo, matice)...',
    connectivity_status: 'Stav konektivity',
    simulate_offline: 'Simulovat offline režim',
    disable_simulation: 'Zrušit simulaci offline',
    online: 'Online',
    offline: 'Offline',
    offline_badge: '100% Offline / Bez odesílání',
    online_badge: 'Vyžaduje online připojení',
    copy: 'Kopírovat',
    copied: 'Zkopírováno',
    download: 'Stáhnout',
    saved: 'Uloženo',
    open: 'Otevřít',
    back: 'Zpět',
    in_favorites: 'V oblíbených',
    add_favorite: 'Přidat do oblíbených',
    reset_defaults: 'Obnovit výchozí',
    local_config: 'Lokální JSON konfigurace',
    no_tools_found: 'Žádný nástroj neodpovídá zadání',
    catalog: 'Katalog nástrojů',

    // Tool Titles & Descriptions
    tool_multi_title: 'Multi-Formátový Konvertor',
    tool_multi_desc: 'Univerzální převod dokumentů (DOCX, MD, TXT -> PDF), dat (CSV <-> JSON) a obrázků (WebP, PNG, JPG).',
    tool_docx_title: 'DOCX do PDF Konvertor',
    tool_docx_desc: '100% offline převod Word dokumentů do PDF přímo v paměti zařízení.',
    tool_diff_title: 'Text & Souborový Diff Porovnávač',
    tool_diff_desc: 'Vizuální porovnání dvou textů nebo konfiguračních souborů řádek po řádce s detekcí změn.',
    tool_inspector_title: 'Inspektor Souborů & Hash',
    tool_inspector_desc: 'Kryptografické SHA-256 kontrolní součty, MIME detekce a binární hex dump.',

    tool_calc_title: 'Klasická & Vědecká Kalkulačka',
    tool_calc_desc: 'Standardní i vědecký režim, goniometrie, mocniny, paměť (M+/MR) a historie výpočtů.',
    tool_matrix_title: 'Maticová Kalkulačka (Vlastní rozměry)',
    tool_matrix_desc: 'Determinanty, inverze, maticové násobení A × B, transpozice pro libovolné rozměry M × N.',
    tool_stats_title: 'Statistika & Analýza Dat',
    tool_stats_desc: 'Aritmetický průměr, medián, modus, výběrový rozptyl, směrodatná odchylka, kvartily a histogram.',
    tool_comb_title: 'Kombinatorika & Teorie Čísel',
    tool_comb_desc: 'Permutace, kombinace, variace, Eukleidův algoritmus (NSD a NSN) a prvočíselný rozklad.',

    tool_chem_title: 'Chemie & Molární Kalkulačka',
    tool_chem_desc: 'Molární hmotnost sloučenin, procentuální složení prvků, periodická tabulka a koncentrace roztoků.',
    tool_unit_title: 'Vědecký Převodník Jednotek',
    tool_unit_desc: 'SI jednotky, imperiální míry, tlak, teplota, energie a digitální data.',

    tool_curr_title: 'Měnový Konvertor & Sledování Krypto',
    tool_curr_desc: 'Konvertor fiat měn (offline cache) a live sledování cen kryptoměn (BTC, ETH, SOL...) v reálném čase.',
    tool_loan_title: 'Hypotéky & Úvěrová Kalkulačka',
    tool_loan_desc: 'Anuitní splátky, úrokové přirážky, poměr jistina/úrok a CSV splátkový kalendář.',

    tool_pass_title: 'Generátor Bezpečných Hesel',
    tool_pass_desc: 'Kryptografická hesla a zapamatovatelné víceslovné fráze (Passphrase) s výpočtem entropie.',
    tool_qr_title: 'Generátor QR Kódů',
    tool_qr_desc: 'Okamžitá offline tvorba QR kódů pro webové adresy, Wi-Fi sítě a texty s exportem do PNG.',
    tool_regex_title: 'RegEx Tester & Base64 / URL',
    tool_regex_desc: 'Testování regulárních výrazů se skupinami a obousměrné kódování Base64 i URL.',
    tool_time_title: 'Světový Čas & Pomodoro',
    tool_time_desc: 'Světové hodiny pro globální města a produktivní časovač soustředění Pomodoro s audio notifikací.',
    tool_json_title: 'JSON Formátovač & Validátor',
    tool_json_desc: 'Odsazení, minifikace a okamžitá syntaktická kontrola struktur.',
    tool_trans_title: 'Hybridní Překladač',
    tool_trans_desc: 'Ukázka online modulu s automatickou detekcí síťového připojení.',

    tool_function_grapher_title: 'Generátor Grafů Funkcí 2D',
    tool_function_grapher_desc: 'Interaktivní vykreslování funkcí f(x), g(x), h(x), posun tažením, zoom, tečna a export grafu do PNG.',
    tool_latex_visualizer_title: 'LaTeX Matematický Vizualizátor',
    tool_latex_visualizer_desc: 'Živý náhled matematických vzorců, rychlé vkládání symbolů, export do SVG/MathML a knihovna rovnic.',
    tool_color_palette_wcag_title: 'Paletka Barev & WCAG Validátor',
    tool_color_palette_wcag_desc: 'Generování harmonických palet barev, převody formátů HEX/RGB/HSL a ověření přístupnosti WCAG 2.1 (AA/AAA).',
    tool_system_monitor_title: 'Systémový Hardware Monitor',
    tool_system_monitor_desc: 'Nativní telemetrie CPU jader, využití RAM a disků přes Tauri Rust IPC (sysinfo) bez režie Electronu.',
  },

  en: {
    cat_all: 'All Tools',
    cat_favorites: 'Favorites',
    cat_files: 'Files & Documents',
    cat_math: 'Mathematics & Calculators',
    cat_science: 'Science & Chemistry',
    cat_finance: 'Finance & Crypto',
    cat_utilities: 'Utilities & Tools',
    cat_architecture: 'Tauri & Code',
    categories: 'Tool Categories',

    search_placeholder: 'Quick search tools... Ctrl+K',
    search_modal_placeholder: 'Search tools (e.g. docx, qr, password, matrix)...',
    connectivity_status: 'Connectivity Status',
    simulate_offline: 'Simulate Offline Mode',
    disable_simulation: 'Disable Simulation',
    online: 'Online',
    offline: 'Offline',
    offline_badge: '100% Offline / No Uploads',
    online_badge: 'Requires Online Connection',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    saved: 'Saved',
    open: 'Open',
    back: 'Back',
    in_favorites: 'In Favorites',
    add_favorite: 'Add to Favorites',
    reset_defaults: 'Reset to Defaults',
    local_config: 'Local JSON Configuration',
    no_tools_found: 'No tools match your query',
    catalog: 'Tools Catalog',

    tool_multi_title: 'Multi-Format Converter',
    tool_multi_desc: 'Universal conversion of documents (DOCX, MD, TXT -> PDF), data (CSV <-> JSON) and images (WebP, PNG, JPG).',
    tool_docx_title: 'DOCX to PDF Converter',
    tool_docx_desc: '100% offline Word document to PDF conversion in local device memory.',
    tool_diff_title: 'Text & File Diff Checker',
    tool_diff_desc: 'Visual side-by-side comparison of two texts or config files with line change detection.',
    tool_inspector_title: 'File Inspector & Hasher',
    tool_inspector_desc: 'Cryptographic SHA-256 checksums, MIME type detection and binary hex inspection.',

    tool_calc_title: 'Standard & Scientific Calculator',
    tool_calc_desc: 'Standard and scientific modes, trigonometry, powers, memory (M+/MR) and calculation history.',
    tool_matrix_title: 'Matrix Calculator (Custom Dimensions)',
    tool_matrix_desc: 'Determinants, inverses, matrix multiplication A × B, and transposes for arbitrary M × N dimensions.',
    tool_stats_title: 'Statistics & Data Analysis',
    tool_stats_desc: 'Mean, median, mode, sample variance, standard deviation, quartiles, and histogram.',
    tool_comb_title: 'Combinatorics & Number Theory',
    tool_comb_desc: 'Permutations, combinations, variations, Euclidean GCD/LCM, and prime factorization.',

    tool_chem_title: 'Chemistry & Molecular Calculator',
    tool_chem_desc: 'Molecular mass of compounds, elemental mass breakdown, periodic table, and solution molarity.',
    tool_unit_title: 'Scientific Unit Converter',
    tool_unit_desc: 'SI units, imperial measures, pressure, temperature, energy, and digital storage.',

    tool_curr_title: 'Currency Converter & Crypto Tracker',
    tool_curr_desc: 'Fiat currency converter with offline cached rates and live real-time cryptocurrency price tracker.',
    tool_loan_title: 'Mortgage & Loan Calculator',
    tool_loan_desc: 'Annuity payments, interest breakdown, principal-to-interest ratios and CSV amortization schedules.',

    tool_pass_title: 'Secure Password Generator',
    tool_pass_desc: 'Cryptographically secure passwords and memorable multi-word passphrases with entropy scores.',
    tool_qr_title: 'QR Code Generator',
    tool_qr_desc: 'Instant offline QR code generation for websites, Wi-Fi networks and text with PNG export.',
    tool_regex_title: 'RegEx Tester & Base64 / URL',
    tool_regex_desc: 'Live regular expression testing with capture groups and bidirectional Base64/URL encoding.',
    tool_time_title: 'World Clock & Pomodoro',
    tool_time_desc: 'World clocks for global time zones and a Pomodoro productivity focus timer with audio cues.',
    tool_json_title: 'JSON Formatter & Validator',
    tool_json_desc: 'Indentation formatting, minification, and instant syntax validation.',
    tool_trans_title: 'Hybrid Translator',
    tool_trans_desc: 'Demonstration of an online translation module with automatic connectivity fallback.',

    tool_function_grapher_title: '2D Function Grapher & Plotter',
    tool_function_grapher_desc: 'Interactive multi-function graphing, pan & zoom canvas, tangent slopes, and PNG export.',
    tool_latex_visualizer_title: 'LaTeX Math Formula Visualizer',
    tool_latex_visualizer_desc: 'Real-time formula rendering, quick-insert symbol bar, SVG export, and library of famous equations.',
    tool_color_palette_wcag_title: 'Color Palette & WCAG Validator',
    tool_color_palette_wcag_desc: 'Harmonious color palettes, color code conversions, and real-time WCAG 2.1 accessibility auditing.',
    tool_system_monitor_title: 'System Hardware Monitor',
    tool_system_monitor_desc: 'Native telemetry of CPU cores, RAM and disks via Tauri Rust IPC without Electron RAM bloat.',
  },

  de: {
    cat_all: 'Alle Werkzeuge',
    cat_favorites: 'Favoriten',
    cat_files: 'Dateien & Dokumente',
    cat_math: 'Mathematik & Rechner',
    cat_science: 'Wissenschaft & Chemie',
    cat_finance: 'Finanzen & Krypto',
    cat_utilities: 'Dienstprogramme',
    cat_architecture: 'Tauri & Quellcode',
    categories: 'Werkzeugkategorien',

    search_placeholder: 'Werkzeuge durchsuchen... Strg+K',
    search_modal_placeholder: 'Werkzeug suchen (z.B. docx, qr, passwort)...',
    connectivity_status: 'Verbindungsstatus',
    simulate_offline: 'Offline-Modus simulieren',
    disable_simulation: 'Simulation beenden',
    online: 'Online',
    offline: 'Offline',
    offline_badge: '100% Offline / Kein Upload',
    online_badge: 'Online-Verbindung erforderlich',
    copy: 'Kopieren',
    copied: 'Kopiert',
    download: 'Herunterladen',
    saved: 'Gespeichert',
    open: 'Öffnen',
    back: 'Zurück',
    in_favorites: 'In Favoriten',
    add_favorite: 'Zu Favoriten hinzufügen',
    reset_defaults: 'Zurücksetzen',
    local_config: 'Lokale JSON-Konfiguration',
    no_tools_found: 'Keine Werkzeuge gefunden',
    catalog: 'Werkzeugkatalog',

    tool_multi_title: 'Multi-Format-Konverter',
    tool_multi_desc: 'Konvertierung von Dokumenten (DOCX, MD, TXT -> PDF), Daten (CSV <-> JSON) und Bildern.',
    tool_docx_title: 'DOCX-zu-PDF-Konverter',
    tool_docx_desc: '100% offline Word-zu-PDF-Konvertierung direkt im Gerätespeicher.',
    tool_diff_title: 'Text- und Datei-Diff-Vergleich',
    tool_diff_desc: 'Visueller Vergleich zweier Texte oder Konfigurationsdateien Zeile für Zeile.',
    tool_inspector_title: 'Datei-Inspektor & Hash',
    tool_inspector_desc: 'Kryptografische SHA-256-Prüfsummen, MIME-Erkennung und binärer Hex-Dump.',

    tool_calc_title: 'Standard- & Wissenschaftsrechner',
    tool_calc_desc: 'Standard- und wissenschaftlicher Modus, Trigonometrie, Potenzen, Speicher und Verlauf.',
    tool_matrix_title: 'Matrix-Rechner (Benutzerdefinierte Maße)',
    tool_matrix_desc: 'Determinanten, Inverse, Matrizenmultiplikation A × B und Transposition für beliebige Maße.',
    tool_stats_title: 'Statistik & Datenanalyse',
    tool_stats_desc: 'Mittelwert, Median, Modus, Varianz, Standardabweichung, Quartile und Histogramm.',
    tool_comb_title: 'Kombinatorik & Zahlentheorie',
    tool_comb_desc: 'Permutationen, Kombinationen, Variationen, ggT/kgV und Primfaktorzerlegung.',

    tool_chem_title: 'Chemie & Molmassenrechner',
    tool_chem_desc: 'Molmasse von Verbindungen, Elementanteile, Periodensystem und Stoffmengenkonzentration.',
    tool_unit_title: 'Wissenschaftlicher Einheitenrechner',
    tool_unit_desc: 'SI-Einheiten, Druck, Temperatur, Energie und digitale Daten.',

    tool_curr_title: 'Währungsrechner & Krypto-Tracker',
    tool_curr_desc: 'Fiat-Währungsrechner (Offline-Cache) und Live-Kryptopreise in Echtzeit.',
    tool_loan_title: 'Kredit- und Hypothekenrechner',
    tool_loan_desc: 'Annuitätendarlehen, Zinsanteile, Tilgungsplan und CSV-Export.',

    tool_pass_title: 'Sicherer Passwortgenerator',
    tool_pass_desc: 'Kryptografisch sichere Passwörter und einprägsame Passphrasen mit Entropieanzeige.',
    tool_qr_title: 'QR-Code-Generator',
    tool_qr_desc: 'Offline-Erstellung von QR-Codes für URLs, WLAN-Netzwerke und Texte als PNG.',
    tool_regex_title: 'RegEx-Tester & Base64 / URL',
    tool_regex_desc: 'Reguläre Ausdrücke testen mit Capture-Gruppen und Base64/URL-Kodierung.',
    tool_time_title: 'Weltzeituhr & Pomodoro',
    tool_time_desc: 'Weltzeiten und Pomodoro-Fokus-Timer mit akustischem Signal.',
    tool_json_title: 'JSON-Formatierer & Validator',
    tool_json_desc: 'Formatierung, Validierung und Minifizierung von JSON-Daten.',
    tool_trans_title: 'Hybrider Übersetzer',
    tool_trans_desc: 'Online-Übersetzungsmodul mit Offline-Erkennung.',

    tool_function_grapher_title: '2D-Funktionsplotter & Graph-Rechner',
    tool_function_grapher_desc: 'Interaktives Plotten von Funktionen mit Zoom, Tangentenberechnung und PNG-Export.',
    tool_latex_visualizer_title: 'LaTeX Formel-Visualisierer',
    tool_latex_visualizer_desc: 'Echtzeit-Vorschau mathematischer Formeln, Symbolleiste, SVG-Export und Formelsammlung.',
    tool_color_palette_wcag_title: 'Farbpalette & WCAG-Prüfer',
    tool_color_palette_wcag_desc: 'Harmonische Farbpaletten, Format-Konverter und WCAG 2.1 Kontrastprüfung.',
    tool_system_monitor_title: 'System-Hardware-Monitor',
    tool_system_monitor_desc: 'Native Hardware-Telemetrie über Tauri Rust IPC ohne Electron-Overhead.',
  },

  es: {
    cat_all: 'Todas las herramientas',
    cat_favorites: 'Favoritos',
    cat_files: 'Archivos y Documentos',
    cat_math: 'Matemáticas y Cálculo',
    cat_science: 'Ciencia y Química',
    cat_finance: 'Finanzas y Cripto',
    cat_utilities: 'Utilidades',
    cat_architecture: 'Tauri y Código',
    categories: 'Categorías de herramientas',

    search_placeholder: 'Buscar herramientas... Ctrl+K',
    search_modal_placeholder: 'Buscar herramientas (p. ej. docx, qr, contraseña)...',
    connectivity_status: 'Estado de conexión',
    simulate_offline: 'Simular modo sin conexión',
    disable_simulation: 'Desactivar simulación',
    online: 'En línea',
    offline: 'Sin conexión',
    offline_badge: '100% Fuera de línea / Sin envíos',
    online_badge: 'Requiere conexión en línea',
    copy: 'Copiar',
    copied: 'Copiado',
    download: 'Descargar',
    saved: 'Guardado',
    open: 'Abrir',
    back: 'Volver',
    in_favorites: 'En favoritos',
    add_favorite: 'Añadir a favoritos',
    reset_defaults: 'Restablecer',
    local_config: 'Configuración JSON local',
    no_tools_found: 'No se encontraron herramientas',
    catalog: 'Catálogo de herramientas',

    tool_multi_title: 'Convertidor Multi-Formato',
    tool_multi_desc: 'Conversión de documentos (DOCX, MD, TXT -> PDF), datos (CSV <-> JSON) e imágenes (WebP, PNG, JPG).',
    tool_docx_title: 'Convertidor DOCX a PDF',
    tool_docx_desc: 'Conversión 100% offline de documentos Word a PDF en la memoria local.',
    tool_diff_title: 'Comparador de Textos y Archivos (Diff)',
    tool_diff_desc: 'Comparación visual de textos o archivos de configuración línea por línea.',
    tool_inspector_title: 'Inspector de Archivos y Hash',
    tool_inspector_desc: 'Checksums criptográficos SHA-256, tipo MIME y volcado hexadecimal.',

    tool_calc_title: 'Calculadora Estándar y Científica',
    tool_calc_desc: 'Modos estándar y científico, trigonometría, potencias, memoria e historial.',
    tool_matrix_title: 'Calculadora de Matrices (Medidas Personalizadas)',
    tool_matrix_desc: 'Determinantes, inversas, producto de matrices A × B y transposición para dimensiones libres.',
    tool_stats_title: 'Estadística y Análisis de Datos',
    tool_stats_desc: 'Media, mediana, moda, varianza muestral, desviación típica, cuartiles e histograma.',
    tool_comb_title: 'Combinatoria y Teoría de Números',
    tool_comb_desc: 'Permutaciones, combinaciones, variaciones, MCD/MCM y factorización en primos.',

    tool_chem_title: 'Química y Calculadora Molecular',
    tool_chem_desc: 'Masa molecular de compuestos, porcentaje elemental, tabla periódica y molaridad.',
    tool_unit_title: 'Convertidor Científico de Unidades',
    tool_unit_desc: 'Unidades SI, medidas imperiales, presión, temperatura, energía y datos digitales.',

    tool_curr_title: 'Conversor de Monedas y Cripto',
    tool_curr_desc: 'Conversor fiat con caché offline y seguimiento de precios cripto en tiempo real.',
    tool_loan_title: 'Calculadora de Préstamos e Hipotecas',
    tool_loan_desc: 'Cuotas de amortización, cálculo de intereses y tabla descargable en CSV.',

    tool_pass_title: 'Generador de Contraseñas Seguras',
    tool_pass_desc: 'Contraseñas criptográficas y frases memorables con cálculo de entropía.',
    tool_qr_title: 'Generador de Códigos QR',
    tool_qr_desc: 'Generación offline de códigos QR para enlaces web, redes Wi-Fi y textos en PNG.',
    tool_regex_title: 'Probador de RegEx y Base64 / URL',
    tool_regex_desc: 'Prueba de expresiones regulares y codificación bidireccional Base64/URL.',
    tool_time_title: 'Reloj Mundial y Pomodoro',
    tool_time_desc: 'Horas mundiales y temporizador de productividad Pomodoro con sonido.',
    tool_json_title: 'Formateador y Validador JSON',
    tool_json_desc: 'Formateo con sangría, minificación y validación sintáctica de JSON.',
    tool_trans_title: 'Traductor Híbrido',
    tool_trans_desc: 'Módulo de traducción en línea con detección de conectividad.',

    tool_function_grapher_title: 'Graficador de Funciones 2D',
    tool_function_grapher_desc: 'Trazado interactivo de múltiples funciones f(x), zoom con ratón, tangente y exportación PNG.',
    tool_latex_visualizer_title: 'Visualizador de Fórmulas LaTeX',
    tool_latex_visualizer_desc: 'Previsualización en vivo, barra de símbolos, exportación SVG y biblioteca de fórmulas.',
    tool_color_palette_wcag_title: 'Paleta de Colores y Validador WCAG',
    tool_color_palette_wcag_desc: 'Paletas armónicas, conversor HEX/RGB/HSL y verificación de contraste WCAG 2.1.',
    tool_system_monitor_title: 'Monitor de Hardware del Sistema',
    tool_system_monitor_desc: 'Telemetría nativa de núcleos CPU, RAM y discos mediante Tauri Rust IPC.',
  },

  ru: {
    cat_all: 'Все инструменты',
    cat_favorites: 'Избранное',
    cat_files: 'Файлы и Документы',
    cat_math: 'Математика и Калькуляторы',
    cat_science: 'Наука и Химия',
    cat_finance: 'Финансы и Криптовалюты',
    cat_utilities: 'Утилиты и Инструменты',
    cat_architecture: 'Tauri и Код',
    categories: 'Категории инструментов',

    search_placeholder: 'Быстрый поиск инструментов... Ctrl+K',
    search_modal_placeholder: 'Поиск (например: docx, qr, пароль, матрица)...',
    connectivity_status: 'Статус подключения',
    simulate_offline: 'Имитировать офлайн-режим',
    disable_simulation: 'Отключить имитацию',
    online: 'Онлайн',
    offline: 'Офлайн',
    offline_badge: '100% Офлайн / Без отправки данных',
    online_badge: 'Требуется подключение к сети',
    copy: 'Копировать',
    copied: 'Скопировано',
    download: 'Скачать',
    saved: 'Сохранено',
    open: 'Открыть',
    back: 'Назад',
    in_favorites: 'В избранном',
    add_favorite: 'В избранное',
    reset_defaults: 'Сбросить по умолчанию',
    local_config: 'Локальная конфигурация JSON',
    no_tools_found: 'Инструменты не найдены',
    catalog: 'Каталог инструментов',

    tool_multi_title: 'Мультиформатный Конвертер',
    tool_multi_desc: 'Универсальное преобразование документов (DOCX, MD, TXT -> PDF), данных (CSV <-> JSON) и изображений (WebP, PNG, JPG).',
    tool_docx_title: 'Конвертер DOCX в PDF',
    tool_docx_desc: '100% локальное преобразование документов Word в PDF прямо в памяти устройства.',
    tool_diff_title: 'Сравнение Текстов и Файлов (Diff)',
    tool_diff_desc: 'Построчное визуальное сравнение двух версий текста или конфигураций с подсветкой изменений.',
    tool_inspector_title: 'Инспектор Файлов и Хэшей',
    tool_inspector_desc: 'Криптографические контрольные суммы SHA-256, MIME-тип и шестнадцатеричный hex dump.',

    tool_calc_title: 'Обычный и Научный Калькулятор',
    tool_calc_desc: 'Обычный и инженерный режимы, тригонометрия, степени, память (M+/MR) и история вычислений.',
    tool_matrix_title: 'Матричный Калькулятор (Свои размеры)',
    tool_matrix_desc: 'Определители, обратные матрицы, умножение A × B и транспонирование для произвольных размеров M × N.',
    tool_stats_title: 'Статистика и Анализ Данных',
    tool_stats_desc: 'Среднее, медиана, мода, выборочная дисперсия, стандартное отклонение, квартили и гистограмма.',
    tool_comb_title: 'Комбинаторика и Теория Чисел',
    tool_comb_desc: 'Перестановки, сочетания, размещения, алгоритм Евклида (НОД и НОК) и факторизация чисел.',

    tool_chem_title: 'Химия и Молярный Калькулятор',
    tool_chem_desc: 'Молярная масса соединений, массовые доли элементов, периодическая таблица и концентрация растворов.',
    tool_unit_title: 'Научный Конвертер Единиц',
    tool_unit_desc: 'Единицы СИ, имперские меры, давление, температура, энергия и объем цифровых данных.',

    tool_curr_title: 'Конвертер Валют и Крипто-Трекер',
    tool_curr_desc: 'Конвертер фиатных валют с офлайн-кэшем и отслеживание курсов криптовалют (BTC, ETH, SOL...) в реальном времени.',
    tool_loan_title: 'Кредитный и Ипотечный Калькулятор',
    tool_loan_desc: 'Аннуитетные платежи, переплата по процентам, график амортизации и экспорт в CSV.',

    tool_pass_title: 'Генератор Надежных Паролей',
    tool_pass_desc: 'Криптографически стойкие пароли и запоминающиеся кодовые фразы с оценкой энтропии в битах.',
    tool_qr_title: 'Генератор QR-Кодов',
    tool_qr_desc: 'Мгновенное офлайн-создание QR-кодов для ссылок, Wi-Fi сетей и текстов с экспортом в PNG.',
    tool_regex_title: 'Тестер RegEx и Base64 / URL',
    tool_regex_desc: 'Тестирование регулярных выражений с группами захвата и двустороннее кодирование Base64/URL.',
    tool_time_title: 'Мировое Время и Помодоро',
    tool_time_desc: 'Мировые часы для ключевых часовых поясов и таймер продуктивности Pomodoro со звуковым сигналом.',
    tool_json_title: 'Форматировщик и Валидатор JSON',
    tool_json_desc: 'Форматирование с отступами, минификация и мгновенная проверка синтаксиса JSON.',
    tool_trans_title: 'Гибридный Переводчик',
    tool_trans_desc: 'Демонстрация онлайн-модуля перевода с автоматической проверкой сети.',

    tool_function_grapher_title: '2D Графопостроитель Функций',
    tool_function_grapher_desc: 'Интерактивное построение функций f(x), g(x), масштабирование, касательная и экспорт в PNG.',
    tool_latex_visualizer_title: 'LaTeX Визуализатор Формул',
    tool_latex_visualizer_desc: 'Живой предпросмотр формул, быстрый ввод символов, экспорт в SVG/MathML и библиотека уравнений.',
    tool_color_palette_wcag_title: 'Палитра Цветов & WCAG Валидатор',
    tool_color_palette_wcag_desc: 'Генератор гармоничных палитр, конвертер форматов и проверка контрастности WCAG 2.1.',
    tool_system_monitor_title: 'Монитор Системных Ресурсов',
    tool_system_monitor_desc: 'Нативная телеметрия ядер CPU, памяти RAM и дисков через Tauri Rust IPC (sysinfo).',
  },
};

interface I18nContextType {
  language: SupportedLanguage;
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'cs',
  currentLanguage: 'cs',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('omnidesk_language') as SupportedLanguage;
      if (saved && ['cs', 'en', 'de', 'es', 'ru'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'cs';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('omnidesk_language', lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict && enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, currentLanguage: language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
