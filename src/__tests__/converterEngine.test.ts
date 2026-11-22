// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  FORMAT_CATALOG,
  TOTAL_SUPPORTED_FORMATS,
  detectCategoryForFile,
  detectFileExtension,
  getDefaultTargetFormat,
  getTargetFormatsForInput,
  stripExtension,
} from '../tools/files/converterCatalog';
import {
  buildMinimalDocx,
  compressGzip,
  createTarArchive,
  createZipArchive,
  decompressGzip,
  encodeAiffPcm16,
  encodeBmp24,
  encodeIcoFromPng,
  encodeWavPcm16,
  htmlToMarkdown,
  markdownToHtml,
  parseDelimitedText,
  parseSimpleXmlToRows,
  parseTarArchive,
  parseZipArchive,
  resampleChannelData,
  rowsToHtmlTable,
  rowsToMarkdownTable,
  rowsToXml,
  serializeDelimitedRows,
  stripRtfToText,
} from '../tools/files/converterEncoders';
import {
  createPdfBlobFromDocx,
  createPdfBlobFromHtml,
  createPdfBlobFromPlainText,
  createPdfBlobFromTableRows,
  parseDocxToLayoutModel,
  setDocumentPdfFontBundle,
} from '../tools/files/documentPdfEngine';

function buildCzechPowerOfAttorneyDocx(): ArrayBuffer {
  const enc = new TextEncoder();
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="1E293B"/></w:rPr>
  </w:style>
</w:styles>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Title"/></w:pPr>
      <w:r><w:t>PLNÁ MOC</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="both"/></w:pPr>
      <w:r><w:t xml:space="preserve">Já níže podepsaný </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Leonid Čarikov</w:t></w:r>
      <w:r><w:t xml:space="preserve">, bytem Praha, tímto zmocňuji (neuvedeno – dovoz USA) k převzetí vozidla a vyřízení veškerých úkonů. Кириллица: Привет!</w:t></w:r>
    </w:p>
    <w:tbl>
      <w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="6000"/></w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:shd w:fill="E2E8F0"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Zmocnitel</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Leonid Čarikov</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:shd w:fill="E2E8F0"/></w:tcPr><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Poznámka</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:rPr><w:i/><w:u w:val="single"/></w:rPr><w:t>neuvedeno – dovoz USA</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const bytes = createZipArchive([
    { name: '[Content_Types].xml', data: enc.encode(contentTypes), size: contentTypes.length },
    { name: '_rels/.rels', data: enc.encode(rootRels), size: rootRels.length },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels), size: docRels.length },
    { name: 'word/styles.xml', data: enc.encode(stylesXml), size: stylesXml.length },
    { name: 'word/document.xml', data: enc.encode(documentXml), size: documentXml.length },
  ]);

  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

describe('converterCatalog', () => {
  it('exposes 6 categories and 30+ formats', () => {
    expect(FORMAT_CATALOG).toHaveLength(6);
    expect(TOTAL_SUPPORTED_FORMATS).toBeGreaterThanOrEqual(30);
  });

  it('detects file extensions and categories accurately', () => {
    expect(detectFileExtension('clip.mp4')).toBe('mp4');
    expect(detectCategoryForFile('clip.mp4', 'video/mp4')).toBe('video');
    expect(detectCategoryForFile('movie.mkv')).toBe('video');

    expect(detectFileExtension('backup.tar.gz')).toBe('tar.gz');
    expect(detectCategoryForFile('backup.tar.gz')).toBe('archives');

    expect(detectFileExtension('voice.webm', 'audio/webm')).toBe('webm');
    expect(detectCategoryForFile('voice.webm', 'audio/webm')).toBe('audio');
    expect(detectCategoryForFile('screen.webm', 'video/webm')).toBe('video');

    expect(detectFileExtension('sheet.xlsx')).toBe('xlsx');
    expect(detectCategoryForFile('sheet.xlsx')).toBe('spreadsheets');

    expect(stripExtension('archive.tar.gz')).toBe('archive');
    expect(stripExtension('photo.jpeg')).toBe('photo');
  });

  it('returns valid target formats and sensible defaults for each category', () => {
    const mp4Targets = getTargetFormatsForInput('mp4', 'video').map(t => t.ext);
    expect(mp4Targets).toContain('webm');
    expect(mp4Targets).toContain('gif');
    expect(mp4Targets).toContain('wav');
    expect(getDefaultTargetFormat('mp4', 'video')).toBe('webm');
    expect(getDefaultTargetFormat('webm', 'video')).toBe('gif');

    const pdfTargets = getTargetFormatsForInput('pdf', 'documents').map(t => t.ext);
    expect(pdfTargets).toContain('txt');
    expect(pdfTargets).toContain('docx');
    expect(pdfTargets).toContain('png');

    const xlsxTargets = getTargetFormatsForInput('xlsx', 'spreadsheets').map(t => t.ext);
    expect(xlsxTargets).toContain('csv');
    expect(xlsxTargets).toContain('json');
    expect(xlsxTargets).toContain('pdf');
    expect(xlsxTargets).not.toContain('xlsx');
  });
});

