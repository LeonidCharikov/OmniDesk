export type ChartFamilyId =
  | 'column'
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'scatter'
  | 'histogram'
  | 'boxplot'
  | 'waterfall'
  | 'funnel'
  | 'radar'
  | 'treemap'
  | 'sunburst'
  | 'heatmap'
  | 'stock'
  | 'combo'
  | 'polar';

export type ChartSubtypeId =
  | 'column-clustered'
  | 'column-stacked'
  | 'column-stacked100'
  | 'bar-clustered'
  | 'bar-stacked'
  | 'bar-stacked100'
  | 'line-straight'
  | 'line-smooth'
  | 'line-stepped'
  | 'line-stacked'
  | 'area-standard'
  | 'area-stacked'
  | 'area-stacked100'
  | 'pie-classic'
  | 'pie-exploded'
  | 'pie-donut'
  | 'pie-semi'
  | 'scatter-points'
  | 'scatter-trendline'
  | 'scatter-bubble'
  | 'histogram-freq'
  | 'histogram-pareto'
  | 'boxplot-classic'
  | 'boxplot-points'
  | 'waterfall-standard'
  | 'funnel-conversion'
  | 'radar-filled'
  | 'radar-line'
  | 'treemap-squarified'
  | 'sunburst-rings'
  | 'heatmap-matrix'
  | 'stock-candlestick'
  | 'stock-hlc'
  | 'combo-bar-line'
  | 'polar-rose';

export type ChartPaletteId =
  | 'vibrant'
  | 'corporate'
  | 'nordic'
  | 'emerald'
  | 'sunset'
  | 'colorblind';

export type ChartCanvasTheme = 'dark' | 'light' | 'transparent';
export type LegendPosition = 'top' | 'bottom' | 'none';

export interface ChartDataset {
  headers: string[];
  rows: string[][];
}

export interface ChartConfig {
  family: ChartFamilyId;
  subtype: ChartSubtypeId;
  title: string;
  subtitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  palette: ChartPaletteId;
  canvasTheme: ChartCanvasTheme;
  legendPosition: LegendPosition;
  showGrid: boolean;
  showDataLabels: boolean;
  histogramBins: number;
}

export interface ChartFamilySpec {
  id: ChartFamilyId;
  labelKey: string;
  defaultLabel: string;
  descKey: string;
  defaultDesc: string;
  defaultSubtype: ChartSubtypeId;
  defaultPresetId: SamplePresetId;
  subtypes: Array<{
    id: ChartSubtypeId;
    labelKey: string;
    defaultLabel: string;
  }>;
}

export type SamplePresetId =
  | 'sales-multi'
  | 'funnel-web'
  | 'waterfall-cashflow'
  | 'stock-ohlc'
  | 'experiment-groups'
  | 'xy-bubble'
  | 'budget-hierarchy'
  | 'weekly-heatmap';

export interface SamplePreset {
  id: SamplePresetId;
  labelKey: string;
  defaultLabel: string;
  title: string;
  subtitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  dataset: ChartDataset;
}

export interface ChartPalette {
  id: ChartPaletteId;
  labelKey: string;
  defaultLabel: string;
  colors: string[];
}

export const CHART_PALETTES: ChartPalette[] = [
  {
    id: 'vibrant',
    labelKey: 'cs_pal_vibrant',
    defaultLabel: 'Vibrant Studio',
    colors: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'],
  },
  {
    id: 'corporate',
    labelKey: 'cs_pal_corporate',
    defaultLabel: 'Executive Blue',
    colors: ['#1d4ed8', '#ea580c', '#15803d', '#7c3aed', '#0284c7', '#ca8a04', '#be123c', '#475569'],
  },
  {
    id: 'nordic',
    labelKey: 'cs_pal_nordic',
    defaultLabel: 'Nordic Frost',
    colors: ['#5e81ac', '#88c0d0', '#a3be8c', '#ebcb8b', '#bf616a', '#b48ead', '#d08770', '#81a1c1'],
  },
  {
    id: 'emerald',
    labelKey: 'cs_pal_emerald',
    defaultLabel: 'Emerald Teal',
    colors: ['#059669', '#0d9488', '#0284c7', '#65a30d', '#14b8a6', '#2563eb', '#84cc16', '#0891b2'],
  },
  {
    id: 'sunset',
    labelKey: 'cs_pal_sunset',
    defaultLabel: 'Warm Terracotta',
    colors: ['#e11d48', '#f97316', '#eab308', '#8b5cf6', '#ec4899', '#d97706', '#f43f5e', '#6366f1'],
  },
  {
    id: 'colorblind',
    labelKey: 'cs_pal_colorblind',
    defaultLabel: 'Okabe-Ito (Accessible)',
    colors: ['#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00', '#f0e442', '#334155'],
  },
];

