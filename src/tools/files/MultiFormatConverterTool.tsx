import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  Table,
  Film,
  Music,
  Archive,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
  Eye,
  EyeOff,
  FolderArchive,
  Play,
  Sparkles,
  FileDown,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { registerTauriDropListener, saveBinaryWithDialog } from '../../services/fileSystemService';
import { consumePendingToolPipe, setPendingToolPipe } from '../../services/toolPipeService';
import { toastService } from '../../services/toastService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { PdfBlobPreview } from './PdfBlobPreview';
import {
  ConverterCategoryId,
  FORMAT_CATALOG,
  TOTAL_SUPPORTED_FORMATS,
  detectCategoryForFile,
  detectFileExtension,
  formatBytes,
  getAllAcceptedExtensions,
  getDefaultTargetFormat,
  getTargetFormatsForInput,
} from './converterCatalog';
import {
  ConversionOptions,
  ConversionResult,
  DEFAULT_CONVERSION_OPTIONS,
  bundleResultsAsZip,
  convertFile,
  createSampleFileForCategory,
} from './converterEngine';
import { ArchiveEntry, createTarArchive, createZipArchive, compressGzip } from './converterEncoders';

type QueueItemStatus = 'ready' | 'converting' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  inputExt: string;
  category: ConverterCategoryId;
  targetExt: string;
  options: ConversionOptions;
  status: QueueItemStatus;
  progress: number;
  stage?: string;
  error?: string;
  result?: ConversionResult;
  resultUrl?: string;
  showOptions: boolean;
  showPreview: boolean;
}

const CATEGORY_ICONS: Record<ConverterCategoryId, React.ComponentType<{ className?: string }>> = {
  video: Film,
  audio: Music,
  images: ImageIcon,
  documents: FileText,
  spreadsheets: Table,
  archives: Archive,
};