describe('converterEncoders binary codecs', () => {
  it('encodes valid RIFF WAVE 16-bit PCM audio headers and supports resampling', () => {
    const src = [new Float32Array([0, 0.5, -0.5, 1, -1])];
    const resampled = resampleChannelData(src, 44100, 22050, 2);
    expect(resampled).toHaveLength(2);
    expect(resampled[0].length).toBeGreaterThan(0);

    const wav = encodeWavPcm16(resampled, 22050);
    const header = new TextDecoder().decode(wav.subarray(0, 4));
    const waveTag = new TextDecoder().decode(wav.subarray(8, 12));
    expect(header).toBe('RIFF');
    expect(waveTag).toBe('WAVE');
    expect(wav.length).toBe(44 + resampled[0].length * 2 * 2);
  });

  it('encodes valid FORM AIFF 16-bit PCM headers', () => {
    const channels = [new Float32Array([0.25, -0.25]), new Float32Array([0.25, -0.25])];
    const aiff = encodeAiffPcm16(channels, 44100);
    expect(new TextDecoder().decode(aiff.subarray(0, 4))).toBe('FORM');
    expect(new TextDecoder().decode(aiff.subarray(8, 12))).toBe('AIFF');
    expect(new TextDecoder().decode(aiff.subarray(12, 16))).toBe('COMM');
  });

  it('encodes valid 24-bit BMP and ICO headers', () => {
    const rgba = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255,
      0, 0, 255, 255, 255, 255, 255, 255,
    ]);
    const bmp = encodeBmp24(rgba, 2, 2);
    expect(bmp[0]).toBe(0x42); // B
    expect(bmp[1]).toBe(0x4d); // M
    expect(bmp.length).toBeGreaterThan(54);

    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ico = encodeIcoFromPng(fakePng, 64, 64);
    expect(ico[2]).toBe(1); // ICO type
    expect(ico[4]).toBe(1); // 1 image
    expect(ico[6]).toBe(64); // width
    expect(ico[7]).toBe(64); // height
    expect(ico.length).toBe(22 + fakePng.length);
  });
});