export const CHART_FAMILIES: ChartFamilySpec[] = [
  {
    id: 'column',
    labelKey: 'cs_fam_column',
    defaultLabel: 'Column',
    descKey: 'cs_fam_column_desc',
    defaultDesc: 'Compare values vertically across categories.',
    defaultSubtype: 'column-clustered',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'column-clustered', labelKey: 'cs_sub_clustered', defaultLabel: 'Clustered' },
      { id: 'column-stacked', labelKey: 'cs_sub_stacked', defaultLabel: 'Stacked' },
      { id: 'column-stacked100', labelKey: 'cs_sub_stacked100', defaultLabel: '100% Stacked' },
    ],
  },
  {
    id: 'bar',
    labelKey: 'cs_fam_bar',
    defaultLabel: 'Bar (Horizontal)',
    descKey: 'cs_fam_bar_desc',
    defaultDesc: 'Horizontal bars ideal for ranked lists & long labels.',
    defaultSubtype: 'bar-clustered',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'bar-clustered', labelKey: 'cs_sub_clustered', defaultLabel: 'Clustered' },
      { id: 'bar-stacked', labelKey: 'cs_sub_stacked', defaultLabel: 'Stacked' },
      { id: 'bar-stacked100', labelKey: 'cs_sub_stacked100', defaultLabel: '100% Stacked' },
    ],
  },
  {
    id: 'line',
    labelKey: 'cs_fam_line',
    defaultLabel: 'Line',
    descKey: 'cs_fam_line_desc',
    defaultDesc: 'Track trends and multi-series trajectories over time.',
    defaultSubtype: 'line-straight',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'line-straight', labelKey: 'cs_sub_straight', defaultLabel: 'Straight' },
      { id: 'line-smooth', labelKey: 'cs_sub_smooth', defaultLabel: 'Smooth Curve' },
      { id: 'line-stepped', labelKey: 'cs_sub_stepped', defaultLabel: 'Stepped' },
      { id: 'line-stacked', labelKey: 'cs_sub_stacked', defaultLabel: 'Stacked' },
    ],
  },
  {
    id: 'area',
    labelKey: 'cs_fam_area',
    defaultLabel: 'Area',
    descKey: 'cs_fam_area_desc',
    defaultDesc: 'Emphasize cumulative magnitude and volume over intervals.',
    defaultSubtype: 'area-standard',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'area-standard', labelKey: 'cs_sub_standard', defaultLabel: 'Standard' },
      { id: 'area-stacked', labelKey: 'cs_sub_stacked', defaultLabel: 'Stacked' },
      { id: 'area-stacked100', labelKey: 'cs_sub_stacked100', defaultLabel: '100% Stacked' },
    ],
  },
  {
    id: 'pie',
    labelKey: 'cs_fam_pie',
    defaultLabel: 'Pie & Donut',
    descKey: 'cs_fam_pie_desc',
    defaultDesc: 'Show part-to-whole shares and proportions.',
    defaultSubtype: 'pie-donut',
    defaultPresetId: 'budget-hierarchy',
    subtypes: [
      { id: 'pie-classic', labelKey: 'cs_sub_pie', defaultLabel: 'Pie' },
      { id: 'pie-exploded', labelKey: 'cs_sub_pie_exploded', defaultLabel: 'Exploded Pie' },
      { id: 'pie-donut', labelKey: 'cs_sub_donut', defaultLabel: 'Donut' },
      { id: 'pie-semi', labelKey: 'cs_sub_semi_donut', defaultLabel: 'Semi-Donut' },
    ],
  },
  {
    id: 'scatter',
    labelKey: 'cs_fam_scatter',
    defaultLabel: 'XY Scatter & Bubble',
    descKey: 'cs_fam_scatter_desc',
    defaultDesc: 'Analyze X/Y correlation, linear regression R², and 3D bubble size.',
    defaultSubtype: 'scatter-trendline',
    defaultPresetId: 'xy-bubble',
    subtypes: [
      { id: 'scatter-points', labelKey: 'cs_sub_scatter', defaultLabel: 'XY Scatter' },
      { id: 'scatter-trendline', labelKey: 'cs_sub_trendline', defaultLabel: 'With Trendline (R²)' },
      { id: 'scatter-bubble', labelKey: 'cs_sub_bubble', defaultLabel: 'Bubble Chart' },
    ],
  },
  {
    id: 'histogram',
    labelKey: 'cs_fam_histogram',
    defaultLabel: 'Histogram & Pareto',
    descKey: 'cs_fam_histogram_desc',
    defaultDesc: 'Frequency distribution bins and Pareto 80/20 cumulative curve.',
    defaultSubtype: 'histogram-freq',
    defaultPresetId: 'experiment-groups',
    subtypes: [
      { id: 'histogram-freq', labelKey: 'cs_sub_histogram', defaultLabel: 'Frequency Bins' },
      { id: 'histogram-pareto', labelKey: 'cs_sub_pareto', defaultLabel: 'Pareto (Cumulative %)' },
    ],
  },
  {
    id: 'boxplot',
    labelKey: 'cs_fam_boxplot',
    defaultLabel: 'Box & Whisker',
    descKey: 'cs_fam_boxplot_desc',
    defaultDesc: 'Compare quartiles (Q1, Median, Q3), mean, whiskers & outliers.',
    defaultSubtype: 'boxplot-classic',
    defaultPresetId: 'experiment-groups',
    subtypes: [
      { id: 'boxplot-classic', labelKey: 'cs_sub_boxplot', defaultLabel: 'Box & Whisker' },
      { id: 'boxplot-points', labelKey: 'cs_sub_boxplot_pts', defaultLabel: 'With Data Points' },
    ],
  },
  {
    id: 'waterfall',
    labelKey: 'cs_fam_waterfall',
    defaultLabel: 'Waterfall',
    descKey: 'cs_fam_waterfall_desc',
    defaultDesc: 'Visualize positive/negative running deltas to a net total.',
    defaultSubtype: 'waterfall-standard',
    defaultPresetId: 'waterfall-cashflow',
    subtypes: [
      { id: 'waterfall-standard', labelKey: 'cs_sub_waterfall', defaultLabel: 'Bridge & Total' },
    ],
  },
  {
    id: 'funnel',
    labelKey: 'cs_fam_funnel',
    defaultLabel: 'Funnel',
    descKey: 'cs_fam_funnel_desc',
    defaultDesc: 'Track sequential conversion rates and stage drop-offs.',
    defaultSubtype: 'funnel-conversion',
    defaultPresetId: 'funnel-web',
    subtypes: [
      { id: 'funnel-conversion', labelKey: 'cs_sub_funnel', defaultLabel: 'Conversion Stages' },
    ],
  },
  {
    id: 'radar',
    labelKey: 'cs_fam_radar',
    defaultLabel: 'Radar / Spider',
    descKey: 'cs_fam_radar_desc',
    defaultDesc: 'Compare multivariate profiles across shared radial axes.',
    defaultSubtype: 'radar-filled',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'radar-filled', labelKey: 'cs_sub_radar_filled', defaultLabel: 'Filled Area' },
      { id: 'radar-line', labelKey: 'cs_sub_radar_line', defaultLabel: 'Line Outline' },
    ],
  },
  {
    id: 'treemap',
    labelKey: 'cs_fam_treemap',
    defaultLabel: 'Treemap',
    descKey: 'cs_fam_treemap_desc',
    defaultDesc: 'Proportional tiled rectangles showing share of total.',
    defaultSubtype: 'treemap-squarified',
    defaultPresetId: 'budget-hierarchy',
    subtypes: [
      { id: 'treemap-squarified', labelKey: 'cs_sub_treemap', defaultLabel: 'Squarified Tiles' },
    ],
  },
  {
    id: 'sunburst',
    labelKey: 'cs_fam_sunburst',
    defaultLabel: 'Sunburst',
    descKey: 'cs_fam_sunburst_desc',
    defaultDesc: 'Concentric multi-ring radial breakdown across series.',
    defaultSubtype: 'sunburst-rings',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'sunburst-rings', labelKey: 'cs_sub_sunburst', defaultLabel: 'Multi-Ring' },
    ],
  },
  {
    id: 'heatmap',
    labelKey: 'cs_fam_heatmap',
    defaultLabel: 'Heatmap / Surface',
    descKey: 'cs_fam_heatmap_desc',
    defaultDesc: '2D color-intensity matrix across rows and columns.',
    defaultSubtype: 'heatmap-matrix',
    defaultPresetId: 'weekly-heatmap',
    subtypes: [
      { id: 'heatmap-matrix', labelKey: 'cs_sub_heatmap', defaultLabel: 'Color Matrix' },
    ],
  },
  {
    id: 'stock',
    labelKey: 'cs_fam_stock',
    defaultLabel: 'Stock / OHLC',
    descKey: 'cs_fam_stock_desc',
    defaultDesc: 'Financial Open-High-Low-Close candlesticks and HLC range bars.',
    defaultSubtype: 'stock-candlestick',
    defaultPresetId: 'stock-ohlc',
    subtypes: [
      { id: 'stock-candlestick', labelKey: 'cs_sub_candlestick', defaultLabel: 'OHLC Candlestick' },
      { id: 'stock-hlc', labelKey: 'cs_sub_hlc', defaultLabel: 'High-Low-Close' },
    ],
  },
  {
    id: 'combo',
    labelKey: 'cs_fam_combo',
    defaultLabel: 'Combo (Bar + Line)',
    descKey: 'cs_fam_combo_desc',
    defaultDesc: 'Combine clustered columns with a secondary line trend.',
    defaultSubtype: 'combo-bar-line',
    defaultPresetId: 'sales-multi',
    subtypes: [
      { id: 'combo-bar-line', labelKey: 'cs_sub_combo', defaultLabel: 'Columns + Line' },
    ],
  },
  {
    id: 'polar',
    labelKey: 'cs_fam_polar',
    defaultLabel: 'Polar Area',
    descKey: 'cs_fam_polar_desc',
    defaultDesc: 'Nightingale rose chart with radius scaled to category value.',
    defaultSubtype: 'polar-rose',
    defaultPresetId: 'budget-hierarchy',
    subtypes: [
      { id: 'polar-rose', labelKey: 'cs_sub_polar', defaultLabel: 'Nightingale Rose' },
    ],
  },
];

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'sales-multi',
    labelKey: 'cs_preset_sales',
    defaultLabel: 'Quarterly Revenue (Multi-Series)',
    title: 'Quarterly Revenue by Region',
    subtitle: 'Thousands USD · FY 2026',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue (k USD)',
    dataset: {
      headers: ['Quarter', 'North America', 'Europe', 'Asia-Pacific'],
      rows: [
        ['Q1', '420', '310', '245'],
        ['Q2', '485', '360', '290'],
        ['Q3', '510', '395', '355'],
        ['Q4', '615', '470', '430'],
        ['Q1+1', '580', '450', '465'],
        ['Q2+1', '640', '505', '520'],
      ],
    },
  },
  {
    id: 'experiment-groups',
    labelKey: 'cs_preset_experiment',
    defaultLabel: 'Lab Samples (Histogram / Box Plot)',
    title: 'Response Latency Distribution by Engine',
    subtitle: '12 measured runs per configuration (ms)',
    xAxisLabel: 'Trial',
    yAxisLabel: 'Latency (ms)',
    dataset: {
      headers: ['Trial', 'Engine A', 'Engine B', 'Engine C'],
      rows: [
        ['T1', '42', '58', '31'],
        ['T2', '48', '64', '35'],
        ['T3', '51', '61', '33'],
        ['T4', '45', '72', '39'],
        ['T5', '54', '68', '37'],
        ['T6', '49', '75', '41'],
        ['T7', '63', '81', '44'],
        ['T8', '47', '66', '34'],
        ['T9', '52', '70', '38'],
        ['T10', '78', '95', '56'],
        ['T11', '46', '62', '32'],
        ['T12', '50', '69', '36'],
      ],
    },
  },
  {
    id: 'xy-bubble',
    labelKey: 'cs_preset_xy',
    defaultLabel: 'XY Correlation & Bubble',
    title: 'Ad Spend vs. Monthly Conversions',
    subtitle: 'X = Spend ($k), Y = Signups, Size = Avg Deal',
    xAxisLabel: 'Ad Spend ($k)',
    yAxisLabel: 'Signups',
    dataset: {
      headers: ['Spend', 'Signups', 'Deal Size'],
      rows: [
        ['2.5', '118', '24'],
        ['4.0', '165', '31'],
        ['5.2', '194', '28'],
        ['6.8', '252', '42'],
        ['8.1', '288', '38'],
        ['9.5', '340', '55'],
        ['11.2', '392', '48'],
        ['13.0', '435', '62'],
        ['14.6', '498', '58'],
        ['16.4', '540', '70'],
      ],
    },
  },
  {
    id: 'waterfall-cashflow',
    labelKey: 'cs_preset_waterfall',
    defaultLabel: 'Cash Flow Bridge (Waterfall)',
    title: 'Annual Operating Cash Flow Bridge',
    subtitle: 'Delta breakdown in thousands USD',
    xAxisLabel: 'Component',
    yAxisLabel: 'Amount (k USD)',
    dataset: {
      headers: ['Item', 'Delta'],
      rows: [
        ['Gross Sales', '920'],
        ['Services', '240'],
        ['COGS', '-380'],
        ['R&D', '-190'],
        ['Marketing', '-145'],
        ['Operations', '-110'],
        ['Taxes', '-75'],
      ],
    },
  },
  {
    id: 'funnel-web',
    labelKey: 'cs_preset_funnel',
    defaultLabel: 'Conversion Funnel',
    title: 'Product Onboarding Funnel',
    subtitle: 'Monthly active cohort progression',
    xAxisLabel: 'Stage',
    yAxisLabel: 'Users',
    dataset: {
      headers: ['Stage', 'Users'],
      rows: [
        ['Landing Visits', '48500'],
        ['Sign-Up Started', '16200'],
        ['Account Verified', '11400'],
        ['First Project', '6850'],
        ['Paid Upgrade', '2420'],
      ],
    },
  },
  {
    id: 'budget-hierarchy',
    labelKey: 'cs_preset_budget',
    defaultLabel: 'Department Allocation (Pie / Treemap)',
    title: 'Annual Engineering Budget Split',
    subtitle: 'Allocation across core teams (k USD)',
    xAxisLabel: 'Department',
    yAxisLabel: 'Budget (k USD)',
    dataset: {
      headers: ['Department', 'Budget'],
      rows: [
        ['Core Platform', '480'],
        ['Product Design', '220'],
        ['Data & Analytics', '310'],
        ['Security & Infra', '275'],
        ['QA & Release', '155'],
        ['Developer Tools', '190'],
      ],
    },
  },
  {
    id: 'stock-ohlc',
    labelKey: 'cs_preset_stock',
    defaultLabel: 'Stock OHLC (Candlestick)',
    title: 'OMNI Equity Daily Price Action',
    subtitle: 'Open / High / Low / Close (USD)',
    xAxisLabel: 'Trading Day',
    yAxisLabel: 'Price (USD)',
    dataset: {
      headers: ['Day', 'Open', 'High', 'Low', 'Close'],
      rows: [
        ['May 01', '142.0', '147.5', '140.2', '146.4'],
        ['May 02', '146.4', '151.0', '144.8', '149.8'],
        ['May 03', '149.8', '152.2', '145.0', '146.1'],
        ['May 06', '146.1', '148.0', '141.5', '142.8'],
        ['May 07', '142.8', '149.6', '142.0', '148.9'],
        ['May 08', '148.9', '155.4', '148.2', '154.2'],
        ['May 09', '154.2', '158.0', '151.5', '153.0'],
        ['May 10', '153.0', '159.8', '152.4', '158.7'],
        ['May 13', '158.7', '162.5', '156.0', '161.2'],
        ['May 14', '161.2', '163.0', '155.4', '157.5'],
      ],
    },
  },
  {
    id: 'weekly-heatmap',
    labelKey: 'cs_preset_heatmap',
    defaultLabel: 'Activity Matrix (Heatmap)',
    title: 'Support Ticket Volume by Day & Time Slot',
    subtitle: 'Average tickets received per 4-hour block',
    xAxisLabel: 'Time Slot',
    yAxisLabel: 'Day of Week',
    dataset: {
      headers: ['Day', '00–06', '06–10', '10–14', '14–18', '18–24'],
      rows: [
        ['Mon', '12', '48', '92', '84', '34'],
        ['Tue', '10', '54', '98', '88', '38'],
        ['Wed', '14', '52', '95', '81', '36'],
        ['Thu', '11', '50', '91', '79', '40'],
        ['Fri', '15', '44', '76', '62', '28'],
        ['Sat', '18', '22', '34', '29', '21'],
        ['Sun', '16', '18', '28', '25', '19'],
      ],
    },
  },
];

