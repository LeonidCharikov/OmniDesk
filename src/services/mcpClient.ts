import { McpAccessMode, McpBridgeConfig } from '../types/tool';
import { invokeRustCommand, isTauri } from './fileSystemService';
import { loadUserConfig, saveUserConfig } from './storage';

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export const CALENDAR_STORAGE_KEY = 'omnidesk_calendar_events';
export const KANBAN_STORAGE_KEY = 'omnidesk-kanban-board-v2';
export const NOTES_STORAGE_KEY = 'omnidesk-notes';
export const SNIPPETS_STORAGE_KEY = 'omnidesk_snippet_vault_v1';

export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

export interface McpToolInputProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface McpToolDescriptor {
  name: string;
  description: string;
  access: McpAccessMode;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpToolInputProperty>;
    required?: string[];
  };
}

export interface McpResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolCallResult {
  content: McpTextContent[];
  isError?: boolean;
}

export interface McpCatalogToolSummary {
  id: string;
  title: string;
  category: string;
  shortDesc: string;
}

export type McpLogDirection = 'incoming' | 'outgoing' | 'error' | 'system';

export interface McpLogEntry {
  id: string;
  timestamp: string;
  direction: McpLogDirection;
  method?: string;
  rpcId?: JsonRpcId;
  summary: string;
  payload: string;
  isError?: boolean;
}

export interface McpClipboardAdapter {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
}

export interface McpConnectedToolCapability {
  id: string;
  localToolId?: string;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  exposedMcpTools: string[];
  canRead: boolean;
  canWrite: boolean;
  isAvailable: boolean;
  localTools?: McpCatalogToolSummary[];
}

export interface McpTransport {
  readonly mode: 'websocket' | 'stdio';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: string): Promise<void>;
  onMessage(listener: (raw: string) => void): () => void;
  onStatusChange(listener: (status: McpConnectionStatus, error?: string) => void): () => void;
}

interface CalendarEventRecord {
  id: string;
  date: string;
  hour: number;
  minute: number;
  title: string;
  description: string;
  color: string;
  durationMinutes: number;
  recurrence?: 'none' | 'weekly' | 'daily';
}

interface KanbanTaskRecord {
  id: number;
  text: string;
  column: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'med' | 'high';
}

interface NoteRecord {
  id: number;
  title: string;
  body: string;
  updatedAt: number;
}

interface NativeSystemTelemetry {
  cpu_usage: number;
  cores: number[];
  ram_used_gb: number;
  ram_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  uptime_seconds: number;
}

interface SnippetRecord {
  id: string;
  title: string;
  description: string;
  language: 'bash' | 'sql' | 'docker' | 'git' | 'typescript' | 'regex' | 'other';
  tags: string[];
  code: string;
  favorite: boolean;
  updatedAt: number;
}

export interface OmniDeskMcpClientOptions {
  accessMode?: McpAccessMode;
  getAvailableTools?: () => McpCatalogToolSummary[];
  onOpenTool?: (toolId: string) => void;
  isWorkspaceLocked?: () => boolean;
  clipboard?: McpClipboardAdapter;
  maxLogEntries?: number;
}

const VALID_COLORS = new Set(['indigo', 'emerald', 'amber', 'rose', 'blue', 'purple', 'cyan', 'orange']);
const VALID_RECURRENCES = new Set(['none', 'daily', 'weekly']);
const VALID_COLUMNS = new Set(['todo', 'doing', 'done']);
const VALID_PRIORITIES = new Set(['low', 'med', 'high']);
const VALID_SNIPPET_LANGUAGES = new Set(['bash', 'sql', 'docker', 'git', 'typescript', 'regex', 'other']);
const VALID_HASH_ALGOS = new Set(['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1']);
const VALID_CONVERTER_CATEGORIES = new Set(['video', 'audio', 'images', 'documents', 'spreadsheets', 'archives']);
const MAX_CLIPBOARD_CHARS = 100_000;
const MAX_DATA_CONVERT_BYTES = 512 * 1024;
const MAX_FILE_CONVERT_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_UTIL_CHARS = 500_000;
const DEFAULT_MAX_LOG_ENTRIES = 200;

