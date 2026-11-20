export interface ToolPipePayload {
  kind: 'text' | 'file' | 'color';
  text?: string;
  file?: File;
  colorHex?: string;
  sourceToolId?: string;
}

export interface PipeTargetOption {
  toolId: string;
  labelKey: string;
  defaultLabel: string;
  acceptedKinds: Array<'text' | 'color'>;
}

export const PIPE_TARGET_OPTIONS: PipeTargetOption[] = [
  { toolId: 'notes', labelKey: 'pipe_target_notes', defaultLabel: 'Notes Workspace', acceptedKinds: ['text'] },
  { toolId: 'text-editor', labelKey: 'pipe_target_text_editor', defaultLabel: 'Text & Markdown Editor', acceptedKinds: ['text'] },
  { toolId: 'markdown-preview', labelKey: 'pipe_target_markdown', defaultLabel: 'Markdown Preview', acceptedKinds: ['text'] },
  { toolId: 'word-counter-cleaner', labelKey: 'pipe_target_word_counter', defaultLabel: 'Word Counter & Text Cleaner', acceptedKinds: ['text'] },
  { toolId: 'json-formatter', labelKey: 'pipe_target_json_formatter', defaultLabel: 'JSON Formatter', acceptedKinds: ['text'] },
  { toolId: 'jsonpath-explorer', labelKey: 'pipe_target_jsonpath', defaultLabel: 'JSONPath Explorer', acceptedKinds: ['text'] },
  { toolId: 'text-diff', labelKey: 'pipe_target_text_diff', defaultLabel: 'Text Diff Checker', acceptedKinds: ['text'] },
  { toolId: 'hash-checksum-suite', labelKey: 'pipe_target_hash_suite', defaultLabel: 'Hash & Checksum Suite', acceptedKinds: ['text'] },
  { toolId: 'encoding-suite', labelKey: 'pipe_target_encoding_suite', defaultLabel: 'Encoding Suite', acceptedKinds: ['text'] },
  { toolId: 'case-converter', labelKey: 'pipe_target_case_converter', defaultLabel: 'Case Converter', acceptedKinds: ['text'] },
  { toolId: 'color-studio', labelKey: 'pipe_target_color_studio', defaultLabel: 'Color Picker & Studio', acceptedKinds: ['color'] },
  { toolId: 'wcag-validator', labelKey: 'pipe_target_wcag_contrast', defaultLabel: 'WCAG Contrast Validator', acceptedKinds: ['color'] },
];

let pendingTargetToolId: string | null = null;
let pendingPayload: ToolPipePayload | null = null;

export function setPendingToolPipe(targetToolId: string, payload: ToolPipePayload): void {
  pendingTargetToolId = targetToolId;
  pendingPayload = payload;
}

/**
 * Consumes and immediately clears the transient handoff payload so unused data
 * is never retained in RAM after the target tool initializes.
 */
export function consumePendingToolPipe(targetToolId: string): ToolPipePayload | null {
  if (pendingTargetToolId !== targetToolId || !pendingPayload) return null;
  const payload = pendingPayload;
  pendingTargetToolId = null;
  pendingPayload = null;
  return payload;
}

export function clearPendingToolPipe(): void {
  pendingTargetToolId = null;
  pendingPayload = null;
}

export function getMatchingToolIdsForFile(fileName: string, mimeType = ''): string[] {
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
  const mime = mimeType.toLowerCase();

  if (ext === 'pdf' || mime === 'application/pdf') {
    return ['pdf-editor', 'pdf-toolkit', 'multi-converter', 'file-inspector', 'hash-checksum-suite'];
  }
  if (ext === 'docx' || ext === 'rtf' || mime.includes('wordprocessingml')) {
    return ['multi-converter', 'file-inspector'];
  }
  if (['mp4', 'mov', 'm4v', 'ogv'].includes(ext) || mime.startsWith('video/')) {
    return ['multi-converter', 'file-inspector', 'hash-checksum-suite'];
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'avif', 'svg', 'ico'].includes(ext) || mime.startsWith('image/')) {
    return ['multi-converter', 'image-editor', 'photo-compressor', 'ocr-scanner', 'color-picker', 'qr-barcode-reader', 'file-inspector'];
  }
  if (['xlsx', 'xls', 'ods'].includes(ext)) {
    return ['multi-converter', 'file-inspector', 'hash-checksum-suite'];
  }
  if (['zip', 'tar', 'gz', 'tgz'].includes(ext) || mime.includes('zip') || mime.includes('gzip')) {
    return ['multi-converter', 'file-inspector', 'hash-checksum-suite'];
  }
  if (ext === 'json' || mime === 'application/json') {
    return ['json-formatter', 'multi-converter', 'jsonpath-explorer', 'data-converter', 'text-diff', 'text-editor'];
  }
  if (['csv', 'tsv'].includes(ext) || mime === 'text/csv') {
    return ['multi-converter', 'data-converter', 'sql-playground', 'text-editor'];
  }
  if (['yaml', 'yml'].includes(ext)) {
    return ['yaml-formatter', 'multi-converter', 'data-converter', 'text-editor', 'text-diff'];
  }
  if (ext === 'xml' || mime.includes('xml')) {
    return ['xml-formatter', 'multi-converter', 'text-editor', 'text-diff'];
  }
  if (['md', 'markdown'].includes(ext)) {
    return ['markdown-preview', 'multi-converter', 'text-editor', 'word-counter-cleaner', 'text-diff'];
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'webm', 'aac', 'opus', 'aiff'].includes(ext) || mime.startsWith('audio/')) {
    return ['audio-editor', 'multi-converter', 'file-inspector', 'hash-checksum-suite'];
  }
  if (['txt', 'log', 'ts', 'tsx', 'js', 'jsx', 'css', 'html', 'sql', 'py', 'rs'].includes(ext) || mime.startsWith('text/')) {
    return ['text-editor', 'multi-converter', 'word-counter-cleaner', 'text-diff', 'hash-checksum-suite', 'file-inspector'];
  }

  return ['file-inspector', 'hash-checksum-suite', 'file-crypto'];
}