export function getPaletteColors(paletteId: ChartPaletteId): string[] {
  return (CHART_PALETTES.find(p => p.id === paletteId) ?? CHART_PALETTES[0]).colors;
}

export function getPresetById(id: SamplePresetId): SamplePreset {
  return SAMPLE_PRESETS.find(p => p.id === id) ?? SAMPLE_PRESETS[0];
}

export function cloneDataset(ds: ChartDataset): ChartDataset {
  return {
    headers: [...ds.headers],
    rows: ds.rows.map(row => [...row]),
  };
}

export function parseNumericCell(raw: string | undefined): number {
  if (!raw) return Number.NaN;
  const cleaned = raw.trim().replace(/\s+/g, '').replace(/,/g, '.');
  const match = cleaned.match(/^-?\d+(\.\d+)?/);
  if (!match) return Number.NaN;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : Number.NaN;
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  if (Number.isInteger(value)) return String(value);
  if (abs >= 100) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Parses CSV, TSV (Excel/Sheets clipboard paste), or semicolon-delimited text into a ChartDataset.
 */
export function parseTabularData(rawText: string): ChartDataset {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return { headers: ['Category', 'Series 1'], rows: [['Item 1', '10']] };
  }

  // Try JSON array of objects first
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(normalized);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        const keySet = new Set<string>();
        for (const item of parsed) {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            for (const k of Object.keys(item as Record<string, unknown>)) {
              keySet.add(k);
            }
          }
        }
        const headers = Array.from(keySet);
        if (headers.length >= 2) {
          const rows = parsed
            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
            .map(item => headers.map(h => (item[h] === undefined || item[h] === null ? '' : String(item[h]))));
          if (rows.length > 0) {
            return { headers, rows };
          }
        }
      }
    } catch {
      // Fall through to delimited parsing
    }
  }

  const lines = normalized.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0];
  let delimiter = ',';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  if (tabCount >= semiCount && tabCount >= commaCount && tabCount > 0) {
    delimiter = '\t';
  } else if (semiCount > commaCount && semiCount > 0) {
    delimiter = ';';
  }

  const splitLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const matrix = lines.map(splitLine);
  const colCount = Math.max(2, ...matrix.map(r => r.length));
  const firstRowAllNumeric = matrix[0].slice(1).every(cell => !Number.isNaN(parseNumericCell(cell)));
  const hasHeaderRow = matrix.length > 1 && !firstRowAllNumeric;

  let headers: string[];
  let dataRows: string[][];

  if (hasHeaderRow) {
    headers = Array.from({ length: colCount }, (_, idx) =>
      matrix[0][idx]?.trim() || (idx === 0 ? 'Category' : `Series ${idx}`)
    );
    dataRows = matrix.slice(1).map(row =>
      Array.from({ length: colCount }, (_, idx) => row[idx] ?? '')
    );
  } else {
    headers = Array.from({ length: colCount }, (_, idx) =>
      idx === 0 ? 'Category' : `Series ${idx}`
    );
    dataRows = matrix.map(row =>
      Array.from({ length: colCount }, (_, idx) => row[idx] ?? '')
    );
  }

  return { headers, rows: dataRows };
}