function sanitizeFileName(raw: unknown): string {
  const cleaned = sanitizeText(raw, 180)
    .replace(/[\\/]+/g, '_')
    .replace(/\.\.+/g, '.')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .trim();
  return cleaned || 'input.txt';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const normalized = b64.replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

function base64ToUtf8(b64: string): string {
  return new TextDecoder().decode(base64ToBytes(b64));
}

function xmlEscape(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function objectToXml(value: unknown, tagName = 'root', indent = ''): string {
  const safeTag = tagName.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'item';
  if (value === null || value === undefined) {
    return `${indent}<${safeTag} />`;
  }
  if (Array.isArray(value)) {
    const children = value.map(item => objectToXml(item, 'item', `${indent}  `)).join('\n');
    return `${indent}<${safeTag}>\n${children}\n${indent}</${safeTag}>`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${indent}<${safeTag} />`;
    const children = entries.map(([k, v]) => objectToXml(v, k, `${indent}  `)).join('\n');
    return `${indent}<${safeTag}>\n${children}\n${indent}</${safeTag}>`;
  }
  return `${indent}<${safeTag}>${xmlEscape(value)}</${safeTag}>`;
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength);
}

function sanitizeClipboardText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLength);
}

function formatLogPayload(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

const DEFAULT_CLIPBOARD_ADAPTER: McpClipboardAdapter = {
  readText: async () => {
    if (isTauri()) {
      try {
        const text = await invokeRustCommand<string>('mcp_read_clipboard');
        if (typeof text === 'string') return text;
      } catch {
        // Fallback to WebView navigator.clipboard if native command is unavailable
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
    throw new Error('Clipboard read API is unavailable or requires desktop focus/permissions.');
  },
  writeText: async (text: string) => {
    if (isTauri()) {
      try {
        await invokeRustCommand<void>('mcp_write_clipboard', { text });
        return;
      } catch {
        // Fallback to WebView navigator.clipboard if native command is unavailable
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('Clipboard write API is unavailable or permission was denied.');
  },
};

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown, customEventName?: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  if (customEventName && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(customEventName));
  }
}

export function isValidMcpWebSocketUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]';
  } catch {
    return false;
  }
}

export const OMNIDESK_MCP_TOOLS: ReadonlyArray<McpToolDescriptor> = [
  {
    name: 'calendar_list_events',
    description: 'List OmniDesk local calendar events with optional date range or text query filtering.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', description: 'Optional inclusive start date (YYYY-MM-DD).' },
        dateTo: { type: 'string', description: 'Optional inclusive end date (YYYY-MM-DD).' },
        query: { type: 'string', description: 'Optional case-insensitive filter against title or description.' },
      },
    },
  },
  {
    name: 'calendar_create_event',
    description: 'Create a new event in the OmniDesk local calendar.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Event date in YYYY-MM-DD format.' },
        hour: { type: 'integer', description: 'Start hour (0-23).', minimum: 0, maximum: 23 },
        minute: { type: 'integer', description: 'Start minute slot (0 or 30).', minimum: 0, maximum: 30 },
        durationMinutes: { type: 'integer', description: 'Duration in minutes (30, 60, 90, 120).', minimum: 15, maximum: 480 },
        title: { type: 'string', description: 'Short event title.' },
        description: { type: 'string', description: 'Optional event notes or details.' },
        color: { type: 'string', description: 'Optional color key.', enum: ['indigo', 'emerald', 'amber', 'rose', 'blue', 'purple', 'cyan', 'orange'] },
        recurrence: { type: 'string', description: 'Optional recurrence.', enum: ['none', 'daily', 'weekly'] },
      },
      required: ['date', 'title'],
    },
  },
  {
    name: 'calendar_delete_event',
    description: 'Delete a calendar event by its ID.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Calendar event ID to remove.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'tasks_list',
    description: 'List sidebar daily tasks and Kanban board tasks.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', description: 'Which task store to read.', enum: ['all', 'daily', 'kanban'] },
      },
    },
  },
  {
    name: 'tasks_create',
    description: 'Create a new daily task or Kanban board card.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target list (daily or kanban).', enum: ['daily', 'kanban'] },
        text: { type: 'string', description: 'Task text.' },
        column: { type: 'string', description: 'Kanban column when target=kanban.', enum: ['todo', 'doing', 'done'] },
        priority: { type: 'string', description: 'Kanban priority when target=kanban.', enum: ['low', 'med', 'high'] },
      },
      required: ['text'],
    },
  },
  {
    name: 'tasks_update_status',
    description: 'Mark a daily task done/undone or move a Kanban task between columns.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target list (daily or kanban).', enum: ['daily', 'kanban'] },
        id: { type: 'string', description: 'Task ID (string for daily, numeric string for kanban).' },
        done: { type: 'boolean', description: 'Completion flag when target=daily.' },
        column: { type: 'string', description: 'Destination column when target=kanban.', enum: ['todo', 'doing', 'done'] },
      },
      required: ['target', 'id'],
    },
  },
  {
    name: 'notes_search',
    description: 'List or search local notes from the Notes Workspace.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search term matched against title and body.' },
      },
    },
  },
  {
    name: 'notes_create',
    description: 'Create a new note in the OmniDesk Notes Workspace.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title.' },
        body: { type: 'string', description: 'Note content.' },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'system_get_info',
    description: 'Get desktop system telemetry (CPU, RAM, disk, uptime via Tauri) or browser runtime info.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'app_list_tools',
    description: 'List available OmniDesk internal tools by category or search query.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional tool category filter.' },
        query: { type: 'string', description: 'Optional search string.' },
      },
    },
  },
  {
    name: 'app_open_tool',
    description: 'Navigate OmniDesk desktop UI to open a specific internal tool by ID.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        toolId: { type: 'string', description: 'Valid OmniDesk tool ID (e.g. calendar, notes, pdf-editor).' },
      },
      required: ['toolId'],
    },
  },
  {
    name: 'clipboard_read',
    description: 'Read current plain text content from the desktop or browser clipboard.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'clipboard_write',
    description: 'Write plain text content to the desktop or browser clipboard for interoperability.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Plain text content to write to the clipboard (max 100,000 characters).' },
      },
      required: ['text'],
    },
  },
  {
    name: 'convert_list_formats',
    description: 'List supported file conversion categories, extensions, and target formats available in OmniDesk Multi-Format Converter.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter.',
          enum: ['video', 'audio', 'images', 'documents', 'spreadsheets', 'archives'],
        },
        inputExtension: {
          type: 'string',
          description: 'Optional input extension (e.g. "csv", "png", "md") to inspect valid output formats.',
        },
      },
    },
  },
  {
    name: 'convert_data',
    description: 'Convert structured text data offline between JSON, YAML, CSV, TSV, Markdown tables, and XML.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Raw input text payload (max 512 KB).' },
        fromFormat: {
          type: 'string',
          description: 'Source data format.',
          enum: ['json', 'yaml', 'csv', 'tsv'],
        },
        toFormat: {
          type: 'string',
          description: 'Target data format.',
          enum: ['json', 'yaml', 'csv', 'tsv', 'markdown', 'xml'],
        },
      },
      required: ['input', 'fromFormat', 'toFormat'],
    },
  },
  {
    name: 'convert_file_base64',
    description: 'Convert a Base64-encoded file (documents, spreadsheets, images, or archives, max 5 MB) using OmniDesk local Multi-Format Converter engine.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        fileName: { type: 'string', description: 'Original file name with extension (e.g. "report.md", "data.csv", "photo.png").' },
        base64Content: { type: 'string', description: 'Base64-encoded file bytes.' },
        targetFormat: { type: 'string', description: 'Target file extension without dot (e.g. "html", "json", "pdf", "webp", "zip").' },
        category: {
          type: 'string',
          description: 'Optional category override (auto-detected from fileName if omitted).',
          enum: ['video', 'audio', 'images', 'documents', 'spreadsheets', 'archives'],
        },
      },
      required: ['fileName', 'base64Content', 'targetFormat'],
    },
  },
  {
    name: 'snippets_search',
    description: 'Search saved code and shell snippets in OmniDesk Snippet Vault and optionally render {{variable}} templates.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional search string matched against title, description, tags, and code.' },
        language: {
          type: 'string',
          description: 'Optional language filter.',
          enum: ['bash', 'sql', 'docker', 'git', 'typescript', 'regex', 'other'],
        },
        variablesJson: {
          type: 'string',
          description: 'Optional JSON object string of {{variable}} substitutions to render matching snippets.',
        },
      },
    },
  },
  {
    name: 'snippets_create',
    description: 'Save a new reusable code or shell snippet to OmniDesk Snippet Vault.',
    access: 'readwrite',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Snippet title.' },
        code: { type: 'string', description: 'Code or command template (supports {{var}} placeholders).' },
        language: {
          type: 'string',
          description: 'Snippet language.',
          enum: ['bash', 'sql', 'docker', 'git', 'typescript', 'regex', 'other'],
        },
        description: { type: 'string', description: 'Optional short description.' },
        tags: { type: 'array', description: 'Optional list of tag strings.' },
      },
      required: ['title', 'code'],
    },
  },
  {
    name: 'crypto_hash_text',
    description: 'Compute a cryptographic digest (SHA-256, SHA-384, SHA-512, or SHA-1) of UTF-8 text locally.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'UTF-8 input text to hash.' },
        algorithm: {
          type: 'string',
          description: 'Hash algorithm (default: SHA-256).',
          enum: ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'],
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'encode_decode_text',
    description: 'Encode or decode UTF-8 text using Base64, Base64URL, URL percent-encoding, Hex, or Binary.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Input text to transform.' },
        mode: { type: 'string', description: 'Operation direction.', enum: ['encode', 'decode'] },
        encoding: {
          type: 'string',
          description: 'Encoding format.',
          enum: ['base64', 'base64url', 'url', 'hex', 'binary'],
        },
      },
      required: ['text', 'mode', 'encoding'],
    },
  },
  {
    name: 'svg_optimize',
    description: 'Minify SVG markup locally, inspect byte savings, and optionally convert to a typed React JSX component.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        svg: { type: 'string', description: 'Raw SVG markup.' },
        precision: { type: 'integer', description: 'Decimal precision for numbers (0-5, default: 2).', minimum: 0, maximum: 5 },
        asReactJsx: { type: 'boolean', description: 'When true, also return a typed React TSX component.' },
        componentName: { type: 'string', description: 'Component name when asReactJsx=true (default: CustomIcon).' },
      },
      required: ['svg'],
    },
  },
  {
    name: 'math_evaluate',
    description: 'Safely evaluate a mathematical expression (arithmetic, trig, logs, constants) using OmniDesk safe math parser.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression (e.g. "sqrt(144) + sin(pi / 2) * 10").' },
        x: { type: 'number', description: 'Optional value for variable x.' },
      },
      required: ['expression'],
    },
  },
  {
    name: 'generate_mock_data',
    description: 'Generate deterministic offline test datasets in JSON, CSV, or SQL INSERT format.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        rows: { type: 'integer', description: 'Number of rows to generate (1-200, default: 10).', minimum: 1, maximum: 200 },
        format: { type: 'string', description: 'Output format (default: json).', enum: ['json', 'csv', 'sql'] },
        tableName: { type: 'string', description: 'SQL table name when format=sql (default: records).' },
        seed: { type: 'integer', description: 'Deterministic seed integer (default: 2026).' },
      },
    },
  },
  {
    name: 'generate_lorem_ipsum',
    description: 'Generate offline placeholder copy (Classic Latin, Tech, or Business) in Plain Text, HTML, or Markdown.',
    access: 'readonly',
    inputSchema: {
      type: 'object',
      properties: {
        style: { type: 'string', description: 'Vocabulary style.', enum: ['classic', 'tech', 'business'] },
        unit: { type: 'string', description: 'Generation unit.', enum: ['paragraphs', 'sentences', 'words', 'list'] },
        count: { type: 'integer', description: 'Number of units (1-50, default: 3).', minimum: 1, maximum: 50 },
        format: { type: 'string', description: 'Output format.', enum: ['plain', 'html', 'markdown'] },
      },
    },
  },
];

export const OMNIDESK_MCP_RESOURCES: ReadonlyArray<McpResourceDescriptor> = [
  {
    uri: 'omnidesk://calendar/events',
    name: 'OmniDesk Calendar Events',
    description: 'JSON list of all events saved in OmniDesk Calendar.',
    mimeType: 'application/json',
  },
  {
    uri: 'omnidesk://tasks/summary',
    name: 'OmniDesk Tasks Summary',
    description: 'Combined snapshot of sidebar daily tasks and Kanban board cards.',
    mimeType: 'application/json',
  },
  {
    uri: 'omnidesk://snippets/list',
    name: 'OmniDesk Snippet Vault',
    description: 'JSON list of reusable code and shell snippets stored locally in Snippet Vault.',
    mimeType: 'application/json',
  },
  {
    uri: 'omnidesk://system/telemetry',
    name: 'OmniDesk System Telemetry',
    description: 'Current hardware and runtime status from Tauri or browser environment.',
    mimeType: 'application/json',
  },
];

export class WebSocketMcpTransport implements McpTransport {
  public readonly mode = 'websocket' as const;
  private socket: WebSocket | null = null;
  private messageListeners = new Set<(raw: string) => void>();
  private statusListeners = new Set<(status: McpConnectionStatus, error?: string) => void>();
  private readonly url: string;
  private readonly authToken?: string;

  constructor(url: string, authToken?: string) {
    this.url = url.trim();
    this.authToken = authToken?.trim() || undefined;
  }

  public onMessage(listener: (raw: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public onStatusChange(listener: (status: McpConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private emitStatus(status: McpConnectionStatus, error?: string): void {
    this.statusListeners.forEach(listener => listener(status, error));
  }

  public async connect(): Promise<void> {
    if (!isValidMcpWebSocketUrl(this.url)) {
      const msg = 'MCP WebSocket URL must target localhost or 127.0.0.1.';
      this.emitStatus('error', msg);
      throw new Error(msg);
    }

    if (typeof WebSocket === 'undefined') {
      const msg = 'WebSocket API is unavailable in this environment.';
      this.emitStatus('error', msg);
      throw new Error(msg);
    }

    await this.disconnect();
    this.emitStatus('connecting');

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(this.url);
      this.socket = ws;

      ws.onopen = () => {
        if (this.authToken) {
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              method: 'omnidesk/authenticate',
              params: { token: this.authToken },
            })
          );
        }
        this.emitStatus('connected');
        settled = true;
        resolve();
      };

      ws.onmessage = event => {
        if (typeof event.data === 'string') {
          this.messageListeners.forEach(listener => listener(event.data as string));
        }
      };

      ws.onerror = () => {
        const msg = 'Failed to connect to local MCP WebSocket server.';
        this.emitStatus('error', msg);
        if (!settled) {
          settled = true;
          reject(new Error(msg));
        }
      };

      ws.onclose = () => {
        if (this.socket === ws) {
          this.socket = null;
          this.emitStatus('disconnected');
        }
      };
    });
  }

  public async disconnect(): Promise<void> {
    const ws = this.socket;
    this.socket = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close(1000, 'Client disconnected');
    }
    this.emitStatus('disconnected');
  }

  public async send(message: string): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('MCP WebSocket transport is not connected.');
    }
    this.socket.send(message);
  }
}

export class StdioIpcMcpTransport implements McpTransport {
  public readonly mode = 'stdio' as const;
  private unlistenFn: (() => void) | null = null;
  private connected = false;
  private messageListeners = new Set<(raw: string) => void>();
  private statusListeners = new Set<(status: McpConnectionStatus, error?: string) => void>();

  public onMessage(listener: (raw: string) => void): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public onStatusChange(listener: (status: McpConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private emitStatus(status: McpConnectionStatus, error?: string): void {
    this.statusListeners.forEach(listener => listener(status, error));
  }

  public async connect(): Promise<void> {
    if (!isTauri()) {
      const msg = 'Stdio IPC MCP transport requires the native Tauri desktop runtime.';
      this.emitStatus('error', msg);
      throw new Error(msg);
    }

    this.emitStatus('connecting');
    const { listen } = await import('@tauri-apps/api/event');
    this.unlistenFn = await listen<string>('omnidesk:mcp-stdio-rx', event => {
      if (typeof event.payload === 'string') {
        this.messageListeners.forEach(listener => listener(event.payload));
      }
    });
    this.connected = true;
    this.emitStatus('connected');
    await invokeRustCommand('mcp_stdio_ready');
  }

  public async disconnect(): Promise<void> {
    if (this.unlistenFn) {
      this.unlistenFn();
      this.unlistenFn = null;
    }
    this.connected = false;
    this.emitStatus('disconnected');
  }

  public async send(message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Stdio IPC MCP transport is not connected.');
    }
    await invokeRustCommand('mcp_stdio_tx', { message });
  }
}

export class OmniDeskMcpClient {
  private transport: McpTransport | null = null;
  private unbindMessage: (() => void) | null = null;
  private unbindStatus: (() => void) | null = null;
  private accessMode: McpAccessMode;
  private readonly getAvailableToolsFn: () => McpCatalogToolSummary[];
  private readonly onOpenToolFn?: (toolId: string) => void;
  private readonly isWorkspaceLockedFn: () => boolean;
  private readonly clipboard: McpClipboardAdapter;
  private readonly maxLogEntries: number;
  private statusListeners = new Set<(status: McpConnectionStatus, error?: string) => void>();
  private logListeners = new Set<(logs: McpLogEntry[]) => void>();
  private logs: McpLogEntry[] = [];
  private currentStatus: McpConnectionStatus = 'disconnected';
  private lastError?: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private autoReconnect = false;
  private manualDisconnect = false;

  constructor(options: OmniDeskMcpClientOptions = {}) {
    this.accessMode = options.accessMode ?? 'readonly';
    this.getAvailableToolsFn = options.getAvailableTools ?? (() => []);
    this.onOpenToolFn = options.onOpenTool;
    this.isWorkspaceLockedFn = options.isWorkspaceLocked ?? (() => false);
    this.clipboard = options.clipboard ?? DEFAULT_CLIPBOARD_ADAPTER;
    this.maxLogEntries = Math.max(20, options.maxLogEntries ?? DEFAULT_MAX_LOG_ENTRIES);
  }

  public setAccessMode(mode: McpAccessMode): void {
    this.accessMode = mode;
  }

  public getStatus(): { status: McpConnectionStatus; error?: string } {
    return { status: this.currentStatus, error: this.lastError };
  }

  public getLogs(): McpLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    const snapshot: McpLogEntry[] = [];
    this.logListeners.forEach(listener => listener(snapshot));
  }

  public onLog(listener: (logs: McpLogEntry[]) => void): () => void {
    this.logListeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  private appendLog(
    direction: McpLogDirection,
    summary: string,
    payload: unknown,
    options: { method?: string; rpcId?: JsonRpcId; isError?: boolean } = {}
  ): void {
    const entry: McpLogEntry = {
      id: `mcp-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      direction,
      method: options.method,
      rpcId: options.rpcId,
      summary,
      payload: formatLogPayload(payload),
      isError: options.isError ?? direction === 'error',
    };
    this.logs = [...this.logs, entry].slice(-this.maxLogEntries);
    const snapshot = [...this.logs];
    this.logListeners.forEach(listener => listener(snapshot));
  }

  public onStatusChange(listener: (status: McpConnectionStatus, error?: string) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus, this.lastError);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private updateStatus(status: McpConnectionStatus, error?: string): void {
    const changed = this.currentStatus !== status || this.lastError !== error;
    this.currentStatus = status;
    this.lastError = error;
    if (changed) {
      if (status === 'error') {
        this.appendLog('error', error || 'MCP transport error', { status, error });
      } else {
        this.appendLog('system', `Transport status: ${status}`, {
          status,
          mode: this.transport?.mode ?? 'none',
        });
      }
    }
    this.statusListeners.forEach(listener => listener(status, error));
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.autoReconnect || this.manualDisconnect || !this.transport || this.reconnectTimer) {
      return;
    }
    const delayMs = Math.min(15000, 2000 * Math.pow(2, Math.min(this.reconnectAttempts, 3)));
    this.reconnectAttempts += 1;
    const targetTransport = this.transport;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.autoReconnect || this.manualDisconnect || this.transport !== targetTransport) {
        return;
      }
      targetTransport.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, delayMs);
  }

  public async connect(transport: McpTransport, options: { autoReconnect?: boolean } = {}): Promise<void> {
    await this.disconnect();
    this.manualDisconnect = false;
    this.autoReconnect = Boolean(options.autoReconnect);
    this.reconnectAttempts = 0;
    this.transport = transport;
    this.appendLog('system', `Connecting via ${transport.mode} transport`, { mode: transport.mode });
    this.unbindStatus = transport.onStatusChange((status, error) => {
      this.updateStatus(status, error);
      if (status === 'connected') {
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
      } else if ((status === 'disconnected' || status === 'error') && !this.manualDisconnect) {
        this.scheduleReconnect();
      }
    });
    this.unbindMessage = transport.onMessage(raw => {
      void this.handleRawMessage(raw);
    });
    try {
      await transport.connect();
    } catch (err) {
      this.scheduleReconnect();
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.autoReconnect = false;
    this.clearReconnectTimer();
    if (this.unbindMessage) {
      this.unbindMessage();
      this.unbindMessage = null;
    }
    if (this.unbindStatus) {
      this.unbindStatus();
      this.unbindStatus = null;
    }
    if (this.transport) {
      const active = this.transport;
      this.transport = null;
      await active.disconnect();
    } else {
      this.updateStatus('disconnected');
    }
  }

  public getExposedTools(): McpToolDescriptor[] {
    if (this.accessMode === 'readonly') {
      return OMNIDESK_MCP_TOOLS.filter(tool => tool.access === 'readonly');
    }
    return [...OMNIDESK_MCP_TOOLS];
  }

  public getConnectedToolCapabilities(): McpConnectedToolCapability[] {
    const isAvailable = this.currentStatus === 'connected';
    const canWrite = this.accessMode === 'readwrite';
    const exposedNames = new Set(this.getExposedTools().map(tool => tool.name));
    const pickExposed = (...names: string[]) => names.filter(name => exposedNames.has(name));

    return [
      {
        id: 'calendar',
        localToolId: 'calendar',
        titleKey: 'mcp_cap_calendar_title',
        defaultTitle: 'Calendar & Planner',
        descKey: 'mcp_cap_calendar_desc',
        defaultDesc: 'Read schedule events or create and delete calendar entries.',
        exposedMcpTools: pickExposed('calendar_list_events', 'calendar_create_event', 'calendar_delete_event'),
        canRead: true,
        canWrite,
        isAvailable,
      },
      {
        id: 'tasks',
        localToolId: 'kanban',
        titleKey: 'mcp_cap_tasks_title',
        defaultTitle: 'Tasks & Kanban Board',
        descKey: 'mcp_cap_tasks_desc',
        defaultDesc: 'Read daily tasks and Kanban cards or create and update task status.',
        exposedMcpTools: pickExposed('tasks_list', 'tasks_create', 'tasks_update_status'),
        canRead: true,
        canWrite,
        isAvailable,
      },
      {
        id: 'notes',
        localToolId: 'notes',
        titleKey: 'mcp_cap_notes_title',
        defaultTitle: 'Notes Workspace',
        descKey: 'mcp_cap_notes_desc',
        defaultDesc: 'Search local notes or create new entries in Notes Workspace.',
        exposedMcpTools: pickExposed('notes_search', 'notes_create'),
        canRead: true,
        canWrite,
        isAvailable,
      },
      {
        id: 'system',
        localToolId: 'system-monitor',
        titleKey: 'mcp_cap_system_title',
        defaultTitle: 'System Hardware Monitor',
        descKey: 'mcp_cap_system_desc',
        defaultDesc: 'Read CPU, memory, disk, uptime, and runtime environment info.',
        exposedMcpTools: pickExposed('system_get_info'),
        canRead: true,
        canWrite: false,
        isAvailable,
      },
      {
        id: 'clipboard',
        titleKey: 'mcp_cap_clipboard_title',
        defaultTitle: 'Clipboard Synchronization',
        descKey: 'mcp_cap_clipboard_desc',
        defaultDesc: 'Read current desktop clipboard text or write new text to clipboard.',
        exposedMcpTools: pickExposed('clipboard_read', 'clipboard_write'),
        canRead: true,
        canWrite,
        isAvailable,
      },
      {
        id: 'converter',
        localToolId: 'multi-converter',
        titleKey: 'mcp_cap_converter_title',
        defaultTitle: 'Multi-Format File & Data Converter',
        descKey: 'mcp_cap_converter_desc',
        defaultDesc: 'List supported formats and convert JSON/YAML/CSV/TSV/Markdown/XML or Base64 files locally.',
        exposedMcpTools: pickExposed('convert_list_formats', 'convert_data', 'convert_file_base64'),
        canRead: true,
        canWrite: false,
        isAvailable,
      },
      {
        id: 'snippets',
        localToolId: 'snippet-vault',
        titleKey: 'mcp_cap_snippets_title',
        defaultTitle: 'Code & Shell Snippet Vault',
        descKey: 'mcp_cap_snippets_desc',
        defaultDesc: 'Search local code/command templates with {{variable}} rendering or save new snippets.',
        exposedMcpTools: pickExposed('snippets_search', 'snippets_create'),
        canRead: true,
        canWrite,
        isAvailable,
      },
      {
        id: 'dev-utilities',
        localToolId: 'hash-suite',
        titleKey: 'mcp_cap_utilities_title',
        defaultTitle: 'Developer & Offline Utilities',
        descKey: 'mcp_cap_utilities_desc',
        defaultDesc: 'Run local SHA hashing, Base64/Hex/URL encoding, SVG optimization, safe math, mock datasets, and Lorem Ipsum.',
        exposedMcpTools: pickExposed(
          'crypto_hash_text',
          'encode_decode_text',
          'svg_optimize',
          'math_evaluate',
          'generate_mock_data',
          'generate_lorem_ipsum'
        ),
        canRead: true,
        canWrite: false,
        isAvailable,
      },
      {
        id: 'workspace-tools',
        titleKey: 'mcp_cap_catalog_title',
        defaultTitle: 'Local Tool Launcher & Catalog',
        descKey: 'mcp_cap_catalog_desc',
        defaultDesc: 'Discover local OmniDesk tools by category/query and launch them in the UI.',
        exposedMcpTools: pickExposed('app_list_tools', 'app_open_tool'),
        canRead: true,
        canWrite,
        isAvailable,
        localTools: this.getAvailableToolsFn(),
      },
    ];
  }

  private async handleRawMessage(raw: string): Promise<void> {
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(raw) as JsonRpcRequest;
    } catch {
      this.appendLog('error', 'Parse error: invalid JSON payload', raw);
      await this.sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON payload.' },
      });
      return;
    }

    if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
      this.appendLog('error', 'Invalid JSON-RPC 2.0 request', req);
      await this.sendResponse({
        jsonrpc: '2.0',
        id: req?.id ?? null,
        error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request.' },
      });
      return;
    }

    const response = await this.handleRequest(req);
    if (response) {
      await this.sendResponse(response, req.method);
    }
  }

  private async sendResponse(response: JsonRpcResponse, method?: string): Promise<void> {
    if (!this.transport) return;
    const resultObj =
      response.result && typeof response.result === 'object' ? (response.result as { isError?: boolean }) : null;
    const isRpcError = Boolean(response.error || resultObj?.isError);
    const summary = response.error
      ? `${method || 'response'} error (${response.error.code}): ${response.error.message}`
      : isRpcError
      ? `${method || 'response'} returned tool error`
      : `${method || 'response'} OK`;

    this.appendLog('outgoing', summary, response, {
      method,
      rpcId: response.id,
      isError: isRpcError,
    });

    try {
      await this.transport.send(JSON.stringify(response));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send MCP response.';
      this.appendLog('error', msg, { responseId: response.id, method });
      this.updateStatus('error', msg);
    }
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const hasId = req.id !== undefined;
    const toolNameParam =
      req.method === 'tools/call' && typeof req.params?.name === 'string' ? ` (${req.params.name})` : '';
    this.appendLog('incoming', `${req.method}${toolNameParam}`, req, {
      method: req.method,
      rpcId: req.id,
    });

    if (req.method === 'notifications/initialized') {
      return null;
    }

    if (req.method === 'ping') {
      return hasId ? { jsonrpc: '2.0', id: req.id ?? null, result: {} } : null;
    }

    if (req.method === 'initialize') {
      return hasId
        ? {
            jsonrpc: '2.0',
            id: req.id ?? null,
            result: {
              protocolVersion: MCP_PROTOCOL_VERSION,
              capabilities: {
                tools: { listChanged: false },
                resources: { subscribe: false, listChanged: false },
              },
              serverInfo: {
                name: 'omnidesk-desktop-bridge',
                version: '0.1.14',
              },
            },
          }
        : null;
    }

    if (req.method === 'tools/list') {
      const tools = this.getExposedTools().map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      }));
      return hasId ? { jsonrpc: '2.0', id: req.id ?? null, result: { tools } } : null;
    }

    if (req.method === 'tools/call') {
      if (this.isWorkspaceLockedFn()) {
        return hasId
          ? {
              jsonrpc: '2.0',
              id: req.id ?? null,
              error: {
                code: -32003,
                message: 'Workspace is locked. Unlock OmniDesk PIN Lock Screen to run MCP tools.',
              },
            }
          : null;
      }

      const params = req.params || {};
      const toolName = typeof params.name === 'string' ? params.name : '';
      const args =
        params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
          ? (params.arguments as Record<string, unknown>)
          : {};

      const descriptor = OMNIDESK_MCP_TOOLS.find(tool => tool.name === toolName);
      if (!descriptor) {
        return hasId
          ? {
              jsonrpc: '2.0',
              id: req.id ?? null,
              error: { code: -32601, message: `Unknown MCP tool: ${toolName}` },
            }
          : null;
      }

      if (descriptor.access === 'readwrite' && this.accessMode === 'readonly') {
        return hasId
          ? {
              jsonrpc: '2.0',
              id: req.id ?? null,
              error: {
                code: -32002,
                message: `Tool "${toolName}" requires read-write MCP access mode.`,
              },
            }
          : null;
      }

      const result = await this.executeTool(toolName, args);
      return hasId ? { jsonrpc: '2.0', id: req.id ?? null, result } : null;
    }

    if (req.method === 'resources/list') {
      return hasId
        ? { jsonrpc: '2.0', id: req.id ?? null, result: { resources: OMNIDESK_MCP_RESOURCES } }
        : null;
    }

    if (req.method === 'resources/read') {
      if (this.isWorkspaceLockedFn()) {
        return hasId
          ? {
              jsonrpc: '2.0',
              id: req.id ?? null,
              error: {
                code: -32003,
                message: 'Workspace is locked. Unlock OmniDesk PIN Lock Screen to read MCP resources.',
              },
            }
          : null;
      }

      const uri = typeof req.params?.uri === 'string' ? req.params.uri : '';
      const content = await this.readResource(uri);
      if (!content) {
        return hasId
          ? {
              jsonrpc: '2.0',
              id: req.id ?? null,
              error: { code: -32602, message: `Unknown MCP resource URI: ${uri}` },
            }
          : null;
      }
      return hasId
        ? {
            jsonrpc: '2.0',
            id: req.id ?? null,
            result: {
              contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(content, null, 2) }],
            },
          }
        : null;
    }

    return hasId
      ? {
          jsonrpc: '2.0',
          id: req.id ?? null,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        }
      : null;
  }

  private async readSnippetsStore(): Promise<SnippetRecord[]> {
    try {
      const { loadToolJson } = await import('./idbStorage');
      const saved = await loadToolJson<SnippetRecord[]>(SNIPPETS_STORAGE_KEY);
      if (Array.isArray(saved)) return saved;
    } catch {
      // Fall back to localStorage below
    }
    return readJsonStorage<SnippetRecord[]>(SNIPPETS_STORAGE_KEY, []);
  }

  private async writeSnippetsStore(snippets: SnippetRecord[]): Promise<void> {
    writeJsonStorage(SNIPPETS_STORAGE_KEY, snippets, 'omnidesk-snippets-updated');
    try {
      const { saveToolJson } = await import('./idbStorage');
      await saveToolJson(SNIPPETS_STORAGE_KEY, snippets);
    } catch {
      // localStorage mirror already written
    }
  }

  private async readResource(uri: string): Promise<unknown | null> {
    if (uri === 'omnidesk://calendar/events') {
      return readJsonStorage<CalendarEventRecord[]>(CALENDAR_STORAGE_KEY, []);
    }
    if (uri === 'omnidesk://tasks/summary') {
      const cfg = loadUserConfig();
      const kanban = readJsonStorage<KanbanTaskRecord[]>(KANBAN_STORAGE_KEY, []);
      return {
        dailyTasks: cfg.widgets?.dailyTasks || [],
        kanbanTasks: kanban,
      };
    }
    if (uri === 'omnidesk://snippets/list') {
      return await this.readSnippetsStore();
    }
    if (uri === 'omnidesk://system/telemetry') {
      return await this.collectSystemInfo();
    }
    return null;
  }

  private async collectSystemInfo(): Promise<Record<string, unknown>> {
    const runtime = isTauri() ? 'tauri' : 'web';
    let nativeTelemetry: NativeSystemTelemetry | null = null;
    if (isTauri()) {
      try {
        nativeTelemetry = await invokeRustCommand<NativeSystemTelemetry>('get_system_telemetry');
      } catch {
        nativeTelemetry = null;
      }
    }

    const browserInfo: Record<string, unknown> = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
      hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || null : null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };

    return {
      runtime,
      timestamp: new Date().toISOString(),
      telemetry: nativeTelemetry,
      environment: browserInfo,
    };
  }

  private okResult(payload: unknown): McpToolCallResult {
    return {
      content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    };
  }

  private errResult(message: string): McpToolCallResult {
    return {
      isError: true,
      content: [{ type: 'text', text: message }],
    };
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<McpToolCallResult> {
    switch (name) {
      case 'calendar_list_events': {
        const events = readJsonStorage<CalendarEventRecord[]>(CALENDAR_STORAGE_KEY, []);
        const dateFrom = typeof args.dateFrom === 'string' ? args.dateFrom.trim() : '';
        const dateTo = typeof args.dateTo === 'string' ? args.dateTo.trim() : '';
        const query = sanitizeText(args.query, 120).toLowerCase();

        if (dateFrom && !isValidIsoDate(dateFrom)) {
          return this.errResult('Invalid dateFrom format. Expected YYYY-MM-DD.');
        }
        if (dateTo && !isValidIsoDate(dateTo)) {
          return this.errResult('Invalid dateTo format. Expected YYYY-MM-DD.');
        }

        const filtered = events.filter(ev => {
          if (dateFrom && ev.date < dateFrom) return false;
          if (dateTo && ev.date > dateTo) return false;
          if (query) {
            const haystack = `${ev.title} ${ev.description}`.toLowerCase();
            if (!haystack.includes(query)) return false;
          }
          return true;
        });

        return this.okResult({ count: filtered.length, events: filtered });
      }

      case 'calendar_create_event': {
        const date = typeof args.date === 'string' ? args.date.trim() : '';
        const title = sanitizeText(args.title, 160);
        if (!isValidIsoDate(date)) {
          return this.errResult('Invalid date. Expected YYYY-MM-DD.');
        }
        if (!title) {
          return this.errResult('Event title is required.');
        }

        const rawHour = typeof args.hour === 'number' ? Math.round(args.hour) : 9;
        const hour = Math.max(0, Math.min(23, rawHour));
        const rawMinute = typeof args.minute === 'number' ? Math.round(args.minute) : 0;
        const minute = rawMinute >= 30 ? 30 : 0;
        const rawDuration = typeof args.durationMinutes === 'number' ? Math.round(args.durationMinutes) : 60;
        const durationMinutes = Math.max(15, Math.min(480, rawDuration));
        const color = typeof args.color === 'string' && VALID_COLORS.has(args.color) ? args.color : 'indigo';
        const recurrence =
          typeof args.recurrence === 'string' && VALID_RECURRENCES.has(args.recurrence)
            ? (args.recurrence as 'none' | 'daily' | 'weekly')
            : 'none';
        const description = sanitizeText(args.description, 1000);

        const events = readJsonStorage<CalendarEventRecord[]>(CALENDAR_STORAGE_KEY, []);
        const created: CalendarEventRecord = {
          id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date,
          hour,
          minute,
          title,
          description,
          color,
          durationMinutes,
          recurrence,
        };
        writeJsonStorage(CALENDAR_STORAGE_KEY, [...events, created], 'omnidesk-calendar-updated');
        return this.okResult({ created });
      }

      case 'calendar_delete_event': {
        const id = sanitizeText(args.id, 120);
        if (!id) return this.errResult('Event id is required.');
        const events = readJsonStorage<CalendarEventRecord[]>(CALENDAR_STORAGE_KEY, []);
        const next = events.filter(ev => ev.id !== id);
        if (next.length === events.length) {
          return this.errResult(`Calendar event not found: ${id}`);
        }
        writeJsonStorage(CALENDAR_STORAGE_KEY, next, 'omnidesk-calendar-updated');
        return this.okResult({ deletedId: id, remainingCount: next.length });
      }

      case 'tasks_list': {
        const scope = typeof args.scope === 'string' ? args.scope : 'all';
        const cfg = loadUserConfig();
        const dailyTasks = cfg.widgets?.dailyTasks || [];
        const kanbanTasks = readJsonStorage<KanbanTaskRecord[]>(KANBAN_STORAGE_KEY, []);
        if (scope === 'daily') return this.okResult({ dailyTasks });
        if (scope === 'kanban') return this.okResult({ kanbanTasks });
        return this.okResult({ dailyTasks, kanbanTasks });
      }

      case 'tasks_create': {
        const target = args.target === 'kanban' ? 'kanban' : 'daily';
        const text = sanitizeText(args.text, 240);
        if (!text) return this.errResult('Task text is required.');

        if (target === 'daily') {
          const cfg = loadUserConfig();
          const newTask = { id: `task-${Date.now()}`, text, done: false };
          saveUserConfig({
            ...cfg,
            widgets: {
              ...cfg.widgets,
              dailyTasks: [...(cfg.widgets?.dailyTasks || []), newTask],
            },
          });
          return this.okResult({ target: 'daily', created: newTask });
        }

        const column =
          typeof args.column === 'string' && VALID_COLUMNS.has(args.column)
            ? (args.column as 'todo' | 'doing' | 'done')
            : 'todo';
        const priority =
          typeof args.priority === 'string' && VALID_PRIORITIES.has(args.priority)
            ? (args.priority as 'low' | 'med' | 'high')
            : 'med';
        const kanban = readJsonStorage<KanbanTaskRecord[]>(KANBAN_STORAGE_KEY, []);
        const created: KanbanTaskRecord = { id: Date.now(), text, column, priority };
        writeJsonStorage(KANBAN_STORAGE_KEY, [...kanban, created], 'omnidesk-kanban-updated');
        return this.okResult({ target: 'kanban', created });
      }

      case 'tasks_update_status': {
        const target = args.target === 'kanban' ? 'kanban' : 'daily';
        const id = sanitizeText(args.id, 80);
        if (!id) return this.errResult('Task id is required.');

        if (target === 'daily') {
          const cfg = loadUserConfig();
          const existing = cfg.widgets?.dailyTasks || [];
          let found = false;
          const updated = existing.map(item => {
            if (item.id !== id) return item;
            found = true;
            const nextDone = typeof args.done === 'boolean' ? args.done : !item.done;
            return { ...item, done: nextDone };
          });
          if (!found) return this.errResult(`Daily task not found: ${id}`);
          saveUserConfig({
            ...cfg,
            widgets: {
              ...cfg.widgets,
              dailyTasks: updated,
            },
          });
          return this.okResult({ target: 'daily', updated: updated.find(item => item.id === id) });
        }

        const column =
          typeof args.column === 'string' && VALID_COLUMNS.has(args.column)
            ? (args.column as 'todo' | 'doing' | 'done')
            : null;
        if (!column) {
          return this.errResult('Valid column (todo, doing, done) is required for Kanban updates.');
        }
        const numericId = Number(id);
        const kanban = readJsonStorage<KanbanTaskRecord[]>(KANBAN_STORAGE_KEY, []);
        let updatedCard: KanbanTaskRecord | null = null;
        const next = kanban.map(card => {
          if (card.id === numericId) {
            updatedCard = { ...card, column };
            return updatedCard;
          }
          return card;
        });
        if (!updatedCard) return this.errResult(`Kanban task not found: ${id}`);
        writeJsonStorage(KANBAN_STORAGE_KEY, next, 'omnidesk-kanban-updated');
        return this.okResult({ target: 'kanban', updated: updatedCard });
      }

      case 'notes_search': {
        const query = sanitizeText(args.query, 160).toLowerCase();
        const notes = readJsonStorage<NoteRecord[]>(NOTES_STORAGE_KEY, []);
        const filtered = query
          ? notes.filter(
              note => note.title.toLowerCase().includes(query) || note.body.toLowerCase().includes(query)
            )
          : notes;
        return this.okResult({ count: filtered.length, notes: filtered });
      }

      case 'notes_create': {
        const title = sanitizeText(args.title, 180);
        const body = sanitizeText(args.body, 20000);
        if (!title) return this.errResult('Note title is required.');
        const notes = readJsonStorage<NoteRecord[]>(NOTES_STORAGE_KEY, []);
        const created: NoteRecord = {
          id: Date.now(),
          title,
          body,
          updatedAt: Date.now(),
        };
        writeJsonStorage(NOTES_STORAGE_KEY, [created, ...notes], 'omnidesk-notes-updated');
        return this.okResult({ created });
      }

      case 'system_get_info': {
        const info = await this.collectSystemInfo();
        return this.okResult(info);
      }

      case 'app_list_tools': {
        const category = sanitizeText(args.category, 60).toLowerCase();
        const query = sanitizeText(args.query, 120).toLowerCase();
        const allTools = this.getAvailableToolsFn();
        const filtered = allTools.filter(tool => {
          if (category && tool.category.toLowerCase() !== category) return false;
          if (query) {
            const haystack = `${tool.id} ${tool.title} ${tool.shortDesc}`.toLowerCase();
            if (!haystack.includes(query)) return false;
          }
          return true;
        });
        return this.okResult({ count: filtered.length, tools: filtered });
      }

      case 'app_open_tool': {
        const toolId = sanitizeText(args.toolId, 80);
        if (!toolId) return this.errResult('toolId is required.');
        const allTools = this.getAvailableToolsFn();
        if (allTools.length > 0 && !allTools.some(t => t.id === toolId)) {
          return this.errResult(`Unknown OmniDesk tool ID: ${toolId}`);
        }
        if (this.onOpenToolFn) {
          this.onOpenToolFn(toolId);
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('omnidesk-open-tool', { detail: { toolId } }));
        }
        return this.okResult({ openedToolId: toolId });
      }

      case 'clipboard_read': {
        try {
          const raw = await this.clipboard.readText();
          const text = sanitizeClipboardText(raw, MAX_CLIPBOARD_CHARS);
          return this.okResult({
            text,
            length: text.length,
            truncated: typeof raw === 'string' && raw.length > MAX_CLIPBOARD_CHARS,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to read clipboard.';
          this.appendLog('error', msg, { tool: 'clipboard_read' });
          return this.errResult(msg);
        }
      }

      case 'clipboard_write': {
        if (typeof args.text !== 'string') {
          return this.errResult('text must be a string.');
        }
        if (args.text.length > MAX_CLIPBOARD_CHARS) {
          return this.errResult(`Clipboard text exceeds maximum length of ${MAX_CLIPBOARD_CHARS} characters.`);
        }
        const text = sanitizeClipboardText(args.text, MAX_CLIPBOARD_CHARS);
        try {
          await this.clipboard.writeText(text);
          return this.okResult({ written: true, length: text.length });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to write clipboard.';
          this.appendLog('error', msg, { tool: 'clipboard_write' });
          return this.errResult(msg);
        }
      }

      case 'convert_list_formats': {
        const catalog = await import('../tools/files/converterCatalog');
        const category = typeof args.category === 'string' ? args.category.trim().toLowerCase() : '';
        const inputExtension = typeof args.inputExtension === 'string'
          ? args.inputExtension.trim().toLowerCase().replace(/^\./, '')
          : '';

        if (inputExtension) {
          const detectedCat =
            category && VALID_CONVERTER_CATEGORIES.has(category)
              ? (category as 'video' | 'audio' | 'images' | 'documents' | 'spreadsheets' | 'archives')
              : catalog.detectCategoryForFile(`file.${inputExtension}`);
          const targets = catalog.getTargetFormatsForInput(inputExtension, detectedCat);
          return this.okResult({
            inputExtension,
            category: detectedCat,
            targetFormats: targets.map(item => ({ ext: item.ext, label: item.label })),
          });
        }

        const categories = catalog.FORMAT_CATALOG.filter(c => (!category ? true : c.id === category)).map(cat => ({
          id: cat.id,
          label: cat.defaultLabel,
          formats: cat.formats.map(f => ({ ext: f.ext, label: f.label })),
        }));
        return this.okResult({
          totalSupportedFormats: catalog.TOTAL_SUPPORTED_FORMATS,
          categories,
        });
      }

      case 'convert_data': {
        if (typeof args.input !== 'string' || !args.input.trim()) {
          return this.errResult('input text is required.');
        }
        if (new TextEncoder().encode(args.input).length > MAX_DATA_CONVERT_BYTES) {
          return this.errResult(`Input exceeds maximum size of ${MAX_DATA_CONVERT_BYTES} bytes.`);
        }
        const fromFormat = typeof args.fromFormat === 'string' ? args.fromFormat.toLowerCase() : '';
        const toFormat = typeof args.toFormat === 'string' ? args.toFormat.toLowerCase() : '';
        if (!['json', 'yaml', 'csv', 'tsv'].includes(fromFormat)) {
          return this.errResult('fromFormat must be one of: json, yaml, csv, tsv.');
        }
        if (!['json', 'yaml', 'csv', 'tsv', 'markdown', 'xml'].includes(toFormat)) {
          return this.errResult('toFormat must be one of: json, yaml, csv, tsv, markdown, xml.');
        }

        try {
          const yamlMod = await import('js-yaml');
          const logic = await import('../utils/newTools.logic');
          let parsed: unknown;

          if (fromFormat === 'json') {
            parsed = JSON.parse(args.input);
          } else if (fromFormat === 'yaml') {
            parsed = yamlMod.load(args.input);
          } else {
            const delim = fromFormat === 'tsv' ? '\t' : ',';
            const grid = logic.parseCsvGrid(args.input, delim);
            parsed = logic.gridToJsonObjects(grid.headers, grid.rows);
          }

          let output = '';
          if (toFormat === 'json') {
            output = JSON.stringify(parsed, null, 2);
          } else if (toFormat === 'yaml') {
            output = yamlMod.dump(parsed, { indent: 2, lineWidth: 120 });
          } else if (toFormat === 'xml') {
            output = `<?xml version="1.0" encoding="UTF-8"?>\n${objectToXml(parsed, 'root')}`;
          } else {
            const rowsArr: Record<string, unknown>[] = Array.isArray(parsed)
              ? parsed.map(item =>
                  item && typeof item === 'object' && !Array.isArray(item)
                    ? (item as Record<string, unknown>)
                    : { value: item }
                )
              : parsed && typeof parsed === 'object'
                ? [parsed as Record<string, unknown>]
                : [{ value: parsed }];

            const headerSet = new Set<string>();
            for (const row of rowsArr) {
              Object.keys(row).forEach(k => headerSet.add(k));
            }
            const headers = Array.from(headerSet);
            const matrix = rowsArr.map(row =>
              headers.map(h => {
                const v = row[h];
                return v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
              })
            );
            if (toFormat === 'markdown') {
              output = logic.gridToMarkdownTable(headers, matrix);
            } else {
              output = logic.serializeCsvGrid(headers, matrix, toFormat === 'tsv' ? '\t' : ',');
            }
          }

          return this.okResult({
            fromFormat,
            toFormat,
            outputBytes: new TextEncoder().encode(output).length,
            output,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to convert structured data.';
          return this.errResult(msg);
        }
      }

      case 'convert_file_base64': {
        const fileName = sanitizeFileName(args.fileName);
        const base64Content = typeof args.base64Content === 'string' ? args.base64Content.trim() : '';
        const targetFormat = typeof args.targetFormat === 'string'
          ? args.targetFormat.trim().toLowerCase().replace(/^\./, '')
          : '';

        if (!base64Content) return this.errResult('base64Content is required.');
        if (!targetFormat || !/^[a-z0-9]{1,10}$/.test(targetFormat)) {
          return this.errResult('targetFormat must be a valid alphanumeric file extension (e.g. "html", "json", "pdf").');
        }

        let inputBytes: Uint8Array;
        try {
          inputBytes = base64ToBytes(base64Content);
        } catch {
          return this.errResult('Invalid base64Content payload.');
        }
        if (inputBytes.byteLength > MAX_FILE_CONVERT_BYTES) {
          return this.errResult(`Decoded file exceeds maximum limit of ${MAX_FILE_CONVERT_BYTES} bytes (5 MB).`);
        }

        try {
          const catalog = await import('../tools/files/converterCatalog');
          const engine = await import('../tools/files/converterEngine');
          const rawCategory = typeof args.category === 'string' ? args.category.trim().toLowerCase() : '';
          const category =
            rawCategory && VALID_CONVERTER_CATEGORIES.has(rawCategory)
              ? (rawCategory as 'video' | 'audio' | 'images' | 'documents' | 'spreadsheets' | 'archives')
              : catalog.detectCategoryForFile(fileName);

          const inputBuffer = inputBytes.buffer.slice(
            inputBytes.byteOffset,
            inputBytes.byteOffset + inputBytes.byteLength
          ) as ArrayBuffer;
          const file = new File([inputBuffer], fileName);
          const result = await engine.convertFile(file, category, targetFormat);
          const outBytes = new Uint8Array(await result.blob.arrayBuffer());
          const mime = result.blob.type || 'application/octet-stream';
          const isText =
            mime.startsWith('text/') ||
            mime.includes('json') ||
            mime.includes('xml') ||
            mime.includes('yaml') ||
            mime.includes('svg');

          return this.okResult({
            fileName: result.fileName,
            category,
            mime,
            originalSize: result.originalSize,
            newSize: result.newSize,
            durationMs: result.durationMs,
            base64Output: bytesToBase64(outBytes),
            textPreview: isText && outBytes.byteLength <= 16_000 ? new TextDecoder().decode(outBytes) : undefined,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'File conversion failed.';
          return this.errResult(msg);
        }
      }

      case 'snippets_search': {
        const query = sanitizeText(args.query, 160).toLowerCase();
        const lang = typeof args.language === 'string' ? args.language.trim().toLowerCase() : '';
        let variables: Record<string, string> | null = null;
        if (typeof args.variablesJson === 'string' && args.variablesJson.trim()) {
          try {
            const parsedVars: unknown = JSON.parse(args.variablesJson);
            if (parsedVars && typeof parsedVars === 'object' && !Array.isArray(parsedVars)) {
              variables = Object.fromEntries(
                Object.entries(parsedVars as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
              );
            }
          } catch {
            return this.errResult('variablesJson must be a valid JSON object string.');
          }
        }

        const snippets = await this.readSnippetsStore();
        const filtered = snippets.filter(item => {
          if (lang && item.language !== lang) return false;
          if (!query) return true;
          return (
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.code.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
          );
        });

        const logic = await import('../utils/newTools.logic');
        const enriched = filtered.map(item => ({
          ...item,
          variables: logic.extractSnippetVariables(item.code),
          renderedCode: variables ? logic.renderSnippetTemplate(item.code, variables) : undefined,
        }));

        return this.okResult({ count: enriched.length, snippets: enriched });
      }

      case 'snippets_create': {
        const title = sanitizeText(args.title, 180);
        const code = typeof args.code === 'string' ? sanitizeClipboardText(args.code, 20_000).trim() : '';
        if (!title) return this.errResult('Snippet title is required.');
        if (!code) return this.errResult('Snippet code is required.');

        const rawLang = typeof args.language === 'string' ? args.language.trim().toLowerCase() : 'other';
        const language = (
          VALID_SNIPPET_LANGUAGES.has(rawLang) ? rawLang : 'other'
        ) as SnippetRecord['language'];
        const description = sanitizeText(args.description, 400);
        const tags = Array.isArray(args.tags)
          ? args.tags
              .map(tag => sanitizeText(tag, 40))
              .filter(Boolean)
              .slice(0, 12)
          : [];

        const existing = await this.readSnippetsStore();
        const created: SnippetRecord = {
          id: `mcp-snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          description,
          language,
          tags,
          code,
          favorite: false,
          updatedAt: Date.now(),
        };
        await this.writeSnippetsStore([created, ...existing]);
        return this.okResult({ created });
      }

      case 'crypto_hash_text': {
        if (typeof args.text !== 'string') return this.errResult('text must be a string.');
        if (args.text.length > MAX_TEXT_UTIL_CHARS) {
          return this.errResult(`text exceeds maximum length of ${MAX_TEXT_UTIL_CHARS} characters.`);
        }
        const algorithm =
          typeof args.algorithm === 'string' && VALID_HASH_ALGOS.has(args.algorithm.toUpperCase())
            ? args.algorithm.toUpperCase()
            : 'SHA-256';
        try {
          const data = new TextEncoder().encode(args.text);
          const digest = await crypto.subtle.digest(algorithm, data);
          const hex = Array.from(new Uint8Array(digest))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          return this.okResult({ algorithm, byteLength: data.byteLength, hex });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to compute hash digest.';
          return this.errResult(msg);
        }
      }

      case 'encode_decode_text': {
        if (typeof args.text !== 'string') return this.errResult('text must be a string.');
        if (args.text.length > MAX_TEXT_UTIL_CHARS) {
          return this.errResult(`text exceeds maximum length of ${MAX_TEXT_UTIL_CHARS} characters.`);
        }
        const mode = args.mode === 'decode' ? 'decode' : args.mode === 'encode' ? 'encode' : null;
        const encoding = typeof args.encoding === 'string' ? args.encoding.toLowerCase() : '';
        if (!mode) return this.errResult('mode must be "encode" or "decode".');
        if (!['base64', 'base64url', 'url', 'hex', 'binary'].includes(encoding)) {
          return this.errResult('encoding must be one of: base64, base64url, url, hex, binary.');
        }

        try {
          let result = '';
          if (encoding === 'base64') {
            result = mode === 'encode' ? utf8ToBase64(args.text) : base64ToUtf8(args.text);
          } else if (encoding === 'base64url') {
            if (mode === 'encode') {
              result = utf8ToBase64(args.text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
            } else {
              const padLen = (4 - (args.text.length % 4)) % 4;
              const std = args.text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
              result = base64ToUtf8(std);
            }
          } else if (encoding === 'url') {
            result = mode === 'encode' ? encodeURIComponent(args.text) : decodeURIComponent(args.text);
          } else if (encoding === 'hex') {
            if (mode === 'encode') {
              result = Array.from(new TextEncoder().encode(args.text))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            } else {
              const clean = args.text.replace(/\s+/g, '');
              if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
                return this.errResult('Invalid hex input string.');
              }
              const bytes = new Uint8Array(clean.length / 2);
              for (let i = 0; i < clean.length; i += 2) {
                bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
              }
              result = new TextDecoder().decode(bytes);
            }
          } else {
            if (mode === 'encode') {
              result = Array.from(new TextEncoder().encode(args.text))
                .map(b => b.toString(2).padStart(8, '0'))
                .join(' ');
            } else {
              const tokens = args.text.trim().split(/\s+/).filter(Boolean);
              if (tokens.some(tok => !/^[01]{1,8}$/.test(tok))) {
                return this.errResult('Invalid binary input string (expected space-separated 8-bit groups).');
              }
              const bytes = new Uint8Array(tokens.map(tok => parseInt(tok, 2)));
              result = new TextDecoder().decode(bytes);
            }
          }
          return this.okResult({ mode, encoding, result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to encode/decode text.';
          return this.errResult(msg);
        }
      }

      case 'svg_optimize': {
        if (typeof args.svg !== 'string' || !args.svg.trim()) {
          return this.errResult('svg markup string is required.');
        }
        if (args.svg.length > MAX_TEXT_UTIL_CHARS) {
          return this.errResult(`svg exceeds maximum length of ${MAX_TEXT_UTIL_CHARS} characters.`);
        }
        const precision =
          typeof args.precision === 'number' && Number.isFinite(args.precision)
            ? Math.max(0, Math.min(5, Math.round(args.precision)))
            : 2;
        const asReactJsx = Boolean(args.asReactJsx);
        const componentName = sanitizeText(args.componentName, 60) || 'CustomIcon';

        const logic = await import('../utils/newTools.logic');
        const { output, stats } = logic.optimizeSvgMarkup(args.svg, {
          precision,
          removeComments: true,
          removeMetadata: true,
          removeDimensions: false,
        });
        return this.okResult({
          optimizedSvg: output,
          stats,
          reactJsx: asReactJsx ? logic.svgToReactJsx(output, componentName) : undefined,
        });
      }

      case 'math_evaluate': {
        const expression = sanitizeText(args.expression, 500);
        if (!expression) return this.errResult('expression is required.');
        const scope = typeof args.x === 'number' && Number.isFinite(args.x) ? { x: args.x } : {};
        try {
          const { evaluateSafeMathExpression } = await import('../utils/safeMathParser');
          const value = evaluateSafeMathExpression(expression, scope);
          if (!Number.isFinite(value)) {
            return this.errResult('Expression evaluated to a non-finite value (NaN or Infinity).');
          }
          return this.okResult({ expression, value });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Invalid math expression.';
          return this.errResult(msg);
        }
      }

      case 'generate_mock_data': {
        const rows =
          typeof args.rows === 'number' && Number.isFinite(args.rows)
            ? Math.max(1, Math.min(200, Math.round(args.rows)))
            : 10;
        const format =
          args.format === 'csv' || args.format === 'sql' || args.format === 'json' ? args.format : 'json';
        const seed =
          typeof args.seed === 'number' && Number.isFinite(args.seed) ? Math.round(args.seed) : 2026;
        const tableName = sanitizeText(args.tableName, 64) || 'records';

        const logic = await import('../utils/newTools.logic');
        const defaultFields = [
          { id: '1', name: 'id', kind: 'uuid' as const },
          { id: '2', name: 'full_name', kind: 'fullName' as const },
          { id: '3', name: 'email', kind: 'email' as const },
          { id: '4', name: 'company', kind: 'company' as const },
          { id: '5', name: 'city', kind: 'city' as const },
          { id: '6', name: 'amount', kind: 'price' as const },
          { id: '7', name: 'status', kind: 'status' as const },
        ];
        const dataset = logic.generateMockDataset(defaultFields, rows, seed);
        let output = '';
        if (format === 'json') {
          output = JSON.stringify(dataset, null, 2);
        } else if (format === 'csv') {
          const headers = defaultFields.map(f => f.name);
          const matrix = dataset.map(rec => headers.map(h => String(rec[h] ?? '')));
          output = logic.serializeCsvGrid(headers, matrix, ',');
        } else {
          output = logic.formatMockAsSqlInserts(tableName, dataset);
        }
        return this.okResult({ rows: dataset.length, format, seed, output });
      }

      case 'generate_lorem_ipsum': {
        const style =
          args.style === 'tech' || args.style === 'business' || args.style === 'classic'
            ? args.style
            : 'classic';
        const unit =
          args.unit === 'sentences' || args.unit === 'words' || args.unit === 'list' || args.unit === 'paragraphs'
            ? args.unit
            : 'paragraphs';
        const format =
          args.format === 'html' || args.format === 'markdown' || args.format === 'plain'
            ? args.format
            : 'plain';
        const count =
          typeof args.count === 'number' && Number.isFinite(args.count)
            ? Math.max(1, Math.min(50, Math.round(args.count)))
            : 3;

        const logic = await import('../utils/newTools.logic');
        const text = logic.generateLoremIpsum({
          style,
          unit,
          count,
          startWithClassic: style === 'classic',
          format,
          seed: 1337,
        });
        return this.okResult({ style, unit, count, format, text });
      }

      default:
        return this.errResult(`Unsupported tool: ${name}`);
    }
  }
}

export function createTransportFromConfig(config: McpBridgeConfig): McpTransport {
  if (config.transport === 'stdio') {
    return new StdioIpcMcpTransport();
  }
  return new WebSocketMcpTransport(config.wsUrl, config.authToken);
}
