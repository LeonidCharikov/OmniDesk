import { McpAccessMode, McpBridgeConfig } from '../types/tool';
import { invokeRustCommand, isTauri } from './fileSystemService';
import { loadUserConfig, saveUserConfig } from './storage';

export const MCP_PROTOCOL_VERSION = '2024-11-05';

export const CALENDAR_STORAGE_KEY = 'omnidesk_calendar_events';
export const KANBAN_STORAGE_KEY = 'omnidesk-kanban-board-v2';
export const NOTES_STORAGE_KEY = 'omnidesk-notes';

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

export interface OmniDeskMcpClientOptions {
  accessMode?: McpAccessMode;
  isLocked?: () => boolean;
  getAvailableTools?: () => McpCatalogToolSummary[];
  onOpenTool?: (toolId: string) => void;
  clipboard?: McpClipboardAdapter;
  maxLogEntries?: number;
}

const VALID_COLORS = new Set(['indigo', 'emerald', 'amber', 'rose', 'blue', 'purple', 'cyan', 'orange']);
const VALID_RECURRENCES = new Set(['none', 'daily', 'weekly']);
const VALID_COLUMNS = new Set(['todo', 'doing', 'done']);
const VALID_PRIORITIES = new Set(['low', 'med', 'high']);
const MAX_CLIPBOARD_CHARS = 100_000;
const DEFAULT_MAX_LOG_ENTRIES = 200;

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
  private readonly isLockedFn: () => boolean;
  private readonly getAvailableToolsFn: () => McpCatalogToolSummary[];
  private readonly onOpenToolFn?: (toolId: string) => void;
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
    this.isLockedFn = options.isLocked ?? (() => false);
    this.getAvailableToolsFn = options.getAvailableTools ?? (() => []);
    this.onOpenToolFn = options.onOpenTool;
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
    if (!this.autoReconnect || this.manualDisconnect || !this.transport || this.reconnectTimer || this.isLockedFn()) {
      return;
    }
    const delayMs = Math.min(15000, 2000 * Math.pow(2, Math.min(this.reconnectAttempts, 3)));
    this.reconnectAttempts += 1;
    const targetTransport = this.transport;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.autoReconnect || this.manualDisconnect || this.transport !== targetTransport || this.isLockedFn()) {
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
    const isAvailable = this.currentStatus === 'connected' && !this.isLockedFn();
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

    if (this.isLockedFn()) {
      return hasId
        ? {
            jsonrpc: '2.0',
            id: req.id ?? null,
            error: {
              code: -32001,
              message: 'OmniDesk workspace is currently locked.',
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