export function serializeDatasetToCsv(dataset: ChartDataset): string {
  const escapeCsvCell = (cell: string): string => {
    if (/[",\n\r]/.test(cell)) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  const headerLine = dataset.headers.map(escapeCsvCell).join(',');
  const rowLines = dataset.rows.map(row =>
    dataset.headers.map((_, idx) => escapeCsvCell(row[idx] ?? '')).join(',')
  );
  return [headerLine, ...rowLines].join('\n');
}

export function transposeDataset(dataset: ChartDataset): ChartDataset {
  const colCount = dataset.headers.length;
  const rowCount = dataset.rows.length;
  if (colCount < 2 || rowCount < 1) return cloneDataset(dataset);

  const newHeaders = [
    dataset.headers[0] || 'Series',
    ...dataset.rows.map((r, idx) => r[0]?.trim() || `Item ${idx + 1}`),
  ];

  const newRows: string[][] = [];
  for (let c = 1; c < colCount; c++) {
    const row: string[] = [dataset.headers[c] || `Series ${c}`];
    for (let r = 0; r < rowCount; r++) {
      row.push(dataset.rows[r][c] ?? '0');
    }
    newRows.push(row);
  }

  return { headers: newHeaders, rows: newRows };
}

export interface NiceAxisScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

export function computeNiceAxisTicks(
  rawMin: number,
  rawMax: number,
  targetTicks = 5
): NiceAxisScale {
  let minVal = Number.isFinite(rawMin) ? rawMin : 0;
  let maxVal = Number.isFinite(rawMax) ? rawMax : 10;
  if (minVal === maxVal) {
    if (minVal === 0) {
      maxVal = 10;
    } else {
      const pad = Math.abs(minVal) * 0.2 || 1;
      minVal -= pad;
      maxVal += pad;
    }
  }
  if (minVal > maxVal) {
    [minVal, maxVal] = [maxVal, minVal];
  }

  const range = maxVal - minVal;
  const roughStep = range / Math.max(2, targetTicks);
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;
  let niceNorm = 1;
  if (norm <= 1.5) niceNorm = 1;
  else if (norm <= 3) niceNorm = 2;
  else if (norm <= 7) niceNorm = 5;
  else niceNorm = 10;

  const step = niceNorm * mag;
  const niceMin = Math.floor(minVal / step) * step;
  const niceMax = Math.ceil(maxVal / step) * step;

  const ticks: number[] = [];
  const count = Math.min(12, Math.round((niceMax - niceMin) / step));
  for (let i = 0; i <= count; i++) {
    const v = niceMin + i * step;
    ticks.push(Math.abs(v) < 1e-10 ? 0 : Number(v.toPrecision(10)));
  }

  return { min: niceMin, max: ticks[ticks.length - 1] ?? niceMax, step, ticks };
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

export function computeLinearRegression(
  points: Array<{ x: number; y: number }>
): LinearRegressionResult | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = slope * p.x + intercept;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - pred) ** 2;
  }
  const r2 = ssTot < 1e-12 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  return { slope, intercept, r2 };
}

export interface HistogramBin {
  start: number;
  end: number;
  label: string;
  count: number;
  cumulativePercent: number;
}

export function computeHistogramBins(
  values: number[],
  requestedBins?: number
): HistogramBin[] {
  const clean = values.filter(v => Number.isFinite(v));
  if (clean.length === 0) return [];

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const sturges = Math.max(3, Math.min(15, Math.ceil(Math.log2(clean.length) + 1)));
  const binCount = Math.max(
    2,
    Math.min(20, requestedBins && Number.isFinite(requestedBins) ? Math.round(requestedBins) : sturges)
  );

  if (min === max) {
    return [
      {
        start: min,
        end: max,
        label: formatCompactNumber(min),
        count: clean.length,
        cumulativePercent: 100,
      },
    ];
  }

  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const val of clean) {
    let idx = Math.floor((val - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }

  let running = 0;
  return counts.map((count, i) => {
    const start = min + i * width;
    const end = start + width;
    running += count;
    return {
      start,
      end,
      label: `${formatCompactNumber(start)}–${formatCompactNumber(end)}`,
      count,
      cumulativePercent: Math.round((running / clean.length) * 1000) / 10,
    };
  });
}

export interface BoxPlotStats {
  min: number;
  whiskerLow: number;
  q1: number;
  median: number;
  mean: number;
  q3: number;
  whiskerHigh: number;
  max: number;
  outliers: number[];
  values: number[];
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function computeBoxPlotStats(rawValues: number[]): BoxPlotStats | null {
  const sorted = rawValues.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;

  const inliers = sorted.filter(v => v >= lowFence && v <= highFence);
  const outliers = sorted.filter(v => v < lowFence || v > highFence);
  const whiskerLow = inliers.length > 0 ? inliers[0] : sorted[0];
  const whiskerHigh = inliers.length > 0 ? inliers[inliers.length - 1] : sorted[sorted.length - 1];
  const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;

  return {
    min: sorted[0],
    whiskerLow,
    q1,
    median,
    mean,
    q3,
    whiskerHigh,
    max: sorted[sorted.length - 1],
    outliers,
    values: sorted,
  };
}

export interface TreemapInput {
  label: string;
  value: number;
  color: string;
}

export interface TreemapRect {
  label: string;
  value: number;
  sharePercent: number;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Recursive binary slice-and-dice / balanced aspect-ratio treemap layout.
 */
export function computeSquarifiedTreemap(
  inputs: TreemapInput[],
  width: number,
  height: number
): TreemapRect[] {
  const positive = inputs
    .filter(item => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);

  const grandTotal = positive.reduce((sum, i) => sum + i.value, 0);
  if (positive.length === 0 || grandTotal <= 0 || width <= 0 || height <= 0) return [];

  const rects: TreemapRect[] = [];

  const partition = (
    items: TreemapInput[],
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      const item = items[0];
      rects.push({
        label: item.label,
        value: item.value,
        sharePercent: Math.round((item.value / grandTotal) * 1000) / 10,
        color: item.color,
        x,
        y,
        w,
        h,
      });
      return;
    }

    const total = items.reduce((s, i) => s + i.value, 0);
    let halfSum = 0;
    let splitIdx = 1;
    for (let i = 0; i < items.length - 1; i++) {
      halfSum += items[i].value;
      splitIdx = i + 1;
      if (halfSum >= total * 0.5) break;
    }

    const firstGroup = items.slice(0, splitIdx);
    const secondGroup = items.slice(splitIdx);
    const firstRatio = firstGroup.reduce((s, i) => s + i.value, 0) / total;

    if (w >= h) {
      const firstW = w * firstRatio;
      partition(firstGroup, x, y, firstW, h);
      partition(secondGroup, x + firstW, y, w - firstW, h);
    } else {
      const firstH = h * firstRatio;
      partition(firstGroup, x, y, w, firstH);
      partition(secondGroup, x, y + firstH, w, h - firstH);
    }
  };

  partition(positive, 0, 0, width, height);
  return rects;
}

export interface SeriesStatSummary {
  name: string;
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

export function computeSeriesSummaryStats(dataset: ChartDataset): SeriesStatSummary[] {
  const results: SeriesStatSummary[] = [];
  for (let col = 1; col < dataset.headers.length; col++) {
    const nums = dataset.rows
      .map(r => parseNumericCell(r[col]))
      .filter(n => Number.isFinite(n));
    if (nums.length === 0) continue;
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / nums.length;
    const variance =
      nums.length > 1
        ? nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (nums.length - 1)
        : 0;
    results.push({
      name: dataset.headers[col] || `Series ${col}`,
      count: nums.length,
      sum,
      mean,
      median: quantile(sorted, 0.5),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev: Math.sqrt(variance),
    });
  }
  return results;
}