describe('converterEncoders documents, data, and archives', () => {
  it('parses RTF with Czech Windows-1250 hex escapes, Unicode escapes, and skips ignorable groups', () => {
    const rtf =
      '{\\rtf1\\ansi\\ansicpg1250{\\fonttbl\\f0 Arial;}{\\*\\themedata 01020304AABBCC}' +
      '\\uc1 Pln\\\'e1 moc: \\b Leonid \\u268?arikov\\b0\\par (neuvedeno \\u8211? dovoz USA)}';
    const text = stripRtfToText(rtf);
    expect(text).toContain('Plná moc:');
    expect(text).toContain('Leonid Čarikov');
    expect(text).toContain('neuvedeno – dovoz USA');
    expect(text).not.toContain('01020304AABBCC');
    expect(text).not.toContain('?');
  });

  it('converts Markdown, HTML tables, and generates rich DOCX ZIP archives with styles & tables', () => {
    const html = markdownToHtml('# Heading\n\nSome **bold** text\n\n- Item A', 'Test');
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(htmlToMarkdown(html)).toContain('# Heading');
    expect(htmlToMarkdown(html)).toContain('**bold**');

    const tableHtml =
      '<table><thead><tr><th>Name</th><th>Note</th></tr></thead>' +
      '<tbody><tr><td>Čarikov</td><td>USA &#8211; Import</td></tr></tbody></table>';
    const mdFromTable = htmlToMarkdown(tableHtml);
    expect(mdFromTable).toContain('| Name | Note |');
    expect(mdFromTable).toContain('| Čarikov | USA – Import |');

    const docxBytes = buildMinimalDocx('# Title\n\nSome **bold** and *italic* text\n\n| A | B |\n| --- | --- |\n| 1 | 2 |');
    const entries = parseZipArchive(docxBytes);
    const names = entries.map(e => e.name);
    expect(names).toContain('[Content_Types].xml');
    expect(names).toContain('word/document.xml');
    expect(names).toContain('word/styles.xml');
    expect(names).toContain('word/_rels/document.xml.rels');

    const docXml = new TextDecoder().decode(entries.find(e => e.name === 'word/document.xml')!.data);
    expect(docXml).toContain('<w:b/>');
    expect(docXml).toContain('<w:i/>');
    expect(docXml).toContain('<w:tbl>');
  });

  it('roundtrips CSV (with UTF-8 BOM), XML (with entities), nested JSON, Markdown table, and HTML table cleanly', () => {
    const csv = '\uFEFFName,Price,Active\r\n"Widget, Pro",49.5,true\r\nLamp & Bulb,19,false';
    const rows = parseDelimitedText(csv, ',');
    expect(rows).toHaveLength(2);
    expect(rows[0].Name).toBe('Widget, Pro');
    expect(rows[0].Price).toBe(49.5);
    expect(rows[0].Active).toBe(true);

    const reserialized = serializeDelimitedRows(rows, ',');
    expect(reserialized).toContain('"Widget, Pro"');

    const xml = rowsToXml(rows);
    expect(xml).toContain('<records>');
    const parsedXml = parseSimpleXmlToRows(xml);
    expect(parsedXml).toHaveLength(2);
    expect(parsedXml[0].Price).toBe(49.5);
    expect(parsedXml[1].Name).toBe('Lamp & Bulb');

    const nestedRows = [{ item: 'Kit', meta: { count: 2 } }];
    const mdTable = rowsToMarkdownTable(nestedRows);
    expect(mdTable).toContain('{"count":2}');
    expect(mdTable).not.toContain('[object Object]');
    const htmlTable = rowsToHtmlTable(nestedRows);
    expect(htmlTable).toContain('<table>');
    expect(htmlTable).not.toContain('[object Object]');
  });

  it('roundtrips ZIP, TAR (including long filenames >100 chars), and GZIP archives losslessly', () => {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const longPath =
      'deeply/nested/folder/structure/for/testing/ustar/and/gnu/longlink/filenames/very_long_document_name_over_hundred_chars.txt';
    expect(longPath.length).toBeGreaterThan(100);

    const input = [
      { name: 'hello.txt', data: enc.encode('Hello OmniDesk'), size: 14 },
      { name: 'nested/data.json', data: enc.encode('{"ok":true}'), size: 11 },
      { name: longPath, data: enc.encode('Long path content'), size: 17 },
    ];

    const tarBytes = createTarArchive(input);
    const tarGzBytes = compressGzip(tarBytes);
    const unzippedTar = decompressGzip(tarGzBytes);
    const parsedTar = parseTarArchive(unzippedTar);
    expect(parsedTar).toHaveLength(3);
    expect(dec.decode(parsedTar[0].data)).toBe('Hello OmniDesk');
    expect(parsedTar[1].name).toBe('nested/data.json');
    expect(parsedTar[2].name).toBe(longPath);
    expect(dec.decode(parsedTar[2].data)).toBe('Long path content');

    const zipBytes = createZipArchive(parsedTar);
    const parsedZip = parseZipArchive(zipBytes);
    expect(parsedZip).toHaveLength(3);
    expect(dec.decode(parsedZip[1].data)).toBe('{"ok":true}');
  });
});

