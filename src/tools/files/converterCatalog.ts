export type ConverterCategoryId =
  | 'video'
  | 'audio'
  | 'images'
  | 'documents'
  | 'spreadsheets'
  | 'archives';

export interface FormatCatalogItem {
  ext: string;
  label: string;
  mime: string;
  category: ConverterCategoryId;
  canInput: boolean;
  canOutput: boolean;
}

export interface CommonConversionPreset {
  from: string;
  to: string;
  descKey: string;
  defaultDesc: string;
}

export interface CategoryCatalogMeta {
  id: ConverterCategoryId;
  labelKey: string;
  defaultLabel: string;
  accept: string;
  formats: FormatCatalogItem[];
  commonConversions: CommonConversionPreset[];
}

export const FORMAT_CATALOG: CategoryCatalogMeta[] = [
  {
    id: 'video',
    labelKey: 'conv_cat_video',
    defaultLabel: 'Video',
    accept: '.mp4,.webm,.mov,.m4v,.ogv,video/*',
    formats: [
      { ext: 'mp4', label: 'MP4', mime: 'video/mp4', category: 'video', canInput: true, canOutput: false },
      { ext: 'webm', label: 'WEBM', mime: 'video/webm', category: 'video', canInput: true, canOutput: true },
      { ext: 'mov', label: 'MOV', mime: 'video/quicktime', category: 'video', canInput: true, canOutput: false },
      { ext: 'm4v', label: 'M4V', mime: 'video/x-m4v', category: 'video', canInput: true, canOutput: false },
      { ext: 'ogv', label: 'OGV', mime: 'video/ogg', category: 'video', canInput: true, canOutput: false },
      { ext: 'gif', label: 'GIF', mime: 'image/gif', category: 'video', canInput: false, canOutput: true },
    ],
    commonConversions: [
      { from: 'mp4', to: 'webm', descKey: 'conv_preset_mp4_webm', defaultDesc: 'web-optimized VP9/VP8 video' },
      { from: 'mp4', to: 'gif', descKey: 'conv_preset_mp4_gif', defaultDesc: 'looping animated GIF clip' },
      { from: 'mp4', to: 'wav', descKey: 'conv_preset_mp4_wav', defaultDesc: 'extract lossless audio track' },
      { from: 'webm', to: 'png', descKey: 'conv_preset_video_png', defaultDesc: 'capture high-res video frame' },
    ],
  },
  {
    id: 'audio',
    labelKey: 'conv_cat_audio',
    defaultLabel: 'Audio',
    accept: '.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus,.webm,.aiff,audio/*',
    formats: [
      { ext: 'mp3', label: 'MP3', mime: 'audio/mpeg', category: 'audio', canInput: true, canOutput: false },
      { ext: 'wav', label: 'WAV', mime: 'audio/wav', category: 'audio', canInput: true, canOutput: true },
      { ext: 'ogg', label: 'OGG', mime: 'audio/ogg', category: 'audio', canInput: true, canOutput: false },
      { ext: 'flac', label: 'FLAC', mime: 'audio/flac', category: 'audio', canInput: true, canOutput: false },
      { ext: 'm4a', label: 'M4A', mime: 'audio/mp4', category: 'audio', canInput: true, canOutput: false },
      { ext: 'aac', label: 'AAC', mime: 'audio/aac', category: 'audio', canInput: true, canOutput: false },
      { ext: 'opus', label: 'OPUS', mime: 'audio/opus', category: 'audio', canInput: true, canOutput: false },
      { ext: 'aiff', label: 'AIFF', mime: 'audio/aiff', category: 'audio', canInput: false, canOutput: true },
    ],
    commonConversions: [
      { from: 'mp3', to: 'wav', descKey: 'conv_preset_mp3_wav', defaultDesc: 'lossless 16-bit PCM audio' },
      { from: 'flac', to: 'wav', descKey: 'conv_preset_flac_wav', defaultDesc: 'uncompressed studio WAV' },
      { from: 'wav', to: 'webm', descKey: 'conv_preset_wav_webm', defaultDesc: 'compact Opus audio container' },
      { from: 'm4a', to: 'aiff', descKey: 'conv_preset_m4a_aiff', defaultDesc: 'DAW-ready lossless AIFF' },
    ],
  },
  {
    id: 'images',
    labelKey: 'conv_cat_images',
    defaultLabel: 'Images',
    accept: '.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.avif,.ico,image/*',
    formats: [
      { ext: 'png', label: 'PNG', mime: 'image/png', category: 'images', canInput: true, canOutput: true },
      { ext: 'jpg', label: 'JPG', mime: 'image/jpeg', category: 'images', canInput: true, canOutput: true },
      { ext: 'webp', label: 'WEBP', mime: 'image/webp', category: 'images', canInput: true, canOutput: true },
      { ext: 'avif', label: 'AVIF', mime: 'image/avif', category: 'images', canInput: true, canOutput: false },
      { ext: 'gif', label: 'GIF', mime: 'image/gif', category: 'images', canInput: true, canOutput: true },
      { ext: 'bmp', label: 'BMP', mime: 'image/bmp', category: 'images', canInput: true, canOutput: true },
      { ext: 'ico', label: 'ICO', mime: 'image/x-icon', category: 'images', canInput: true, canOutput: true },
      { ext: 'svg', label: 'SVG', mime: 'image/svg+xml', category: 'images', canInput: true, canOutput: true },
    ],
    commonConversions: [
      { from: 'png', to: 'webp', descKey: 'conv_preset_png_webp', defaultDesc: 'smallest web image size' },
      { from: 'svg', to: 'png', descKey: 'conv_preset_svg_png', defaultDesc: 'rasterize vector at custom scale' },
      { from: 'png', to: 'ico', descKey: 'conv_preset_png_ico', defaultDesc: 'favicon & Windows app icon' },
      { from: 'jpg', to: 'pdf', descKey: 'conv_preset_jpg_pdf', defaultDesc: 'embed photo into printable PDF' },
    ],
  },
  {
    id: 'documents',
    labelKey: 'conv_cat_documents',
    defaultLabel: 'Documents',
    accept: '.docx,.pdf,.md,.markdown,.html,.htm,.txt,.rtf',
    formats: [
      { ext: 'docx', label: 'DOCX', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'documents', canInput: true, canOutput: true },
      { ext: 'pdf', label: 'PDF', mime: 'application/pdf', category: 'documents', canInput: true, canOutput: true },
      { ext: 'md', label: 'MD', mime: 'text/markdown', category: 'documents', canInput: true, canOutput: true },
      { ext: 'html', label: 'HTML', mime: 'text/html', category: 'documents', canInput: true, canOutput: true },
      { ext: 'txt', label: 'TXT', mime: 'text/plain', category: 'documents', canInput: true, canOutput: true },
      { ext: 'rtf', label: 'RTF', mime: 'application/rtf', category: 'documents', canInput: true, canOutput: false },
    ],
    commonConversions: [
      { from: 'docx', to: 'pdf', descKey: 'conv_preset_docx_pdf', defaultDesc: 'print-ready PDF document' },
      { from: 'pdf', to: 'txt', descKey: 'conv_preset_pdf_txt', defaultDesc: 'extract plain text from PDF' },
      { from: 'pdf', to: 'png', descKey: 'conv_preset_pdf_png', defaultDesc: 'render PDF pages as PNG images' },
      { from: 'md', to: 'docx', descKey: 'conv_preset_md_docx', defaultDesc: 'editable Word document export' },
    ],
  },
  {
    id: 'spreadsheets',
    labelKey: 'conv_cat_spreadsheets',
    defaultLabel: 'Spreadsheets & Data',
    accept: '.xlsx,.xls,.ods,.csv,.tsv,.json,.yaml,.yml,.xml',
    formats: [
      { ext: 'xlsx', label: 'XLSX', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'spreadsheets', canInput: true, canOutput: true },
      { ext: 'xls', label: 'XLS', mime: 'application/vnd.ms-excel', category: 'spreadsheets', canInput: true, canOutput: false },
      { ext: 'ods', label: 'ODS', mime: 'application/vnd.oasis.opendocument.spreadsheet', category: 'spreadsheets', canInput: true, canOutput: true },
      { ext: 'csv', label: 'CSV', mime: 'text/csv', category: 'spreadsheets', canInput: true, canOutput: true },
      { ext: 'tsv', label: 'TSV', mime: 'text/tab-separated-values', category: 'spreadsheets', canInput: true, canOutput: true },
      { ext: 'json', label: 'JSON', mime: 'application/json', category: 'spreadsheets', canInput: true, canOutput: true },
      { ext: 'yaml', label: 'YAML', mime: 'text/yaml', category: 'spreadsheets', canInput: true, canOutput: true },
      { ext: 'xml', label: 'XML', mime: 'application/xml', category: 'spreadsheets', canInput: true, canOutput: true },
    ],
    commonConversions: [
      { from: 'xlsx', to: 'csv', descKey: 'conv_preset_xlsx_csv', defaultDesc: 'export spreadsheet to CSV' },
      { from: 'csv', to: 'xlsx', descKey: 'conv_preset_csv_xlsx', defaultDesc: 'convert CSV into Excel workbook' },
      { from: 'json', to: 'yaml', descKey: 'conv_preset_json_yaml', defaultDesc: 'human-readable config format' },
      { from: 'csv', to: 'md', descKey: 'conv_preset_csv_md', defaultDesc: 'formatted Markdown data table' },
    ],
  },
  {
    id: 'archives',
    labelKey: 'conv_cat_archives',
    defaultLabel: 'Archives',
    accept: '.zip,.tar,.gz,.tgz',
    formats: [
      { ext: 'zip', label: 'ZIP', mime: 'application/zip', category: 'archives', canInput: true, canOutput: true },
      { ext: 'tar', label: 'TAR', mime: 'application/x-tar', category: 'archives', canInput: true, canOutput: true },
      { ext: 'gz', label: 'GZ', mime: 'application/gzip', category: 'archives', canInput: true, canOutput: true },
      { ext: 'tar.gz', label: 'TAR.GZ', mime: 'application/gzip', category: 'archives', canInput: true, canOutput: true },
    ],
    commonConversions: [
      { from: 'zip', to: 'tar.gz', descKey: 'conv_preset_zip_tgz', defaultDesc: 'repack ZIP into compressed tarball' },
      { from: 'tar.gz', to: 'zip', descKey: 'conv_preset_tgz_zip', defaultDesc: 'convert tarball into standard ZIP' },
      { from: 'tar', to: 'zip', descKey: 'conv_preset_tar_zip', defaultDesc: 'compress TAR archive as ZIP' },
      { from: 'gz', to: 'zip', descKey: 'conv_preset_gz_zip', defaultDesc: 'repack GZIP file into ZIP' },
    ],
  },
];

