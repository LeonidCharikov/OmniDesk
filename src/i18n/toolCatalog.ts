import { SupportedLanguage } from './context';

type CatalogText = Record<SupportedLanguage, string>;

const catalog: Record<string, { title: CatalogText; desc: CatalogText }> = {
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
    desc: { cs: 'Měňte velikost, komprimujte, zobrazujte náhled a exportujte obrázky jako JPEG.', en: 'Resize, compress, preview, and export images as JPEG.', de: 'Bilder skalieren, komprimieren, in der Vorschau anzeigen und als JPEG exportieren.', es: 'Cambia el tamaño, comprime, previsualiza y exporta imágenes como JPEG.', ru: 'Изменяйте размер, сжимайте, просматривайте и экспортируйте изображения в JPEG.' },
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
