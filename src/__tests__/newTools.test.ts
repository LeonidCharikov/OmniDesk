import { describe, expect, it } from 'vitest';
import {
  computeColumnNumericStat,
  deduplicateGridRows,
  detectCsvDelimiter,
  extractSnippetVariables,
  formatMockAsSqlInserts,
  generateLoremIpsum,
  generateMockDataset,
  gridToJsonObjects,
  gridToMarkdownTable,
  optimizeSvgMarkup,
  parseCsvGrid,
  renderSnippetTemplate,
  serializeCsvGrid,
  svgToReactJsx,
} from '../utils/newTools.logic';

describe('CSV / Spreadsheet Grid Engine', () => {
  it('detects delimiters and parses quoted values accurately', () => {
    expect(detectCsvDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(detectCsvDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');

    const raw = 'Name,Note,Amount\n"Novak, Jan","He said ""hi""",42.5\nEva,Active,10';
    const parsed = parseCsvGrid(raw);
    expect(parsed.headers).toEqual(['Name', 'Note', 'Amount']);
    expect(parsed.rows[0]).toEqual(['Novak, Jan', 'He said "hi"', '42.5']);
    expect(parsed.rows[1]).toEqual(['Eva', 'Active', '10']);

    const roundTrip = serializeCsvGrid(parsed.headers, parsed.rows);
    expect(parseCsvGrid(roundTrip).rows).toEqual(parsed.rows);
  });

  it('converts rows to typed JSON, Markdown tables, deduplicates, and computes stats', () => {
    const headers = ['Item', 'Price', 'Active'];
    const rows = [
      ['Keyboard', '100', 'true'],
      ['Mouse', '50', 'false'],
      ['Mouse', '50', 'false'],
    ];
    const deduped = deduplicateGridRows(rows);
    expect(deduped.removedCount).toBe(1);
    expect(deduped.rows).toHaveLength(2);

    const json = gridToJsonObjects(headers, deduped.rows);
    expect(json[0]).toEqual({ Item: 'Keyboard', Price: 100, Active: true });
    expect(json[1]).toEqual({ Item: 'Mouse', Price: 50, Active: false });

    const md = gridToMarkdownTable(headers, deduped.rows);
    expect(md).toContain('| Item | Price | Active |');
    expect(md).toContain('| Keyboard | 100 | true |');

    const stat = computeColumnNumericStat(deduped.rows, 1);
    expect(stat).toEqual({ count: 2, sum: 150, avg: 75, min: 50, max: 100 });
    expect(computeColumnNumericStat(deduped.rows, 0)).toBeNull();
  });
});

describe('SVG Optimizer & React JSX Converter', () => {
  it('strips comments, metadata, dimensions, rounds floats, recolors, and builds TSX', () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
      <!-- comment -->
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
        <metadata>author</metadata>
        <g></g>
        <path d="M 1.23456 2.98765 L 10 10" fill="#ff0000" stroke="none" />
      </svg>`;

    const { output, stats } = optimizeSvgMarkup(sample, {
      precision: 2,
      removeComments: true,
      removeMetadata: true,
      removeDimensions: true,
      overrideColor: '#4f46e5',
    });

    expect(output).not.toContain('<!--');
    expect(output).not.toContain('<metadata');
    expect(output).not.toContain('width="64"');
    expect(output).toContain('1.23');
    expect(output).toContain('fill="#4f46e5"');
    expect(output).toContain('stroke="none"');
    expect(stats.viewBox).toBe('0 0 24 24');
    expect(stats.optimizedBytes).toBeLessThan(stats.originalBytes);

    const jsx = svgToReactJsx('<svg viewBox="0 0 24 24" class="icon" stroke-width="2"><path d="M0 0"/></svg>', 'MyIcon');
    expect(jsx).toContain('export const MyIcon');
    expect(jsx).toContain('className="icon"');
    expect(jsx).toContain('strokeWidth="2"');
    expect(jsx).toContain('{...props}');
  });
});

describe('Deterministic Mock Data Generator', () => {
  it('produces identical seeded rows and valid SQL INSERT statements', () => {
    const schema = [
      { id: '1', name: 'id', kind: 'uuid' as const },
      { id: '2', name: 'full_name', kind: 'fullName' as const },
      { id: '3', name: 'price', kind: 'price' as const },
      { id: '4', name: 'active', kind: 'boolean' as const },
    ];
    const runA = generateMockDataset(schema, 5, 99);
    const runB = generateMockDataset(schema, 5, 99);
    expect(runA).toEqual(runB);
    expect(runA).toHaveLength(5);

    const sql = formatMockAsSqlInserts('orders', runA);
    expect(sql.split('\n')).toHaveLength(5);
    expect(sql).toContain('INSERT INTO orders (id, full_name, price, active) VALUES (');
  });
});

describe('Lorem Ipsum & Placeholder Text Generator', () => {
  it('supports classic opening, word/sentence/paragraph/list units, and HTML/Markdown formatting', () => {
    const para = generateLoremIpsum({
      style: 'classic',
      unit: 'paragraphs',
      count: 2,
      startWithClassic: true,
      format: 'plain',
      seed: 100,
    });
    expect(para.startsWith('Lorem ipsum dolor sit amet')).toBe(true);
    expect(para.split('\n\n')).toHaveLength(2);

    const words = generateLoremIpsum({
      style: 'tech',
      unit: 'words',
      count: 12,
      startWithClassic: false,
      format: 'plain',
      seed: 100,
    });
    expect(words.split(/\s+/)).toHaveLength(12);

    const mdList = generateLoremIpsum({
      style: 'business',
      unit: 'list',
      count: 4,
      startWithClassic: false,
      format: 'markdown',
      seed: 100,
    });
    expect(mdList.split('\n').every(line => line.startsWith('- '))).toBe(true);

    const htmlList = generateLoremIpsum({
      style: 'classic',
      unit: 'list',
      count: 3,
      startWithClassic: false,
      format: 'html',
      seed: 100,
    });
    expect(htmlList).toContain('<ul>');
    expect(htmlList).toContain('<li>');
  });
});

describe('Snippet Template Variables', () => {
  it('extracts unique placeholders and substitutes provided values cleanly', () => {
    const tpl = 'docker logs -f --tail {{lines}} {{container}} # {{container}}';
    expect(extractSnippetVariables(tpl)).toEqual(['lines', 'container']);
    expect(renderSnippetTemplate(tpl, { lines: '200', container: 'api' })).toBe(
      'docker logs -f --tail 200 api # api'
    );
    expect(renderSnippetTemplate(tpl, { lines: '50' })).toBe(
      'docker logs -f --tail 50 {{container}} # {{container}}'
    );
  });
});