export const TOTAL_SUPPORTED_FORMATS = FORMAT_CATALOG.reduce(
  (sum, cat) => sum + cat.formats.length,
  0
);

export function detectFileExtension(fileName: string, mimeType = ''): string {
  const lower = fileName.toLowerCase().trim();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'tar.gz';

  const parts = lower.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1];
    if (ext === 'jpeg') return 'jpg';
    if (ext === 'markdown') return 'md';
    if (ext === 'htm') return 'html';
    if (ext === 'yml') return 'yaml';
    if (ext === 'aif') return 'aiff';
    return ext;
  }

  const mime = mimeType.toLowerCase();
  if (mime.startsWith('video/mp4')) return 'mp4';
  if (mime.startsWith('video/webm')) return 'webm';
  if (mime.startsWith('video/quicktime')) return 'mov';
  if (mime.startsWith('audio/mpeg')) return 'mp3';
  if (mime.startsWith('audio/wav')) return 'wav';
  if (mime.startsWith('audio/ogg')) return 'ogg';
  if (mime.startsWith('audio/flac')) return 'flac';
  if (mime.startsWith('image/png')) return 'png';
  if (mime.startsWith('image/jpeg')) return 'jpg';
  if (mime.startsWith('image/webp')) return 'webp';
  if (mime.startsWith('image/gif')) return 'gif';
  if (mime.startsWith('image/svg')) return 'svg';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'application/json') return 'json';
  if (mime === 'text/csv') return 'csv';
  if (mime === 'application/zip') return 'zip';
  if (mime === 'application/gzip') return 'gz';
  return 'txt';
}

