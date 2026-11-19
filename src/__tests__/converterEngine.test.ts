import { describe, it, expect } from 'vitest';
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

describe('converterCatalog', () => {
  it('exposes 6 categories and 30+ formats', () => {
    expect(FORMAT_CATALOG).toHaveLength(6);
    expect(TOTAL_SUPPORTED_FORMATS).toBeGreaterThanOrEqual(30);
  });

  it('detects file extensions and categories accurately', () => {
    expect(detectFileExtension('clip.mp4')).toBe('mp4');
    expect(detectCategoryForFile('clip.mp4', 'video/mp4')).toBe('video');

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

    const xlsxTargets = getTargetFormatsForInput('xlsx', 'spreadsheets').map(t => t.ext);
    expect(xlsxTargets).toContain('csv');
    expect(xlsxTargets).toContain('json');
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
  it('converts RTF, Markdown, HTML, and generates valid minimal DOCX ZIP archives', () => {
    const rtf = '{\\rtf1\\ansi{\\fonttbl\\f0 Arial;}Hello \\b World\\b0\\par Second line}';
    expect(stripRtfToText(rtf)).toContain('Hello');
    expect(stripRtfToText(rtf)).toContain('Second line');

    const html = markdownToHtml('# Heading\n\nSome **bold** text\n\n- Item A', 'Test');
    expect(html).toContain('<h1>Heading</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(htmlToMarkdown(html)).toContain('# Heading');
    expect(htmlToMarkdown(html)).toContain('**bold**');

    const docxBytes = buildMinimalDocx('# Title\n\nParagraph text');
    const entries = parseZipArchive(docxBytes);
    const names = entries.map(e => e.name);
    expect(names).toContain('[Content_Types].xml');
    expect(names).toContain('word/document.xml');
  });

  it('roundtrips CSV, XML, Markdown table, and HTML table cleanly', () => {
    const csv = 'Name,Price,Active\n"Widget, Pro",49.5,true\nLamp,19,false';
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

    const mdTable = rowsToMarkdownTable(rows);
    expect(mdTable).toContain('| Name | Price | Active |');
    expect(rowsToHtmlTable(rows)).toContain('<table>');
  });

  it('roundtrips ZIP, TAR, and GZIP archives losslessly', () => {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const input = [
      { name: 'hello.txt', data: enc.encode('Hello OmniDesk'), size: 14 },
      { name: 'nested/data.json', data: enc.encode('{"ok":true}'), size: 11 },
    ];

    const tarBytes = createTarArchive(input);
    const tarGzBytes = compressGzip(tarBytes);
    const unzippedTar = decompressGzip(tarGzBytes);
    const parsedTar = parseTarArchive(unzippedTar);
    expect(parsedTar).toHaveLength(2);
    expect(dec.decode(parsedTar[0].data)).toBe('Hello OmniDesk');
    expect(parsedTar[1].name).toBe('nested/data.json');

    const zipBytes = createZipArchive(parsedTar);
    const parsedZip = parseZipArchive(zipBytes);
    expect(parsedZip).toHaveLength(2);
    expect(dec.decode(parsedZip[1].data)).toBe('{"ok":true}');
  });
});
