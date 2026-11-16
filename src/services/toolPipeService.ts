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
    return ['pdf-editor', 'pdf-toolkit', 'file-inspector', 'hash-checksum-suite'];
  }
  if (ext === 'docx' || mime.includes('wordprocessingml')) {
    return ['docx-to-pdf', 'multi-converter', 'file-inspector'];
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext) || mime.startsWith('image/')) {
    return ['image-editor', 'photo-compressor', 'ocr-scanner', 'color-picker', 'qr-barcode-reader', 'file-inspector'];
  }
  if (ext === 'json' || mime === 'application/json') {
    return ['json-formatter', 'jsonpath-explorer', 'data-converter', 'text-diff', 'text-editor'];
  }
  if (['csv', 'tsv'].includes(ext) || mime === 'text/csv') {
    return ['data-converter', 'multi-converter', 'sql-playground', 'text-editor'];
  }
  if (['yaml', 'yml'].includes(ext)) {
    return ['yaml-formatter', 'data-converter', 'text-editor', 'text-diff'];
  }
  if (ext === 'xml' || mime.includes('xml')) {
    return ['xml-formatter', 'text-editor', 'text-diff'];
  }
  if (['md', 'markdown'].includes(ext)) {
    return ['markdown-preview', 'text-editor', 'word-counter-cleaner', 'text-diff'];
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'webm', 'aac'].includes(ext) || mime.startsWith('audio/')) {
    return ['audio-editor', 'file-inspector', 'hash-checksum-suite'];
  }
  if (['txt', 'log', 'ts', 'tsx', 'js', 'jsx', 'css', 'html', 'sql', 'py', 'rs'].includes(ext) || mime.startsWith('text/')) {
    return ['text-editor', 'word-counter-cleaner', 'text-diff', 'hash-checksum-suite', 'file-inspector'];
  }

  return ['file-inspector', 'hash-checksum-suite', 'file-crypto'];
}