export function detectCategoryForFile(fileName: string, mimeType = ''): ConverterCategoryId {
  const ext = detectFileExtension(fileName, mimeType);
  const mime = mimeType.toLowerCase();

  // Disambiguate webm (audio vs video) via MIME when available
  if (ext === 'webm' && mime.startsWith('audio/')) {
    return 'audio';
  }
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv', 'avi'].includes(ext) || mime.startsWith('video/')) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'aiff'].includes(ext) || mime.startsWith('audio/')) {
    return 'audio';
  }
  if (['png', 'jpg', 'webp', 'avif', 'gif', 'bmp', 'ico', 'svg'].includes(ext) || mime.startsWith('image/')) {
    return 'images';
  }
  if (['docx', 'pdf', 'md', 'html', 'txt', 'rtf'].includes(ext)) {
    return 'documents';
  }
  if (['xlsx', 'xls', 'ods', 'csv', 'tsv', 'json', 'yaml', 'xml'].includes(ext)) {
    return 'spreadsheets';
  }
  if (['zip', 'tar', 'gz', 'tar.gz'].includes(ext) || mime.includes('zip') || mime.includes('gzip') || mime.includes('tar')) {
    return 'archives';
  }
  return 'documents';
}

export interface TargetFormatOption {
  ext: string;
  label: string;
  group: 'primary' | 'extract' | 'pack';
}

