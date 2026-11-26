import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  AreaChart,
  ArrowDownUp,
  ArrowLeftRight,
  BarChart2,
  BarChart3,
  BarChartHorizontal,
  BoxSelect,
  CandlestickChart,
  Check,
  ClipboardPaste,
  Compass,
  Copy,
  Download,
  FileSpreadsheet,
  Filter,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  LineChart,
  PieChart,
  Plus,
  Printer,
  Radar,
  RotateCcw,
  ScatterChart,
  Sliders,
  Trash2,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { toastService } from '../../services/toastService';
import { saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';
import { printHtmlDocument } from '../../services/printService';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { ChartStudioCanvas } from './ChartStudioCanvas';
import {
  CHART_FAMILIES,
  CHART_PALETTES,
  ChartCanvasTheme,
  ChartConfig,
  ChartDataset,
  ChartFamilyId,
  ChartPaletteId,
  ChartSubtypeId,
  LegendPosition,
  SAMPLE_PRESETS,
  SamplePresetId,
  cloneDataset,
  computeSeriesSummaryStats,
  formatCompactNumber,
  getPresetById,
  parseNumericCell,
  parseTabularData,
  serializeDatasetToCsv,
  transposeDataset,
} from './chartStudio.logic';

const STORAGE_KEY = 'omnidesk_chart_studio_v1';

interface PersistedState {
  config: ChartConfig;
  dataset: ChartDataset;
  isCustomData: boolean;
}

const DEFAULT_PRESET = getPresetById('sales-multi');

const DEFAULT_CONFIG: ChartConfig = {
  family: 'column',
  subtype: 'column-clustered',
  title: DEFAULT_PRESET.title,
  subtitle: DEFAULT_PRESET.subtitle,
  xAxisLabel: DEFAULT_PRESET.xAxisLabel,
  yAxisLabel: DEFAULT_PRESET.yAxisLabel,
  palette: 'vibrant',
  canvasTheme: 'dark',
  legendPosition: 'top',
  showGrid: true,
  showDataLabels: false,
  histogramBins: 6,
};

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        config: { ...DEFAULT_CONFIG },
        dataset: cloneDataset(DEFAULT_PRESET.dataset),
        isCustomData: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const validFamily = CHART_FAMILIES.some(f => f.id === parsed.config?.family);
    const config: ChartConfig = {
      ...DEFAULT_CONFIG,
      ...(parsed.config && validFamily ? parsed.config : {}),
    };
    const dataset: ChartDataset =
      parsed.dataset &&
      Array.isArray(parsed.dataset.headers) &&
      parsed.dataset.headers.length >= 2 &&
      Array.isArray(parsed.dataset.rows)
        ? {
            headers: parsed.dataset.headers.map(String),
            rows: parsed.dataset.rows.map(r => (Array.isArray(r) ? r.map(String) : [])),
          }
        : cloneDataset(DEFAULT_PRESET.dataset);
    return {
      config,
      dataset,
      isCustomData: Boolean(parsed.isCustomData),
    };
  } catch {
    return {
      config: { ...DEFAULT_CONFIG },
      dataset: cloneDataset(DEFAULT_PRESET.dataset),
      isCustomData: false,
    };
  }
}

function getFamilyIcon(familyId: ChartFamilyId): React.ReactNode {
  const cls = 'w-4 h-4 shrink-0';
  switch (familyId) {
    case 'column':
      return <BarChart3 className={cls} />;
    case 'bar':
      return <BarChartHorizontal className={cls} />;
    case 'line':
      return <LineChart className={cls} />;
    case 'area':
      return <AreaChart className={cls} />;
    case 'pie':
      return <PieChart className={cls} />;
    case 'scatter':
      return <ScatterChart className={cls} />;
    case 'histogram':
      return <BarChart2 className={cls} />;
    case 'boxplot':
      return <BoxSelect className={cls} />;
    case 'waterfall':
      return <TrendingUp className={cls} />;
    case 'funnel':
      return <Filter className={cls} />;
    case 'radar':
      return <Radar className={cls} />;
    case 'treemap':
      return <LayoutGrid className={cls} />;
    case 'sunburst':
      return <Layers className={cls} />;
    case 'heatmap':
      return <Grid3x3 className={cls} />;
    case 'stock':
      return <CandlestickChart className={cls} />;
    case 'combo':
      return <Activity className={cls} />;
    case 'polar':
      return <Compass className={cls} />;
    default:
      return <BarChart3 className={cls} />;
  }
}

