import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CALENDAR_STORAGE_KEY,
  isValidMcpWebSocketUrl,
  KANBAN_STORAGE_KEY,
  McpConnectionStatus,
  McpTransport,
  NOTES_STORAGE_KEY,
  OmniDeskMcpClient,
} from '../services/mcpClient';

function createMockTransport() {
  let msgHandler: ((raw: string) => void) | null = null;
  let statusHandler: ((status: McpConnectionStatus, error?: string) => void) | null = null;
  const sent: string[] = [];

  const transport: McpTransport = {
    mode: 'websocket',
    async connect() {
      statusHandler?.('connected');
    },
    async disconnect() {
      statusHandler?.('disconnected');
    },
    async send(message: string) {
      sent.push(message);
    },
    onMessage(listener) {
      msgHandler = listener;
      return () => {
        msgHandler = null;
      };
    },
    onStatusChange(listener) {
      statusHandler = listener;
      return () => {
        statusHandler = null;
      };
    },
  };

  return {
    transport,
    sent,
    emitIncoming(raw: string) {
      msgHandler?.(raw);
    },
  };
}

describe('OmniDeskMcpClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates loopback-only WebSocket URLs', () => {
    expect(isValidMcpWebSocketUrl('ws://127.0.0.1:3847/bridge')).toBe(true);
    expect(isValidMcpWebSocketUrl('ws://localhost:3847/bridge')).toBe(true);
    expect(isValidMcpWebSocketUrl('wss://127.0.0.1:3847')).toBe(true);
    expect(isValidMcpWebSocketUrl('ws://192.168.1.50:3847')).toBe(false);
    expect(isValidMcpWebSocketUrl('https://example.com')).toBe(false);
    expect(isValidMcpWebSocketUrl('not-a-url')).toBe(false);
  });

  it('responds to initialize and filters tools in readonly mode', async () => {
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const initRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });

    expect(initRes?.error).toBeUndefined();
    expect((initRes?.result as { serverInfo: { name: string } }).serverInfo.name).toBe('omnidesk-desktop-bridge');

    const listRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    const tools = (listRes?.result as { tools: Array<{ name: string }> }).tools.map(t => t.name);
    expect(tools).toContain('calendar_list_events');
    expect(tools).toContain('tasks_list');
    expect(tools).toContain('system_get_info');
    expect(tools).toContain('clipboard_read');
    expect(tools).not.toContain('calendar_create_event');
    expect(tools).not.toContain('clipboard_write');
    expect(tools).not.toContain('app_open_tool');
  });

  it('blocks write tools when in readonly mode', async () => {
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const res = await client.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'calendar_create_event',
        arguments: { date: '2026-11-20', title: 'Blocked event' },
      },
    });
    expect(res?.error?.code).toBe(-32002);
  });

  it('creates, lists, and deletes calendar events in readwrite mode', async () => {
    const calendarEventsListener = vi.fn();
    window.addEventListener('omnidesk-calendar-updated', calendarEventsListener);

    const client = new OmniDeskMcpClient({ accessMode: 'readwrite' });

    const createRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'calendar_create_event',
        arguments: {
          date: '2026-11-25',
          hour: 14,
          minute: 30,
          durationMinutes: 60,
          title: 'Team Sync',
          description: 'Review sprint goals',
          color: 'emerald',
        },
      },
    });

    const createPayload = JSON.parse(
      (createRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { created: { id: string; title: string } };
    expect(createPayload.created.title).toBe('Team Sync');
    expect(calendarEventsListener).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(localStorage.getItem(CALENDAR_STORAGE_KEY) || '[]');
    expect(stored).toHaveLength(1);

    const listRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'calendar_list_events',
        arguments: { dateFrom: '2026-11-20', dateTo: '2026-11-30', query: 'sprint' },
      },
    });
    const listPayload = JSON.parse(
      (listRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { count: number };
    expect(listPayload.count).toBe(1);

    const delRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'calendar_delete_event',
        arguments: { id: createPayload.created.id },
      },
    });
    const delPayload = JSON.parse(
      (delRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { remainingCount: number };
    expect(delPayload.remainingCount).toBe(0);

    window.removeEventListener('omnidesk-calendar-updated', calendarEventsListener);
  });

  it('manages daily tasks, kanban tasks, notes, and app navigation', async () => {
    const onOpenTool = vi.fn();
    const client = new OmniDeskMcpClient({
      accessMode: 'readwrite',
      getAvailableTools: () => [
        { id: 'calendar', title: 'Calendar', category: 'planning', shortDesc: 'Planner' },
      ],
      onOpenTool,
    });

    const addDailyRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 20,
      method: 'tools/call',
      params: {
        name: 'tasks_create',
        arguments: { target: 'daily', text: 'Prepare MCP demo' },
      },
    });
    const dailyCreated = JSON.parse(
      (addDailyRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { created: { id: string } };

    await client.handleRequest({
      jsonrpc: '2.0',
      id: 21,
      method: 'tools/call',
      params: {
        name: 'tasks_create',
        arguments: { target: 'kanban', text: 'Ship release', column: 'doing', priority: 'high' },
      },
    });

    const kanbanStored = JSON.parse(localStorage.getItem(KANBAN_STORAGE_KEY) || '[]');
    expect(kanbanStored).toHaveLength(1);

    await client.handleRequest({
      jsonrpc: '2.0',
      id: 22,
      method: 'tools/call',
      params: {
        name: 'tasks_update_status',
        arguments: { target: 'daily', id: dailyCreated.created.id, done: true },
      },
    });

    await client.handleRequest({
      jsonrpc: '2.0',
      id: 23,
      method: 'tools/call',
      params: {
        name: 'notes_create',
        arguments: { title: 'Meeting Notes', body: 'MCP bridge tested.' },
      },
    });
    expect(JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '[]')).toHaveLength(1);

    await client.handleRequest({
      jsonrpc: '2.0',
      id: 24,
      method: 'tools/call',
      params: {
        name: 'app_open_tool',
        arguments: { toolId: 'calendar' },
      },
    });
    expect(onOpenTool).toHaveBeenCalledWith('calendar');

    const resRead = await client.handleRequest({
      jsonrpc: '2.0',
      id: 25,
      method: 'resources/read',
      params: { uri: 'omnidesk://system/telemetry' },
    });
    const contents = (resRead?.result as { contents: Array<{ text: string }> }).contents;
    expect(JSON.parse(contents[0].text).runtime).toBe('web');
  });

  it('supports clipboard_read and clipboard_write with access control', async () => {
    let buffer = 'Initial desktop snippet';
    const clipboard = {
      readText: vi.fn(async () => buffer),
      writeText: vi.fn(async (next: string) => {
        buffer = next;
      }),
    };

    const readonlyClient = new OmniDeskMcpClient({ accessMode: 'readonly', clipboard });
    const readRes = await readonlyClient.handleRequest({
      jsonrpc: '2.0',
      id: 30,
      method: 'tools/call',
      params: { name: 'clipboard_read', arguments: {} },
    });
    const readPayload = JSON.parse(
      (readRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { text: string; length: number };
    expect(readPayload.text).toBe('Initial desktop snippet');
    expect(readPayload.length).toBe(23);

    const blockedWrite = await readonlyClient.handleRequest({
      jsonrpc: '2.0',
      id: 31,
      method: 'tools/call',
      params: { name: 'clipboard_write', arguments: { text: 'Should fail' } },
    });
    expect(blockedWrite?.error?.code).toBe(-32002);

    const rwClient = new OmniDeskMcpClient({ accessMode: 'readwrite', clipboard });
    const writeRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 32,
      method: 'tools/call',
      params: { name: 'clipboard_write', arguments: { text: 'Updated\nMultiline\tText' } },
    });
    const writePayload = JSON.parse(
      (writeRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { written: boolean; length: number };
    expect(writePayload.written).toBe(true);
    expect(buffer).toBe('Updated\nMultiline\tText');
  });

  it('records live incoming, outgoing, and error JSON-RPC logs and clears them', async () => {
    const mock = createMockTransport();
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const snapshots: number[] = [];
    const unsubscribe = client.onLog(logs => snapshots.push(logs.length));

    await client.connect(mock.transport);

    mock.emitIncoming(JSON.stringify({ jsonrpc: '2.0', id: 40, method: 'ping' }));
    await new Promise(resolve => setTimeout(resolve, 10));

    mock.emitIncoming('{invalid-json');
    await new Promise(resolve => setTimeout(resolve, 10));

    const logs = client.getLogs();
    expect(logs.some(entry => entry.direction === 'system')).toBe(true);
    expect(logs.some(entry => entry.direction === 'incoming' && entry.method === 'ping')).toBe(true);
    expect(logs.some(entry => entry.direction === 'outgoing' && entry.rpcId === 40)).toBe(true);
    expect(logs.some(entry => entry.direction === 'error')).toBe(true);
    expect(mock.sent).toHaveLength(2);
    expect(snapshots.length).toBeGreaterThan(2);

    client.clearLogs();
    expect(client.getLogs()).toHaveLength(0);
    unsubscribe();
    await client.disconnect();
  });

  it('dynamically computes connected tool capabilities based on connection status and access mode', async () => {
    const mock = createMockTransport();
    const client = new OmniDeskMcpClient({
      accessMode: 'readonly',
      getAvailableTools: () => [
        { id: 'calendar', title: 'Calendar', category: 'planning', shortDesc: 'Planner' },
        { id: 'pdf-editor', title: 'PDF Editor', category: 'files', shortDesc: 'PDF' },
      ],
    });

    // Disconnected initially -> all capabilities standby, only readonly endpoints listed
    const initial = client.getConnectedToolCapabilities();
    expect(initial.every(cap => !cap.isAvailable)).toBe(true);
    const calInitial = initial.find(cap => cap.id === 'calendar');
    expect(calInitial?.exposedMcpTools).toEqual(['calendar_list_events']);

    // Connected in readwrite mode -> all capabilities active and write endpoints exposed
    client.setAccessMode('readwrite');
    await client.connect(mock.transport);
    const active = client.getConnectedToolCapabilities();
    expect(active.every(cap => cap.isAvailable)).toBe(true);
    const calActive = active.find(cap => cap.id === 'calendar');
    expect(calActive?.exposedMcpTools).toEqual([
      'calendar_list_events',
      'calendar_create_event',
      'calendar_delete_event',
    ]);
    const catalogCap = active.find(cap => cap.id === 'workspace-tools');
    expect(catalogCap?.localTools).toHaveLength(2);

    await client.disconnect();
  });
});