describe('documentPdfEngine full-Unicode OOXML & PDF generation', () => {
  beforeAll(() => {
    const fontsDir = path.resolve(process.cwd(), 'src/assets/fonts');
    setDocumentPdfFontBundle({
      regular: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'LiberationSans-Regular.ttf'))),
      bold: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'LiberationSans-Bold.ttf'))),
      italic: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'LiberationSans-Italic.ttf'))),
      boldItalic: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'LiberationSans-BoldItalic.ttf'))),
      mono: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'LiberationMono-Regular.ttf'))),
    });
  });

  it('parses Czech & Cyrillic DOCX OOXML preserving alignment, styles, diacritics, and tables', () => {
    const docxBuffer = buildCzechPowerOfAttorneyDocx();
    const model = parseDocxToLayoutModel(docxBuffer);

    expect(model.blocks.length).toBe(3);

    const title = model.blocks[0];
    expect(title.kind).toBe('paragraph');
    if (title.kind === 'paragraph') {
      expect(title.align).toBe('center');
      expect(title.runs[0].text).toBe('PLNÁ MOC');
      expect(title.runs[0].bold).toBe(true);
      expect(title.runs[0].fontSize).toBe(18);
    }

    const body = model.blocks[1];
    expect(body.kind).toBe('paragraph');
    if (body.kind === 'paragraph') {
      expect(body.align).toBe('justify');
      const fullText = body.runs.map(r => r.text).join('');
      expect(fullText).toContain('Já níže podepsaný');
      expect(fullText).toContain('Leonid Čarikov');
      expect(fullText).toContain('neuvedeno – dovoz USA');
      expect(fullText).toContain('Кириллица: Привет!');
    }

    const table = model.blocks[2];
    expect(table.kind).toBe('table');
    if (table.kind === 'table') {
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0].cells[0].backgroundColor).toBeDefined();
      expect(table.rows[1].cells[1].paragraphs[0].runs[0].underline).toBe(true);
    }
  });

  it('generates valid vector PDF from DOCX with Unicode fonts and no artificial OmniDesk header', async () => {
    const docxBuffer = buildCzechPowerOfAttorneyDocx();
    const blob = await createPdfBlobFromDocx(docxBuffer);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(2000);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder('latin1').decode(bytes.subarray(0, 5))).toBe('%PDF-');
    expect(new TextDecoder('latin1').decode(bytes)).not.toContain('(OmniDesk)');

    const pdfDoc = await PDFDocument.load(bytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    const { width, height } = pdfDoc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595); // A4 width from w:pgSz 11906 twips
    expect(Math.round(height)).toBe(842); // A4 height from w:pgSz 16838 twips
  });

  it('generates valid Unicode PDFs from HTML, Plain Text, and Spreadsheet Table Rows', async () => {
    const htmlBlob = await createPdfBlobFromHtml(
      '<h1>Přehled smlouvy</h1><p>Cena: <strong>12 500 €</strong> – schváleno.</p>'
    );
    const htmlDoc = await PDFDocument.load(new Uint8Array(await htmlBlob.arrayBuffer()));
    expect(htmlDoc.getPageCount()).toBe(1);

    const txtBlob = await createPdfBlobFromPlainText('Příliš žluťoučký kůň úpěl ďábelské ódy.\nПривет мир!');
    const txtDoc = await PDFDocument.load(new Uint8Array(await txtBlob.arrayBuffer()));
    expect(txtDoc.getPageCount()).toBe(1);

    const tableBlob = await createPdfBlobFromTableRows(
      [
        { Jméno: 'Leonid Čarikov', Poznámka: 'neuvedeno – dovoz USA', Částka: 1500 },
        { Jméno: 'Jana Nováková', Poznámka: 'Schváleno', Částka: 2400 },
      ],
      'Seznam klientů'
    );
    const tableDoc = await PDFDocument.load(new Uint8Array(await tableBlob.arrayBuffer()));
    expect(tableDoc.getPageCount()).toBe(1);
  });

  it('preserves two-column layout, column breaks, gray run highlights/shading, leading spaces, and tab stops in DOCX -> PDF', async () => {
    const enc = new TextEncoder();
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const col1Lines = Array.from({ length: 28 }, (_, i) =>
      `<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>КУПЛЕТ ${i + 1}: </w:t></w:r><w:r><w:rPr><w:highlight w:val="lightGray"/></w:rPr><w:t>ВСЕ, АКЦЕНТЫ НА 1</w:t></w:r></w:p>`
    ).join('\n');

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>БЛАГ НАШ ГОСПОДЬ</w:t></w:r>
    </w:p>
    ${col1Lines}
    <w:p>
      <w:pPr><w:tabs><w:tab w:val="left" w:pos="1440"/></w:tabs></w:pPr>
      <w:r><w:br w:type="column"/></w:r>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>ПРИПЕВ:</w:t></w:r>
      <w:r><w:rPr><w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/></w:rPr><w:t> ВСЕ, МОЩНО---2Х</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">        3-- АККАПЕЛЬНО</w:t></w:r>
      <w:r><w:tab/><w:t>4--ВСЕ,МОЩНО</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
      <w:cols w:num="2" w:space="720" w:sep="1"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const zipBytes = createZipArchive([
      { name: '[Content_Types].xml', data: enc.encode(contentTypes), size: contentTypes.length },
      { name: '_rels/.rels', data: enc.encode(rootRels), size: rootRels.length },
      { name: 'word/document.xml', data: enc.encode(documentXml), size: documentXml.length },
    ]);
    const buf = new Uint8Array(zipBytes.byteLength);
    buf.set(zipBytes);

    const model = parseDocxToLayoutModel(buf.buffer);
    expect(model.initialSection?.columnCount).toBe(2);
    expect(model.initialSection?.columnSeparator).toBe(true);

    // Check gray highlight on КУПЛЕТ run and NO highlight on bold label
    const verseBlock = model.blocks[1];
    expect(verseBlock.kind).toBe('paragraph');
    if (verseBlock.kind === 'paragraph') {
      expect(verseBlock.runs[0].highlightColor).toBeUndefined();
      expect(verseBlock.runs[1].highlightColor).toBeDefined();
      expect(verseBlock.runs[1].highlightColor!.r).toBeGreaterThan(0.8);
    }

    // Check column break + w:shd fill="D9D9D9" on ПРИПЕВ
    const chorusBlock = model.blocks[model.blocks.length - 2];
    expect(chorusBlock.kind).toBe('paragraph');
    if (chorusBlock.kind === 'paragraph') {
      expect(chorusBlock.runs[0].isColumnBreak).toBe(true);
      expect(chorusBlock.runs[2].highlightColor).toBeDefined();
      expect(chorusBlock.tabStops?.[0].posPt).toBe(72);
    }

    // Check leading spaces + tab preserved on indented line
    const indentBlock = model.blocks[model.blocks.length - 1];
    expect(indentBlock.kind).toBe('paragraph');
    if (indentBlock.kind === 'paragraph') {
      expect(indentBlock.preserveLeadingSpaces).toBe(true);
      expect(indentBlock.runs[0].text.startsWith('        3--')).toBe(true);
      expect(indentBlock.runs[1].isTab).toBe(true);
    }

    // All 28 lines + second column should fit cleanly onto 1 two-column page!
    const pdfBlob = await createPdfBlobFromDocx(buf.buffer);
    const pdfDoc = await PDFDocument.load(new Uint8Array(await pdfBlob.arrayBuffer()));
    expect(pdfDoc.getPageCount()).toBe(1);
  });
});
