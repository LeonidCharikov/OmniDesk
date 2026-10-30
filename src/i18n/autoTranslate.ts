import { SupportedLanguage } from './context';

// Comprehensive dictionary of phrases, buttons, and terms from Czech to target languages
const DICTIONARY: Record<string, Record<Exclude<SupportedLanguage, 'cs'>, string>> = {
  // Common UI Buttons & Badges
  'Tmavé': { ru: 'Темная', en: 'Dark', de: 'Dunkel', es: 'Oscuro' },
  'Světlé': { ru: 'Светлая', en: 'Light', de: 'Hell', es: 'Claro' },
  'Vymazat': { ru: 'Очистить', en: 'Clear', de: 'Löschen', es: 'Borrar' },
  'Vyčistit': { ru: 'Очистить', en: 'Clear', de: 'Bereinigen', es: 'Limpiar' },
  'Kopírovat': { ru: 'Копировать', en: 'Copy', de: 'Kopieren', es: 'Copiar' },
  'Zkopírováno': { ru: 'Скопировано', en: 'Copied', de: 'Kopiert', es: 'Copiado' },
  'Stáhnout': { ru: 'Скачать', en: 'Download', de: 'Herunterladen', es: 'Descargar' },
  'Uložit': { ru: 'Сохранить', en: 'Save', de: 'Speichern', es: 'Guardar' },
  'Zpět': { ru: 'Назад', en: 'Back', de: 'Zurück', es: 'Volver' },
  'Zavřít': { ru: 'Закрыть', en: 'Close', de: 'Schließen', es: 'Cerrar' },
  'Smazat': { ru: 'Удалить', en: 'Delete', de: 'Löschen', es: 'Eliminar' },
  'Resetovat': { ru: 'Сбросить', en: 'Reset', de: 'Zurücksetzen', es: 'Restablecer' },
  'Vypočítat': { ru: 'Вычислить', en: 'Calculate', de: 'Berechnen', es: 'Calcular' },
  'Náhodná barva': { ru: 'Случайный цвет', en: 'Random color', de: 'Zufällige Farbe', es: 'Color aleatorio' },
  '100% Offline / Bez odesílání': { ru: '100% Офлайн / Без отправки данных', en: '100% Offline / Local Only', de: '100% Offline / Keine Datenübertragung', es: '100% Offline / Sin envío de datos' },
  'Vyzkoušet na ukázkovém dokumentu': { ru: 'Попробовать на примере документа', en: 'Try sample document', de: 'Beispieldokument ausprobieren', es: 'Probar con documento de ejemplo' },

  // LaTeX & Mathematical Visualizer
  'Kopírovat LaTeX': { ru: 'Копировать LaTeX', en: 'Copy LaTeX', de: 'LaTeX kopieren', es: 'Copiar LaTeX' },
  'Stáhnout SVG': { ru: 'Скачать SVG', en: 'Download SVG', de: 'SVG herunterladen', es: 'Descargar SVG' },
  'RYCHLÉ VLOŽENÍ MATEMATICKÝCH SYMBOLŮ A STRUKTUR': { ru: 'БЫСТРАЯ ВСТАВКА МАТЕМАТИЧЕСКИХ СИМВОЛОВ И СТРУКТУР', en: 'QUICK INSERT MATH SYMBOLS & STRUCTURES', de: 'SCHNELLES EINFÜGEN MATHEMATISCHER SYMBOLE', es: 'INSERCIÓN RÁPIDA DE SÍMBOLOS MATEMÁTICOS' },
  'Rychlé vložení matematických symbolů a struktur': { ru: 'Быстрая вставка математических символов и структур', en: 'Quick insert math symbols & structures', de: 'Schnelles Einfügen mathematischer Symbole', es: 'Inserción rápida de símbolos matemáticos' },
  'KNIHOVNA SLAVNÝCH VZORCŮ': { ru: 'БИБЛИОТЕКА ИЗВЕСТНЫХ ФОРМУЛ', en: 'LIBRARY OF FAMOUS FORMULAS', de: 'BIBLIOTHEK BERÜHMTER FORMELN', es: 'BIBLIOTECA DE FÓRMULAS FAMOSAS' },
  'Knihovna slavných vzorců': { ru: 'Библиотека известных формул', en: 'Library of famous formulas', de: 'Bibliothek berühmter Formeln', es: 'Biblioteca de fórmulas famosas' },
  'LATEX KÓD': { ru: 'КОД LATEX', en: 'LATEX CODE', de: 'LATEX CODE', es: 'CÓDIGO LATEX' },
  'LaTeX Kód': { ru: 'Код LaTeX', en: 'LaTeX Code', de: 'LaTeX-Code', es: 'Código LaTeX' },
  'Zadejte matematický vzorec v LaTeXu...': { ru: 'Введите математическую формулу в LaTeX...', en: 'Enter math formula in LaTeX...', de: 'Mathematische Formel in LaTeX eingeben...', es: 'Introduzca fórmula matemática en LaTeX...' },
  'Zadejte vzorec v syntaxi LaTeX níže...': { ru: 'Введите формулу в синтаксисе LaTeX ниже...', en: 'Enter formula in LaTeX syntax below...', de: 'Geben Sie unten eine Formel in LaTeX ein...', es: 'Introduzca la fórmula en sintaxis LaTeX abajo...' },
  'Zmenšit': { ru: 'Уменьшить', en: 'Zoom Out', de: 'Verkleinern', es: 'Reducir' },
  'Zvětšit': { ru: 'Увеличить', en: 'Zoom In', de: 'Vergrößern', es: 'Aumentar' },
  'Kvadratická rovnice': { ru: 'Квадратное уравнение', en: 'Quadratic equation', de: 'Quadratische Gleichung', es: 'Ecuación cuadrática' },
  'Eulerova identita': { ru: 'Тождество Эйлера', en: 'Euler identity', de: 'Eulersche Identität', es: 'Identidad de Euler' },
  'Gaussovo normální rozdělení': { ru: 'Нормальное распределение Гаусса', en: 'Gaussian normal distribution', de: 'Gaußsche Normalverteilung', es: 'Distribución normal de Gauss' },
  'Schrödingerova rovnice': { ru: 'Уравнение Шрёдингера', en: 'Schrödinger equation', de: 'Schrödinger-Gleichung', es: 'Ecuación de Schrödinger' },
  'Einsteinova ekvivalence hmoty a energie': { ru: 'Эквивалентность массы и энергии', en: 'Mass-energy equivalence', de: 'Äquivalenz von Masse und Energie', es: 'Equivalencia masa-energía' },
  'Bayesův teorém': { ru: 'Теорема Байеса', en: 'Bayes theorem', de: 'Satz von Bayes', es: 'Teorema de Bayes' },
  'Maticový součin (2×2)': { ru: 'Матричное произведение (2×2)', en: 'Matrix product (2×2)', de: 'Matrixmultiplikation (2×2)', es: 'Producto matricial (2×2)' },
  'Určitý integrál (Fourier)': { ru: 'Определенный интеграл (Фурье)', en: 'Definite integral (Fourier)', de: 'Bestimmtes Integral (Fourier)', es: 'Integral definida (Fourier)' },
  'Zlomek': { ru: 'Дробь', en: 'Fraction', de: 'Bruch', es: 'Fracción' },
  'Mocnina': { ru: 'Степень', en: 'Power', de: 'Potenz', es: 'Potencia' },
  'Index': { ru: 'Индекс', en: 'Subscript', de: 'Index', es: 'Subíndice' },
  'Odmocnina': { ru: 'Квадратный корень', en: 'Square root', de: 'Quadratwurzel', es: 'Raíz cuadrada' },
  'N-tá odmocnina': { ru: 'Корень n-й степени', en: 'N-th root', de: 'N-te Wurzel', es: 'Raíz n-ésima' },
  'Určitý integrál': { ru: 'Определенный интеграл', en: 'Definite integral', de: 'Bestimmtes Integral', es: 'Integral definida' },
  'Suma': { ru: 'Сумма', en: 'Sum', de: 'Summe', es: 'Suma' },
  'Součin': { ru: 'Произведение', en: 'Product', de: 'Produkt', es: 'Producto' },
  'Limita': { ru: 'Предел', en: 'Limit', de: 'Grenzwert', es: 'Límite' },
  'Derivace': { ru: 'Производная', en: 'Derivative', de: 'Ableitung', es: 'Derivada' },
  'Parciální derivace': { ru: 'Частная производная', en: 'Partial derivative', de: 'Partielle Ableitung', es: 'Derivada parcial' },
  'Nekonečno': { ru: 'Бесконечность', en: 'Infinity', de: 'Unendlich', es: 'Infinito' },
  'Plus mínus': { ru: 'Плюс-минус', en: 'Plus-minus', de: 'Plus-Minus', es: 'Más o menos' },
  'Matice': { ru: 'Матрица', en: 'Matrix', de: 'Matrix', es: 'Matriz' },
  'Dynamické závorky': { ru: 'Динамические скобки', en: 'Dynamic brackets', de: 'Dynamische Klammern', es: 'Paréntesis dinámicos' },

  // DOCX to PDF Tool
  'Offline DOCX → PDF Konvertor': { ru: 'Офлайн DOCX → PDF Конвертер', en: 'Offline DOCX → PDF Converter', de: 'Offline DOCX → PDF Konverter', es: 'Conversor Offline DOCX → PDF' },
  'Offline DOCX -> PDF Konvertor': { ru: 'Офлайн DOCX → PDF Конвертер', en: 'Offline DOCX → PDF Converter', de: 'Offline DOCX → PDF Konverter', es: 'Conversor Offline DOCX → PDF' },
  'Konverze probíhá přímo v paměti přes WebAssembly parser. Žádný bajt neopustí váš počítač.': {
    ru: 'Конвертация происходит прямо в памяти через WebAssembly парсер. Ни одного байта не покидает ваше устройство.',
    en: 'Conversion runs directly in memory via WebAssembly parser. Zero bytes leave your machine.',
    de: 'Die Konvertierung läuft direkt im Speicher über einen WebAssembly-Parser. Kein Byte verlässt Ihr Gerät.',
    es: 'La conversión se ejecuta en memoria mediante el analizador WebAssembly. Ningún dato sale de su equipo.',
  },
  'Přetáhněte sem soubor .docx nebo klikněte pro výběr': {
    ru: 'Перетащите сюда файл .docx или нажмите для выбора',
    en: 'Drag & drop .docx file here or click to select',
    de: 'Ziehen Sie die .docx-Datei hierher oder klicken Sie zur Auswahl',
    es: 'Arrastre el archivo .docx aquí o haga clic para seleccionar',
  },
  'Podporuje standardní Microsoft Word dokumenty i čisté textové soubory.': {
    ru: 'Поддерживает стандартные документы Microsoft Word и текстовые файлы.',
    en: 'Supports standard Microsoft Word documents and plain text files.',
    de: 'Unterstützt Standard-Microsoft-Word-Dokumente und reine Textdateien.',
    es: 'Compatible con documentos estándar de Microsoft Word y archivos de texto plano.',
  },
  'Generuji PDF dokument v lokální paměti...': {
    ru: 'Генерация PDF документа в локальной памяти...',
    en: 'Generating PDF in local memory...',
    de: 'PDF-Dokument wird im lokalen Speicher generiert...',
    es: 'Generando documento PDF en memoria local...',
  },
  'Doba konverze': { ru: 'Время конвертации', en: 'Conversion time', de: 'Konvertierungszeit', es: 'Tiempo de conversión' },
  'Počet stran PDF': { ru: 'Страниц PDF', en: 'PDF pages', de: 'PDF-Seiten', es: 'Páginas PDF' },
  'Počet slov': { ru: 'Количество слов', en: 'Word count', de: 'Wortanzahl', es: 'Cantidad de palabras' },
  'Počet znaků': { ru: 'Количество символов', en: 'Character count', de: 'Zeichenanzahl', es: 'Cantidad de caracteres' },
  'PDF je připraveno ke stažení a náhledu': {
    ru: 'PDF готов к скачиванию и предпросмотру',
    en: 'PDF is ready for download and preview',
    de: 'PDF ist bereit zum Herunterladen und zur Vorschau',
    es: 'El PDF está listo para descargar y previsualizar',
  },
  'Stáhnout PDF': { ru: 'Скачать PDF', en: 'Download PDF', de: 'PDF herunterladen', es: 'Descargar PDF' },
  'Náhled PDF': { ru: 'Предпросмотр PDF', en: 'PDF preview', de: 'PDF-Vorschau', es: 'Vista previa de PDF' },

  // Matrix Calculator
  'Transpozice Aᵀ': { ru: 'Транспонирование Aᵀ', en: 'Transpose Aᵀ', de: 'Transposition Aᵀ', es: 'Transposición Aᵀ' },
  'Inverze A⁻¹': { ru: 'Обратная A⁻¹', en: 'Inverse A⁻¹', de: 'Inverse A⁻¹', es: 'Inversa A⁻¹' },
  'Transpozice Bᵀ': { ru: 'Транспонирование Bᵀ', en: 'Transpose Bᵀ', de: 'Transposition Bᵀ', es: 'Transposición Bᵀ' },
  'Inverze B⁻¹': { ru: 'Обратная B⁻¹', en: 'Inverse B⁻¹', de: 'Inverse B⁻¹', es: 'Inversa B⁻¹' },
  'Transpozice': { ru: 'Транспонирование', en: 'Transpose', de: 'Transposition', es: 'Transposición' },
  'Inverze': { ru: 'Обратная матрица', en: 'Inverse', de: 'Inverse', es: 'Inversa' },
  'Kompatibilní': { ru: 'Совместимы', en: 'Compatible', de: 'Kompatibel', es: 'Compatible' },
  'Nelze': { ru: 'Несовместимы', en: 'Incompatible', de: 'Nicht möglich', es: 'No compatible' },
  'Sloupce': { ru: 'Столбцы', en: 'Columns', de: 'Spalten', es: 'Columnas' },
  'Řádky': { ru: 'Строки', en: 'Rows', de: 'Zeilen', es: 'Filas' },
  'Stejný rozměr': { ru: 'Одинаковый размер', en: 'Same dimension', de: 'Gleiche Dimension', es: 'Misma dimensión' },
  'Různé rozměry': { ru: 'Разные размеры', en: 'Different dimensions', de: 'Unterschiedliche Dimensionen', es: 'Dimensiones diferentes' },
  'Sčítání A ± B': { ru: 'Сложение A ± B', en: 'Addition A ± B', de: 'Addition A ± B', es: 'Suma A ± B' },
  'Jednotková (I)': { ru: 'Единичная (I)', en: 'Identity (I)', de: 'Einheitsmatrix (I)', es: 'Identidad (I)' },
  'Nulovat': { ru: 'Обнулить', en: 'Zero out', de: 'Nullen', es: 'Poner a cero' },
  'Náhodná': { ru: 'Случайная', en: 'Random', de: 'Zufällig', es: 'Aleatoria' },
  'Prohodit A ↔ B': { ru: 'Поменять A ↔ B', en: 'Swap A ↔ B', de: 'Tauschen A ↔ B', es: 'Intercambiar A ↔ B' },
  'Prohodit matici A a matici B': { ru: 'Поменять местами матрицу A и B', en: 'Swap matrix A and matrix B', de: 'Matrix A und Matrix B tauschen', es: 'Intercambiar matriz A y matriz B' },
  'Maticové Binární Operace (A a B)': { ru: 'Бинарные операции над матрицами (A и B)', en: 'Matrix Binary Operations (A and B)', de: 'Binäre Matrixoperationen (A und B)', es: 'Operaciones Binarias de Matrices (A y B)' },
  'Skalár k:': { ru: 'Скаляр k:', en: 'Scalar k:', de: 'Skalar k:', es: 'Escalar k:' },
  'Násobení A × B': { ru: 'Умножение A × B', en: 'Multiplication A × B', de: 'Multiplikation A × B', es: 'Multiplicación A × B' },
  'Násobení B × A': { ru: 'Умножение B × A', en: 'Multiplication B × A', de: 'Multiplikation B × A', es: 'Multiplicación B × A' },
  'Součet (A + B)': { ru: 'Сложение (A + B)', en: 'Addition (A + B)', de: 'Addition (A + B)', es: 'Suma (A + B)' },
  'Rozdíl (A - B)': { ru: 'Вычитание (A - B)', en: 'Subtraction (A - B)', de: 'Subtraktion (A - B)', es: 'Resta (A - B)' },
  'Kopírovat výsledek': { ru: 'Копировать результат', en: 'Copy result', de: 'Ergebnis kopieren', es: 'Copiar resultado' },
  'Skalární hodnota:': { ru: 'Скалярное значение:', en: 'Scalar value:', de: 'Skalarwert:', es: 'Valor escalar:' },

  // Function Grapher
  'Generátor & Vykreslovač Grafů Funkcí 2D': { ru: '2D Графопостроитель Функций', en: '2D Function Graph Plotter', de: '2D-Funktionsgraphen-Plotter', es: 'Trazador Gráfico de Funciones 2D' },
  'Interaktivní vykreslování více funkcí f(x), g(x), h(x), posun tažením myší, zoom, tečna a export grafu do PNG.': {
    ru: 'Интерактивное построение функций f(x), g(x), перемещение мышью, зум, касательная и экспорт в PNG.',
    en: 'Interactive multi-function graphing f(x), g(x), mouse panning, zoom, tangent line and PNG export.',
    de: 'Interaktives Zeichnen mehrerer Funktionen f(x), Verschieben mit der Maus, Zoom, Tangente und PNG-Export.',
    es: 'Trazado interactivo de múltiples funciones f(x), zoom con ratón, tangente y exportación PNG.',
  },
  'Přiblížit (Zoom In)': { ru: 'Приблизить (Zoom In)', en: 'Zoom In', de: 'Vergrößern', es: 'Acercar' },
  'Oddálit (Zoom Out)': { ru: 'Отдалить (Zoom Out)', en: 'Zoom Out', de: 'Verkleinern', es: 'Alejar' },
  'Resetovat zobrazení (0,0)': { ru: 'Сбросить вид (0,0)', en: 'Reset view (0,0)', de: 'Ansicht zurücksetzen (0,0)', es: 'Restablecer vista (0,0)' },
  'Stáhnout graf ve formátu PNG': { ru: 'Скачать график в формате PNG', en: 'Download graph as PNG', de: 'Diagramm als PNG herunterladen', es: 'Descargar gráfico en PNG' },
  'Aktivní Funkční Výrazy': { ru: 'Активные функции', en: 'Active Function Expressions', de: 'Aktive Funktionsausdrücke', es: 'Expresiones de Función Activas' },
  'Skrýt funkci': { ru: 'Скрыть функцию', en: 'Hide function', de: 'Funktion ausblenden', es: 'Ocultar función' },
  'Zobrazit funkci': { ru: 'Показать функцию', en: 'Show function', de: 'Funktion anzeigen', es: 'Mostrar función' },
  'Inspektor Bodu & Tečna f(x)': { ru: 'Инспектор точки и касательная f(x)', en: 'Point Inspector & Tangent f(x)', de: 'Punkt-Inspektor & Tangente f(x)', es: 'Inspector de Puntos y Tangente f(x)' },
  'Zkoumaný bod x₀:': { ru: 'Исследуемая точка x₀:', en: 'Inspected point x₀:', de: 'Untersuchter Punkt x₀:', es: 'Punto investigado x₀:' },
  'Směrnice tečny f\'(x₀):': { ru: 'Угловой коэффициент касательной f\'(x₀):', en: 'Tangent slope f\'(x₀):', de: 'Tangentensteigung f\'(x₀):', es: 'Pendiente de la tangente f\'(x₀):' },
  'Žlutý bod na grafu zobrazuje polohu [x₀, f(x₀)] a čárkovaná linie znázorňuje tečnu funkce v daném bodě.': {
    ru: 'Желтая точка на графике показывает [x₀, f(x₀)], а пунктирная линия отображает касательную в этой точке.',
    en: 'Yellow point on graph shows [x₀, f(x₀)] and dashed line shows the tangent at that point.',
    de: 'Der gelbe Punkt zeigt [x₀, f(x₀)] und die gestrichelte Linie stellt die Tangente dar.',
    es: 'El punto amarillo muestra [x₀, f(x₀)] y la línea discontinua muestra la tangente.',
  },

  // Finance & Currency
  'Měnový Konvertor & Kryptoměny': { ru: 'Конвертер валют и криптовалют', en: 'Currency Converter & Cryptocurrencies', de: 'Währungsrechner & Kryptowährungen', es: 'Conversor de Monedas y Criptomonedas' },
  'Real-time živé kurzy': { ru: 'Курсы в реальном времени', en: 'Real-time live rates', de: 'Echtzeit-Kurse', es: 'Tipos de cambio en tiempo real' },
  'Offline lokální cache': { ru: 'Офлайн локальный кэш', en: 'Offline local cache', de: 'Lokaler Offline-Cache', es: 'Caché local offline' },
  'Aktualizovat živé kurzy': { ru: 'Обновить курсы онлайн', en: 'Refresh live rates', de: 'Live-Kurse aktualisieren', es: 'Actualizar tipos en vivo' },
  'Z měny': { ru: 'Из валюты', en: 'From currency', de: 'Von Währung', es: 'De moneda' },
  'Do měny': { ru: 'В валюту', en: 'To currency', de: 'In Währung', es: 'A moneda' },
  'Částka k převodu': { ru: 'Сумма для конвертации', en: 'Amount to convert', de: 'Betrag umrechnen', es: 'Cantidad a convertir' },
  'Prohodit měny': { ru: 'Поменять валюты местами', en: 'Swap currencies', de: 'Währungen tauschen', es: 'Invertir monedas' },
  'Přehled směnných kurzů (Základ: 1 CZK)': { ru: 'Обзор обменных курсов (База: 1 CZK)', en: 'Exchange rates overview (Base: 1 CZK)', de: 'Wechselkursübersicht (Basis: 1 CZK)', es: 'Resumen de tipos de cambio (Base: 1 CZK)' },
  'Měnový konvertor (Fiat)': { ru: 'Конвертер валют (Фиат)', en: 'Currency converter (Fiat)', de: 'Währungsrechner (Fiat)', es: 'Conversor de divisas (Fiat)' },
  'Kryptoměny & Portfolio': { ru: 'Криптовалюты и Портфель', en: 'Cryptocurrencies & Portfolio', de: 'Kryptowährungen & Portfolio', es: 'Criptomonedas y Portafolio' },
  'Kalkulátor hodnoty kryptoměny': { ru: 'Калькулятор стоимости криптовалюты', en: 'Cryptocurrency value calculator', de: 'Kryptowährungswert-Rechner', es: 'Calculadora de valor de criptomoneda' },
  'Množství mincí': { ru: 'Количество монет', en: 'Coin quantity', de: 'Münzmenge', es: 'Cantidad de monedas' },
  'Převést na měnu': { ru: 'Конвертировать в валюту', en: 'Convert to currency', de: 'In Währung umrechnen', es: 'Convertir a moneda' },
  'Celková hodnota': { ru: 'Общая стоимость', en: 'Total value', de: 'Gesamtwert', es: 'Valor total' },
  'Dnes, 15:30 (Lokální cache)': { ru: 'Сегодня, 15:30 (Локальный кэш)', en: 'Today, 15:30 (Local cache)', de: 'Heute, 15:30 (Lokaler Cache)', es: 'Hoy, 15:30 (Caché local)' },
  'Živá data z internetu': { ru: 'Данные из сети', en: 'Live network data', de: 'Live-Netzwerkdaten', es: 'Datos en vivo de red' },

  // Chemistry & Molecular Mass
  'Chemie & Molární Kalkulačka': { ru: 'Химия и Молярный Калькулятор', en: 'Chemistry & Molecular Calculator', de: 'Chemie & Molmassenrechner', es: 'Química y Calculadora Molecular' },
  'Lokální výpočet molární hmotnosti sloučenin, procentuálního složení prvků, periodická tabulka a koncentrace roztoků.': {
    ru: 'Локальный расчет молярной массы соединений, массовых долей элементов, периодическая таблица и концентрация растворов.',
    en: 'Local molecular mass calculation, elemental breakdown, periodic table and solution molarity.',
    de: 'Lokale Berechnung der Molmasse von Verbindungen, Elementzusammensetzung, Periodensystem und Molarität.',
    es: 'Cálculo local de masa molecular de compuestos, porcentaje elemental, tabla periódica y molaridad.',
  },
  'Molární hmotnost & Složení': { ru: 'Молярная масса и Состав', en: 'Molar Mass & Composition', de: 'Molmasse & Zusammensetzung', es: 'Masa Molar y Composición' },
  'Periodická tabulka & Prvky': { ru: 'Периодическая таблица и Элементы', en: 'Periodic Table & Elements', de: 'Periodensystem & Elemente', es: 'Tabla Periódica y Elementos' },
  'Roztoky & Koncentrace (Molarita)': { ru: 'Растворы и Концентрация (Молярность)', en: 'Solutions & Molarity', de: 'Lösungen & Konzentration (Molarität)', es: 'Soluciones y Concentración (Molaridad)' },
  'Zadejte chemický vzorec sloučeniny': { ru: 'Введите химическую формулу соединения', en: 'Enter chemical compound formula', de: 'Chemische Summenformel eingeben', es: 'Introduzca la fórmula química' },
  'ZADEJTE CHEMICKÝ VZOREC SLOUČENINY': { ru: 'ВВЕДИТЕ ХИМИЧЕСКУЮ ФОРМУЛУ СОЕДИНЕНИЯ', en: 'ENTER CHEMICAL COMPOUND FORMULA', de: 'CHEMISCHE SUMMENFORMEL EINGEBEN', es: 'INTRODUZCA LA FÓRMULA QUÍMICA' },
  'Ukázky:': { ru: 'Примеры:', en: 'Examples:', de: 'Beispiele:', es: 'Ejemplos:' },
  'Celková molární hmotnost (M)': { ru: 'Общая молярная масса (M)', en: 'Total molar mass (M)', de: 'Gesamte Molmasse (M)', es: 'Masa molar total (M)' },
  'CELKOVÁ MOLÁRNÍ HMOTNOST (M)': { ru: 'ОБЩАЯ МОЛЯРНАЯ МАССА (M)', en: 'TOTAL MOLAR MASS (M)', de: 'GESAMTE MOLMASSE (M)', es: 'MASA MOLAR TOTAL (M)' },
  'Hmotnostní zastoupení jednotlivých prvků': { ru: 'Массовые доли элементов', en: 'Elemental mass breakdown', de: 'Massenanteile der Elemente', es: 'Distribución en masa de elementos' },
  'HMOTNOSTNÍ ZASTOUPENÍ JEDNOTLIVÝCH PRVKŮ': { ru: 'МАССОВЫЕ ДОЛИ ЭЛЕМЕНТОВ', en: 'ELEMENTAL MASS BREAKDOWN', de: 'MASSENANTEILE DER ELEMENTE', es: 'DISTRIBUCIÓN EN MASA DE ELEMENTOS' },
  'Prvek': { ru: 'Элемент', en: 'Element', de: 'Element', es: 'Elemento' },
  'PRVEK': { ru: 'ЭЛЕМЕНТ', en: 'ELEMENT', de: 'ELEMENT', es: 'ELEMENTO' },
  'Počet atomů': { ru: 'Число атомов', en: 'Atom count', de: 'Atomanzahl', es: 'Número de átomos' },
  'POČET ATOMŮ': { ru: 'ЧИСЛО АТОМОВ', en: 'ATOM COUNT', de: 'ATOMANZAHL', es: 'NÚMERO DE ÁTOMOS' },
  'Dílčí hmotnost': { ru: 'Масса доли', en: 'Sub-mass', de: 'Teilmasse', es: 'Masa parcial' },
  'DÍLČÍ HMOTNOST': { ru: 'МАССА ДОЛИ', en: 'SUB-MASS', de: 'TEILMASSE', es: 'MASA PARCIAL' },
  'Zastoupení (%)': { ru: 'Доля (%)', en: 'Share (%)', de: 'Anteil (%)', es: 'Proporción (%)' },
  'ZASTOUPENÍ (%)': { ru: 'ДОЛЯ (%)', en: 'SHARE (%)', de: 'ANTEIL (%)', es: 'PROPORCIÓN (%)' },
  'Hledat prvek podle názvu, značky, čísla...': { ru: 'Поиск по названию, символу, номеру...', en: 'Search by name, symbol, atomic number...', de: 'Nach Name, Symbol, Ordnungszahl suchen...', es: 'Buscar por nombre, símbolo, número atómico...' },
  'Protonové číslo': { ru: 'Атомный номер', en: 'Atomic number', de: 'Ordnungszahl', es: 'Número atómico' },
  'Elektronegativita': { ru: 'Электроотрицательность', en: 'Electronegativity', de: 'Elektronegativität', es: 'Electronegatividad' },
  'Perioda': { ru: 'Период', en: 'Period', de: 'Periode', es: 'Período' },
  'Skupina': { ru: 'Группа', en: 'Group', de: 'Gruppe', es: 'Grupo' },

  // Unit Converter
  'Vědecký Převodník Jednotek': { ru: 'Научный Конвертер Единиц', en: 'Scientific Unit Converter', de: 'Wissenschaftlicher Einheitenrechner', es: 'Conversor Científico de Unidades' },
  'SI jednotky, imperiální míry, tlak, teplota, energie a digitální data.': {
    ru: 'Единицы СИ, имперские меры, давление, температура, энергия и объем цифровых данных.',
    en: 'SI units, imperial measures, pressure, temperature, energy and digital data.',
    de: 'SI-Einheiten, imperiale Maße, Druck, Temperatur, Energie und digitale Daten.',
    es: 'Unidades SI, medidas imperiales, presión, temperatura, energía y datos digitales.',
  },
  'Z jednotky': { ru: 'Из единицы', en: 'From unit', de: 'Von Einheit', es: 'De unidad' },
  'Do jednotky': { ru: 'В единицу', en: 'To unit', de: 'In Einheit', es: 'A unidad' },
  'Prohodit jednotky': { ru: 'Поменять местами', en: 'Swap units', de: 'Einheiten tauschen', es: 'Invertir unidades' },
  'Srovnávací tabulka pro': { ru: 'Сравнительная таблица для', en: 'Comparison table for', de: 'Vergleichstabelle für', es: 'Tabla comparativa para' },

  // Statistics & Probability
  'Statistika & Analýza Dat': { ru: 'Статистика и Анализ Данных', en: 'Statistics & Data Analysis', de: 'Statistik & Datenanalyse', es: 'Estadística y Análisis de Datos' },
  'Statistická & Pravděpodobnostní Analýza': { ru: 'Статистический и вероятностный анализ', en: 'Statistical & Probability Analysis', de: 'Statistische & Wahrscheinlichkeitsanalyse', es: 'Análisis Estadístico y de Probabilidad' },
  'Výpočet aritmetického průměru, mediánu, rozptylu, směrodatných odchylek a kvartilů IQR.': {
    ru: 'Расчет среднего арифметического, медианы, дисперсии, стандартного отклонения и квартилей IQR.',
    en: 'Calculation of arithmetic mean, median, variance, standard deviation and quartiles IQR.',
    de: 'Berechnung des arithmetischen Mittels, Medians, der Varianz, Standardabweichung und Quartile IQR.',
    es: 'Cálculo de media aritmética, mediana, varianza, desviación típica y cuartiles IQR.',
  },
  'Kopírovat souhrn': { ru: 'Копировать сводку', en: 'Copy summary', de: 'Zusammenfassung kopieren', es: 'Copiar resumen' },
  'Datový vzorek (oddělený čárkami, mezerami nebo novými řádky)': {
    ru: 'Выборка данных (через запятую, пробел или новую строку)',
    en: 'Data sample (comma, space or newline separated)',
    de: 'Datenstichprobe (durch Kommas, Leerzeichen oder Zeilenumbrüche getrennt)',
    es: 'Muestra de datos (separada por comas, espacios o saltos de línea)',
  },
  'Předvolby:': { ru: 'Пресеты:', en: 'Presets:', de: 'Voreinstellungen:', es: 'Ajustes predefinidos:' },
  'Známky': { ru: 'Оценки', en: 'Grades', de: 'Noten', es: 'Notas' },
  'Latence (ms)': { ru: 'Задержка (мс)', en: 'Latency (ms)', de: 'Latenz (ms)', es: 'Latencia (ms)' },
  'Příjmy': { ru: 'Доходы', en: 'Incomes', de: 'Einkommen', es: 'Ingresos' },
  'Aritmetický průměr': { ru: 'Среднее арифметическое', en: 'Arithmetic mean', de: 'Arithmetisches Mittel', es: 'Media aritmética' },
  'Medián': { ru: 'Медиана', en: 'Median', de: 'Median', es: 'Mediana' },
  'Modus': { ru: 'Мода', en: 'Mode', de: 'Modus', es: 'Moda' },
  'Výběrový rozptyl (s²)': { ru: 'Выборочная дисперсия (s²)', en: 'Sample variance (s²)', de: 'Stichprobenvarianz (s²)', es: 'Varianza muestral (s²)' },
  'Směrodatná odchylka (s)': { ru: 'Стандартное отклонение (s)', en: 'Standard deviation (s)', de: 'Standardabweichung (s)', es: 'Desviación estándar (s)' },
  'Variační rozpětí (R)': { ru: 'Размах вариации (R)', en: 'Range (R)', de: 'Spannweite (R)', es: 'Rango (R)' },
  'Minimum': { ru: 'Минимум', en: 'Minimum', de: 'Minimum', es: 'Mínimo' },
  'Maximum': { ru: 'Максимум', en: 'Maximum', de: 'Maximum', es: 'Máximo' },
  '1. Kvartil (Q1)': { ru: '1-й квартиль (Q1)', en: '1st Quartile (Q1)', de: '1. Quartil (Q1)', es: '1er Cuartil (Q1)' },
  '3. Kvartil (Q3)': { ru: '3-й квартиль (Q3)', en: '3rd Quartile (Q3)', de: '3. Quartil (Q3)', es: '3er Cuartil (Q3)' },
  'Interkvartilové rozpětí (IQR)': { ru: 'Межквартильный размах (IQR)', en: 'Interquartile range (IQR)', de: 'Interquartilsabstand (IQR)', es: 'Rango intercuartílico (IQR)' },
  'Frekvenční rozdělení (Histogram)': { ru: 'Частотное распределение (Гистограмма)', en: 'Frequency distribution (Histogram)', de: 'Häufigkeitsverteilung (Histogramm)', es: 'Distribución de frecuencias (Histograma)' },

  // Combinatorics
  'Kombinatorika & Teorie Čísel': { ru: 'Комбинаторика и Теория Чисел', en: 'Combinatorics & Number Theory', de: 'Kombinatorik & Zahlentheorie', es: 'Combinatoria y Teoría de Números' },
  'Permutace, kombinace, variace, Eukleidův algoritmus (NSD a NSN) a prvočíselný rozklad.': {
    ru: 'Перестановки, сочетания, размещения, алгоритм Евклида (НОД и НОК) и факторизация чисел.',
    en: 'Permutations, combinations, variations, Euclidean algorithm (GCD & LCM) and prime factorization.',
    de: 'Permutationen, Kombinationen, Variationen, Euklidischer Algorithmus (ggT & kgV) und Primfaktorzerlegung.',
    es: 'Permutaciones, combinaciones, variaciones, algoritmo de Euclides (MCD y MCM) y descomposición en primos.',
  },
  'Kombinatorické počty: P(n), V(n, k), C(n, k)': {
    ru: 'Комбинаторные расчеты: P(n), V(n, k), C(n, k)',
    en: 'Combinatorial counts: P(n), V(n, k), C(n, k)',
    de: 'Kombinatorische Zählungen: P(n), V(n, k), C(n, k)',
    es: 'Cálculos combinatorios: P(n), V(n, k), C(n, k)',
  },
  'S opakováním prvků': { ru: 'С повторением элементов', en: 'With repetition', de: 'Mit Wiederholung', es: 'Con repetición' },
  'Celkový počet prvků (n):': { ru: 'Всего элементов (n):', en: 'Total elements (n):', de: 'Gesamtelemente (n):', es: 'Total de elementos (n):' },
  'Velikost výběru / třída (k):': { ru: 'Размер выборки / класс (k):', en: 'Selection size / class (k):', de: 'Auswahlgröße / Klasse (k):', es: 'Tamaño de selección / clase (k):' },
  'Permutace P(n)': { ru: 'Перестановки P(n)', en: 'Permutations P(n)', de: 'Permutationen P(n)', es: 'Permutaciones P(n)' },
  'Variace V(n, k)': { ru: 'Размещения V(n, k)', en: 'Variations V(n, k)', de: 'Variationen V(n, k)', es: 'Variaciones V(n, k)' },
  'Kombinace C(n, k)': { ru: 'Сочетания C(n, k)', en: 'Combinations C(n, k)', de: 'Kombinationen C(n, k)', es: 'Combinaciones C(n, k)' },
  'Teorie čísel: NSD, NSN a prvočísla': { ru: 'Теория чисел: НОД, НОК и простые числа', en: 'Number theory: GCD, LCM & primes', de: 'Zahlentheorie: ggT, kgV & Primzahlen', es: 'Teoría de números: MCD, MCM y primos' },
  'Největší společný dělitel (NSD)': { ru: 'Наибольший общий делитель (НОД)', en: 'Greatest common divisor (GCD)', de: 'Größter gemeinsamer Teiler (ggT)', es: 'Máximo común divisor (MCD)' },
  'Nejmenší společný násobek (NSN)': { ru: 'Наименьшее общее кратное (НОК)', en: 'Least common multiple (LCM)', de: 'Kleinstes gemeinsames Vielfaches (kgV)', es: 'Mínimo común múltiplo (MCM)' },
  'Prvočíselný rozklad (Faktorizace)': { ru: 'Факторизация на простые множители', en: 'Prime factorization', de: 'Primfaktorzerlegung', es: 'Factorización de números primos' },

  // Loans & Mortgages
  'Hypoteční & Úvěrová Kalkulačka': { ru: 'Кредитный и Ипотечный Калькулятор', en: 'Mortgage & Loan Calculator', de: 'Kredit- & Hypothekenrechner', es: 'Calculadora de Hipotecas y Préstamos' },
  'Kreditní a Ipotéční Kalkulačka': { ru: 'Кредитный и Ипотечный Калькулятор', en: 'Mortgage & Loan Calculator', de: 'Kredit- & Hypothekenrechner', es: 'Calculadora de Hipotecas y Préstamos' },
  'Přesný výpočet anuitních splátek, celkového přeplatku na úrocích a amortizačního kalendáře.': {
    ru: 'Точный расчет аннуитетных платежей, общей переплаты по процентам и графика амортизации.',
    en: 'Accurate annuity calculation, total interest overpayment and amortization schedule.',
    de: 'Genaue Annuitätenberechnung, Zinsmehraufwand und Tilgungsplan.',
    es: 'Cálculo exacto de cuotas, sobrepago de intereses y tabla de amortización.',
  },
  'Výše úvěru (Kč)': { ru: 'Сумма кредита', en: 'Loan amount', de: 'Kreditbetrag', es: 'Importe del préstamo' },
  'Úroková sazba (% p.a.)': { ru: 'Процентная ставка (% годовых)', en: 'Interest rate (% p.a.)', de: 'Zinssatz (% p.a.)', es: 'Tipo de interés (% anual)' },
  'Doba splácení (roky)': { ru: 'Срок погашения (лет)', en: 'Loan term (years)', de: 'Laufzeit (Jahre)', es: 'Plazo (años)' },
  'Měsíční splátka': { ru: 'Ежемесячный платеж', en: 'Monthly payment', de: 'Monatliche Rate', es: 'Cuota mensual' },
  'Přeplatek na úrocích': { ru: 'Переплата по процентам', en: 'Interest overpayment', de: 'Zinsaufwand', es: 'Total intereses' },
  'Celkem zaplatíte': { ru: 'Итого к выплате', en: 'Total payout', de: 'Gesamtbetrag', es: 'Total a pagar' },
  'Jistina': { ru: 'Основной долг', en: 'Principal', de: 'Tilgung', es: 'Principal' },
  'Úroky': { ru: 'Проценты', en: 'Interest', de: 'Zinsen', es: 'Intereses' },
  'Amortizační rozpis (Ukázka prvních 36 měsíců)': {
    ru: 'График платежей (Первые 36 месяцев)',
    en: 'Amortization schedule (First 36 months)',
    de: 'Tilgungsplan (Erste 36 Monate)',
    es: 'Cuadro de amortización (Primeros 36 meses)',
  },
  'Exportovat celý splátkový kalendář (.CSV)': {
    ru: 'Экспортировать график платежей (.CSV)',
    en: 'Export full payment schedule (.CSV)',
    de: 'Vollständigen Tilgungsplan exportieren (.CSV)',
    es: 'Exportar cuadro de amortización (.CSV)',
  },
  'Měsíc': { ru: 'Месяц', en: 'Month', de: 'Monat', es: 'Mes' },
  'Splátka': { ru: 'Платеж', en: 'Payment', de: 'Rate', es: 'Cuota' },
  'Úmor (Jistina)': { ru: 'Погашение долга', en: 'Principal part', de: 'Tilgungsanteil', es: 'Amortización' },
  'Úrok': { ru: 'Процент', en: 'Interest', de: 'Zinsanteil', es: 'Interés' },
  'Zůstatek jistiny': { ru: 'Остаток долга', en: 'Remaining balance', de: 'Restschuld', es: 'Saldo pendiente' },

  // Time & Pomodoro
  'Časová Pásma & Pomodoro Časovač': { ru: 'Часовые Пояса и Помодоро Таймер', en: 'Time Zones & Pomodoro Timer', de: 'Zeitzonen & Pomodoro-Timer', es: 'Zonas Horarias y Temporizador Pomodoro' },
  'Světové hodiny pro globální týmy a produktivní časovač soustředění Pomodoro.': {
    ru: 'Мировое время для международных команд и продуктивный таймер концентрации Pomodoro.',
    en: 'World clock for distributed teams and productive Pomodoro focus timer.',
    de: 'Weltzeituhr für globale Teams und produktiver Pomodoro-Fokustimer.',
    es: 'Reloj mundial para equipos globales y temporizador de concentración Pomodoro.',
  },
  'Pomodoro Focus': { ru: 'Pomodoro Фокус', en: 'Pomodoro Focus', de: 'Pomodoro-Fokus', es: 'Enfoque Pomodoro' },
  'Světový čas': { ru: 'Мировое время', en: 'World Clock', de: 'Weltzeit', es: 'Hora Mundial' },
  'Práce (25 min)': { ru: 'Работа (25 мин)', en: 'Work (25 min)', de: 'Arbeit (25 Min.)', es: 'Trabajo (25 min)' },
  'Pauza (5 min)': { ru: 'Перерыв (5 мин)', en: 'Short break (5 min)', de: 'Pause (5 Min.)', es: 'Descanso (5 min)' },
  'Dlouhá pauza (15 min)': { ru: 'Длинный отдых (15 мин)', en: 'Long break (15 min)', de: 'Lange Pause (15 Min.)', es: 'Descanso largo (15 min)' },
  'Pozastavit': { ru: 'Пауза', en: 'Pause', de: 'Pause', es: 'Pausar' },
  'Spustit': { ru: 'Старт', en: 'Start', de: 'Starten', es: 'Iniciar' },
  'Resetovat časovač': { ru: 'Сбросить таймер', en: 'Reset timer', de: 'Timer zurücksetzen', es: 'Restablecer temporizador' },
  'Dokončeno soustředěných bloků:': { ru: 'Завершено циклов фокуса:', en: 'Completed focus blocks:', de: 'Abgeschlossene Fokusblöcke:', es: 'Bloques de enfoque completados:' },

  // Multi-Format Converter
  'Multi-Formátový Konvertor': { ru: 'Мультиформатный Конвертер', en: 'Multi-Format Converter', de: 'Multiformat-Konverter', es: 'Conversor Multiformato' },
  'Univerzální převod dokumentů (DOCX, MD, TXT -> PDF), dat (CSV <-> JSON) a obrázků (WebP, PNG, JPG).': {
    ru: 'Универсальное преобразование документов (DOCX, MD, TXT -> PDF), данных (CSV <-> JSON) и изображений (WebP, PNG, JPG).',
    en: 'Universal file conversion (DOCX, MD, TXT -> PDF), data (CSV <-> JSON) and images (WebP, PNG, JPG).',
    de: 'Universelle Dokumentenkonvertierung (DOCX, MD, TXT -> PDF), Daten (CSV <-> JSON) und Bilder (WebP, PNG, JPG).',
    es: 'Conversión universal de documentos (DOCX, MD, TXT -> PDF), datos (CSV <-> JSON) e imágenes (WebP, PNG, JPG).',
  },
  'Dokumenty (DOCX, MD, TXT → PDF)': { ru: 'Документы (DOCX, MD, TXT → PDF)', en: 'Documents (DOCX, MD, TXT → PDF)', de: 'Dokumente (DOCX, MD, TXT → PDF)', es: 'Documentos (DOCX, MD, TXT → PDF)' },
  'Data (CSV ↔ JSON)': { ru: 'Данные (CSV ↔ JSON)', en: 'Data (CSV ↔ JSON)', de: 'Daten (CSV ↔ JSON)', es: 'Datos (CSV ↔ JSON)' },
  'Obrázky & Grafika (PNG, JPG → WebP)': { ru: 'Изображения (PNG, JPG → WebP)', en: 'Images & Graphics (PNG, JPG → WebP)', de: 'Bilder & Grafiken (PNG, JPG → WebP)', es: 'Imágenes y Gráficos (PNG, JPG → WebP)' },
  'Cílový formát': { ru: 'Целевой формат', en: 'Target format', de: 'Zielformat', es: 'Formato de destino' },
  'Kvalita komprese': { ru: 'Качество сжатия', en: 'Compression quality', de: 'Kompressionsqualität', es: 'Calidad de compresión' },
  'Změna měřítka': { ru: 'Масштабирование', en: 'Scale factor', de: 'Skalierung', es: 'Escala' },
  'Přetáhněte sem soubor pro okamžitou konverzi': {
    ru: 'Перетащите сюда файл для мгновенной конвертации',
    en: 'Drag & drop file here for instant conversion',
    de: 'Ziehen Sie eine Datei zur sofortigen Konvertierung hierher',
    es: 'Arrastre el archivo aquí para la conversión instantánea',
  },
  'Vyzkoušet na ukázkovém souboru →': { ru: 'Попробовать на примере файла →', en: 'Try sample file →', de: 'An Beispieldatei ausprobieren →', es: 'Probar con archivo de ejemplo →' },
  'Stáhnout převedený soubor': { ru: 'Скачать готовый файл', en: 'Download converted file', de: 'Konvertierte Datei herunterladen', es: 'Descargar archivo convertido' },
  'Doba zpracování': { ru: 'Время обработки', en: 'Processing time', de: 'Verarbeitungszeit', es: 'Tiempo de procesamiento' },
  'Původní velikost': { ru: 'Исходный размер', en: 'Original size', de: 'Originalgröße', es: 'Tamaño original' },
  'Výsledná velikost': { ru: 'Итоговый размер', en: 'Result size', de: 'Ergebnisgröße', es: 'Tamaño final' },
  'Úspora / Změna': { ru: 'Экономия / Изменение', en: 'Savings / Change', de: 'Einsparung / Änderung', es: 'Ahorro / Variación' },
  'Převod dokončen:': { ru: 'Конвертация завершена:', en: 'Conversion completed:', de: 'Konvertierung abgeschlossen:', es: 'Conversión completada:' },

  // File Inspector
  'Inspektor souborů & Hash kalkulátor': { ru: 'Инспектор файлов и Хэш калькулятор', en: 'File Inspector & Hash Calculator', de: 'Datei-Inspektor & Hash-Rechner', es: 'Inspector de Archivos y Calculadora de Hash' },
  'Okamžitý výpočet kontrolních součtů (SHA-256), binární hex dump a analýza hlaviček bez odesílání na síť.': {
    ru: 'Мгновенный расчет контрольных сумм (SHA-256), шестнадцатеричный дамп и анализ без отправки в сеть.',
    en: 'Instant checksum calculation (SHA-256), binary hex dump and header analysis without network transfer.',
    de: 'Sofortige Prüfsummenberechnung (SHA-256), binärer Hex-Dump und Header-Analyse ohne Netzwerkübertragung.',
    es: 'Cálculo instantáneo de sumas de control (SHA-256), volcado hexadecimal binario y análisis sin red.',
  },
  'Vyberte libovolný soubor k prozkoumání': { ru: 'Выберите любой файл для анализа', en: 'Select any file to inspect', de: 'Wählen Sie eine Datei zur Prüfung aus', es: 'Seleccione cualquier archivo para examinar' },
  'Název souboru': { ru: 'Имя файла', en: 'Filename', de: 'Dateiname', es: 'Nombre del archivo' },
  'Velikost': { ru: 'Размер', en: 'Size', de: 'Größe', es: 'Tamaño' },
  'MIME typ': { ru: 'MIME-тип', en: 'MIME type', de: 'MIME-Typ', es: 'Tipo MIME' },
  'Kryptografický otisk SHA-256': { ru: 'Криптографический хэш SHA-256', en: 'Cryptographic SHA-256 Hash', de: 'Kryptografischer SHA-256 Hash', es: 'Hash Criptográfico SHA-256' },
  'Kopírovat hash': { ru: 'Копировать хэш', en: 'Copy hash', de: 'Hash kopieren', es: 'Copiar hash' },
  'Hexadecimální náhled hlavičky (prvních 128 bajtů)': {
    ru: 'Шестнадцатеричный дамп заголовка (первые 128 байт)',
    en: 'Hex header preview (first 128 bytes)',
    de: 'Hex-Header-Vorschau (erste 128 Bytes)',
    es: 'Vista previa hexadecimal del encabezado (primeros 128 bytes)',
  },

  // Text Diff
  'Text & Souborový Diff Porovnávač': { ru: 'Сравнение Текстов и Файлов (Diff)', en: 'Text & File Diff Comparator', de: 'Text- & Datei-Diff-Vergleich', es: 'Comparador de Textos y Archivos Diff' },
  'Vizuální porovnání dvou textů nebo konfiguračních souborů řádek po řádce s detekcí změn.': {
    ru: 'Построчное визуальное сравнение двух версий текста или конфигураций с подсветкой изменений.',
    en: 'Visual line-by-line comparison of two text or configuration files with change detection.',
    de: 'Visueller Zeilenvergleich zweier Text- oder Konfigurationsdateien mit Änderungserkennung.',
    es: 'Comparación visual línea a línea de dos archivos de texto o configuración con detección de cambios.',
  },
  'Původní text (Verze A)': { ru: 'Исходный текст (Версия A)', en: 'Original text (Version A)', de: 'Originaltext (Version A)', es: 'Texto original (Versión A)' },
  'Upravený text (Verze B)': { ru: 'Измененный текст (Версия B)', en: 'Modified text (Version B)', de: 'Geänderter Text (Version B)', es: 'Texto modificado (Versión B)' },
  'Přidáno': { ru: 'Добавлено', en: 'Added', de: 'Hinzugefügt', es: 'Añadido' },
  'Odebráno': { ru: 'Удалено', en: 'Removed', de: 'Entfernt', es: 'Eliminado' },
  'Beze změny': { ru: 'Без изменений', en: 'Unchanged', de: 'Unverändert', es: 'Sin cambios' },
  'Výsledné porovnání řádek po řádce': { ru: 'Построчное сравнение результатов', en: 'Line-by-line comparison results', de: 'Zeilenweiser Ergebnisvergleich', es: 'Resultado de comparación línea a línea' },

  // JSON Formatter
  'JSON Formátovač & Validátor': { ru: 'Форматировщик и Валидатор JSON', en: 'JSON Formatter & Validator', de: 'JSON-Formatierer & Validierer', es: 'Formateador y Validador JSON' },
  'Formátovat (2 mezery)': { ru: 'Форматировать (2 пробела)', en: 'Format (2 spaces)', de: 'Formatieren (2 Leerzeichen)', es: 'Formatear (2 espacios)' },
  'Formátovat (4 mezery)': { ru: 'Форматировать (4 пробела)', en: 'Format (4 spaces)', de: 'Formatieren (4 Leerzeichen)', es: 'Formatear (4 espacios)' },
  'Minifikovat': { ru: 'Минифицировать', en: 'Minify', de: 'Minimieren', es: 'Minificar' },
  'Stáhnout .json': { ru: 'Скачать .json', en: 'Download .json', de: '.json herunterladen', es: 'Descargar .json' },
  'Validní JSON': { ru: 'Валидный JSON', en: 'Valid JSON', de: 'Gültiges JSON', es: 'JSON válido' },
  'Chybná syntaxe': { ru: 'Ошибка синтаксиса', en: 'Syntax error', de: 'Syntaxfehler', es: 'Error de sintaxis' },

  // Password Generator
  'Generátor Bezpečných Hesel & Frází': { ru: 'Генератор Надежных Паролей и Фраз', en: 'Secure Password & Passphrase Generator', de: 'Sicherer Passwort- & Passphrasen-Generator', es: 'Generador de Contraseñas Seguras y Frases' },
  'Náhodné znaky': { ru: 'Случайные символы', en: 'Random characters', de: 'Zufällige Zeichen', es: 'Caracteres aleatorios' },
  'Slovní fráze (Passphrase)': { ru: 'Словарная фраза (Passphrase)', en: 'Memorable passphrase', de: 'Passphrase (Wortfolge)', es: 'Frase de paso (Passphrase)' },
  'Vygenerovat nové heslo': { ru: 'Сгенерировать новый пароль', en: 'Generate new password', de: 'Neues Passwort generieren', es: 'Generar nueva contraseña' },
  'Parametry generátoru': { ru: 'Параметры генератора', en: 'Generator parameters', de: 'Generator-Parameter', es: 'Parámetros del generador' },
  'Délka hesla:': { ru: 'Длина пароля:', en: 'Password length:', de: 'Passwortlänge:', es: 'Longitud de la contraseña:' },
  'Velká písmena (A–Z)': { ru: 'Заглавные буквы (A–Z)', en: 'Uppercase (A–Z)', de: 'Großbuchstaben (A–Z)', es: 'Mayúsculas (A–Z)' },
  'Malá písmena (a–z)': { ru: 'Строчные буквы (a–z)', en: 'Lowercase (a–z)', de: 'Kleinbuchstaben (a–z)', es: 'Minúsculas (a–z)' },
  'Čísla (0–9)': { ru: 'Цифры (0–9)', en: 'Numbers (0–9)', de: 'Zahlen (0–9)', es: 'Números (0–9)' },
  'Speciální znaky (!@#$)': { ru: 'Спецсимволы (!@#$)', en: 'Symbols (!@#$)', de: 'Sonderzeichen (!@#$)', es: 'Símbolos especiales (!@#$)' },
  'Vyloučit podobné znaky (i, l, 1, L, o, 0, O)': {
    ru: 'Исключить похожие символы (i, l, 1, L, o, 0, O)',
    en: 'Exclude ambiguous chars (i, l, 1, L, o, 0, O)',
    de: 'Ähnliche Zeichen ausschließen (i, l, 1, L, o, 0, O)',
    es: 'Excluir caracteres ambiguos (i, l, 1, L, o, 0, O)',
  },
  'Počet slov:': { ru: 'Количество слов:', en: 'Word count:', de: 'Wortanzahl:', es: 'Cantidad de palabras:' },
  'Oddělovač slov:': { ru: 'Разделитель:', en: 'Separator:', de: 'Trennzeichen:', es: 'Separador:' },
  'Zahrnout číslo': { ru: 'Включить число', en: 'Include number', de: 'Zahl einfügen', es: 'Incluir número' },
  'Velká počáteční písmena': { ru: 'Заглавные первые буквы', en: 'Capitalize words', de: 'Wörter großschreiben', es: 'Mayúsculas iniciales' },
  'Síla hesla:': { ru: 'Надежность пароля:', en: 'Password strength:', de: 'Passwortstärke:', es: 'Fortaleza:' },
  'Entropie:': { ru: 'Энтропия:', en: 'Entropy:', de: 'Entropie:', es: 'Entropía:' },

  // QR Code Generator
  'Generátor QR Kódů (100% Offline)': { ru: 'Генератор QR-Кодов (100% Офлайн)', en: 'QR Code Generator (100% Offline)', de: 'QR-Code-Generator (100% Offline)', es: 'Generador de Códigos QR (100% Offline)' },
  'Webový odkaz': { ru: 'Ссылка', en: 'Web link', de: 'Weblink', es: 'Enlace web' },
  'Wi-Fi síť': { ru: 'Сеть Wi-Fi', en: 'Wi-Fi network', de: 'WLAN-Netzwerk', es: 'Red Wi-Fi' },
  'Volný text': { ru: 'Произвольный текст', en: 'Plain text', de: 'Freitext', es: 'Texto libre' },
  'Stáhnout PNG': { ru: 'Скачать PNG', en: 'Download PNG', de: 'PNG herunterladen', es: 'Descargar PNG' },
  'Generuji...': { ru: 'Создание...', en: 'Generating...', de: 'Generierung...', es: 'Generando...' },
  'Vygenerovaný QR kód': { ru: 'Созданный QR-код', en: 'Generated QR code', de: 'Generierter QR-Code', es: 'Código QR generado' },

  // RegEx & Encoders
  'RegEx Tester & Base64 / URL Kódovač': { ru: 'Тестер RegEx и Кодировщик Base64 / URL', en: 'RegEx Tester & Base64 / URL Encoder', de: 'RegEx-Tester & Base64 / URL-Encoder', es: 'Probador de RegEx y Codificador Base64 / URL' },
  'Zakódovat do Base64': { ru: 'Закодировать в Base64', en: 'Encode to Base64', de: 'In Base64 kodieren', es: 'Codificar a Base64' },
  'Dekódovat z Base64': { ru: 'Декодировать из Base64', en: 'Decode from Base64', de: 'Aus Base64 dekodieren', es: 'Decodificar de Base64' },
  'Vstup': { ru: 'Вход', en: 'Input', de: 'Eingabe', es: 'Entrada' },
  'Výsledek': { ru: 'Результат', en: 'Result', de: 'Ergebnis', es: 'Resultado' },
  'Vstupní URL': { ru: 'Исходный URL', en: 'Input URL', de: 'Eingabe-URL', es: 'URL de entrada' },

  // Architecture & System
  'Modulární struktura složek': { ru: 'Модульная структура папок', en: 'Modular folder structure', de: 'Modulare Ordnerstruktur', es: 'Estructura modular de carpetas' },
  'Inicializační příkazy': { ru: 'Команды инициализации', en: 'Initialization commands', de: 'Initialisierungsbefehle', es: 'Comandos de inicialización' },
  'Propojení UI & Rust Backend (IPC)': { ru: 'Связь UI и Rust Backend (IPC)', en: 'UI & Rust Backend bridge (IPC)', de: 'UI- & Rust-Backend-Brücke (IPC)', es: 'Conexión UI y Backend Rust (IPC)' },
  'Desktop (.exe / .dmg) vs. Web': { ru: 'Desktop (.exe / .dmg) vs. Web', en: 'Desktop (.exe / .dmg) vs. Web', de: 'Desktop (.exe / .dmg) vs. Web', es: 'Escritorio (.exe / .dmg) vs. Web' },
  'Git Repozitář & Export': { ru: 'Git Репозиторий и Экспорт', en: 'Git Repository & Export', de: 'Git-Repository & Export', es: 'Repositorio Git y Exportación' },
  'Kopírovat kód': { ru: 'Копировать код', en: 'Copy code', de: 'Code kopieren', es: 'Copiar código' },
  'Srovnání technologií': { ru: 'Сравнение технологий', en: 'Technology comparison', de: 'Technologievergleich', es: 'Comparación tecnológica' },
  'Tauri v2 (Doporučená volba)': { ru: 'Tauri v2 (Рекомендуемый выбор)', en: 'Tauri v2 (Recommended choice)', de: 'Tauri v2 (Empfohlene Wahl)', es: 'Tauri v2 (Opción recomendada)' },
  'Vítěz pro OmniDesk': { ru: 'Победитель для OmniDesk', en: 'Winner for OmniDesk', de: 'Gewinner für OmniDesk', es: 'Ganador para OmniDesk' },
  'Simulovat zvýšené vytížení procesoru': { ru: 'Имитировать нагрузку на процессор', en: 'Simulate CPU high load', de: 'Hohe CPU-Auslastung simulieren', es: 'Simular carga alta de CPU' },
  'Zátěž aktivní': { ru: 'Нагрузка активна', en: 'Stress active', de: 'Belastung aktiv', es: 'Carga activa' },
  'Test zátěže': { ru: 'Стресс-тест', en: 'Stress test', de: 'Stresstest', es: 'Test de estrés' },
  'Dashboard Telemetrie': { ru: 'Дашборд телеметрии', en: 'Telemetry Dashboard', de: 'Telemetrie-Dashboard', es: 'Panel de Telemetría' },
  'Aktivní Procesy': { ru: 'Активные процессы', en: 'Active Processes', de: 'Aktive Prozesse', es: 'Procesos Activos' },
  'Tauri Plugin-OS Architektura': { ru: 'Архитектура Tauri Plugin-OS', en: 'Tauri Plugin-OS Architecture', de: 'Tauri Plugin-OS Architektur', es: 'Arquitectura Tauri Plugin-OS' },

  // WCAG & Colors
  'Prohodit barvy popředí a pozadí': { ru: 'Поменять цвета фона и текста', en: 'Swap foreground and background', de: 'Vorder- und Hintergrundfarben tauschen', es: 'Intercambiar colores de fondo y texto' },
  'Kopírovat kompletní report přístupnosti': { ru: 'Копировать полный отчет о доступности', en: 'Copy full accessibility audit report', de: 'Vollständigen Barrierefreiheitsbericht kopieren', es: 'Copiar informe completo de accesibilidad' },
  'Barevné vstupy': { ru: 'Входные цвета', en: 'Color inputs', de: 'Farbeingaben', es: 'Entradas de color' },
  'Prohodit': { ru: 'Поменять', en: 'Swap', de: 'Tauschen', es: 'Intercambiar' },
  'Doladit na AA (4.5:1)': { ru: 'Подогнать под AA (4.5:1)', en: 'Tune to AA (4.5:1)', de: 'Auf AA abstimmen (4.5:1)', es: 'Ajustar a AA (4.5:1)' },
  'Doladit na AAA (7.0:1)': { ru: 'Подогнать под AAA (7.0:1)', en: 'Tune to AAA (7.0:1)', de: 'Auf AAA abstimmen (7.0:1)', es: 'Ajustar a AAA (7.0:1)' },
  'Doporučené vzory': { ru: 'Рекомендуемые шаблоны', en: 'Recommended presets', de: 'Empfohlene Muster', es: 'Patrones recomendados' },
  'Vypočtený Kontrastní Poměr': { ru: 'Рассчитанный коэффициент контрастности', en: 'Calculated Contrast Ratio', de: 'Berechnetes Kontrastverhältnis', es: 'Relación de Contraste Calculada' },
  'Živý náhled v zadaných barvách': { ru: 'Интерактивный просмотр в выбранных цветах', en: 'Live preview with selected colors', de: 'Live-Vorschau in ausgewählten Farben', es: 'Vista previa con colores seleccionados' },
  'Ukázkový text': { ru: 'Пример текста', en: 'Sample text', de: 'Beispieltext', es: 'Texto de ejemplo' },
  'Primární tlačítko': { ru: 'Основная кнопка', en: 'Primary button', de: 'Primäre Schaltfläche', es: 'Botón principal' },
  'Obrysové tlačítko': { ru: 'Контурная кнопка', en: 'Outline button', de: 'Umriss-Schaltfläche', es: 'Botón con contorno' },
  'Vyhovuje': { ru: 'Соответствует', en: 'Passes', de: 'Bestanden', es: 'Cumple' },
  'Nevyhovuje': { ru: 'Не соответствует', en: 'Fails', de: 'Nicht bestanden', es: 'No cumple' },
  'Kopírovat číslo': { ru: 'Копировать число', en: 'Copy number', de: 'Zahl kopieren', es: 'Copiar número' },
  'Historie': { ru: 'История', en: 'History', de: 'Verlauf', es: 'Historial' },
  'Smazat historii': { ru: 'Очистить историю', en: 'Clear history', de: 'Verlauf löschen', es: 'Borrar historial' },
  'Historie je prázdná': { ru: 'История пуста', en: 'History is empty', de: 'Verlauf ist leer', es: 'El historial está vacío' },
  'Podporuje numpad klávesnici': { ru: 'Поддержка цифровой клавиатуры', en: 'Numpad keyboard supported', de: 'Ziffernblock unterstützt', es: 'Compatible con teclado numérico' },

  // Multi-Format Converter (Additional)
  'Zpracovávám a optimalizuji soubor v paměti...': { ru: 'Обработка и оптимизация файла в памяти...', en: 'Processing and optimizing file in memory...', de: 'Datei wird im Speicher optimiert...', es: 'Procesando y optimizando archivo en memoria...' },
  'Převod dokončen': { ru: 'Конвертация завершена', en: 'Conversion completed', de: 'Konvertierung abgeschlossen', es: 'Conversión completada' },

  // Pomodoro, Timer & Timezones
  'Časovač (Timer)': { ru: 'Таймер', en: 'Countdown Timer', de: 'Timer', es: 'Temporizador' },
  'Stopky & Mezičasy': { ru: 'Секундомер и Круги', en: 'Stopwatch & Laps', de: 'Stoppuhr & Runden', es: 'Cronómetro y Vueltas' },
  'Krátká pauza (5 min)': { ru: 'Короткий перерыв (5 мин)', en: 'Short break (5 min)', de: 'Kurze Pause (5 min)', es: 'Pausa corta (5 min)' },
  'Nastavit nový odpočet': { ru: 'Установить новый таймер', en: 'Set new countdown', de: 'Neuen Countdown einstellen', es: 'Configurar nueva cuenta atrás' },
  'Nastavit a spustit': { ru: 'Установить и запустить', en: 'Set & Start', de: 'Einstellen & Starten', es: 'Configurar e Iniciar' },
  'Mezičas (Kolo)': { ru: 'Круг (Отсечка)', en: 'Split Lap', de: 'Zwischenzeit (Runde)', es: 'Tiempo por Vuelta' },
  'Historie kol': { ru: 'История кругов', en: 'Lap history', de: 'Rundenverlauf', es: 'Historial de vueltas' },
  'Kopírovat kola': { ru: 'Копировать круги', en: 'Copy laps', de: 'Runden kopieren', es: 'Copiar vueltas' },
  'Nejrychlejší': { ru: 'Лучший круг', en: 'Fastest', de: 'Schnellste', es: 'Más rápida' },
  'Nejpomalejší': { ru: 'Медленный', en: 'Slowest', de: 'Langsamste', es: 'Más lenta' },
  'Interaktivní časový posuvník (Plánování schůzek)': { ru: 'Интерактивный ползунок времени (Планировщик встреч)', en: 'Interactive Time Slider (Meeting Planner)', de: 'Interaktiver Zeitschieber (Meeting-Planer)', es: 'Control deslizante interactivo (Planificador de reuniones)' },
  'Aktuální reálný čas': { ru: 'Текущее реальное время', en: 'Current live time', de: 'Aktuelle Echtzeit', es: 'Hora real actual' },
  'Návrat k živému času': { ru: 'Вернуться к текущему времени', en: 'Reset to live time', de: 'Zurück zur Echtzeit', es: 'Volver a la hora actual' },
  'Hledat město nebo zemi...': { ru: 'Поиск города или страны...', en: 'Search city or country...', de: 'Stadt oder Land suchen...', es: 'Buscar ciudad o país...' },
  'Evropa': { ru: 'Европа', en: 'Europe', de: 'Europa', es: 'Europa' },
  'Amerika': { ru: 'Америка', en: 'Americas', de: 'Amerika', es: 'América' },
  'Asie': { ru: 'Азия', en: 'Asia', de: 'Asien', es: 'Asia' },
  'Oceánie': { ru: 'Океания', en: 'Oceania', de: 'Ozeanien', es: 'Oceanía' },
  'Afrika': { ru: 'Африка', en: 'Africa', de: 'Afrika', es: 'África' },

  // Mini-widgets and Config Backup
  'Mini widgety': { ru: 'Мини-виджеты', en: 'Mini widgets', de: 'Mini-Widgets', es: 'Mini widgets' },
  'Rychlý timer': { ru: 'Быстрый таймер', en: 'Quick timer', de: 'Schneller Timer', es: 'Temporizador rápido' },
  'Nastavit widgety': { ru: 'Настроить виджеты', en: 'Configure widgets', de: 'Widgets anpassen', es: 'Configurar widgets' },
  'Záloha & Konfigurátor': { ru: 'Бэкап и Конфигуратор', en: 'Backup & Configurator', de: 'Backup & Konfigurator', es: 'Copia de seguridad y Configuración' },
  'Exportovat nebo Obnovit konfiguraci': { ru: 'Экспорт или Восстановление конфигурации', en: 'Export or Restore Configuration', de: 'Konfiguration exportieren oder wiederherstellen', es: 'Exportar o Restaurar configuración' },
  'Stáhnout zálohu .json': { ru: 'Скачать бэкап .json', en: 'Download backup .json', de: 'Backup .json herunterladen', es: 'Descargar copia .json' },
  'Nahrát soubor .json': { ru: 'Загрузить файл .json', en: 'Import .json file', de: '.json-Datei hochladen', es: 'Cargar archivo .json' },
  'Vložit textem': { ru: 'Вставить текстом', en: 'Paste as text', de: 'Als Text einfügen', es: 'Pegar como texto' },
  'Aplikovat vloženou konfiguraci': { ru: 'Применить вставленную конфигурацию', en: 'Apply pasted configuration', de: 'Eingefügte Konfiguration anwenden', es: 'Aplicar configuración pegada' },
  'Zobrazení mini-widgetů na postranním panelu': { ru: 'Отображение мини-виджетов на боковой панели', en: 'Sidebar mini-widgets display', de: 'Anzeige von Mini-Widgets in der Seitenleiste', es: 'Mostrar mini-widgets en la barra lateral' },
  'Živé hodiny a datum': { ru: 'Живые часы и дата', en: 'Live clock and date', de: 'Live-Uhr und Datum', es: 'Reloj y fecha en vivo' },
  'Rychlý časovač / Pomodoro': { ru: 'Быстрый таймер / Помодоро', en: 'Quick timer / Pomodoro', de: 'Schneller Timer / Pomodoro', es: 'Temporizador rápido / Pomodoro' },
  'Lístek kryptoměn & měn': { ru: 'Тикер криптовалют и валют', en: 'Crypto & Currency Ticker', de: 'Krypto- & Währungsticker', es: 'Ticker de criptomonedas y divisas' },
  'Instalovat aplikaci': { ru: 'Установить приложение', en: 'Install App', de: 'App installieren', es: 'Instalar aplicación' },
  'Instalace aplikace OmniDesk': { ru: 'Установка приложения OmniDesk', en: 'Install OmniDesk App', de: 'OmniDesk App installieren', es: 'Instalación de OmniDesk' },

  // Currencies
  'Ruský rubl': { ru: 'Российский рубль', en: 'Russian Ruble', de: 'Russischer Rubel', es: 'Rublo ruso' },
  'Česká koruna': { ru: 'Чешская крона', en: 'Czech Koruna', de: 'Tschechische Krone', es: 'Corona checa' },
  'Americký dolar': { ru: 'Доллар США', en: 'US Dollar', de: 'US-Dollar', es: 'Dólar estadounidense' },
  'Britská libra': { ru: 'Британский фунт', en: 'British Pound', de: 'Britisches Pfund', es: 'Libra esterlina' },
  'Švýcarský frank': { ru: 'Швейцарский франк', en: 'Swiss Franc', de: 'Schweizer Franken', es: 'Franco suizo' },
  'Polský zlotý': { ru: 'Польский злотый', en: 'Polish Zloty', de: 'Polnischer Zloty', es: 'Złoty polaco' },
  'Japonský jen': { ru: 'Японская иена', en: 'Japanese Yen', de: 'Japanischer Yen', es: 'Yen japonés' },
  'Kanadský dolar': { ru: 'Канадский доллар', en: 'Canadian Dollar', de: 'Kanadischer Dollar', es: 'Dólar canadiense' },
  'Australský dolar': { ru: 'Австралийский доллар', en: 'Australian Dollar', de: 'Australischer Dollar', es: 'Dólar australiano' },
  'Maďarský forint': { ru: 'Венгерский форинт', en: 'Hungarian Forint', de: 'Ungarischer Forint', es: 'Forinto húngaro' },
  'Čínský jüan': { ru: 'Китайский юань', en: 'Chinese Yuan', de: 'Chinesischer Yuan', es: 'Yuan chino' },
  // Themes and Settings
  'Nastavení & Konfigurátor OmniDesk': { ru: 'Настройки и Конфигуратор OmniDesk', en: 'OmniDesk Settings & Configurator', de: 'OmniDesk Einstellungen & Konfigurator', es: 'Configuración de OmniDesk' },
  'Barevné režimy, správa postranních widgetů a přenositelné JSON profily': { ru: 'Цветовые темы, боковые виджеты и переносимые JSON-профили', en: 'Color themes, sidebar widgets, and portable JSON profiles', de: 'Farbthemen, Seitenleisten-Widgets und portable JSON-Profile', es: 'Temas de color, widgets laterales y perfiles JSON portátiles' },
  'Vzhled & Barvy': { ru: 'Внешний вид и Темы', en: 'Appearance & Themes', de: 'Design & Farben', es: 'Apariencia y Temas' },
  'Postranní Widgety': { ru: 'Боковые Виджеты', en: 'Sidebar Widgets', de: 'Seitenleisten-Widgets', es: 'Widgets Laterales' },
  'Záloha & JSON Export/Import': { ru: 'Бэкап и JSON Экспорт/Импорт', en: 'Backup & JSON Export/Import', de: 'Backup & JSON Export/Import', es: 'Copia y Exportar/Importar JSON' },
  'Vyberte barevný režim aplikace': { ru: 'Выберите цветовую тему приложения', en: 'Choose application color theme', de: 'Wählen Sie das App-Farbthema', es: 'Elija el tema de color' },
  'Přizpůsobte si kontrast, tónování a celkovou estetiku prostředí OmniDesk.': { ru: 'Настройте контраст, оттенки и общую эстетику среды OmniDesk.', en: 'Customize contrast, tint, and overall aesthetic of OmniDesk.', de: 'Passen Sie Kontrast, Tönung und Ästhetik von OmniDesk an.', es: 'Personalice el contraste, tonos y estética de OmniDesk.' },
  'Půlnoční modrá (Midnight Navy)': { ru: 'Полуночный синий (Midnight Navy)', en: 'Midnight Navy', de: 'Mitternachtsblau (Midnight Navy)', es: 'Azul Medianoche (Midnight Navy)' },
  'Čistě černá (OLED Black)': { ru: 'Глубокий черный (OLED Black)', en: 'Pure OLED Black', de: 'Reines Schwarz (OLED Black)', es: 'Negro Puro (OLED Black)' },
  'Grafitově šedá (Charcoal)': { ru: 'Графитово-серый (Charcoal)', en: 'Graphite Charcoal', de: 'Graphitgrau (Charcoal)', es: 'Gris Grafito (Charcoal)' },
  'Kybernetická smaragdová (Emerald)': { ru: 'Кибернетический изумруд (Emerald)', en: 'Cyber Emerald', de: 'Smaragdgrün (Emerald)', es: 'Esmeralda Cibernética (Emerald)' },
  'Temně fialová (Royal Twilight)': { ru: 'Темно-фиолетовый (Royal Twilight)', en: 'Royal Violet Twilight', de: 'Dunkelviolett (Royal Twilight)', es: 'Violeta Real (Royal Twilight)' },
  'Čistý moderní světlý (Clean Light)': { ru: 'Чистый светлый режим (Clean Light)', en: 'Clean Modern Light', de: 'Heller Modus (Clean Light)', es: 'Modo Claro Limpio (Clean Light)' },
  'Aktivní mini widgety v postranním panelu': { ru: 'Активные мини-виджеты в боковой панели', en: 'Active sidebar mini widgets', de: 'Aktive Seitenleisten-Widgets', es: 'Mini widgets activos en la barra lateral' },
  'Zapněte nebo vypněte zobrazení jednotlivých mini panelů.': { ru: 'Включите или отключите отображение отдельных мини-панелей.', en: 'Toggle visibility of individual sidebar panels.', de: 'Schalten Sie einzelne Seitenleisten-Panels ein oder aus.', es: 'Active o desactive los paneles laterales.' },
  'Přizpůsobení obsahu widgetů': { ru: 'Персонализация содержимого виджетов', en: 'Widget Content Customization', de: 'Widget-Inhalte anpassen', es: 'Personalización del contenido de widgets' },
  'Město pro hodiny': { ru: 'Город для часов', en: 'City for Clock', de: 'Stadt für die Uhr', es: 'Ciudad para el reloj' },
  'Sledovaná fiat měna': { ru: 'Отслеживаемая фиатная валюта', en: 'Tracked fiat currency', de: 'Verfolgte Fiat-Währung', es: 'Moneda fiduciaria rastreada' },
  'Sledovaná kryptoměna': { ru: 'Отслеживаемая криптовалюта', en: 'Tracked cryptocurrency', de: 'Verfolgte Kryptowährung', es: 'Criptomoneda rastreada' },
  'Rychlá poznámka': { ru: 'Быстрая заметка', en: 'Quick Note', de: 'Kurznotiz', es: 'Nota rápida' },
  'Napište rychlou myšlenku...': { ru: 'Напишите быструю заметку...', en: 'Type a quick note...', de: 'Schreiben Sie eine Notiz...', es: 'Escriba una nota rápida...' },
  'Záloha a migrace konfigurace mezi zařízeními': { ru: 'Резервное копирование и миграция между устройствами', en: 'Backup and Configuration Migration', de: 'Backup und Konfigurationsmigration', es: 'Copia de seguridad y migración de configuración' },
  'Exportujte své nastavení do standardního JSON souboru nebo jej jednoduše přeneste na jiný počítač.': { ru: 'Экспортируйте свои настройки в файл JSON или перенесите на другой компьютер.', en: 'Export your settings to a standard JSON file or transfer to another device.', de: 'Exportieren Sie Einstellungen als JSON oder übertragen Sie sie auf ein anderes Gerät.', es: 'Exporte su configuración a un archivo JSON o transfiérala a otro dispositivo.' },
  'Kopírovat JSON do schránky': { ru: 'Скопировать JSON в буфер', en: 'Copy JSON to clipboard', de: 'JSON in Zwischenablage kopieren', es: 'Copiar JSON al portapapeles' },
  'Nahrát a obnovit ze souboru .json': { ru: 'Загрузить и восстановить из .json', en: 'Upload & restore from .json file', de: 'Aus .json hochladen & wiederherstellen', es: 'Subir y restaurar desde .json' },
  'Vložit JSON textem': { ru: 'Вставить JSON текстом', en: 'Paste JSON as text', de: 'JSON als Text einfügen', es: 'Pegar JSON como texto' },
  'Skrýt vkládání textem': { ru: 'Скрыть текстовое поле', en: 'Hide text paste', de: 'Textfeld ausblenden', es: 'Ocultar entrada de texto' },
  'Vložte JSON kód profilu:': { ru: 'Вставьте JSON-код профиля:', en: 'Paste profile JSON code:', de: 'Fügen Sie den Profil-JSON ein:', es: 'Pegue el código JSON del perfil:' },
  'Aplikovat konfiguraci': { ru: 'Применить конфигурацию', en: 'Apply configuration', de: 'Konfiguration anwenden', es: 'Aplicar configuración' },
  'Aktuální konfigurace (Live JSON)': { ru: 'Текущая конфигурация (Live JSON)', en: 'Current configuration (Live JSON)', de: 'Aktuelle Konfiguration (Live JSON)', es: 'Configuración actual (Live JSON)' },
  'Tovární nastavení': { ru: 'Сброс до заводских настроек', en: 'Factory Reset', de: 'Werkseinstellungen', es: 'Restablecimiento de fábrica' },
  'Obnovit výchozí barevný režim, widgety i jazyk': { ru: 'Сбросить цветовую тему, виджеты и язык к исходным', en: 'Restore default color theme, widgets, and language', de: 'Standardfarbthema, Widgets und Sprache wiederherstellen', es: 'Restablecer tema, widgets e idioma' },
  'Výběr jazyka rozhraní': { ru: 'Выбор языка интерфейса', en: 'Interface Language Selection', de: 'Auswahl der Sprache', es: 'Selección del idioma' },
  'OmniDesk podporuje 5 plně lokalizovaných jazyků.': { ru: 'OmniDesk поддерживает 5 полностью локализованных языков.', en: 'OmniDesk supports 5 fully localized languages.', de: 'OmniDesk unterstützt 5 vollständig lokalisierte Sprachen.', es: 'OmniDesk admite 5 idiomas completamente traducidos.' },
  'Nastavení & Záloha': { ru: 'Настройки и Бэкап', en: 'Settings & Backup', de: 'Einstellungen & Backup', es: 'Configuración y Copia' },
  'Nastavení & Vzhled': { ru: 'Настройки и Внешний вид', en: 'Settings & Appearance', de: 'Einstellungen & Design', es: 'Configuración y Apariencia' },
  'Návrhy na další widgety do příštích verzí': { ru: 'Идеи для будущих виджетов', en: 'Ideas for future widgets', de: 'Ideen für zukünftige Widgets', es: 'Ideas para futuros widgets' },
};

