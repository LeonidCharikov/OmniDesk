import { describe, it, expect } from 'vitest';
import {
  CHART_FAMILIES,
  CHART_PALETTES,
  SAMPLE_PRESETS,
  computeBoxPlotStats,
  computeHistogramBins,
  computeLinearRegression,
  computeNiceAxisTicks,
  computeSeriesSummaryStats,
  computeSquarifiedTreemap,
  parseNumericCell,
  parseTabularData,
  serializeDatasetToCsv,
  transposeDataset,
} from '../tools/math/chartStudio.logic';

describe('chartStudio.logic', () => {
  it('exposes 17 chart families with valid default subtypes and presets', () => {
    expect(CHART_FAMILIES.length).toBe(17);
    expect(CHART_PALETTES.length).toBe(6);
    const presetIds = new Set(SAMPLE_PRESETS.map(p => p.id));

    for (const family of CHART_FAMILIES) {
      expect(family.subtypes.length).toBeGreaterThanOrEqual(1);
      expect(family.subtypes.some(s => s.id === family.defaultSubtype)).toBe(true);
      expect(presetIds.has(family.defaultPresetId)).toBe(true);
    }
  });

  it('parses CSV, TSV (Excel paste), semicolon CSV, and JSON arrays', () => {
    const csv = parseTabularData('Month,Sales,Cost\nJan,100,60\nFeb,140,80');
    expect(csv.headers).toEqual(['Month', 'Sales', 'Cost']);
    expect(csv.rows).toEqual([
      ['Jan', '100', '60'],
      ['Feb', '140', '80'],
    ]);

    const tsv = parseTabularData('Region\tQ1\tQ2\nEU\t12\t15\nUS\t20\t25');
    expect(tsv.headers).toEqual(['Region', 'Q1', 'Q2']);
    expect(tsv.rows[1]).toEqual(['US', '20', '25']);

    const semi = parseTabularData('Name;Value\n"Alpha;One";42,5\nBeta;18');
    expect(semi.headers).toEqual(['Name', 'Value']);
    expect(semi.rows[0]).toEqual(['Alpha;One', '42,5']);
    expect(parseNumericCell(semi.rows[0][1])).toBeCloseTo(42.5, 5);

    const json = parseTabularData('[{"Stage":"Visits","Users":500},{"Stage":"Paid","Users":45}]');
    expect(json.headers).toEqual(['Stage', 'Users']);
    expect(json.rows).toEqual([
      ['Visits', '500'],
      ['Paid', '45'],
    ]);
  });

  it('round-trips CSV serialization with quoting and transposes datasets', () => {
    const original = {
      headers: ['Region', 'Q1', 'Q2'],
      rows: [
        ['North, West', '10', '20'],
        ['East', '30', '40'],
      ],
    };
    const csv = serializeDatasetToCsv(original);
    expect(csv).toContain('"North, West"');
    const reparsed = parseTabularData(csv);
    expect(reparsed).toEqual(original);

    const transposed = transposeDataset(original);
    expect(transposed.headers).toEqual(['Region', 'North, West', 'East']);
    expect(transposed.rows).toEqual([
      ['Q1', '10', '30'],
      ['Q2', '20', '40'],
    ]);
  });

  it('computes nice axis ticks across ranges', () => {
    const scale = computeNiceAxisTicks(0, 93, 5);
    expect(scale.min).toBeLessThanOrEqual(0);
    expect(scale.max).toBeGreaterThanOrEqual(93);
    expect(scale.ticks.length).toBeGreaterThanOrEqual(4);
    expect(scale.step).toBe(20);
  });

  it('computes exact linear regression slope, intercept, and R²', () => {
    const pts = [
      { x: 1, y: 5 },
      { x: 2, y: 8 },
      { x: 3, y: 11 },
      { x: 4, y: 14 },
    ];
    const reg = computeLinearRegression(pts);
    expect(reg).not.toBeNull();
    expect(reg!.slope).toBeCloseTo(3, 6);
    expect(reg!.intercept).toBeCloseTo(2, 6);
    expect(reg!.r2).toBeCloseTo(1, 6);
  });

  it('computes histogram frequency bins and cumulative Pareto percentages', () => {
    const values = [10, 12, 15, 18, 22, 25, 29, 31, 35, 40];
    const bins = computeHistogramBins(values, 4);
    expect(bins.length).toBe(4);
    const totalCount = bins.reduce((acc, b) => acc + b.count, 0);
    expect(totalCount).toBe(values.length);
    expect(bins[bins.length - 1].cumulativePercent).toBe(100);
  });

  it('computes box plot quartiles, whiskers, and 1.5*IQR outliers', () => {
    const stats = computeBoxPlotStats([10, 11, 12, 13, 14, 15, 16, 17, 50]);
    expect(stats).not.toBeNull();
    expect(stats!.median).toBe(14);
    expect(stats!.q1).toBe(12);
    expect(stats!.q3).toBe(16);
    expect(stats!.outliers).toEqual([50]);
    expect(stats!.whiskerHigh).toBe(17);
  });

  it('tiles squarified treemap to exact canvas area', () => {
    const rects = computeSquarifiedTreemap(
      [
        { label: 'A', value: 50, color: '#111' },
        { label: 'B', value: 30, color: '#222' },
        { label: 'C', value: 20, color: '#333' },
      ],
      600,
      300
    );
    expect(rects.length).toBe(3);
    const areaSum = rects.reduce((sum, r) => sum + r.w * r.h, 0);
    expect(areaSum).toBeCloseTo(600 * 300, 3);
    expect(rects[0].sharePercent).toBe(50);
  });

  it('computes descriptive series summary statistics', () => {
    const stats = computeSeriesSummaryStats({
      headers: ['Item', 'Score'],
      rows: [
        ['A', '10'],
        ['B', '20'],
        ['C', '30'],
      ],
    });
    expect(stats.length).toBe(1);
    expect(stats[0].count).toBe(3);
    expect(stats[0].sum).toBe(60);
    expect(stats[0].mean).toBe(20);
    expect(stats[0].median).toBe(20);
    expect(stats[0].stdDev).toBeCloseTo(10, 6);
  });
});
