import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CALENDAR_STORAGE_KEY,
  CHART_STUDIO_STORAGE_KEY,
  CROSSHAIR_ACTIVE_STORAGE_KEY,
  DIAGRAM_STUDIO_STORAGE_KEY,
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

  it('supports converter MCP tools (convert_list_formats, convert_data, convert_file_base64)', async () => {
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });

    const listRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 50,
      method: 'tools/call',
      params: { name: 'convert_list_formats', arguments: { inputExtension: 'csv' } },
    });
    const listPayload = JSON.parse(
      (listRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { category: string; targetFormats: Array<{ ext: string }> };
    expect(listPayload.category).toBe('spreadsheets');
    expect(listPayload.targetFormats.some(f => f.ext === 'json')).toBe(true);

    const dataRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 51,
      method: 'tools/call',
      params: {
        name: 'convert_data',
        arguments: {
          input: 'name,score\nAda,99\nAlan,95',
          fromFormat: 'csv',
          toFormat: 'yaml',
        },
      },
    });
    const dataPayload = JSON.parse(
      (dataRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { output: string };
    expect(dataPayload.output).toContain('name: Ada');
    expect(dataPayload.output).toContain('score: 99');

    const mdInput = '# Hello OmniDesk\n\nConverted via MCP.';
    const fileRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 52,
      method: 'tools/call',
      params: {
        name: 'convert_file_base64',
        arguments: {
          fileName: 'notes.md',
          base64Content: btoa(mdInput),
          targetFormat: 'html',
        },
      },
    });
    const filePayload = JSON.parse(
      (fileRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { fileName: string; textPreview?: string; base64Output: string };
    expect(filePayload.fileName).toBe('notes.html');
    expect(filePayload.base64Output.length).toBeGreaterThan(10);
    expect(filePayload.textPreview).toContain('Hello OmniDesk');
  });

  it('supports Snippet Vault MCP tools and omnidesk://snippets/list resource with access control', async () => {
    const roClient = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const blocked = await roClient.handleRequest({
      jsonrpc: '2.0',
      id: 60,
      method: 'tools/call',
      params: { name: 'snippets_create', arguments: { title: 'Test', code: 'echo hi' } },
    });
    expect(blocked?.error?.code).toBe(-32002);

    const rwClient = new OmniDeskMcpClient({ accessMode: 'readwrite' });
    const createRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 61,
      method: 'tools/call',
      params: {
        name: 'snippets_create',
        arguments: {
          title: 'SSH Tunnel',
          code: 'ssh -L {{localPort}}:127.0.0.1:{{remotePort}} {{host}}',
          language: 'bash',
          tags: ['ssh', 'network'],
        },
      },
    });
    const created = JSON.parse(
      (createRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { created: { title: string } };
    expect(created.created.title).toBe('SSH Tunnel');

    const searchRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 62,
      method: 'tools/call',
      params: {
        name: 'snippets_search',
        arguments: {
          query: 'tunnel',
          variablesJson: JSON.stringify({ localPort: '8080', remotePort: '5432', host: 'db.internal' }),
        },
      },
    });
    const searchPayload = JSON.parse(
      (searchRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { count: number; snippets: Array<{ renderedCode: string; variables: string[] }> };
    expect(searchPayload.count).toBe(1);
    expect(searchPayload.snippets[0].renderedCode).toBe('ssh -L 8080:127.0.0.1:5432 db.internal');
    expect(searchPayload.snippets[0].variables).toEqual(['localPort', 'remotePort', 'host']);

    const resourceRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 63,
      method: 'resources/read',
      params: { uri: 'omnidesk://snippets/list' },
    });
    const contents = (resourceRes?.result as { contents: Array<{ text: string }> }).contents;
    expect(JSON.parse(contents[0].text)).toHaveLength(1);
  });

  it('supports developer utility MCP tools (hash, encode/decode, svg, math, mock data, lorem ipsum)', async () => {
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });

    const hashRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 70,
      method: 'tools/call',
      params: { name: 'crypto_hash_text', arguments: { text: 'omnidesk', algorithm: 'SHA-256' } },
    });
    const hashPayload = JSON.parse(
      (hashRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { hex: string };
    expect(hashPayload.hex).toHaveLength(64);

    const encRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 71,
      method: 'tools/call',
      params: { name: 'encode_decode_text', arguments: { text: 'Hello MCP!', mode: 'encode', encoding: 'hex' } },
    });
    const encPayload = JSON.parse(
      (encRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { result: string };
    expect(encPayload.result).toBe('48656c6c6f204d435021');

    const svgRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 72,
      method: 'tools/call',
      params: {
        name: 'svg_optimize',
        arguments: {
          svg: '<svg viewBox="0 0 24 24"><!-- comment --><path stroke-width="2.12345" d="M0 0"/></svg>',
          asReactJsx: true,
          componentName: 'TestIcon',
        },
      },
    });
    const svgPayload = JSON.parse(
      (svgRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { optimizedSvg: string; reactJsx: string };
    expect(svgPayload.optimizedSvg).not.toContain('comment');
    expect(svgPayload.reactJsx).toContain('export const TestIcon');

    const mathRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 73,
      method: 'tools/call',
      params: { name: 'math_evaluate', arguments: { expression: 'sqrt(144) + 2^3' } },
    });
    const mathPayload = JSON.parse(
      (mathRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { value: number };
    expect(mathPayload.value).toBe(20);

    const mockRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 74,
      method: 'tools/call',
      params: { name: 'generate_mock_data', arguments: { rows: 3, format: 'sql', tableName: 'customers' } },
    });
    const mockPayload = JSON.parse(
      (mockRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { rows: number; output: string };
    expect(mockPayload.rows).toBe(3);
    expect(mockPayload.output).toContain('INSERT INTO customers');

    const loremRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 75,
      method: 'tools/call',
      params: { name: 'generate_lorem_ipsum', arguments: { style: 'classic', unit: 'paragraphs', count: 2, format: 'html' } },
    });
    const loremPayload = JSON.parse(
      (loremRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { text: string };
    expect(loremPayload.text).toContain('<p>Lorem ipsum dolor sit amet');
  });

  it('blocks MCP tool calls and resource reads when workspace lock is active', async () => {
    let locked = true;
    const client = new OmniDeskMcpClient({
      accessMode: 'readwrite',
      isWorkspaceLocked: () => locked,
    });

    const lockedToolRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 80,
      method: 'tools/call',
      params: { name: 'math_evaluate', arguments: { expression: '1+1' } },
    });
    expect(lockedToolRes?.error?.code).toBe(-32003);

    const lockedResRead = await client.handleRequest({
      jsonrpc: '2.0',
      id: 81,
      method: 'resources/read',
      params: { uri: 'omnidesk://snippets/list' },
    });
    expect(lockedResRead?.error?.code).toBe(-32003);

    locked = false;
    const unlockedRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 82,
      method: 'tools/call',
      params: { name: 'math_evaluate', arguments: { expression: '1+1' } },
    });
    expect(unlockedRes?.error).toBeUndefined();
  });

  it('supports Chart Studio MCP tools, live sync event, and resource snapshot', async () => {
    const roClient = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const typesRes = await roClient.handleRequest({
      jsonrpc: '2.0',
      id: 90,
      method: 'tools/call',
      params: { name: 'chart_list_types', arguments: {} },
    });
    const typesPayload = JSON.parse(
      (typesRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { totalFamilies: number; totalSubtypes: number };
    expect(typesPayload.totalFamilies).toBe(17);
    expect(typesPayload.totalSubtypes).toBe(35);

    const blockedWrite = await roClient.handleRequest({
      jsonrpc: '2.0',
      id: 91,
      method: 'tools/call',
      params: { name: 'chart_create_or_update', arguments: { family: 'line', title: 'Blocked' } },
    });
    expect(blockedWrite?.error?.code).toBe(-32002);

    const openedTools: string[] = [];
    const chartUpdated = vi.fn();
    window.addEventListener('omnidesk-chart-studio-updated', chartUpdated);

    const rwClient = new OmniDeskMcpClient({
      accessMode: 'readwrite',
      onOpenTool: id => openedTools.push(id),
    });

    const csv = 'Quarter,Revenue,Profit\n1,100,25\n2,150,40\n3,200,55\n4,250,70';
    const createRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 92,
      method: 'tools/call',
      params: {
        name: 'chart_create_or_update',
        arguments: {
          data: csv,
          family: 'line',
          subtype: 'line-smooth',
          title: 'Quarterly Growth',
          palette: 'emerald',
          openInUi: true,
        },
      },
    });
    expect(createRes?.error).toBeUndefined();
    const createdPayload = JSON.parse(
      (createRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { config: { family: string; subtype: string; title: string }; rowCount: number; openedInUi: boolean };
    expect(createdPayload.config.family).toBe('line');
    expect(createdPayload.config.subtype).toBe('line-smooth');
    expect(createdPayload.config.title).toBe('Quarterly Growth');
    expect(createdPayload.rowCount).toBe(4);
    expect(createdPayload.openedInUi).toBe(true);
    expect(openedTools).toContain('chart-studio');
    expect(chartUpdated).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CHART_STUDIO_STORAGE_KEY)).toContain('Quarterly Growth');

    const analyzeRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 93,
      method: 'tools/call',
      params: {
        name: 'chart_analyze_data',
        arguments: { includeRegression: true, histogramBins: 4, includeBoxPlot: true },
      },
    });
    const analyzePayload = JSON.parse(
      (analyzeRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as {
      source: string;
      summaryStats: Array<{ name: string; mean: number }>;
      regression: { slope: number; r2: number };
      histogram: Array<{ count: number }>;
      boxPlots: Array<{ series: string; median: number }>;
    };
    expect(analyzePayload.source).toBe('workspace');
    expect(analyzePayload.summaryStats[0].mean).toBe(175);
    expect(analyzePayload.regression.slope).toBeCloseTo(50, 5);
    expect(analyzePayload.regression.r2).toBeCloseTo(1, 5);
    expect(analyzePayload.histogram).toHaveLength(4);
    expect(analyzePayload.boxPlots).toHaveLength(2);

    const resourceRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 94,
      method: 'resources/read',
      params: { uri: 'omnidesk://chart-studio/current' },
    });
    const resText = (resourceRes?.result as { contents: Array<{ text: string }> }).contents[0].text;
    expect(JSON.parse(resText).config.title).toBe('Quarterly Growth');

    window.removeEventListener('omnidesk-chart-studio-updated', chartUpdated);
  });

  it('supports Diagram Studio SQL DDL import, Mermaid export, and resource snapshot', async () => {
    const diagramUpdated = vi.fn();
    window.addEventListener('omnidesk-diagram-studio-updated', diagramUpdated);

    const client = new OmniDeskMcpClient({ accessMode: 'readwrite' });
    const ddl = `
      CREATE TABLE teams (
        id BIGINT PRIMARY KEY,
        name VARCHAR(100) NOT NULL
      );
      CREATE TABLE members (
        id BIGINT PRIMARY KEY,
        team_id BIGINT REFERENCES teams(id),
        email VARCHAR(255) UNIQUE NOT NULL
      );
    `;

    const fromSqlRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 100,
      method: 'tools/call',
      params: { name: 'diagram_from_sql', arguments: { sql: ddl, title: 'Team ERD' } },
    });
    const fromSqlPayload = JSON.parse(
      (fromSqlRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { title: string; tableCount: number; relationshipCount: number; mermaid: string };
    expect(fromSqlPayload.title).toBe('Team ERD');
    expect(fromSqlPayload.tableCount).toBe(2);
    expect(fromSqlPayload.relationshipCount).toBe(1);
    expect(fromSqlPayload.mermaid).toContain('erDiagram');
    expect(diagramUpdated).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(DIAGRAM_STUDIO_STORAGE_KEY)).toContain('Team ERD');

    const getRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 101,
      method: 'tools/call',
      params: { name: 'diagram_get_current', arguments: {} },
    });
    const getPayload = JSON.parse(
      (getRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { title: string; nodeCount: number; sqlDdl: string };
    expect(getPayload.title).toBe('Team ERD');
    expect(getPayload.nodeCount).toBe(2);
    expect(getPayload.sqlDdl).toContain('CREATE TABLE teams');

    const resourceRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 102,
      method: 'resources/read',
      params: { uri: 'omnidesk://diagram-studio/current' },
    });
    const resText = (resourceRes?.result as { contents: Array<{ text: string }> }).contents[0].text;
    expect(JSON.parse(resText).title).toBe('Team ERD');

    window.removeEventListener('omnidesk-diagram-studio-updated', diagramUpdated);
  });

  it('supports sql_run_query over inline JSON and CSV datasets', async () => {
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const data = JSON.stringify([
      { region: 'EU', sales: 120 },
      { region: 'EU', sales: 80 },
      { region: 'US', sales: 300 },
    ]);

    const res = await client.handleRequest({
      jsonrpc: '2.0',
      id: 110,
      method: 'tools/call',
      params: {
        name: 'sql_run_query',
        arguments: {
          data,
          query: 'SELECT region, SUM(sales) AS total FROM data GROUP BY region ORDER BY total DESC',
          includeCsv: true,
        },
      },
    });
    const payload = JSON.parse(
      (res?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { rowCount: number; rows: Array<{ region: string; total: number }>; csv: string };
    expect(payload.rowCount).toBe(2);
    expect(payload.rows[0]).toEqual({ region: 'US', total: 300 });
    expect(payload.rows[1]).toEqual({ region: 'EU', total: 200 });
    expect(payload.csv).toContain('region,total');
  });

  it('supports crosshair_list_presets and crosshair_apply_preset with readonly enforcement', async () => {
    const roClient = new OmniDeskMcpClient({ accessMode: 'readonly' });
    const listRes = await roClient.handleRequest({
      jsonrpc: '2.0',
      id: 120,
      method: 'tools/call',
      params: { name: 'crosshair_list_presets', arguments: { game: 'cs2' } },
    });
    const listPayload = JSON.parse(
      (listRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { count: number; presets: Array<{ id: string; shareCode: string }> };
    expect(listPayload.count).toBeGreaterThan(0);
    expect(listPayload.presets[0].shareCode).toMatch(/^ODX-/);

    const blockedApply = await roClient.handleRequest({
      jsonrpc: '2.0',
      id: 121,
      method: 'tools/call',
      params: { name: 'crosshair_apply_preset', arguments: { presetId: listPayload.presets[0].id } },
    });
    expect(blockedApply?.error?.code).toBe(-32002);

    const crosshairUpdated = vi.fn();
    window.addEventListener('omnidesk-crosshair-updated', crosshairUpdated);

    const rwClient = new OmniDeskMcpClient({ accessMode: 'readwrite' });
    const applyRes = await rwClient.handleRequest({
      jsonrpc: '2.0',
      id: 122,
      method: 'tools/call',
      params: { name: 'crosshair_apply_preset', arguments: { shareCode: listPayload.presets[0].shareCode } },
    });
    const applyPayload = JSON.parse(
      (applyRes?.result as { content: Array<{ text: string }> }).content[0].text
    ) as { applied: { name: string }; shareCode: string };
    expect(applyPayload.shareCode).toBe(listPayload.presets[0].shareCode);
    expect(crosshairUpdated).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CROSSHAIR_ACTIVE_STORAGE_KEY)).toContain(applyPayload.applied.name);

    window.removeEventListener('omnidesk-crosshair-updated', crosshairUpdated);
  });

  it('validates desktop diagnostics MCP tools safely outside Tauri runtime', async () => {
    const client = new OmniDeskMcpClient({ accessMode: 'readonly' });

    const invalidHostRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 130,
      method: 'tools/call',
      params: { name: 'desktop_network_check', arguments: { action: 'ping', host: 'bad host; rm -rf' } },
    });
    expect((invalidHostRes?.result as { isError?: boolean }).isError).toBe(true);

    const missingPortRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 131,
      method: 'tools/call',
      params: { name: 'desktop_network_check', arguments: { action: 'tcp_check', host: '1.1.1.1' } },
    });
    expect((missingPortRes?.result as { isError?: boolean }).isError).toBe(true);

    const nonTauriSpecsRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 132,
      method: 'tools/call',
      params: { name: 'desktop_hardware_specs', arguments: {} },
    });
    expect((nonTauriSpecsRes?.result as { isError?: boolean }).isError).toBe(true);

    const nonTauriPortsRes = await client.handleRequest({
      jsonrpc: '2.0',
      id: 133,
      method: 'tools/call',
      params: { name: 'desktop_list_ports_and_processes', arguments: { scope: 'ports' } },
    });
    expect((nonTauriPortsRes?.result as { isError?: boolean }).isError).toBe(true);

    const caps = client.getConnectedToolCapabilities().map(c => c.id);
    expect(caps).toContain('chart-studio');
    expect(caps).toContain('diagram-studio');
    expect(caps).toContain('sql-playground');
    expect(caps).toContain('desktop-diagnostics');
    expect(caps).toContain('crosshair-studio');
  });
});

