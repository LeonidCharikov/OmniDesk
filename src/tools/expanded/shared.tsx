import React from 'react';
import { FileUp } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { findToolCatalogIdByTitle, getToolCatalogText } from '../../i18n/toolCatalog';

export const btn =
  'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const button = btn;
export const secondary =
  'px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const danger =
  'px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium transition-colors';
export const input =
  'w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-200';
export const box = 'p-4 rounded-xl bg-slate-900/50 border border-slate-800';
export const panel = 'p-4 rounded-xl bg-slate-900/50 border border-slate-800';
export const innerPanel = 'p-4 rounded-xl bg-slate-950/70 border border-slate-800';

export function FilePicker({
  id,
  label,
  fileName,
  accept,
  multiple,
  onChange,
}: {
  id: string;
  label: string;
  fileName?: string;
  accept?: string;
  multiple?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-slate-300">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={btn + ' inline-flex items-center gap-2 cursor-pointer'}>
          <FileUp className="w-4 h-4" />
          {label}
        </label>
        {fileName && <span className="text-xs text-slate-400 truncate max-w-full">{fileName}</span>}
      </div>
      <input
        id={id}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
      />
    </div>
  );
}

const TOOL_TRANSLATIONS: Record<string, [string, string]> = {
  'PDF Toolkit': ['pdf_toolkit_title', 'PDF Toolkit'],
  'OCR Scanner': ['ocr_scanner_title', 'OCR Scanner'],
  'Image Editor': ['image_editor_title', 'Image Editor'],
  'Markdown Preview & Export': ['markdown_preview_title', 'Markdown Preview & Export'],
  'To-do / Kanban': ['kanban_title', 'To-do / Kanban'],
  'Notes Workspace': ['notes_title', 'Notes Workspace'],
  'SQL Playground': ['sql_playground_title', 'SQL Playground'],
  'API Tester': ['api_tester_title', 'API Tester'],
  'Git Tools': ['git_tools_title', 'Git Tools'],
  'Diagram Editor': ['diagram_editor_title', 'Diagram Editor'],
  'Expense Tracker & Budget': ['budget_tracker_title', 'Expense Tracker & Budget'],
  'Investment Calculator': ['investment_calculator_title', 'Investment Calculator'],
  'Invoice Generator': ['invoice_generator_title', 'Invoice Generator'],
  'JWT Decoder': ['jwt_decoder_title', 'JWT Decoder'],
  'XML Formatter & Validator': ['xml_formatter_title', 'XML Formatter & Validator'],
  'YAML Formatter & Validator': ['yaml_formatter_title', 'YAML Formatter & Validator'],
  'CSS/HTML/JavaScript Minifier': ['minifier_title', 'CSS/HTML/JavaScript Minifier'],
  'Markdown Table Generator': ['markdown_table_title', 'Markdown Table Generator'],
  'Regex Builder': ['regex_builder_title', 'Regex Builder'],
  'Image Color Picker': ['color_picker_title', 'Image Color Picker'],
  'Screenshot Annotator': ['screenshot_annotator_title', 'Screenshot Annotator'],
  'Geographic & GPS Converter': ['geo_gps_title', 'Geographic & GPS Converter'],
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  'PDF Toolkit': 'Merge selected PDF files or rotate all pages in a PDF locally.',
  'OCR Scanner': 'Extract text from an image locally without uploading the file to a server.',
  'Image Editor': 'Resize, convert format, rotate, and apply filters with size comparison.',
  'Markdown Preview & Export': 'Full-featured live Markdown preview with tables, code blocks, and HTML export.',
  'To-do / Kanban': 'Simple three-column task board with persistent local storage.',
  'Notes Workspace': 'Manage multiple local notes with search and automatic saving.',
  'SQL Playground': 'Query JSON data locally with SELECT ... FROM data syntax and table view.',
  'API Tester': 'Send HTTP requests with custom headers and inspect response status and payloads.',
  'Git Tools': 'Build conventional commits, highlight diffs, and copy common Git commands.',
  'Diagram Editor': 'Create draggable UML class, interface, and actor nodes, connect arrows, and export clean SVG.',
  'Expense Tracker & Budget': 'Record expense descriptions and amounts and see the running total for the current session.',
  'Investment Calculator': 'Estimate compound growth from an initial deposit, monthly contributions, annual return, and time horizon.',
  'Invoice Generator': 'Create an HTML invoice with supplier, customer, and line-item details.',
  'JWT Decoder': 'Decode JWT header and payload locally with expiration validation.',
  'XML Formatter & Validator': 'Format, minify, validate XML or convert it to JSON locally.',
  'YAML Formatter & Validator': 'Normalize YAML structure and convert seamlessly to JSON.',
  'CSS/HTML/JavaScript Minifier': 'Minify or beautify CSS, HTML, JS, and JSON code with byte-savings statistics.',
  'Markdown Table Generator': 'Visual table editor and CSV/TSV converter for clean Markdown tables.',
  'Regex Builder': 'Interactive regular expression builder and tester with live match inspection.',
  'Image Color Picker': 'Open an image, click a canvas pixel, and read its HEX, RGB, and HSL color.',
  'Screenshot Annotator': 'Draw boxes, arrows, text, and freehand marks on screenshots and export PNG.',
  'Geographic & GPS Converter': 'Convert decimal latitude and longitude to DMS notation, compute distance, bearing, midpoint, and view map links.',
};

export function ToolHeader({ title, description }: { title: string; description: string }) {
  const { t, language } = useI18n();
  const catalogId = findToolCatalogIdByTitle(title);
  const catalogTitle = catalogId ? getToolCatalogText(catalogId, 'title', language, title) : title;
  const catalogDescription = catalogId ? getToolCatalogText(catalogId, 'desc', language, description) : description;
  const [key, fallback] = TOOL_TRANSLATIONS[title] || ['', title];
  return (
    <div className={box}>
      <h2 className="text-lg font-semibold text-white">
        {catalogId ? catalogTitle : key ? t(key, fallback) : title}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {catalogId
          ? catalogDescription
          : key
            ? t(`${key}_desc`, TOOL_DESCRIPTIONS[title] || description)
            : description}
      </p>
    </div>
  );
}

export const Header: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <ToolHeader title={title} description={desc} />
);

export const downloadText = (name: string, value: string, extension: string, dialogTitle: string) =>
  saveTextWithDialog(
    name,
    value,
    [{ name: `${extension.toUpperCase()} (*.${extension})`, extensions: [extension] }],
    dialogTitle
  );