// Word-level fallback vocabulary
const WORD_MAP: Record<string, Record<Exclude<SupportedLanguage, 'cs'>, string>> = {
  'znaků': { ru: 'символов', en: 'chars', de: 'Zeichen', es: 'caracteres' },
  'znak': { ru: 'символ', en: 'char', de: 'Zeichen', es: 'carácter' },
  'znaky': { ru: 'символа', en: 'chars', de: 'Zeichen', es: 'caracteres' },
  'atomů': { ru: 'атомов', en: 'atoms', de: 'Atome', es: 'átomos' },
  'atom': { ru: 'атом', en: 'atom', de: 'Atom', es: 'átomo' },
  'měny': { ru: 'валюты', en: 'currency', de: 'Währung', es: 'moneda' },
  'měna': { ru: 'валюта', en: 'currency', de: 'Währung', es: 'moneda' },
  'kurzy': { ru: 'курсы', en: 'rates', de: 'Kurse', es: 'tipos de cambio' },
  'kurz': { ru: 'курс', en: 'rate', de: 'Kurs', es: 'tipo de cambio' },
  'hodnota': { ru: 'стоимость', en: 'value', de: 'Wert', es: 'valor' },
  'hodnoty': { ru: 'стоимости', en: 'values', de: 'Werte', es: 'valores' },
  'převodník': { ru: 'конвертер', en: 'converter', de: 'Konverter', es: 'conversor' },
  'konvertor': { ru: 'конвертер', en: 'converter', de: 'Konverter', es: 'conversor' },
  'kalkulačka': { ru: 'калькулятор', en: 'calculator', de: 'Rechner', es: 'calculadora' },
  'kalkulátor': { ru: 'калькулятор', en: 'calculator', de: 'Rechner', es: 'calculadora' },
  'přehled': { ru: 'обзор', en: 'overview', de: 'Übersicht', es: 'resumen' },
  'z': { ru: 'из', en: 'from', de: 'von', es: 'de' },
  'do': { ru: 'в', en: 'to', de: 'in', es: 'a' },
  'na': { ru: 'на', en: 'to', de: 'auf', es: 'en' },
  'a': { ru: 'и', en: 'and', de: 'und', es: 'y' },
  's': { ru: 'с', en: 'with', de: 'mit', es: 'con' },
  'bez': { ru: 'без', en: 'without', de: 'ohne', es: 'sin' },
  'online': { ru: 'онлайн', en: 'online', de: 'online', es: 'en línea' },
  'offline': { ru: 'офлайн', en: 'offline', de: 'offline', es: 'offline' },
  'lokální': { ru: 'локальный', en: 'local', de: 'lokal', es: 'local' },
  'dnes': { ru: 'сегодня', en: 'today', de: 'heute', es: 'hoy' },
  'včera': { ru: 'вчера', en: 'yesterday', de: 'gestern', es: 'ayer' },
  'mince': { ru: 'монеты', en: 'coins', de: 'Münzen', es: 'monedas' },
  'mincí': { ru: 'монет', en: 'coins', de: 'Münzen', es: 'monedas' },
  'množství': { ru: 'количество', en: 'quantity', de: 'Menge', es: 'cantidad' },
  'částka': { ru: 'сумма', en: 'amount', de: 'Betrag', es: 'cantidad' },
  'součet': { ru: 'сумма', en: 'sum', de: 'Summe', es: 'suma' },
  'rozdíl': { ru: 'разность', en: 'difference', de: 'Differenz', es: 'diferencia' },
  'násobení': { ru: 'умножение', en: 'multiplication', de: 'Multiplikation', es: 'multiplicación' },
  'dělení': { ru: 'деление', en: 'division', de: 'Division', es: 'división' },
  'výsledek': { ru: 'результат', en: 'result', de: 'Ergebnis', es: 'resultado' },
  'zkopírováno': { ru: 'скопировано', en: 'copied', de: 'kopiert', es: 'copiado' },
  'chyba': { ru: 'ошибка', en: 'error', de: 'Fehler', es: 'error' },
  'úprava': { ru: 'редактирование', en: 'edit', de: 'Bearbeitung', es: 'edición' },
  'nastavení': { ru: 'настройки', en: 'settings', de: 'Einstellungen', es: 'configuración' },
  'převést': { ru: 'конвертировать', en: 'convert', de: 'umrechnen', es: 'convertir' },
  'vymazat': { ru: 'очистить', en: 'clear', de: 'löschen', es: 'borrar' },
  'uložit': { ru: 'сохранить', en: 'save', de: 'speichern', es: 'guardar' },
  'stáhnout': { ru: 'скачать', en: 'download', de: 'herunterladen', es: 'descargar' },
};