export function getTargetFormatsForInput(
  inputExt: string,
  category: ConverterCategoryId
): TargetFormatOption[] {
  const ext = inputExt.toLowerCase();

  switch (category) {
    case 'video':
      return [
        { ext: 'gif', label: 'GIF (Animated)', group: 'primary' },
        { ext: 'webm', label: 'WebM (Video)', group: 'primary' },
        { ext: 'wav', label: 'WAV (Extract Audio)', group: 'extract' },
        { ext: 'png', label: 'PNG (Frame Capture)', group: 'extract' },
        { ext: 'jpg', label: 'JPG (Frame Capture)', group: 'extract' },
        { ext: 'webp', label: 'WebP (Frame Capture)', group: 'extract' },
      ];

    case 'audio': {
      const audioTargets: TargetFormatOption[] = [
        { ext: 'wav', label: 'WAV (Lossless PCM)', group: 'primary' },
        { ext: 'webm', label: 'WebM (Opus Audio)', group: 'primary' },
        { ext: 'aiff', label: 'AIFF (Lossless)', group: 'primary' },
      ];
      return audioTargets.filter(opt => opt.ext !== ext || ext === 'wav' || ext === 'webm');
    }

    case 'images': {
      const options: TargetFormatOption[] = [
        { ext: 'webp', label: 'WebP', group: 'primary' },
        { ext: 'png', label: 'PNG', group: 'primary' },
        { ext: 'jpg', label: 'JPG', group: 'primary' },
        { ext: 'gif', label: 'GIF', group: 'primary' },
        { ext: 'bmp', label: 'BMP', group: 'primary' },
        { ext: 'ico', label: 'ICO (Icon)', group: 'primary' },
        { ext: 'pdf', label: 'PDF (Document)', group: 'extract' },
        { ext: 'svg', label: 'SVG (Wrapper)', group: 'extract' },
      ];
      return options;
    }

    case 'documents': {
      if (ext === 'pdf') {
        return [
          { ext: 'txt', label: 'TXT (Plain Text)', group: 'primary' },
          { ext: 'md', label: 'Markdown (.md)', group: 'primary' },
          { ext: 'html', label: 'HTML Document', group: 'primary' },
          { ext: 'docx', label: 'DOCX (Word)', group: 'primary' },
          { ext: 'png', label: 'PNG (Pages)', group: 'extract' },
          { ext: 'jpg', label: 'JPG (Pages)', group: 'extract' },
        ];
      }
      const docTargets: TargetFormatOption[] = [
        { ext: 'pdf', label: 'PDF', group: 'primary' },
        { ext: 'html', label: 'HTML', group: 'primary' },
        { ext: 'md', label: 'Markdown (.md)', group: 'primary' },
        { ext: 'txt', label: 'TXT', group: 'primary' },
        { ext: 'docx', label: 'DOCX (Word)', group: 'primary' },
      ];
      return docTargets.filter(opt => opt.ext !== ext);
    }

    case 'spreadsheets': {
      const dataTargets: TargetFormatOption[] = [
        { ext: 'xlsx', label: 'XLSX (Excel)', group: 'primary' },
        { ext: 'ods', label: 'ODS (OpenDocument)', group: 'primary' },
        { ext: 'csv', label: 'CSV', group: 'primary' },
        { ext: 'tsv', label: 'TSV', group: 'primary' },
        { ext: 'json', label: 'JSON', group: 'primary' },
        { ext: 'yaml', label: 'YAML', group: 'primary' },
        { ext: 'xml', label: 'XML', group: 'primary' },
        { ext: 'pdf', label: 'PDF (Table)', group: 'extract' },
        { ext: 'md', label: 'Markdown Table (.md)', group: 'extract' },
        { ext: 'html', label: 'HTML Table', group: 'extract' },
      ];
      return dataTargets.filter(opt => opt.ext !== ext);
    }

    case 'archives': {
      const archTargets: TargetFormatOption[] = [
        { ext: 'zip', label: 'ZIP Archive', group: 'primary' },
        { ext: 'tar', label: 'TAR Archive', group: 'primary' },
        { ext: 'tar.gz', label: 'TAR.GZ Archive', group: 'primary' },
        { ext: 'gz', label: 'GZIP (Single)', group: 'primary' },
      ];
      return archTargets.filter(opt => opt.ext !== ext);
    }
  }
}

export function getDefaultTargetFormat(inputExt: string, category: ConverterCategoryId): string {
  const ext = inputExt.toLowerCase();
  if (category === 'video') return ext === 'webm' ? 'gif' : 'webm';
  if (category === 'audio') return ext === 'wav' ? 'webm' : 'wav';
  if (category === 'images') return ext === 'webp' ? 'png' : 'webp';
  if (category === 'documents') return ext === 'pdf' ? 'txt' : 'pdf';
  if (category === 'spreadsheets') {
    if (ext === 'csv' || ext === 'tsv') return 'xlsx';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') return 'csv';
    if (ext === 'json') return 'yaml';
    return 'json';
  }
  if (category === 'archives') {
    return ext === 'zip' ? 'tar.gz' : 'zip';
  }
  const targets = getTargetFormatsForInput(inputExt, category);
  return targets[0]?.ext ?? 'pdf';
}

export function getAllAcceptedExtensions(): string {
  return FORMAT_CATALOG.map(c => c.accept).join(',');
}

export function stripExtension(fileName: string): string {
  if (fileName.toLowerCase().endsWith('.tar.gz')) {
    return fileName.slice(0, -7);
  }
  const idx = fileName.lastIndexOf('.');
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
