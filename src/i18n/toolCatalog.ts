import { SupportedLanguage } from './context';

type CatalogText = Record<SupportedLanguage, string>;

const catalog: Record<string, { title: CatalogText; desc: CatalogText }> = {
  'pdf-editor': {
    title: {
      cs: 'PDF Studio & Vizuální Editor',
      en: 'PDF Studio & Visual Editor',
      de: 'PDF Studio & Visueller Editor',
      es: 'Estudio y Editor Visual de PDF',
      ru: 'PDF Студия и Визуальный Редактор',
    },
    desc: {
      cs: 'Vizuální editor PDF: přímá úprava a nahrazování textu, textová pole, bělitko, začernění, zvýrazňovač, kreslení, podpis a správa stránek.',
      en: 'Visual PDF editor: edit or replace text in-place, add text boxes, whiteout, redact, highlight, draw, digital signature, and page manager.',
      de: 'Visueller PDF-Editor: Text direkt bearbeiten oder ersetzen, Textfelder, Whiteout, Schwärzen, Textmarker, Zeichnen, Unterschrift und Seitenverwaltung.',
      es: 'Editor visual de PDF: edición o reemplazo directo de texto, cuadros de texto, corrector blanco, censura, resaltador, dibujo, firma y gestión de páginas.',
      ru: 'Визуальный редактор PDF: редактирование и замена текста на странице, текстовые блоки, белый корректор, цензура, выделитель, подпись и страницы.',
    },
  },
  'pdf-toolkit': {
    title: { cs: 'PDF nástroje', en: 'PDF Toolkit', de: 'PDF-Werkzeuge', es: 'Herramientas PDF', ru: 'Инструменты PDF' },
    desc: { cs: 'Lokálně slučujte vybrané soubory PDF nebo otočte všechny stránky jednoho PDF a uložte výsledek.', en: 'Merge selected PDF files or rotate all pages in one PDF locally, then save the result.', de: 'Ausgewählte PDF-Dateien zusammenführen oder alle Seiten einer PDF drehen und lokal speichern.', es: 'Une archivos PDF seleccionados o gira todas las páginas de un PDF y guarda el resultado localmente.', ru: 'Объединяйте выбранные PDF или поворачивайте все страницы одного PDF локально и сохраняйте результат.' },
  },
  'ocr-scanner': {
    title: { cs: 'OCR skener', en: 'OCR Scanner', de: 'OCR-Scanner', es: 'Escáner OCR', ru: 'OCR-сканер' },
    desc: { cs: 'Lokálně extrahujte text z obrázku pomocí OCR a zkopírujte upravitelný výsledek.', en: 'Extract text from an image locally with OCR and copy the editable result.', de: 'Text mit OCR lokal aus einem Bild extrahieren und das bearbeitbare Ergebnis kopieren.', es: 'Extrae texto de una imagen localmente con OCR y copia el resultado editable.', ru: 'Извлекайте текст из изображения локально с помощью OCR и копируйте результат.' },
  },
  'image-editor': {
    title: { cs: 'Editor obrázků', en: 'Image Editor', de: 'Bildeditor', es: 'Editor de imágenes', ru: 'Редактор изображений' },
    desc: {
      cs: 'Vizuální studio pro úpravu fotografií: změna šířky a výšky, ořez, rotace, filtry, jas, kontrast, vodoznaky a export.',
      en: 'Visual photo studio editor: manual width & height resize, cropping, rotation, filters, brightness, contrast, watermarks, and export.',
      de: 'Visuelles Fotostudio: Manuelle Breiten- und Höhenanpassung, Zuschnitt, Drehung, Filter, Helligkeit, Kontrast, Wasserzeichen und Export.',
      es: 'Estudio visual de fotos: cambio manual de ancho y alto, recorte, rotación, filtros, brillo, contraste, marcas de agua y exportación.',
      ru: 'Визуальная фотостудия: ручное изменение ширины и высоты, кадрирование, поворот, фильтры, яркость, контрастность, водяные знаки и экспорт.',
    },
  },
  'markdown-preview': {
    title: { cs: 'Náhled a export Markdownu', en: 'Markdown Preview & Export', de: 'Markdown-Vorschau und Export', es: 'Vista previa y exportación de Markdown', ru: 'Предпросмотр и экспорт Markdown' },
    desc: { cs: 'Živý náhled Markdownu s exportem do HTML.', en: 'Live Markdown preview with HTML export.', de: 'Live-Markdown-Vorschau mit HTML-Export.', es: 'Vista previa de Markdown en vivo con exportación HTML.', ru: 'Предпросмотр Markdown в реальном времени с экспортом в HTML.' },
  },
  kanban: {
    title: { cs: 'Úkoly / Kanban', en: 'To-do / Kanban', de: 'Aufgaben / Kanban', es: 'Tareas / Kanban', ru: 'Задачи / Канбан' },
    desc: { cs: 'Organizujte úkoly ve sloupcích naplánováno, probíhá a hotovo.', en: 'Organize tasks across planned, in-progress, and completed columns.', de: 'Aufgaben in den Spalten geplant, in Bearbeitung und erledigt organisieren.', es: 'Organiza tareas en columnas planificadas, en curso y completadas.', ru: 'Организуйте задачи в колонках запланировано, выполняется и готово.' },
  },
  notes: {
    title: { cs: 'Pracovní prostor poznámek', en: 'Notes Workspace', de: 'Notizen-Arbeitsbereich', es: 'Espacio de notas', ru: 'Рабочее пространство заметок' },
    desc: { cs: 'Spravujte lokální poznámky s vyhledáváním a automatickým ukládáním v prohlížeči.', en: 'Manage searchable local notes with automatic browser persistence.', de: 'Durchsuchbare lokale Notizen mit automatischer Speicherung im Browser verwalten.', es: 'Gestiona notas locales con búsqueda y guardado automático en el navegador.', ru: 'Управляйте локальными заметками с поиском и автоматическим сохранением в браузере.' },
  },
  'sql-playground': {
    title: { cs: 'SQL hřiště', en: 'SQL Playground', de: 'SQL-Spielplatz', es: 'Entorno SQL', ru: 'SQL-песочница' },
    desc: { cs: 'Spouštějte omezené dotazy SELECT nad řádky JSON lokálně bez databázového serveru.', en: 'Run limited SELECT queries against JSON rows locally without a database server.', de: 'Begrenzte SELECT-Abfragen auf JSON-Zeilen lokal ohne Datenbankserver ausführen.', es: 'Ejecuta consultas SELECT limitadas sobre filas JSON localmente sin servidor de base de datos.', ru: 'Запускайте ограниченные SELECT-запросы к строкам JSON локально без сервера базы данных.' },
  },
  'api-tester': {
    title: { cs: 'Tester API', en: 'API Tester', de: 'API-Tester', es: 'Probador de API', ru: 'Тестер API' },
    desc: { cs: 'Odesílejte požadavky GET, POST, PUT nebo DELETE a kontrolujte stav i odpovědi JSON či textu; platí pravidla CORS.', en: 'Send GET, POST, PUT, or DELETE requests and inspect status plus JSON or text responses; CORS rules apply.', de: 'GET-, POST-, PUT- oder DELETE-Anfragen senden und Status sowie JSON- oder Textantworten prüfen; CORS-Regeln gelten.', es: 'Envía solicitudes GET, POST, PUT o DELETE y revisa el estado y las respuestas JSON o de texto; se aplican reglas CORS.', ru: 'Отправляйте GET, POST, PUT или DELETE-запросы и проверяйте статус и ответы JSON или текста; действуют правила CORS.' },
  },
  'git-tools': {
    title: { cs: 'Git nástroje', en: 'Git Tools', de: 'Git-Werkzeuge', es: 'Herramientas Git', ru: 'Инструменты Git' },
    desc: { cs: 'Vložte Git log nebo diff, filtrujte jeho řádky a zkopírujte výsledek bez úprav repozitáře.', en: 'Paste a Git log or diff, filter its lines, and copy the result without modifying your repository.', de: 'Git-Log oder Diff einfügen, Zeilen filtern und das Ergebnis ohne Änderungen am Repository kopieren.', es: 'Pega un registro o diff de Git, filtra sus líneas y copia el resultado sin modificar el repositorio.', ru: 'Вставляйте Git log или diff, фильтруйте строки и копируйте результат без изменения репозитория.' },
  },
  'diagram-editor': {
    title: { cs: 'Editor diagramů', en: 'Diagram Editor', de: 'Diagrammeditor', es: 'Editor de diagramas', ru: 'Редактор диаграмм' },
    desc: { cs: 'Vytvářejte UML třídy, rozhraní, aktéry a případy užití, popsané šipky, upravitelný text a export SVG.', en: 'Create UML classes, interfaces, actors, use cases, labeled arrows, editable text, and SVG exports.', de: 'UML-Klassen, Schnittstellen, Akteure und Anwendungsfälle mit beschrifteten Pfeilen, bearbeitbarem Text und SVG-Export erstellen.', es: 'Crea clases, interfaces, actores y casos de uso UML, flechas etiquetadas, texto editable y exportaciones SVG.', ru: 'Создавайте UML-классы, интерфейсы, акторов и варианты использования, подписанные стрелки, редактируемый текст и экспорт SVG.' },
  },
  'budget-tracker': {
    title: { cs: 'Výdajový tracker a rozpočet', en: 'Expense Tracker & Budget', de: 'Ausgaben-Tracker und Budget', es: 'Gastos y presupuesto', ru: 'Трекер расходов и бюджет' },
    desc: { cs: 'Zaznamenávejte popisy a částky výdajů a sledujte průběžný součet aktuální relace.', en: 'Record expense descriptions and amounts and see the running total for the current session.', de: 'Ausgabenbeschreibungen und Beträge erfassen und die laufende Summe der Sitzung anzeigen.', es: 'Registra descripciones y cantidades de gastos y consulta el total de la sesión.', ru: 'Записывайте расходы и суммы и отслеживайте текущий итог сеанса.' },
  },
  'investment-calculator': {
    title: { cs: 'Investiční kalkulačka', en: 'Investment Calculator', de: 'Investitionsrechner', es: 'Calculadora de inversiones', ru: 'Инвестиционный калькулятор' },
    desc: { cs: 'Odhadněte složené zhodnocení z počátečního vkladu, měsíčních vkladů, ročního výnosu a délky investice.', en: 'Estimate compound growth from an initial deposit, monthly contributions, annual return, and time horizon.', de: 'Zinseszins aus Anfangseinlage, monatlichen Beiträgen, Jahresrendite und Laufzeit schätzen.', es: 'Estima el crecimiento compuesto con depósito inicial, aportaciones mensuales, rendimiento anual y plazo.', ru: 'Оценивайте сложный рост по начальному взносу, ежемесячным взносам, доходности и сроку.' },
  },
  'invoice-generator': {
    title: { cs: 'Generátor faktur', en: 'Invoice Generator', de: 'Rechnungsgenerator', es: 'Generador de facturas', ru: 'Генератор счетов' },
    desc: { cs: 'Vytvořte HTML fakturu s údaji dodavatele, odběratele a položkami.', en: 'Create an HTML invoice with supplier, customer, and line-item details.', de: 'HTML-Rechnung mit Lieferanten-, Kunden- und Positionsdaten erstellen.', es: 'Crea una factura HTML con datos del proveedor, cliente y partidas.', ru: 'Создавайте HTML-счет с данными поставщика, клиента и позициями.' },
  },
  'file-crypto': {
    title: { cs: 'Hashování a šifrování souborů', en: 'File Hashing & Encryption', de: 'Datei-Hashing und Verschlüsselung', es: 'Hash y cifrado de archivos', ru: 'Хеширование и шифрование файлов' },
    desc: { cs: 'Vypočítejte SHA-256 nebo zašifrujte text či soubor heslem pomocí AES-GCM.', en: 'Calculate SHA-256 or encrypt text or file content with password-derived AES-GCM.', de: 'SHA-256 berechnen oder Text bzw. Dateiinhalte mit passwortbasiertem AES-GCM verschlüsseln.', es: 'Calcula SHA-256 o cifra texto o archivos con AES-GCM derivado de contraseña.', ru: 'Вычисляйте SHA-256 или шифруйте текст и файлы с помощью AES-GCM и пароля.' },
  },
  'jwt-decoder': {
    title: { cs: 'Dekodér JWT', en: 'JWT Decoder', de: 'JWT-Dekodierer', es: 'Decodificador JWT', ru: 'Декодер JWT' },
    desc: { cs: 'Lokálně dekódujte hlavičku a obsah JWT; podpis se neověřuje.', en: 'Decode JWT header and payload locally; the signature is not verified.', de: 'JWT-Header und Payload lokal dekodieren; die Signatur wird nicht verifiziert.', es: 'Decodifica localmente el encabezado y payload JWT; la firma no se verifica.', ru: 'Локально декодируйте заголовок и полезную нагрузку JWT; подпись не проверяется.' },
  },
  'xml-formatter': {
    title: { cs: 'Formátovač a validátor XML', en: 'XML Formatter & Validator', de: 'XML-Formatierer und -Validator', es: 'Formateador y validador XML', ru: 'Форматтер и валидатор XML' },
    desc: { cs: 'Analyzujte XML parserem prohlížeče, oznamte chybný vstup a zobrazte čitelný výstup.', en: 'Parse XML in the browser, report malformed input, and display readable output.', de: 'XML im Browser parsen, fehlerhafte Eingaben melden und lesbare Ausgabe anzeigen.', es: 'Analiza XML en el navegador, informa entradas inválidas y muestra una salida legible.', ru: 'Разбирайте XML в браузере, сообщайте об ошибках и выводите читаемый результат.' },
  },
  'yaml-formatter': {
    title: { cs: 'Formátovač a validátor YAML', en: 'YAML Formatter & Validator', de: 'YAML-Formatierer und -Validator', es: 'Formateador y validador YAML', ru: 'Форматтер и валидатор YAML' },
    desc: { cs: 'Lokálně normalizujte základní konfigurační text YAML.', en: 'Normalize basic YAML configuration text locally.', de: 'Grundlegenden YAML-Konfigurationstext lokal normalisieren.', es: 'Normaliza localmente texto de configuración YAML básico.', ru: 'Локально нормализуйте базовый конфигурационный текст YAML.' },
  },
  'web-minifier': {
    title: { cs: 'Minifikátor CSS/HTML/JavaScriptu', en: 'CSS/HTML/JavaScript Minifier', de: 'CSS/HTML/JavaScript-Minifier', es: 'Minificador de CSS/HTML/JavaScript', ru: 'Минификатор CSS/HTML/JavaScript' },
    desc: { cs: 'Lokálně odstraňte komentáře a přebytečné mezery z CSS, HTML nebo JavaScriptu.', en: 'Remove comments and unnecessary whitespace from CSS, HTML, or JavaScript locally.', de: 'Kommentare und unnötige Leerzeichen aus CSS, HTML oder JavaScript lokal entfernen.', es: 'Elimina localmente comentarios y espacios innecesarios de CSS, HTML o JavaScript.', ru: 'Локально удаляйте комментарии и лишние пробелы из CSS, HTML или JavaScript.' },
  },
  'markdown-table': {
    title: { cs: 'Generátor Markdown tabulek', en: 'Markdown Table Generator', de: 'Markdown-Tabellengenerator', es: 'Generador de tablas Markdown', ru: 'Генератор таблиц Markdown' },
    desc: { cs: 'Převeďte řádky oddělené středníkem na Markdown tabulku a zkopírujte výsledek.', en: 'Convert semicolon-separated rows into a Markdown table and copy the result.', de: 'Durch Semikolons getrennte Zeilen in eine Markdown-Tabelle umwandeln und kopieren.', es: 'Convierte filas separadas por punto y coma en una tabla Markdown y copia el resultado.', ru: 'Преобразуйте строки, разделенные точкой с запятой, в таблицу Markdown и скопируйте результат.' },
  },
  'regex-builder': {
    title: { cs: 'Generátor regulárních výrazů', en: 'Regex Builder', de: 'Regex-Generator', es: 'Constructor de expresiones regulares', ru: 'Конструктор регулярных выражений' },
    desc: { cs: 'Escapujte hledaný text a spojte jej s příznaky do bezpečného základu výrazu.', en: 'Escape literal search text and combine it with flags to form a safe starting pattern.', de: 'Suchtext escapen und mit Flags zu einem sicheren Ausgangsmuster kombinieren.', es: 'Escapa el texto literal y combínalo con indicadores para crear un patrón inicial seguro.', ru: 'Экранируйте текст поиска и объедините его с флагами для безопасного шаблона.' },
  },
  'color-picker': {
    title: { cs: 'Výběr barvy z obrázku', en: 'Image Color Picker', de: 'Bildfarbpicker', es: 'Selector de color de imagen', ru: 'Пипетка цвета изображения' },
    desc: { cs: 'Otevřete obrázek, klikněte na pixel plátna a zjistěte jeho HEX barvu.', en: 'Open an image, click a canvas pixel, and read its HEX color.', de: 'Bild öffnen, auf einen Pixel klicken und dessen HEX-Farbe ablesen.', es: 'Abre una imagen, haz clic en un píxel y consulta su color HEX.', ru: 'Откройте изображение, нажмите на пиксель и узнайте его цвет HEX.' },
  },
  'screenshot-annotator': {
    title: { cs: 'Anotace snímků obrazovky', en: 'Screenshot Annotator', de: 'Screenshot-Annotator', es: 'Anotador de capturas', ru: 'Аннотатор снимков экрана' },
    desc: { cs: 'Otevřete obrázek, přidejte textovou anotaci a exportujte kopii PNG.', en: 'Open an image, add a text annotation, and export a PNG copy.', de: 'Bild öffnen, Textanmerkung hinzufügen und eine PNG-Kopie exportieren.', es: 'Abre una imagen, añade una anotación de texto y exporta una copia PNG.', ru: 'Откройте изображение, добавьте текстовую аннотацию и экспортируйте копию PNG.' },
  },
  'geo-gps': {
    title: { cs: 'Geografický a GPS převodník', en: 'Geographic & GPS Converter', de: 'Geografischer und GPS-Konverter', es: 'Convertidor geográfico y GPS', ru: 'Географический и GPS-конвертер' },
    desc: { cs: 'Převeďte desetinnou šířku a délku na zápis ve stupních, minutách a sekundách.', en: 'Convert decimal latitude and longitude to degrees, minutes, and seconds notation.', de: 'Dezimale Breiten- und Längengrade in Grad-, Minuten- und Sekundenformat umwandeln.', es: 'Convierte latitud y longitud decimales a grados, minutos y segundos.', ru: 'Преобразуйте десятичные координаты широты и долготы в градусы, минуты и секунды.' },
  },
  'periodic-finance': {
    title: { cs: 'Periodický finanční kalkulátor', en: 'Periodic Finance Calculator', de: 'Periodischer Finanzrechner', es: 'Calculadora financiera periódica', ru: 'Периодический финансовый калькулятор' },
    desc: { cs: 'Vypočítejte složené úročení z jistiny, roční sazby a počtu úročení.', en: 'Calculate compound interest from principal, annual rate, and compounding periods.', de: 'Zinseszins aus Kapital, Jahreszins und Verzinsungsperioden berechnen.', es: 'Calcula el interés compuesto a partir del capital, tasa anual y periodos.', ru: 'Рассчитайте сложный процент по сумме, годовой ставке и периодам начисления.' },
  },
  'binary-hex': {
    title: { cs: 'Binární a hexadecimální převodník', en: 'Binary & Hex Converter', de: 'Binär- und Hex-Konverter', es: 'Convertidor binario y hexadecimal', ru: 'Двоичный и шестнадцатеричный конвертер' },
    desc: { cs: 'Převeďte text UTF-8 na bajtový hexadecimální a binární výstup.', en: 'Convert UTF-8 text into byte-level hexadecimal and binary output.', de: 'UTF-8-Text in byteweise Hexadezimal- und Binärausgabe umwandeln.', es: 'Convierte texto UTF-8 a salida hexadecimal y binaria por bytes.', ru: 'Преобразуйте текст UTF-8 в побайтовый шестнадцатеричный и двоичный вид.' },
  },
  'time-tracker': {
    title: { cs: 'Sledování času', en: 'Time Tracker', de: 'Zeiterfassung', es: 'Registro de tiempo', ru: 'Учет времени' },
    desc: { cs: 'Sledujte čas více aktivit současně; data zůstávají v této relaci.', en: 'Track multiple activities at once; data remains in this session.', de: 'Mehrere Aktivitäten gleichzeitig verfolgen; die Daten bleiben in dieser Sitzung.', es: 'Registra varias actividades a la vez; los datos permanecen en esta sesión.', ru: 'Отслеживайте несколько действий одновременно; данные остаются в текущем сеансе.' },
  },
  'recurring-events': {
    title: { cs: 'Opakované události', en: 'Recurring Events', de: 'Wiederkehrende Ereignisse', es: 'Eventos recurrentes', ru: 'Повторяющиеся события' },
    desc: { cs: 'Naplánujte týdenní událost a zobrazte její následující výskyty.', en: 'Schedule a weekly event and display its upcoming occurrences.', de: 'Ein wöchentliches Ereignis planen und kommende Vorkommen anzeigen.', es: 'Programa un evento semanal y muestra sus próximas apariciones.', ru: 'Запланируйте еженедельное событие и просмотрите следующие вхождения.' },
  },
  'workday-calculator': {
    title: { cs: 'Pracovní dny a dovolená', en: 'Workdays & Vacation', de: 'Arbeitstage und Urlaub', es: 'Días laborables y vacaciones', ru: 'Рабочие дни и отпуск' },
    desc: { cs: 'Přičtěte pracovní dny k datu a ignorujte víkendy.', en: 'Add workdays to a date while ignoring weekends.', de: 'Arbeitstage zu einem Datum addieren und Wochenenden ignorieren.', es: 'Añade días laborables a una fecha ignorando los fines de semana.', ru: 'Добавляйте рабочие дни к дате, не учитывая выходные.' },
  },
  'hash-checksum-suite': {
    title: {
      cs: 'Hash, HMAC & Checksum Suite',
      en: 'Hash, HMAC & Checksum Suite',
      de: 'Hash-, HMAC- & Prüfsummen-Suite',
      es: 'Suite de Hash, HMAC y Checksums',
      ru: 'Набор хешей, HMAC и контрольных сумм',
    },
    desc: {
      cs: 'Lokální výpočet MD5, SHA-1, SHA-2, SHA-3, Keccak, CRC-32, Adler-32 a HMAC pro text i soubory s ověřením shody.',
      en: 'Compute MD5, SHA-1, SHA-2, SHA-3, Keccak, CRC-32, Adler-32 and HMAC locally for text or files with hash verification.',
      de: 'MD5, SHA-1, SHA-2, SHA-3, Keccak, CRC-32, Adler-32 und HMAC lokal für Text oder Dateien mit Prüfsummenvergleich berechnen.',
      es: 'Calcula MD5, SHA-1, SHA-2, SHA-3, Keccak, CRC-32, Adler-32 y HMAC localmente para texto o archivos con verificación.',
      ru: 'Локальный расчёт MD5, SHA-1, SHA-2, SHA-3, Keccak, CRC-32, Adler-32 и HMAC для текста и файлов с проверкой совпадения.',
    },
  },
  'encoding-suite': {
    title: {
      cs: 'Base32 / Base58 / Base64 & Web Kodér',
      en: 'Base32 / Base58 / Base64 & Web Encoder',
      de: 'Base32 / Base58 / Base64 & Web-Encoder',
      es: 'Codificador Base32 / Base58 / Base64 y Web',
      ru: 'Кодировщик Base32 / Base58 / Base64 и Web',
    },
    desc: {
      cs: 'Kódování a dekódování Base32, Base58, Base64URL, HTML entit, URL parametrů a Unicode escape sekvencí.',
      en: 'Encode and decode Base32, Base58, Base64URL, HTML entities, URL query parameters, and Unicode escapes.',
      de: 'Base32, Base58, Base64URL, HTML-Entitäten, URL-Parameter und Unicode-Escapes kodieren und dekodieren.',
      es: 'Codifica y decodifica Base32, Base58, Base64URL, entidades HTML, parámetros URL y escapes Unicode.',
      ru: 'Кодирование и декодирование Base32, Base58, Base64URL, HTML-сущностей, параметров URL и Unicode-последовательностей.',
    },
  },
  'uuid-generator': {
    title: {
      cs: 'Generátor UUID (v1–v7), ULID & NanoID',
      en: 'UUID (v1–v7), ULID & NanoID Generator',
      de: 'UUID (v1–v7), ULID & NanoID Generator',
      es: 'Generador de UUID (v1–v7), ULID y NanoID',
      ru: 'Генератор UUID (v1–v7), ULID и NanoID',
    },
    desc: {
      cs: 'Hromadné generování UUID v1, v3, v4, v5, v6, v7, ULID a NanoID včetně dekodéru časových razítek.',
      en: 'Generate UUID v1, v3, v4, v5, v6, v7, ULID and NanoID in bulk, and inspect embedded timestamps.',
      de: 'UUID v1, v3, v4, v5, v6, v7, ULID und NanoID in Serie generieren und eingebettete Zeitstempel prüfen.',
      es: 'Genera UUID v1, v3, v4, v5, v6, v7, ULID y NanoID en lote e inspecciona marcas de tiempo.',
      ru: 'Массовая генерация UUID v1, v3, v4, v5, v6, v7, ULID и NanoID с инспектором встроенных меток времени.',
    },
  },
  'number-base-converter': {
    title: {
      cs: 'Převodník Číselných Soustav & Bitové Operace',
      en: 'Number Base & Bitwise Converter',
      de: 'Zahlensystem- & Bitwise-Konverter',
      es: 'Conversor de Bases Numéricas y Bit a Bit',
      ru: 'Конвертер систем счисления и битовых операций',
    },
    desc: {
      cs: 'Přesný BigInt převod mezi soustavami (Bin, Oct, Dec, Hex, 2–36), doplňkový kód a bitové operace.',
      en: 'Arbitrary-precision BigInt converter across Binary, Octal, Decimal, Hex, Base 2–36, two\'s complement and bitwise ops.',
      de: 'Beliebig genauer BigInt-Konverter für Binär, Oktal, Dezimal, Hex, Basis 2–36, Zweierkomplement und Bitoperationen.',
      es: 'Conversor BigInt de precisión arbitraria entre binario, octal, decimal, hex, base 2–36 y operaciones bit a bit.',
      ru: 'Конвертер BigInt произвольной точности: Bin, Oct, Dec, Hex, основание 2–36, доп. код и битовые операции.',
    },
  },
  'case-converter': {
    title: {
      cs: 'Konvertor Velikosti Písmen & Textové Utility',
      en: 'Case Converter & Text Utilities',
      de: 'Groß-/Kleinschreibung & Text-Werkzeuge',
      es: 'Conversor de Mayúsculas y Utilidades de Texto',
      ru: 'Конвертер регистра и текстовые утилиты',
    },
    desc: {
      cs: 'Okamžitý převod camelCase, snake_case, kebab-case, CONSTANT_CASE, URL slugů a úprava řádků.',
      en: 'Convert between camelCase, snake_case, kebab-case, CONSTANT_CASE, slugs, and transform text lines.',
      de: 'Konvertieren zwischen camelCase, snake_case, kebab-case, CONSTANT_CASE, Slugs sowie Zeilenwerkzeuge.',
      es: 'Convierte entre camelCase, snake_case, kebab-case, CONSTANT_CASE, slugs y transforma líneas de texto.',
      ru: 'Мгновенное преобразование в camelCase, snake_case, kebab-case, CONSTANT_CASE, slug и обработка строк.',
    },
  },
  'timestamp-converter': {
    title: {
      cs: 'Unix Timestamp & Epoch Konvertor',
      en: 'Unix Timestamp & Epoch Converter',
      de: 'Unix-Zeitstempel & Epoch-Konverter',
      es: 'Conversor de Marca de Tiempo Unix y Epoch',
      ru: 'Конвертер Unix Timestamp и Epoch',
    },
    desc: {
      cs: 'Živé epoch hodiny, převod Unix času (s/ms/µs/ns) na datum ISO/UTC/lokální, aritmetika data a dávkový převod.',
      en: 'Convert Unix epochs (s, ms, µs, ns) to ISO 8601, UTC and local dates with date arithmetic and batch mode.',
      de: 'Unix-Zeitstempel (s, ms, µs, ns) in ISO 8601, UTC und lokale Daten mit Datumsarithmetik und Stapelmodus umwandeln.',
      es: 'Convierte épocas Unix (s, ms, µs, ns) a ISO 8601, UTC y fechas locales con aritmética y modo por lotes.',
      ru: 'Конвертация меток Unix (с, мс, мкс, нс) в ISO 8601, UTC и локальное время с арифметикой дат и пакетным режимом.',
    },
  },
  'cron-builder': {
    title: {
      cs: 'Cron Výrazy & Simulátor',
      en: 'Cron Expression Builder & Simulator',
      de: 'Cron-Ausdruck-Editor & Simulator',
      es: 'Generador y Simulador Cron',
      ru: 'Конструктор и симулятор Cron',
    },
    desc: {
      cs: 'Sestavování a validace 5-polových Cron výrazů se simulací budoucích časů spuštění.',
      en: 'Build and validate 5-field Cron expressions and simulate upcoming execution timestamps.',
      de: '5-Feld-Cron-Ausdrücke erstellen, validieren und nächste Ausführungszeiten simulieren.',
      es: 'Crea y valida expresiones Cron de 5 campos y simula las próximas ejecuciones.',
      ru: 'Создавайте и проверяйте 5-польные выражения Cron с симуляцией будущих запусков.',
    },
  },
  'cidr-calculator': {
    title: {
      cs: 'IPv4 / IPv6 Subnet & CIDR Kalkulačka',
      en: 'IPv4 / IPv6 Subnet & CIDR Calculator',
      de: 'IPv4 / IPv6 Subnetz- & CIDR-Rechner',
      es: 'Calculadora de Subredes IPv4 / IPv6 y CIDR',
      ru: 'Калькулятор подсетей IPv4 / IPv6 и CIDR',
    },
    desc: {
      cs: 'Výpočet adres sítě, broadcastu, masek, hostů, binární podoby, IPv6 bloků a dělení podsítí.',
      en: 'Calculate network ranges, netmasks, usable hosts, binary views, IPv6 blocks, and split subnets.',
      de: 'Netzbereiche, Netzmasken, nutzbare Hosts, Binäransicht, IPv6-Blöcke und Subnetz-Aufteilung berechnen.',
      es: 'Calcula rangos de red, máscaras, hosts utilizables, vistas binarias, bloques IPv6 y división de subredes.',
      ru: 'Расчёт диапазонов сети, масок, доступных хостов, двоичного вида, блоков IPv6 и разбиения подсетей.',
    },
  },
  'data-converter': {
    title: {
      cs: 'Konvertor Dat & TypeScript Generátor',
      en: 'Structured Data & TypeScript Generator',
      de: 'Datenkonverter & TypeScript-Generator',
      es: 'Conversor de Datos y Generador TypeScript',
      ru: 'Конвертер данных и генератор TypeScript',
    },
    desc: {
      cs: 'Převod mezi JSON, YAML, TOML a CSV nebo generování TypeScript rozhraní a JSON Schema.',
      en: 'Convert between JSON, YAML, TOML, and CSV, or generate TypeScript interfaces and JSON Schema.',
      de: 'Zwischen JSON, YAML, TOML und CSV konvertieren oder TypeScript-Interfaces und JSON-Schema erzeugen.',
      es: 'Convierte entre JSON, YAML, TOML y CSV o genera interfaces TypeScript y JSON Schema.',
      ru: 'Конвертируйте между JSON, YAML, TOML и CSV или создавайте интерфейсы TypeScript и JSON Schema.',
    },
  },
  'aes-cipher-studio': {
    title: {
      cs: 'AES Cipher & PBKDF2 Studio',
      en: 'AES Cipher & PBKDF2 Studio',
      de: 'AES-Chiffre & PBKDF2-Studio',
      es: 'Estudio de Cifrado AES y PBKDF2',
      ru: 'Студия шифрования AES и PBKDF2',
    },
    desc: {
      cs: 'Šifrování AES-GCM, AES-CBC a AES-CTR se 128/192/256bit klíči, vlastním IV a odvozením PBKDF2.',
      en: 'Configurable AES-GCM, AES-CBC, and AES-CTR encryption with 128/192/256-bit keys, custom IV, and PBKDF2 derivation.',
      de: 'Konfigurierbare AES-GCM-, CBC- und CTR-Verschlüsselung mit 128/192/256-Bit-Schlüsseln, IV und PBKDF2.',
      es: 'Cifrado AES-GCM, AES-CBC y AES-CTR con claves de 128/192/256 bits, IV personalizado y PBKDF2.',
      ru: 'Шифрование AES-GCM, AES-CBC и AES-CTR с ключами 128/192/256 бит, собственным IV и PBKDF2.',
    },
  },
  'chmod-reference': {
    title: {
      cs: 'Chmod Kalkulačka & HTTP / MIME / ASCII',
      en: 'Chmod Calculator & HTTP / MIME / ASCII',
      de: 'Chmod-Rechner & HTTP / MIME / ASCII',
      es: 'Calculadora Chmod y Referencia HTTP / MIME / ASCII',
      ru: 'Калькулятор Chmod и справочник HTTP / MIME / ASCII',
    },
    desc: {
      cs: 'Interaktivní Unix chmod kalkulačka a vyhledávací přehled HTTP stavů, MIME typů a ASCII tabulky.',
      en: 'Interactive Unix chmod permission calculator plus searchable HTTP status codes, MIME types, and ASCII table.',
      de: 'Interaktiver Unix-Chmod-Rechner sowie durchsuchbare HTTP-Codes, MIME-Typen und ASCII-Tabelle.',
      es: 'Calculadora interactiva de permisos Unix chmod más tabla buscable de códigos HTTP, MIME y ASCII.',
      ru: 'Интерактивный калькулятор прав Unix chmod, а также поиск по кодам HTTP, MIME-типам и таблице ASCII.',
    },
  },
  'jsonpath-explorer': {
    title: {
      cs: 'JSONPath Query Explorer',
      en: 'JSONPath Query Explorer',
      de: 'JSONPath-Abfrage-Explorer',
      es: 'Explorador de Consultas JSONPath',
      ru: 'Обозреватель запросов JSONPath',
    },
    desc: {
      cs: 'Filtrování a extrakce vnořených hodnot z JSON pomocí JSONPath výrazů a predikátů.',
      en: 'Filter and extract nested values from JSON using JSONPath (wildcards, slices, recursive descent, filters).',
      de: 'Verschachtelte Werte aus JSON mit JSONPath-Abfragen (Wildcards, Slices, Rekursion, Filter) extrahieren.',
      es: 'Filtra y extrae valores anidados de JSON con expresiones JSONPath (comodines, cortes, recursión y filtros).',
      ru: 'Фильтруйте и извлекайте вложенные значения из JSON с помощью выражений JSONPath.',
    },
  },
  'chemical-balancer': {
    title: {
      cs: 'Vyvažovač Chemických Rovnic & Stechiometrie',
      en: 'Chemical Equation Balancer & Stoichiometry',
      de: 'Reaktionsgleichungs-Ausgleicher & Stöchiometrie',
      es: 'Balanceador de Ecuaciones Químicas y Estequiometría',
      ru: 'Балансировщик химических уравнений и стехиометрия',
    },
    desc: {
      cs: 'Automatické vyčíslení chemických rovnic, výpočet limitujícího reaktantu a teoretického výtěžku.',
      en: 'Balance chemical reactions automatically and compute limiting reagents and theoretical product yields.',
      de: 'Chemische Gleichungen automatisch ausgleichen sowie limitierende Reaktanten und Ausbeute berechnen.',
      es: 'Balancea reacciones químicas automáticamente y calcula el reactivo limitante y el rendimiento teórico.',
      ru: 'Автоматическая расстановка коэффициентов, расчёт лимитирующего реагента и теоретического выхода.',
    },
  },
  'electronics-calc': {
    title: {
      cs: 'Elektronika & Výpočty Obvodů',
      en: 'Electronics & Circuit Calculator',
      de: 'Elektronik- & Schaltungsrechner',
      es: 'Calculadora de Electrónica y Circuitos',
      ru: 'Калькулятор электроники и цепей',
    },
    desc: {
      cs: 'Ohmův zákon, sériové a paralelní rezistory, dělič napětí, odpor pro LED a RC filtr.',
      en: "Ohm's law, series/parallel networks, voltage dividers, LED resistors, and RC filter cutoff frequency.",
      de: 'Ohmsches Gesetz, Reihen-/Parallelschaltung, Spannungsteiler, LED-Vorwiderstand und RC-Grenzfrequenz.',
      es: 'Ley de Ohm, redes en serie/paralelo, divisores de tensión, resistencia LED y filtro RC.',
      ru: 'Закон Ома, последовательные/параллельные цепи, делитель напряжения, резистор для LED и RC-фильтр.',
    },
  },
  'physics-toolkit': {
    title: {
      cs: 'Fyzika & Mechanika Toolkit',
      en: 'Physics & Mechanics Toolkit',
      de: 'Physik- & Mechanik-Toolkit',
      es: 'Kit de Física y Mecánica',
      ru: 'Инструментарий физики и механики',
    },
    desc: {
      cs: 'Kinematika šikmého vrhu, stavová rovnice ideálního plynu (PV=nRT), energie, vlnění a decibely.',
      en: 'Projectile kinematics, Ideal Gas Law (PV = nRT), kinetic/potential energy, and wave/decibel solvers.',
      de: 'Wurfkinematik, ideales Gasgesetz (PV = nRT), kinetische/potenzielle Energie sowie Wellen- und dB-Rechner.',
      es: 'Cinemática de proyectiles, ley de gases ideales (PV = nRT), energía, ondas y decibelios.',
      ru: 'Кинематика броска, уравнение идеального газа (PV = nRT), энергия, волны и децибелы.',
    },
  },
  'dna-analyzer': {
    title: {
      cs: 'Analyzátor DNA / RNA & Proteinů',
      en: 'DNA / RNA & Protein Sequence Analyzer',
      de: 'DNA- / RNA- & Proteinsequenz-Analysator',
      es: 'Analizador de Secuencias ADN / ARN y Proteínas',
      ru: 'Анализатор последовательностей ДНК / РНК и белков',
    },
    desc: {
      cs: 'Komplement, reverzní komplement, transkripce mRNA, translace do 3 čtecích rámců, GC% a teplota tání.',
      en: 'Complement, reverse complement, mRNA transcription, 3-frame translation, GC% and melting temperature.',
      de: 'Komplement, Revers-Komplement, mRNA-Transkription, 3-Frame-Translation, GC% und Schmelztemperatur.',
      es: 'Complemento, complemento inverso, transcripción ARNm, traducción en 3 marcos, %GC y temperatura Tm.',
      ru: 'Комплемент, обратный комплемент, транскрипция мРНК, трансляция в 3 рамках, GC% и температура плавления.',
    },
  },
  'solar-ephemeris': {
    title: {
      cs: 'Sluneční, Měsíční & Geodetická Efemerida',
      en: 'Solar, Moon & Geodesic Ephemeris',
      de: 'Sonnen-, Mond- & Geodäsie-Ephemeride',
      es: 'Efemérides Solares, Lunares y Geodésicas',
      ru: 'Солнечные, лунные и геодезические эфемериды',
    },
    desc: {
      cs: 'Východ a západ Slunce, zlatá hodinka, juliánské datum, fáze Měsíce a Haversine vzdálenost.',
      en: 'Sunrise, solar noon, sunset, golden hour, Julian date, lunar phase, and great-circle Haversine distance.',
      de: 'Sonnenauf-/untergang, goldene Stunde, Julianisches Datum, Mondphase und Haversine-Großkreisdistanz.',
      es: 'Amanecer, mediodía solar, atardecer, hora dorada, fecha juliana, fase lunar y distancia Haversine.',
      ru: 'Восход и закат, золотой час, юлианская дата, фаза Луны и ортодромическое расстояние Хаверсина.',
    },
  },
  'npv-irr-calc': {
    title: {
      cs: 'NPV, IRR & CAGR Analýza Cashflow',
      en: 'NPV, IRR & CAGR Cashflow Analyzer',
      de: 'NPV-, IRR- & CAGR-Cashflow-Rechner',
      es: 'Analizador de Flujos NPV, IRR y CAGR',
      ru: 'Анализатор денежных потоков NPV, IRR и CAGR',
    },
    desc: {
      cs: 'Diskontované cashflow (NPV, IRR, index ziskovosti, doba návratnosti) a složený roční růst CAGR.',
      en: 'Discounted cashflow valuation (NPV, IRR, Profitability Index, Payback) and CAGR calculator.',
      de: 'Abgezinste Cashflow-Bewertung (NPV, IRR, Profitabilitätsindex, Amortisation) und CAGR-Rechner.',
      es: 'Valoración por flujo descontado (VAN, TIR, índice de rentabilidad, recuperación) y CAGR.',
      ru: 'Оценка дисконтированных потоков (NPV, IRR, индекс доходности, окупаемость) и расчёт CAGR.',
    },
  },
  'breakeven-margin': {
    title: {
      cs: 'Bod Zvratu, Marže vs. Přirážka & Cenotvorba',
      en: 'Break-Even, Margin vs. Markup & Pricing',
      de: 'Break-Even, Marge vs. Aufschlag & Preisfindung',
      es: 'Punto de Equilibrio, Margen vs. Recargo y Precios',
      ru: 'Точка безубыточности, маржа и наценка',
    },
    desc: {
      cs: 'Výpočet bodu zvratu, převod marže a přirážky, cílový zisk a jednotková ekonomika SaaS (LTV/CAC).',
      en: 'Calculate break-even volume, contribution margin, markup conversion, and SaaS LTV/CAC unit economics.',
      de: 'Break-Even-Menge, Deckungsbeitrag, Margen-/Aufschlagumrechnung und SaaS-LTV/CAC berechnen.',
      es: 'Calcula punto de equilibrio, margen de contribución, conversión margen/recargo y LTV/CAC SaaS.',
      ru: 'Расчёт точки безубыточности, маржи и наценки, целевой прибыли и юнит-экономики SaaS (LTV/CAC).',
    },
  },
  'portfolio-rebalancer': {
    title: {
      cs: 'Rebalancování Portfolia & DCA Plánovač',
      en: 'Portfolio Rebalancer & DCA Planner',
      de: 'Portfolio-Rebalancer & Sparplan-Rechner (DCA)',
      es: 'Rebalanceador de Cartera y Planificador DCA',
      ru: 'Ребалансировщик портфеля и планировщик DCA',
    },
    desc: {
      cs: 'Přesné nákupní a prodejní příkazy pro rebalancování s novým vkladem a srovnání Lump-Sum vs. DCA.',
      en: 'Calculate exact buy/sell rebalancing orders with new cash contributions and compare Lump-Sum vs. DCA.',
      de: 'Exakte Kauf-/Verkaufsorders zum Rebalancing berechnen und Einmalanlage vs. DCA vergleichen.',
      es: 'Calcula órdenes exactas de compra/venta para rebalancear y compara inversión única frente a DCA.',
      ru: 'Точный расчёт ордеров покупки/продажи для ребалансировки и сравнение единовременного входа и DCA.',
    },
  },
  'fire-simulator': {
    title: {
      cs: 'FIRE & Simulátor Finanční Nezávislosti',
      en: 'FIRE & Inflation-Adjusted Retirement Simulator',
      de: 'FIRE- & inflationsbereinigter Ruhestandsrechner',
      es: 'Simulador FIRE y Jubilación Ajustada a Inflación',
      ru: 'Симулятор FIRE и пенсии с учётом инфляции',
    },
    desc: {
      cs: 'Simulace FIRE, Coast-FIRE, reálné kupní síly po inflaci a bezpečné míry výběru.',
      en: 'Simulate Financial Independence (FIRE), Coast-FIRE, real purchasing power, and safe withdrawal rates.',
      de: 'Finanzielle Unabhängigkeit (FIRE), Coast-FIRE, reale Kaufkraft und Entnahmeraten simulieren.',
      es: 'Simula independencia financiera (FIRE), Coast-FIRE, poder adquisitivo real y tasa de retiro segura.',
      ru: 'Симуляция финансовой независимости (FIRE), Coast-FIRE, реальной доходности и ставки изъятия.',
    },
  },
  'freelance-rate-calc': {
    title: {
      cs: 'Freelance Sazba & Převodník Mzdy',
      en: 'Freelance Rate & Salary Converter',
      de: 'Freelancer-Stundensatz & Gehaltsrechner',
      es: 'Calculadora de Tarifa Freelance y Salario',
      ru: 'Калькулятор ставки фрилансера и зарплаты',
    },
    desc: {
      cs: 'Výpočet udržitelné hodinové, denní a měsíční sazby se započtením daní, režie, dovolené a vytížení.',
      en: 'Determine sustainable hourly, daily, and monthly retainer rates accounting for taxes, overhead, PTO, and utilization.',
      de: 'Nachhaltige Stunden-, Tages- und Monatssätze unter Berücksichtigung von Steuern, Fixkosten und Urlaub berechnen.',
      es: 'Calcula tarifas por hora, día y retención mensual considerando impuestos, gastos fijos y vacaciones.',
      ru: 'Расчёт устойчивой часовой, дневной и месячной ставки с учётом налогов, расходов, отпуска и загрузки.',
    },
  },
  'bmi-calculator': {
    title: {
      cs: 'BMI & Kalkulačka Složení Těla',
      en: 'BMI & Body Composition Calculator',
      de: 'BMI- & Körperzusammensetzungs-Rechner',
      es: 'Calculadora de IMC y Composición Corporal',
      ru: 'Калькулятор ИМТ и состава тела',
    },
    desc: {
      cs: 'WHO Index tělesné hmotnosti (BMI), rozsah zdravé váhy, Ponderal index, pas/výška a US Navy tělesný tuk.',
      en: 'WHO Body Mass Index, healthy weight range, Ponderal Index, Waist-to-Height ratio, and US Navy body fat %.',
      de: 'WHO Body-Mass-Index, Idealgewichtsbereich, Ponderal-Index, WHtR und US-Navy-Körperfettanteil.',
      es: 'Índice de masa corporal (OMS), rango saludable, índice ponderal, relación cintura-altura y % de grasa US Navy.',
      ru: 'Индекс массы тела (ВОЗ), диапазон здорового веса, индекс Пондерала, талия/рост и % жира US Navy.',
    },
  },
  'calories-calculator': {
    title: {
      cs: 'Kalkulačka Kalorií, BMR & Maker',
      en: 'Calories, BMR & Macro Calculator',
      de: 'Kalorien-, BMR- & Makronährstoff-Rechner',
      es: 'Calculadora de Calorías, TMB y Macros',
      ru: 'Калькулятор калорий, БМР и макронутриентов',
    },
    desc: {
      cs: 'Bazální metabolismus (Mifflin-St Jeor & Katch-McArdle), denní výdej TDEE a rozpis bílkovin, sacharidů a tuků.',
      en: 'Daily energy expenditure (Mifflin-St Jeor & Katch-McArdle), TDEE activity targets, and macro gram splits.',
      de: 'Grundumsatz (Mifflin-St Jeor & Katch-McArdle), TDEE-Kalorienziele und Makroverteilung in Gramm.',
      es: 'Gasto energético (Mifflin-St Jeor y Katch-McArdle), objetivos TDEE por actividad y reparto de macros.',
      ru: 'Базовый обмен (Mifflin-St Jeor и Katch-McArdle), суточный расход TDEE и баланс БЖУ в граммах.',
    },
  },
};

export function getToolCatalogText(id: string, field: 'title' | 'desc', language: SupportedLanguage, fallback: string) {
  return catalog[id]?.[field][language] || fallback;
}

export function findToolCatalogIdByTitle(title: string) {
  const aliases: Record<string, string> = {
    'Poznámky': 'notes',
    'UML Diagram Editor': 'diagram-editor',
    'Minifikátor CSS / HTML / JavaScriptu': 'web-minifier',
    'CSS / HTML / JavaScript minifier': 'web-minifier',
    'Výdaje a rozpočet': 'budget-tracker',
    'Expenses & budget': 'budget-tracker',
  };
  return aliases[title] || Object.entries(catalog).find(([, value]) => Object.values(value.title).includes(title))?.[0];
}