// In-memory runtime cache for dynamic translations
const runtimeCache = new Map<string, string>();

/**
 * Automatically translates a Czech string into the selected target language.
 * Uses exact phrase lookup first, then pattern & token matching, with instant caching.
 */
export function autoTranslate(
  text: string,
  targetLang: SupportedLanguage
): string {
  if (!text || targetLang === 'cs') {
    return text;
  }

  const trimmed = text.trim();
  const cacheKey = `${targetLang}:${trimmed}`;

  // 1. Check in-memory runtime cache
  if (runtimeCache.has(cacheKey)) {
    const cached = runtimeCache.get(cacheKey)!;
    return text.startsWith(' ') || text.endsWith(' ')
      ? text.replace(trimmed, cached)
      : cached;
  }

  // 2. Direct exact phrase dictionary match
  const phraseMatch = DICTIONARY[trimmed];
  if (phraseMatch && phraseMatch[targetLang]) {
    const result = phraseMatch[targetLang];
    runtimeCache.set(cacheKey, result);
    return text.startsWith(' ') || text.endsWith(' ')
      ? text.replace(trimmed, result)
      : result;
  }

  // 3. Case-insensitive phrase match
  const lowerTrimmed = trimmed.toLowerCase();
  for (const [czKey, translations] of Object.entries(DICTIONARY)) {
    if (czKey.toLowerCase() === lowerTrimmed && translations[targetLang]) {
      const result = translations[targetLang];
      runtimeCache.set(cacheKey, result);
      return result;
    }
  }

  // 4. Substring & regex phrase replacement for composite messages
  let translatedText = trimmed;
  let hasAnyMatch = false;

  for (const [czKey, translations] of Object.entries(DICTIONARY)) {
    if (translations[targetLang] && translatedText.includes(czKey)) {
      translatedText = translatedText.replace(new RegExp(escapeRegex(czKey), 'g'), translations[targetLang]);
      hasAnyMatch = true;
    }
  }

  // Dynamic regex replacements for counts like "38 znaků" -> "38 символов"
  const charMatch = translatedText.match(/^(\d+)\s+znaků$/);
  if (charMatch) {
    const num = charMatch[1];
    const unitMap = {
      ru: `${num} символов`,
      en: `${num} chars`,
      de: `${num} Zeichen`,
      es: `${num} caracteres`,
    };
    const res = unitMap[targetLang];
    runtimeCache.set(cacheKey, res);
    return res;
  }

  if (hasAnyMatch) {
    runtimeCache.set(cacheKey, translatedText);
    return translatedText;
  }

  // 5. Tokenized word-level replacement if it has multiple recognizable words
  const words = trimmed.split(/(\s+|[.,:;!?()[\]{}"])/);
  let wordMatches = 0;
  const translatedWords = words.map(chunk => {
    const cleanWord = chunk.trim().toLowerCase();
    if (WORD_MAP[cleanWord] && WORD_MAP[cleanWord][targetLang]) {
      wordMatches++;
      const repl = WORD_MAP[cleanWord][targetLang];
      if (chunk[0] && chunk[0] === chunk[0].toUpperCase() && chunk[0] !== chunk[0].toLowerCase()) {
        return repl.charAt(0).toUpperCase() + repl.slice(1);
      }
      return repl;
    }
    return chunk;
  });

  if (wordMatches > 0) {
    const result = translatedWords.join('');
    runtimeCache.set(cacheKey, result);
    return result;
  }

  // If nothing matched, cache original and return
  runtimeCache.set(cacheKey, text);
  return text;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