export const ChartStudioTool: React.FC = () => {
  const { t } = useI18n();
  const initial = useMemo(() => loadPersistedState(), []);

  const [config, setConfig] = useState<ChartConfig>(initial.config);
  const [dataset, setDataset] = useState<ChartDataset>(initial.dataset);
  const [isCustomData, setIsCustomData] = useState<boolean>(initial.isCustomData);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [showStyleControls, setShowStyleControls] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeFamilySpec = useMemo(
    () => CHART_FAMILIES.find(f => f.id === config.family) ?? CHART_FAMILIES[0],
    [config.family]
  );

  const summaryStats = useMemo(() => computeSeriesSummaryStats(dataset), [dataset]);

  // Persist workspace state safely
  useEffect(() => {
    try {
      const payload: PersistedState = { config, dataset, isCustomData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [config, dataset, isCustomData]);

  // Sync live updates pushed from Desktop MCP Bridge
  useEffect(() => {
    const handleExternalUpdate = () => {
      const next = loadPersistedState();
      setConfig(next.config);
      setDataset(next.dataset);
      setIsCustomData(next.isCustomData);
    };
    window.addEventListener('omnidesk-chart-studio-updated', handleExternalUpdate);
    return () => {
      window.removeEventListener('omnidesk-chart-studio-updated', handleExternalUpdate);
    };
  }, []);

  const importFileObject = useCallback(
    async (file: File) => {
      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.ods')) {
          const XLSX = await import('xlsx');
          const buf = await file.arrayBuffer();
          const workbook = XLSX.read(buf, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) throw new Error('Empty workbook');
          const sheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          const parsed = parseTabularData(csv);
          setDataset(parsed);
          setIsCustomData(true);
          setConfig(prev => ({
            ...prev,
            title: file.name.replace(/\.[^.]+$/, ''),
          }));
          toastService.show({
            type: 'success',
            title: t('cs_imported_file_toast', 'Imported {name} ({rows} rows)', {
              name: file.name,
              rows: parsed.rows.length,
            }),
          });
          return;
        }

        const text = await file.text();
        const parsed = parseTabularData(text);
        setDataset(parsed);
        setIsCustomData(true);
        setConfig(prev => ({
          ...prev,
          title: file.name.replace(/\.[^.]+$/, ''),
        }));
        toastService.show({
          type: 'success',
          title: t('cs_imported_file_toast', 'Imported {name} ({rows} rows)', {
            name: file.name,
            rows: parsed.rows.length,
          }),
        });
      } catch (err) {
        toastService.show({
          type: 'error',
          title: err instanceof Error ? err.message : t('cs_import_failed', 'Failed to parse file'),
        });
      }
    },
    [t]
  );

  // Consume incoming cross-tool pipe payloads (CSV/JSON text or dropped spreadsheet file)
  useEffect(() => {
    const incoming = consumePendingToolPipe('chart-studio');
    if (!incoming) return;
    if (incoming.kind === 'file' && incoming.file) {
      void importFileObject(incoming.file);
    } else if (incoming.kind === 'text' && incoming.text?.trim()) {
      const parsed = parseTabularData(incoming.text);
      setDataset(parsed);
      setIsCustomData(true);
      toastService.show({
        type: 'success',
        title: t('cs_piped_data_toast', 'Loaded piped data ({rows} rows)', {
          rows: parsed.rows.length,
        }),
      });
    }
  }, [importFileObject, t]);

  const handleSelectFamily = (familyId: ChartFamilyId) => {
    const spec = CHART_FAMILIES.find(f => f.id === familyId);
    if (!spec) return;

    if (!isCustomData) {
      const preset = getPresetById(spec.defaultPresetId);
      setDataset(cloneDataset(preset.dataset));
      setConfig(prev => ({
        ...prev,
        family: familyId,
        subtype: spec.defaultSubtype,
        title: preset.title,
        subtitle: preset.subtitle,
        xAxisLabel: preset.xAxisLabel,
        yAxisLabel: preset.yAxisLabel,
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        family: familyId,
        subtype: spec.defaultSubtype,
      }));
    }
  };

  const handleLoadPreset = (presetId: SamplePresetId) => {
    const preset = getPresetById(presetId);
    setDataset(cloneDataset(preset.dataset));
    setIsCustomData(false);
    setConfig(prev => ({
      ...prev,
      title: preset.title,
      subtitle: preset.subtitle,
      xAxisLabel: preset.xAxisLabel,
      yAxisLabel: preset.yAxisLabel,
    }));
  };

  // ─── Data Table Mutations ──────────────────────────────────────────────────

  const updateHeader = (colIdx: number, value: string) => {
    setIsCustomData(true);
    setDataset(prev => {
      const nextHeaders = [...prev.headers];
      nextHeaders[colIdx] = value;
      return { ...prev, headers: nextHeaders };
    });
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    setIsCustomData(true);
    setDataset(prev => {
      const nextRows = prev.rows.map((r, i) => {
        if (i !== rowIdx) return r;
        const copy = [...r];
        copy[colIdx] = value;
        return copy;
      });
      return { ...prev, rows: nextRows };
    });
  };

  const addRow = () => {
    setIsCustomData(true);
    setDataset(prev => {
      const nextIdx = prev.rows.length + 1;
      const newRow = prev.headers.map((_, cIdx) =>
        cIdx === 0 ? `Item ${nextIdx}` : String(Math.round(50 + Math.random() * 150))
      );
      return { ...prev, rows: [...prev.rows, newRow] };
    });
  };

  const duplicateRow = (rowIdx: number) => {
    setIsCustomData(true);
    setDataset(prev => {
      const target = prev.rows[rowIdx];
      if (!target) return prev;
      const nextRows = [...prev.rows];
      nextRows.splice(rowIdx + 1, 0, [...target]);
      return { ...prev, rows: nextRows };
    });
  };

  const deleteRow = (rowIdx: number) => {
    setIsCustomData(true);
    setDataset(prev => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== rowIdx),
    }));
  };

  const addSeriesColumn = () => {
    setIsCustomData(true);
    setDataset(prev => {
      const nextNum = prev.headers.length;
      return {
        headers: [...prev.headers, `Series ${nextNum}`],
        rows: prev.rows.map(row => [...row, String(Math.round(40 + Math.random() * 160))]),
      };
    });
  };

  const deleteSeriesColumn = (colIdx: number) => {
    if (colIdx === 0 || dataset.headers.length <= 2) return;
    setIsCustomData(true);
    setDataset(prev => ({
      headers: prev.headers.filter((_, i) => i !== colIdx),
      rows: prev.rows.map(r => r.filter((_, i) => i !== colIdx)),
    }));
  };

  const handleTranspose = () => {
    setIsCustomData(true);
    setDataset(prev => transposeDataset(prev));
  };

  const handleSortByFirstSeries = () => {
    setIsCustomData(true);
    const nextAsc = !sortAsc;
    setSortAsc(nextAsc);
    setDataset(prev => {
      const sorted = [...prev.rows].sort((a, b) => {
        const na = parseNumericCell(a[1]);
        const nb = parseNumericCell(b[1]);
        const va = Number.isFinite(na) ? na : 0;
        const vb = Number.isFinite(nb) ? nb : 0;
        return nextAsc ? va - vb : vb - va;
      });
      return { ...prev, rows: sorted };
    });
  };

  const handleApplyPastedData = () => {
    if (!pasteInput.trim()) return;
    const parsed = parseTabularData(pasteInput);
    setDataset(parsed);
    setIsCustomData(true);
    setShowPasteBox(false);
    setPasteInput('');
    toastService.show({
      type: 'success',
      title: t('cs_pasted_toast', 'Loaded {rows} rows & {cols} columns', {
        rows: parsed.rows.length,
        cols: parsed.headers.length,
      }),
    });
  };

  const handleClearTable = () => {
    setIsCustomData(true);
    setDataset({
      headers: ['Category', 'Series 1'],
      rows: [
        ['A', '25'],
        ['B', '50'],
        ['C', '35'],
      ],
    });
  };

  // ─── Export Handlers (SVG, 2x PNG, Copy SVG, CSV, Print) ───────────────────

  const getSerializedSvg = (): string | null => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;
    const serializer = new XMLSerializer();
    let markup = serializer.serializeToString(svgEl);
    if (!markup.includes('xmlns="http://www.w3.org/2000/svg"')) {
      markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return markup;
  };

  const safeFileSlug = (config.title || config.family)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'chart';

  const handleExportSvg = async () => {
    const svg = getSerializedSvg();
    if (!svg) return;
    const res = await saveTextWithDialog(`${safeFileSlug}.svg`, svg, [
      { name: 'SVG Vector Image', extensions: ['svg'] },
    ]);
    if (res.success) {
      toastService.show({ type: 'success', title: t('cs_exported_svg', 'Exported SVG chart') });
    }
  };

  const handleCopySvg = async () => {
    const svg = getSerializedSvg();
    if (!svg) return;
    try {
      await navigator.clipboard.writeText(svg);
      setCopiedSvg(true);
      toastService.show({ type: 'success', title: t('cs_copied_svg', 'SVG markup copied to clipboard') });
      window.setTimeout(() => setCopiedSvg(false), 1800);
    } catch {
      toastService.show({ type: 'error', title: t('cs_copy_failed', 'Clipboard copy failed') });
    }
  };

  const handleExportPng = async () => {
    const svg = getSerializedSvg();
    if (!svg) return;
    try {
      const scale = 2;
      const w = 880 * scale;
      const h = 470 * scale;
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to rasterize SVG'));
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D unavailable');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, 880, 470);
      URL.revokeObjectURL(url);

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(b => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('PNG encoding failed');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const res = await saveBinaryWithDialog(`${safeFileSlug}.png`, bytes, 'image/png', [
        { name: 'PNG Image', extensions: ['png'] },
      ]);
      if (res.success) {
        toastService.show({ type: 'success', title: t('cs_exported_png', 'Exported 2× HD PNG chart') });
      }
    } catch (err) {
      toastService.show({
        type: 'error',
        title: err instanceof Error ? err.message : t('cs_export_failed', 'PNG export failed'),
      });
    }
  };

  const handleExportCsv = async () => {
    const csv = serializeDatasetToCsv(dataset);
    const res = await saveTextWithDialog(`${safeFileSlug}.csv`, csv, [
      { name: 'CSV Spreadsheet', extensions: ['csv'] },
    ]);
    if (res.success) {
      toastService.show({ type: 'success', title: t('cs_exported_csv', 'Exported CSV dataset') });
    }
  };

  const handlePrintChart = async () => {
    const svg = getSerializedSvg();
    if (!svg) return;
    await printHtmlDocument(svg, {
      title: config.title || t('tool_chart_studio_title', 'Chart & Statistics Graph Studio'),
      isSvg: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white truncate">
            {t('tool_chart_studio_title', 'Chart & Statistics Graph Studio')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(activeFamilySpec.descKey, activeFamilySpec.defaultDesc)} · {CHART_FAMILIES.length}{' '}
            {t('cs_families_count', 'chart families')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportPng()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{t('cs_export_png', 'Export PNG')}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportSvg()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SVG</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopySvg()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSvg ? t('cs_copied', 'Copied') : t('cs_copy_svg', 'Copy SVG')}</span>
          </button>

          <button
            type="button"
            onClick={() => void handlePrintChart()}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            title={t('cs_print', 'Print chart')}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('cs_print', 'Print')}</span>
          </button>

          <SendToToolButton
            sourceToolId="chart-studio"
            kind="text"
            getText={() => serializeDatasetToCsv(dataset)}
          />
        </div>
      </div>

      {/* Main Split Workspace: Left Excel-Style Chart Gallery + Right Canvas & Data Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)] gap-4 items-start">
        {/* Left Chart Type Gallery */}
        <aside className="rounded-xl bg-slate-900/40 border border-slate-800 p-2">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>{t('cs_chart_types', 'Chart Types')}</span>
            <span className="font-mono text-slate-500">{CHART_FAMILIES.length}</span>
          </div>
          <nav
            aria-label={t('cs_chart_types', 'Chart Types')}
            className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 lg:max-h-[680px] lg:overflow-y-auto"
          >
            {CHART_FAMILIES.map(fam => {
              const active = fam.id === config.family;
              return (
                <button
                  key={fam.id}
                  type="button"
                  onClick={() => handleSelectFamily(fam.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left whitespace-nowrap shrink-0 lg:w-full ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className={active ? 'text-white' : 'text-indigo-400'}>
                    {getFamilyIcon(fam.id)}
                  </span>
                  <span className="truncate">{t(fam.labelKey, fam.defaultLabel)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Studio Area */}
        <div className="space-y-4 min-w-0">
          {/* Subtype Bar + Style Toggle */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFamilySpec.subtypes.map(sub => {
                const isSubActive = config.subtype === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      setConfig(prev => ({ ...prev, subtype: sub.id as ChartSubtypeId }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSubActive
                        ? 'bg-indigo-600/25 border border-indigo-500/60 text-white'
                        : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {t(sub.labelKey, sub.defaultLabel)}
                  </button>
                );
              })}

              {isCustomData && (
                <button
                  type="button"
                  onClick={() => handleLoadPreset(activeFamilySpec.defaultPresetId)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors whitespace-nowrap shrink-0"
                >
                  {t('cs_load_matching_sample', 'Load matching sample')}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowStyleControls(prev => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('cs_customize_btn', 'Customize')}</span>
            </button>
          </div>

          {/* Live Interactive Chart Canvas */}
          <ChartStudioCanvas
            svgRef={svgRef}
            dataset={dataset}
            config={config}
            emptyMessage={t('cs_empty_chart', 'Add at least one row of numeric data below to render your chart.')}
          />

          {/* Customization Strip */}
          {showStyleControls && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-400">
                    {t('cs_chart_title', 'Chart Title')}
                  </span>
                  <input
                    type="text"
                    value={config.title}
                    onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('cs_title_placeholder', 'Enter chart title...')}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-400">
                    {t('cs_chart_subtitle', 'Subtitle')}
                  </span>
                  <input
                    type="text"
                    value={config.subtitle}
                    onChange={e => setConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder={t('cs_subtitle_placeholder', 'Optional units or timeframe...')}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-400">
                    {t('cs_x_axis_label', 'X-Axis Label')}
                  </span>
                  <input
                    type="text"
                    value={config.xAxisLabel}
                    onChange={e => setConfig(prev => ({ ...prev, xAxisLabel: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="text-[11px] font-medium text-slate-400">
                    {t('cs_y_axis_label', 'Y-Axis Label')}
                  </span>
                  <input
                    type="text"
                    value={config.yAxisLabel}
                    onChange={e => setConfig(prev => ({ ...prev, yAxisLabel: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800/80">
                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{t('cs_palette', 'Palette')}</span>
                  <select
                    value={config.palette}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, palette: e.target.value as ChartPaletteId }))
                    }
                    className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {CHART_PALETTES.map(pal => (
                      <option key={pal.id} value={pal.id}>
                        {t(pal.labelKey, pal.defaultLabel)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{t('cs_background', 'Canvas')}</span>
                  <select
                    value={config.canvasTheme}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        canvasTheme: e.target.value as ChartCanvasTheme,
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="dark">{t('cs_bg_dark', 'Dark')}</option>
                    <option value="light">{t('cs_bg_light', 'Light (Report)')}</option>
                    <option value="transparent">{t('cs_bg_transparent', 'Transparent')}</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{t('cs_legend', 'Legend')}</span>
                  <select
                    value={config.legendPosition}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        legendPosition: e.target.value as LegendPosition,
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="top">{t('cs_legend_top', 'Top')}</option>
                    <option value="bottom">{t('cs_legend_bottom', 'Bottom')}</option>
                    <option value="none">{t('cs_legend_none', 'Hidden')}</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showGrid}
                    onChange={e => setConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
                    className="rounded border-slate-700 accent-indigo-500"
                  />
                  <span>{t('cs_show_grid', 'Gridlines')}</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showDataLabels}
                    onChange={e =>
                      setConfig(prev => ({ ...prev, showDataLabels: e.target.checked }))
                    }
                    className="rounded border-slate-700 accent-indigo-500"
                  />
                  <span>{t('cs_show_values', 'Data Labels')}</span>
                </label>

                {config.family === 'histogram' && (
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <span>
                      {t('cs_bins', 'Bins')}:{' '}
                      <strong className="font-mono text-indigo-300">{config.histogramBins}</strong>
                    </span>
                    <input
                      type="range"
                      min={2}
                      max={16}
                      value={config.histogramBins}
                      onChange={e =>
                        setConfig(prev => ({ ...prev, histogramBins: Number(e.target.value) }))
                      }
                      className="w-24 accent-indigo-500"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Interactive Spreadsheet Data Editor */}
          <section className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  {t('cs_data_editor_title', 'Chart Data Table')}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {dataset.rows.length} × {dataset.headers.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  aria-label={t('cs_load_preset', 'Load sample dataset')}
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      handleLoadPreset(e.target.value as SamplePresetId);
                      e.target.value = '';
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    {t('cs_load_sample_placeholder', 'Load Sample Dataset...')}
                  </option>
                  {SAMPLE_PRESETS.map(p => (
                    <option key={p.id} value={p.id}>
                      {t(p.labelKey, p.defaultLabel)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addRow}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('cs_add_row', 'Row')}</span>
                </button>

                <button
                  type="button"
                  onClick={addSeriesColumn}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('cs_add_series', 'Series')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTranspose}
                  title={t('cs_transpose_tip', 'Swap rows and columns')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('cs_transpose', 'Transpose')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSortByFirstSeries}
                  title={t('cs_sort_tip', 'Sort rows by first numeric series')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('cs_sort', 'Sort')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasteBox(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>{t('cs_paste_csv', 'Paste CSV / Excel')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('cs_import_file', 'Import File')}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.ods"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void importFileObject(file);
                    e.target.value = '';
                  }}
                />

                <button
                  type="button"
                  onClick={() => void handleExportCsv()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearTable}
                  title={t('cs_clear_table', 'Reset to minimal blank table')}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Inline Paste CSV/Excel/JSON Drawer */}
            {showPasteBox && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                <p className="text-xs text-slate-400">
                  {t(
                    'cs_paste_help',
                    'Paste comma-separated (CSV), tab-separated (copied directly from Excel / Google Sheets), semicolon-separated, or JSON array data:'
                  )}
                </p>
                <textarea
                  rows={5}
                  value={pasteInput}
                  onChange={e => setPasteInput(e.target.value)}
                  placeholder={'Category,Series A,Series B\nJan,120,95\nFeb,145,112\nMar,168,134'}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                  >
                    {t('cs_cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPastedData}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    {t('cs_apply_data', 'Apply Data')}
                  </button>
                </div>
              </div>
            )}

            {/* Editable Spreadsheet Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800">
                    <th className="w-10 px-2 py-2 text-center text-[11px] font-mono text-slate-500">
                      #
                    </th>
                    {dataset.headers.map((header, colIdx) => (
                      <th key={colIdx} className="px-2 py-1.5 min-w-[110px]">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            aria-label={`Column ${colIdx + 1} header`}
                            value={header}
                            onChange={e => updateHeader(colIdx, e.target.value)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 focus:border-indigo-500 text-xs font-semibold text-white focus:outline-none"
                          />
                          {colIdx > 0 && dataset.headers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => deleteSeriesColumn(colIdx)}
                              title={t('cs_delete_col', 'Remove series column')}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-16 px-2 py-2 text-right text-[11px] font-mono text-slate-500">
                      {t('cs_actions', 'Row')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {dataset.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-2 py-1 text-center text-[11px] font-mono text-slate-500 tabular-nums">
                        {rowIdx + 1}
                      </td>
                      {dataset.headers.map((_, colIdx) => (
                        <td key={colIdx} className="px-2 py-1">
                          <input
                            type="text"
                            value={row[colIdx] ?? ''}
                            onChange={e => updateCell(rowIdx, colIdx, e.target.value)}
                            className={`w-full px-2 py-1 rounded bg-slate-950/60 border border-slate-800/80 focus:border-indigo-500 text-xs text-slate-100 focus:outline-none ${
                              colIdx > 0 ? 'font-mono tabular-nums text-right' : ''
                            }`}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => duplicateRow(rowIdx)}
                            title={t('cs_dup_row', 'Duplicate row')}
                            className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRow(rowIdx)}
                            title={t('cs_del_row', 'Delete row')}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Descriptive Series Statistics Summary */}
            {summaryStats.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  {t('cs_series_stats', 'Series Descriptive Statistics')}
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-500 font-mono">
                        <th className="py-1.5 pr-3">{t('cs_stat_series', 'Series')}</th>
                        <th className="py-1.5 pr-3 text-right">{t('cs_stat_n', 'N')}</th>
                        <th className="py-1.5 pr-3 text-right">{t('cs_stat_sum', 'Sum')}</th>
                        <th className="py-1.5 pr-3 text-right">{t('cs_stat_mean', 'Mean')}</th>
                        <th className="py-1.5 pr-3 text-right">{t('cs_stat_median', 'Median')}</th>
                        <th className="py-1.5 pr-3 text-right">{t('cs_stat_std', 'Std Dev')}</th>
                        <th className="py-1.5 pr-3 text-right">{t('cs_stat_min', 'Min')}</th>
                        <th className="py-1.5 text-right">{t('cs_stat_max', 'Max')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                      {summaryStats.map(st => (
                        <tr key={st.name} className="text-slate-300">
                          <td className="py-1.5 pr-3 font-sans font-medium text-white truncate max-w-[160px]">
                            {st.name}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-slate-400">{st.count}</td>
                          <td className="py-1.5 pr-3 text-right">{formatCompactNumber(st.sum)}</td>
                          <td className="py-1.5 pr-3 text-right text-cyan-300">
                            {formatCompactNumber(st.mean)}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-indigo-300">
                            {formatCompactNumber(st.median)}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-slate-400">
                            {formatCompactNumber(st.stdDev)}
                          </td>
                          <td className="py-1.5 pr-3 text-right">{formatCompactNumber(st.min)}</td>
                          <td className="py-1.5 text-right">{formatCompactNumber(st.max)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