function createQueueId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const MultiFormatConverterTool: React.FC = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<ConverterCategoryId>('video');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [pendingPresetTarget, setPendingPresetTarget] = useState<string | null>(null);
  const [pickerAccept, setPickerAccept] = useState<string>(getAllAcceptedExtensions());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<Set<string>>(new Set());

  const revokeUrl = useCallback((url?: string) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    urlsRef.current.delete(url);
  }, []);

  useEffect(() => {
    const tracked = urlsRef.current;
    return () => {
      tracked.forEach(url => URL.revokeObjectURL(url));
      tracked.clear();
    };
  }, []);

  const enqueueFiles = useCallback(
    (files: File[], preferredTarget?: string | null) => {
      if (files.length === 0) return;

      const newItems: QueueItem[] = files.map(file => {
        const inputExt = detectFileExtension(file.name, file.type);
        const category = detectCategoryForFile(file.name, file.type);
        const validTargets = getTargetFormatsForInput(inputExt, category);
        const targetExt =
          preferredTarget && validTargets.some(opt => opt.ext === preferredTarget)
            ? preferredTarget
            : getDefaultTargetFormat(inputExt, category);

        return {
          id: createQueueId(),
          file,
          inputExt,
          category,
          targetExt,
          options: { ...DEFAULT_CONVERSION_OPTIONS },
          status: 'ready',
          progress: 0,
          showOptions: false,
          showPreview: false,
        };
      });

      setQueue(prev => [...prev, ...newItems]);
      if (newItems[0]) {
        setActiveCategory(newItems[0].category);
      }
    },
    []
  );

  // Consume piped files from SmartDropModal or other OmniDesk tools
  useEffect(() => {
    const piped = consumePendingToolPipe('multi-converter');
    if (piped?.kind === 'file' && piped.file) {
      enqueueFiles([piped.file]);
    }
  }, [enqueueFiles]);

  // Native Tauri desktop drag & drop (WebView intercepts HTML5 onDrop when dragDropEnabled=true)
  useEffect(() => {
    return registerTauriDropListener(
      files => {
        if (files.length > 0) {
          enqueueFiles(files);
        }
      },
      {
        onDragStateChange: setIsDragging,
        onError: message => {
          toastService.show({
            type: 'error',
            title: t('conv_drop_error', 'Could not read dropped file'),
            message,
          });
        },
      }
    );
  }, [enqueueFiles, t]);

  const updateItem = useCallback((id: string, updater: (item: QueueItem) => QueueItem) => {
    setQueue(prev => prev.map(item => (item.id === id ? updater(item) : item)));
  }, []);

  const removeItem = useCallback(
    (id: string) => {
      setQueue(prev => {
        const target = prev.find(i => i.id === id);
        if (target?.resultUrl) revokeUrl(target.resultUrl);
        return prev.filter(i => i.id !== id);
      });
    },
    [revokeUrl]
  );

  const clearQueue = useCallback(() => {
    setQueue(prev => {
      prev.forEach(item => revokeUrl(item.resultUrl));
      return [];
    });
  }, [revokeUrl]);

  const convertSingleItem = useCallback(
    async (item: QueueItem): Promise<void> => {
      updateItem(item.id, curr => ({
        ...curr,
        status: 'converting',
        progress: 5,
        stage: t('conv_stage_starting', 'Preparing'),
        error: undefined,
      }));

      try {
        const result = await convertFile(
          item.file,
          item.category,
          item.targetExt,
          item.options,
          (percent, stage) => {
            updateItem(item.id, curr => ({
              ...curr,
              progress: percent,
              stage,
            }));
          }
        );

        const url = URL.createObjectURL(result.blob);
        urlsRef.current.add(url);

        updateItem(item.id, curr => {
          if (curr.resultUrl) revokeUrl(curr.resultUrl);
          return {
            ...curr,
            status: 'done',
            progress: 100,
            stage: undefined,
            result,
            resultUrl: url,
            showPreview:
              result.previewKind === 'image' ||
              result.previewKind === 'audio' ||
              result.previewKind === 'video' ||
              result.previewKind === 'archive' ||
              result.previewKind === 'pdf',
          };
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : t('conv_error_generic', 'Conversion failed for this file.');
        updateItem(item.id, curr => ({
          ...curr,
          status: 'error',
          progress: 0,
          stage: undefined,
          error: message,
        }));
      }
    },
    [revokeUrl, t, updateItem]
  );

  const handleConvertAll = useCallback(async () => {
    const pending = queue.filter(item => item.status === 'ready' || item.status === 'error');
    if (pending.length === 0) return;

    setIsBatchRunning(true);
    try {
      for (const item of pending) {
        await convertSingleItem(item);
      }
    } finally {
      setIsBatchRunning(false);
    }
  }, [convertSingleItem, queue]);

  const handleSaveResult = useCallback(
    async (result: ConversionResult) => {
      const ext = result.fileName.split('.').pop() || 'bin';
      await saveBinaryWithDialog(
        result.fileName,
        result.blob,
        result.mime,
        [
          { name: `${t('file_label', 'File')} (*.${ext})`, extensions: [ext] },
          { name: `${t('all_files', 'All files')} (*.*)`, extensions: ['*'] },
        ],
        t('save_converted_file', 'Save converted file (Explorer)')
      );
    },
    [t]
  );

  const handleOpenInPdfEditor = useCallback((result: ConversionResult) => {
    const pdfFile = new File([result.blob], result.fileName, { type: 'application/pdf' });
    setPendingToolPipe('pdf-editor', {
      kind: 'file',
      file: pdfFile,
      sourceToolId: 'multi-converter',
    });
    window.dispatchEvent(new CustomEvent('omnidesk-open-tool', { detail: { toolId: 'pdf-editor' } }));
  }, []);

  const handleSaveArchiveEntry = useCallback(
    async (entry: ArchiveEntry) => {
      const cleanName = entry.name.split('/').pop() || entry.name;
      const ext = cleanName.includes('.') ? cleanName.split('.').pop() || 'bin' : 'bin';
      const blob = new Blob([entry.data as unknown as BlobPart], {
        type: 'application/octet-stream',
      });
      await saveBinaryWithDialog(
        cleanName,
        blob,
        'application/octet-stream',
        [
          { name: `${t('file_label', 'File')} (*.${ext})`, extensions: [ext] },
          { name: `${t('all_files', 'All files')} (*.*)`, extensions: ['*'] },
        ],
        t('conv_save_extracted_file', 'Save extracted file')
      );
    },
    [t]
  );

  const handleDownloadAllZip = useCallback(async () => {
    const completed = queue.filter(
      (item): item is QueueItem & { result: ConversionResult } =>
        item.status === 'done' && Boolean(item.result)
    );
    if (completed.length === 0) return;

    const zipBlob = await bundleResultsAsZip(
      completed.map(item => ({
        fileName: item.result.fileName,
        blob: item.result.blob,
      }))
    );

    await saveBinaryWithDialog(
      'omnidesk_converted_batch.zip',
      zipBlob,
      'application/zip',
      [{ name: 'ZIP Archive (*.zip)', extensions: ['zip'] }],
      t('conv_download_all_zip', 'Download All (.zip)')
    );
  }, [queue, t]);

  const handlePackQueueArchive = useCallback(
    async (format: 'zip' | 'tar.gz') => {
      if (queue.length === 0) return;
      const entries: ArchiveEntry[] = [];
      for (const item of queue) {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        entries.push({ name: item.file.name, data: bytes, size: bytes.length });
      }
      const outBytes =
        format === 'zip'
          ? createZipArchive(entries)
          : compressGzip(createTarArchive(entries));
      const mime = format === 'zip' ? 'application/zip' : 'application/gzip';
      const fileName = format === 'zip' ? 'omnidesk_bundle.zip' : 'omnidesk_bundle.tar.gz';
      const blob = new Blob([outBytes as unknown as BlobPart], { type: mime });
      await saveBinaryWithDialog(
        fileName,
        blob,
        mime,
        [{ name: `${format.toUpperCase()} (*.${format})`, extensions: [format === 'zip' ? 'zip' : 'gz'] }],
        t('conv_pack_archive_btn', 'Pack files into archive')
      );
    },
    [queue, t]
  );

  const openPickerWithAccept = useCallback((accept: string, presetTarget: string | null = null) => {
    setPickerAccept(accept);
    setPendingPresetTarget(presetTarget);
    // Defer click until input accept updates
    window.setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 0);
  }, []);

  const handleLoadSample = useCallback(async () => {
    setIsGeneratingSample(true);
    try {
      const sample = await createSampleFileForCategory(activeCategory);
      enqueueFiles([sample]);
      toastService.show({
        type: 'info',
        title: t('conv_sample_loaded', 'Sample file added to queue'),
      });
    } catch {
      toastService.show({
        type: 'error',
        title: t('conv_sample_error', 'Could not generate sample file'),
      });
    } finally {
      setIsGeneratingSample(false);
    }
  }, [activeCategory, enqueueFiles, t]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      enqueueFiles(droppedFiles);
    }
  };

  const activeCatalogMeta =
    FORMAT_CATALOG.find(cat => cat.id === activeCategory) ?? FORMAT_CATALOG[0];

  const completedCount = queue.filter(i => i.status === 'done').length;
  const readyOrErrorCount = queue.filter(i => i.status === 'ready' || i.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Hidden multi-file picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={pickerAccept}
        className="hidden"
        onChange={e => {
          const picked = e.target.files ? Array.from(e.target.files) : [];
          if (picked.length > 0) {
            enqueueFiles(picked, pendingPresetTarget);
          }
          setPendingPresetTarget(null);
        }}
      />

      {/* Format Catalog Header + Category Tabs + 2-Column Catalog Panel */}
      <section className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
        <div className="p-5 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {t('conv_catalog_title', 'Offline Format Catalog')}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {t(
                  'conv_catalog_subtitle',
                  'Convert {count} formats across 6 categories locally in device memory — video, audio, images, documents, spreadsheets, and archives with zero uploads.',
                  { count: TOTAL_SUPPORTED_FORMATS }
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isGeneratingSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              {isGeneratingSample ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>
                {t('conv_try_category_sample', 'Load sample {category} file', {
                  category: t(activeCatalogMeta.labelKey, activeCatalogMeta.defaultLabel),
                })}
              </span>
            </button>
          </div>

          {/* Category Navigation Tabs */}
          <div
            role="tablist"
            aria-label={t('conv_categories_aria', 'Format categories')}
            className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-slate-800"
          >
            {FORMAT_CATALOG.map(cat => {
              const Icon = CATEGORY_ICONS[cat.id];
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(cat.labelKey, cat.defaultLabel)}</span>
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      isActive ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {cat.formats.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Format Grid + Common Conversions (CloudConvert-inspired layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-slate-800 bg-slate-950/40">
          {/* Left: Supported Formats Grid */}
          <div className="lg:col-span-7 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 tracking-wide">
                {t('conv_category_formats_heading', '{category} formats', {
                  category: t(activeCatalogMeta.labelKey, activeCatalogMeta.defaultLabel),
                })}
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {t('conv_formats_listed', '{count} listed', {
                  count: activeCatalogMeta.formats.length,
                })}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {activeCatalogMeta.formats.map(fmt => (
                <button
                  key={fmt.ext}
                  type="button"
                  onClick={() => {
                    if (fmt.canInput) {
                      openPickerWithAccept(`.${fmt.ext}`);
                    } else {
                      openPickerWithAccept(activeCatalogMeta.accept, fmt.ext);
                    }
                  }}
                  title={
                    fmt.canInput && fmt.canOutput
                      ? t('conv_fmt_io_tooltip', 'Supports input & output — click to select .{ext} files', { ext: fmt.ext })
                      : fmt.canInput
                      ? t('conv_fmt_in_tooltip', 'Input format — click to select .{ext} files', { ext: fmt.ext })
                      : t('conv_fmt_out_tooltip', 'Output target — click to pick a file to convert to .{ext}', { ext: fmt.ext })
                  }
                  className="px-2.5 py-2 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-center transition-colors group"
                >
                  <span className="block font-mono text-xs font-semibold text-slate-200 group-hover:text-white">
                    {fmt.label}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    {fmt.canInput && fmt.canOutput
                      ? t('conv_dir_both', 'In / Out')
                      : fmt.canInput
                      ? t('conv_dir_in', 'Input')
                      : t('conv_dir_out', 'Output')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Common Conversion Presets */}
          <div className="lg:col-span-5 p-5 border-t lg:border-t-0 lg:border-l border-slate-800">
            <span className="text-xs font-semibold text-slate-400 tracking-wide block mb-3">
              {t('conv_common_conversions', 'Common conversions')}
            </span>
            <div className="space-y-2">
              {activeCatalogMeta.commonConversions.map(preset => (
                <button
                  key={`${preset.from}_${preset.to}`}
                  type="button"
                  onClick={() => openPickerWithAccept(`.${preset.from}`, preset.to)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-200 group-hover:text-indigo-300">
                    <span>{preset.from.toUpperCase()}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                    <span>{preset.to.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t(preset.descKey, preset.defaultDesc)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Universal Multi-File Dropzone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => openPickerWithAccept(getAllAcceptedExtensions())}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPickerWithAccept(getAllAcceptedExtensions());
          }
        }}
        className={`rounded-xl border-2 border-dashed p-7 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/20'
            : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/20'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-white">
            {t('conv_dropzone_title', 'Drop files here or click to browse')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {t(
              'conv_dropzone_hint',
              'Auto-detects Video, Audio, Images, Documents, Spreadsheets & Archives — batch multiple files at once'
            )}
          </p>
        </div>
      </div>

      {/* Conversion Queue */}
      {queue.length > 0 && (
        <section className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
          {/* Batch Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-white">
                {t('conv_queue_heading', 'Conversion queue')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {t('conv_queue_stats', '{total} file(s) · {done} ready', {
                  total: queue.length,
                  done: completedCount,
                })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {queue.length >= 2 && (
                <button
                  type="button"
                  onClick={() => handlePackQueueArchive('zip')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('conv_pack_zip_btn', 'Pack inputs as ZIP')}</span>
                </button>
              )}

              {completedCount >= 2 && (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('conv_download_all_zip', 'Download All (.zip)')}</span>
                </button>
              )}

              {readyOrErrorCount > 0 && (
                <button
                  type="button"
                  onClick={handleConvertAll}
                  disabled={isBatchRunning}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                >
                  {isBatchRunning ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isBatchRunning
                      ? t('conv_converting_batch', 'Converting...')
                      : t('conv_convert_all_btn', 'Convert All ({count})', {
                          count: readyOrErrorCount,
                        })}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={clearQueue}
                disabled={isBatchRunning}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('conv_clear_queue', 'Clear')}</span>
              </button>
            </div>
          </div>

          {/* Queue Rows */}
          <div className="divide-y divide-slate-800">
            {queue.map(item => {
              const Icon = CATEGORY_ICONS[item.category];
              const targets = getTargetFormatsForInput(item.inputExt, item.category);
              const hasOptions =
                item.category === 'images' ||
                item.category === 'video' ||
                item.category === 'audio' ||
                (item.category === 'documents' && item.inputExt === 'pdf' && (item.targetExt === 'png' || item.targetExt === 'jpg'));

              const deltaPct =
                item.result && item.result.originalSize > 0
                  ? ((item.result.newSize - item.result.originalSize) / item.result.originalSize) * 100
                  : 0;

              return (
                <div key={item.id} className="p-4 space-y-3">
                  {/* Primary Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* File Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700 text-indigo-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono tabular-nums">
                          <span>{item.inputExt.toUpperCase()}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatBytes(item.file.size)}</span>
                          {item.result && (
                            <>
                              <span aria-hidden="true">→</span>
                              <span className="text-indigo-300 font-semibold">
                                {formatBytes(item.result.newSize)}
                              </span>
                              <span
                                className={
                                  deltaPct < 0 ? 'text-emerald-400' : 'text-slate-400'
                                }
                              >
                                ({deltaPct >= 0 ? '+' : ''}
                                {deltaPct.toFixed(1)}%)
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{item.result.durationMs} ms</span>
                              {item.result.note && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.result.note}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls: Target Selector + Options + Convert/Save + Remove */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">
                          {t('conv_to_label', 'to')}
                        </span>
                        <select
                          aria-label={t('conv_target_format_aria', 'Target format for {name}', {
                            name: item.file.name,
                          })}
                          value={item.targetExt}
                          disabled={item.status === 'converting'}
                          onChange={e =>
                            updateItem(item.id, curr => ({
                              ...curr,
                              targetExt: e.target.value,
                              status: curr.status === 'done' ? 'ready' : curr.status,
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono font-semibold text-slate-100"
                        >
                          {targets.map(opt => (
                            <option key={opt.ext} value={opt.ext}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {hasOptions && (
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, curr => ({
                              ...curr,
                              showOptions: !curr.showOptions,
                            }))
                          }
                          title={t('conv_options_tooltip', 'Conversion settings')}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            item.showOptions
                              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                              : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {item.status === 'done' && item.result ? (
                        <>
                          {item.result.previewKind !== 'none' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  showPreview: !curr.showPreview,
                                }))
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap shrink-0"
                            >
                              {item.showPreview ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              <span>{t('conv_preview_btn', 'Preview')}</span>
                            </button>
                          )}

                          {item.result.previewKind === 'text' && item.result.textPreview && (
                            <SendToToolButton
                              sourceToolId="multi-converter"
                              kind="text"
                              getText={() => item.result?.textPreview || ''}
                            />
                          )}

                          {item.result.previewKind === 'pdf' && (
                            <button
                              type="button"
                              onClick={() => handleOpenInPdfEditor(item.result!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors whitespace-nowrap shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{t('conv_open_in_pdf_editor', 'Open in PDF Editor')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSaveResult(item.result!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t('conv_save_btn', 'Save')}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => convertSingleItem(item)}
                          disabled={item.status === 'converting'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                        >
                          {item.status === 'converting' ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {item.status === 'converting'
                              ? `${item.progress}%`
                              : t('conv_convert_btn', 'Convert')}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={item.status === 'converting'}
                        aria-label={t('conv_remove_item', 'Remove file from queue')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Per-File Options Strip */}
                  {item.showOptions && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                      {/* Image Options */}
                      {item.category === 'images' && (
                        <>
                          {item.targetExt === 'ico' ? (
                            <div className="space-y-1">
                              <label className="text-slate-400 block font-medium">
                                {t('conv_opt_ico_size', 'Icon size')}
                              </label>
                              <select
                                value={item.options.icoSize}
                                onChange={e =>
                                  updateItem(item.id, curr => ({
                                    ...curr,
                                    status: curr.status === 'done' ? 'ready' : curr.status,
                                    options: { ...curr.options, icoSize: Number(e.target.value) },
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                              >
                                <option value={32}>32 × 32 px</option>
                                <option value={64}>64 × 64 px</option>
                                <option value={128}>128 × 128 px</option>
                                <option value={256}>256 × 256 px</option>
                              </select>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <label className="text-slate-400 font-medium">
                                    {t('compression_quality', 'Compression quality')}
                                  </label>
                                  <span className="font-mono tabular-nums text-indigo-400">
                                    {item.options.imageQuality}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={10}
                                  max={100}
                                  value={item.options.imageQuality}
                                  onChange={e =>
                                    updateItem(item.id, curr => ({
                                      ...curr,
                                      status: curr.status === 'done' ? 'ready' : curr.status,
                                      options: {
                                        ...curr.options,
                                        imageQuality: Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full accent-indigo-500 cursor-pointer"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-400 block font-medium">
                                  {t('scale_resize', 'Scale / Resize')}
                                </label>
                                <select
                                  value={item.options.imageScale}
                                  onChange={e =>
                                    updateItem(item.id, curr => ({
                                      ...curr,
                                      status: curr.status === 'done' ? 'ready' : curr.status,
                                      options: {
                                        ...curr.options,
                                        imageScale: Number(e.target.value),
                                      },
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                                >
                                  <option value={100}>100%</option>
                                  <option value={75}>75%</option>
                                  <option value={50}>50%</option>
                                  <option value={25}>25%</option>
                                </select>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* Video -> GIF Options */}
                      {item.category === 'video' && item.targetExt === 'gif' && (
                        <>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <label className="text-slate-400 font-medium">
                                {t('conv_opt_gif_fps', 'GIF frame rate')}
                              </label>
                              <span className="font-mono tabular-nums text-indigo-400">
                                {item.options.gifFps} fps
                              </span>
                            </div>
                            <input
                              type="range"
                              min={5}
                              max={20}
                              value={item.options.gifFps}
                              onChange={e =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  status: curr.status === 'done' ? 'ready' : curr.status,
                                  options: { ...curr.options, gifFps: Number(e.target.value) },
                                }))
                              }
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-400 block font-medium">
                              {t('conv_opt_gif_width', 'Max GIF width')}
                            </label>
                            <select
                              value={item.options.gifWidth}
                              onChange={e =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  status: curr.status === 'done' ? 'ready' : curr.status,
                                  options: { ...curr.options, gifWidth: Number(e.target.value) },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                            >
                              <option value={320}>320 px</option>
                              <option value={480}>480 px</option>
                              <option value={640}>640 px</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <label className="text-slate-400 font-medium">
                                {t('conv_opt_gif_duration', 'Max clip length')}
                              </label>
                              <span className="font-mono tabular-nums text-indigo-400">
                                {item.options.gifMaxDurationSec} s
                              </span>
                            </div>
                            <input
                              type="range"
                              min={2}
                              max={15}
                              value={item.options.gifMaxDurationSec}
                              onChange={e =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  status: curr.status === 'done' ? 'ready' : curr.status,
                                  options: {
                                    ...curr.options,
                                    gifMaxDurationSec: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-full accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </>
                      )}

                      {/* Video -> WebM / Frame Options */}
                      {item.category === 'video' &&
                        item.targetExt !== 'gif' &&
                        item.targetExt !== 'wav' && (
                          <>
                            <div className="space-y-1">
                              <label className="text-slate-400 block font-medium">
                                {t('scale_resize', 'Scale / Resize')}
                              </label>
                              <select
                                value={item.options.videoScale}
                                onChange={e =>
                                  updateItem(item.id, curr => ({
                                    ...curr,
                                    status: curr.status === 'done' ? 'ready' : curr.status,
                                    options: {
                                      ...curr.options,
                                      videoScale: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                              >
                                <option value={100}>100%</option>
                                <option value={75}>75%</option>
                                <option value={50}>50%</option>
                              </select>
                            </div>
                            {['png', 'jpg', 'webp'].includes(item.targetExt) && (
                              <div className="space-y-1">
                                <label className="text-slate-400 block font-medium">
                                  {t('conv_opt_frame_time', 'Capture timestamp (sec)')}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={item.options.frameTimeSec}
                                  onChange={e =>
                                    updateItem(item.id, curr => ({
                                      ...curr,
                                      status: curr.status === 'done' ? 'ready' : curr.status,
                                      options: {
                                        ...curr.options,
                                        frameTimeSec: Math.max(0, Number(e.target.value) || 0),
                                      },
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono tabular-nums"
                                />
                              </div>
                            )}
                          </>
                        )}

                      {/* Audio / Video->WAV Options */}
                      {(item.category === 'audio' ||
                        (item.category === 'video' && item.targetExt === 'wav')) && (
                        <>
                          <div className="space-y-1">
                            <label className="text-slate-400 block font-medium">
                              {t('conv_opt_sample_rate', 'Sample rate')}
                            </label>
                            <select
                              value={item.options.audioSampleRate}
                              onChange={e =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  status: curr.status === 'done' ? 'ready' : curr.status,
                                  options: {
                                    ...curr.options,
                                    audioSampleRate: Number(e.target.value) as 22050 | 44100 | 48000,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                            >
                              <option value={48000}>48.0 kHz</option>
                              <option value={44100}>44.1 kHz</option>
                              <option value={22050}>22.05 kHz</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-400 block font-medium">
                              {t('conv_opt_channels', 'Channels')}
                            </label>
                            <select
                              value={item.options.audioChannels}
                              onChange={e =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  status: curr.status === 'done' ? 'ready' : curr.status,
                                  options: {
                                    ...curr.options,
                                    audioChannels: Number(e.target.value) as 1 | 2,
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                            >
                              <option value={2}>{t('conv_opt_stereo', 'Stereo (2 ch)')}</option>
                              <option value={1}>{t('conv_opt_mono', 'Mono (1 ch)')}</option>
                            </select>
                          </div>
                        </>
                      )}

                      {/* PDF -> Image Options */}
                      {item.category === 'documents' &&
                        item.inputExt === 'pdf' &&
                        (item.targetExt === 'png' || item.targetExt === 'jpg') && (
                          <div className="space-y-1">
                            <label className="text-slate-400 block font-medium">
                              {t('conv_opt_pdf_scale', 'PDF render DPI scale')}
                            </label>
                            <select
                              value={item.options.pdfRenderScale}
                              onChange={e =>
                                updateItem(item.id, curr => ({
                                  ...curr,
                                  status: curr.status === 'done' ? 'ready' : curr.status,
                                  options: {
                                    ...curr.options,
                                    pdfRenderScale: Number(e.target.value),
                                  },
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
                            >
                              <option value={1}>1.0× (72 DPI)</option>
                              <option value={1.5}>1.5× (108 DPI)</option>
                              <option value={2}>2.0× (144 DPI)</option>
                            </select>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Progress Bar */}
                  {item.status === 'converting' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.stage || t('processing_file_in_memory', 'Processing file locally...')}</span>
                        <span className="font-mono tabular-nums text-indigo-400">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-150"
                          style={{ width: `${Math.max(4, item.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {item.status === 'error' && item.error && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{item.error}</span>
                    </div>
                  )}

                  {/* Completed Banner */}
                  {item.status === 'done' && item.result && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-slate-300">
                        {t('conversion_finished', 'Conversion complete')}:{' '}
                        <strong className="font-mono text-white">{item.result.fileName}</strong>
                      </span>
                    </div>
                  )}

                  {/* Inline Preview */}
                  {item.status === 'done' && item.showPreview && item.result && item.resultUrl && (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 overflow-hidden">
                      {item.result.previewKind === 'image' && (
                        <div className="flex justify-center">
                          <img
                            src={item.resultUrl}
                            alt={item.result.fileName}
                            className="max-h-64 rounded-lg object-contain border border-slate-800"
                          />
                        </div>
                      )}

                      {item.result.previewKind === 'video' && (
                        <video
                          src={item.resultUrl}
                          controls
                          className="w-full max-h-72 rounded-lg bg-black"
                        />
                      )}

                      {item.result.previewKind === 'audio' && (
                        <audio src={item.resultUrl} controls className="w-full" />
                      )}

                      {item.result.previewKind === 'pdf' && (
                        <PdfBlobPreview
                          blob={item.result.blob}
                          fileName={item.result.fileName}
                        />
                      )}

                      {item.result.previewKind === 'text' && item.result.textPreview && (
                        <pre className="max-h-56 overflow-auto text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
                          {item.result.textPreview}
                        </pre>
                      )}

                      {item.result.previewKind === 'archive' && item.result.archiveEntries && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-slate-400 mb-2">
                            {t('conv_archive_contents', 'Archive contents ({count} files) — click any file to extract:', {
                              count: item.result.archiveEntries.length,
                            })}
                          </p>
                          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-lg">
                            {item.result.archiveEntries.map(entry => (
                              <div
                                key={entry.name}
                                className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-900/60"
                              >
                                <span className="font-mono text-slate-200 truncate pr-3">
                                  {entry.name}
                                </span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-mono tabular-nums text-[11px] text-slate-500">
                                    {formatBytes(entry.size)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveArchiveEntry(entry)}
                                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                    <span>{t('conv_extract_btn', 'Extract')}</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
