// @vitest-environment node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OmniDeskMcpClient, WebSocketMcpTransport } from '../services/mcpClient';

const SERVER_DIR = path.resolve(process.cwd(), 'docs/mcp-server-template');
const SERVER_ENTRY = path.join(SERVER_DIR, 'server.mjs');
const HAS_WS_INSTALLED = fs.existsSync(path.join(SERVER_DIR, 'node_modules/ws'));

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe.skipIf(!HAS_WS_INSTALLED)('OmniDesk MCP End-to-End Integration', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('connects OmniDeskMcpClient via WebSocketMcpTransport to server.mjs and executes tools end-to-end', { timeout: 10000 }, async () => {
    const child = spawn(process.execPath, [SERVER_ENTRY], {
      env: {
        ...process.env,
        OMNIDESK_MCP_PORT: '0',
        OMNIDESK_MCP_TOKEN: 'vitest-bridge-token',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdoutLines: Array<Record<string, unknown>> = [];
    const lineWaiters: Array<{
      predicate: (msg: Record<string, unknown>) => boolean;
      resolve: (msg: Record<string, unknown>) => void;
      timer: ReturnType<typeof setTimeout>;
    }> = [];

    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const idx = lineWaiters.findIndex(w => w.predicate(parsed));
      if (idx >= 0) {
        const [w] = lineWaiters.splice(idx, 1);
        clearTimeout(w.timer);
        w.resolve(parsed);
      } else {
        stdoutLines.push(parsed);
      }
    });

    const waitForStdio = (predicate: (msg: Record<string, unknown>) => boolean) => {
      const idx = stdoutLines.findIndex(predicate);
      if (idx >= 0) {
        const [found] = stdoutLines.splice(idx, 1);
        return Promise.resolve(found);
      }
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out waiting for MCP server response')), 5000);
        lineWaiters.push({ predicate, resolve, timer });
      });
    };

    const sendStdio = (payload: Record<string, unknown>) => {
      child.stdin.write(`${JSON.stringify(payload)}\n`);
    };

    let clipboardValue = 'initial';
    const client = new OmniDeskMcpClient({
      accessMode: 'readwrite',
      clipboard: {
        readText: async () => clipboardValue,
        writeText: async next => {
          clipboardValue = next;
        },
      },
    });

    try {
      const wsUrl = await new Promise<string>((resolve, reject) => {
        let stderr = '';
        const timer = setTimeout(() => reject(new Error(`Server failed to report URL: ${stderr}`)), 5000);
        child.stderr.on('data', chunk => {
          stderr += chunk.toString('utf8');
          const match = stderr.match(/ws:\/\/127\.0\.0\.1:\d+\/bridge/);
          if (match) {
            clearTimeout(timer);
            resolve(match[0]);
          }
        });
      });

      sendStdio({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
      const initRes = await waitForStdio(m => m.id === 1);
      expect((initRes.result as { serverInfo: { name: string } }).serverInfo.name).toBe('omnidesk-mcp-server');

      const transport = new WebSocketMcpTransport(wsUrl, 'vitest-bridge-token');
      await client.connect(transport);

      await waitForStdio(m => m.method === 'notifications/tools/list_changed');

      sendStdio({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
      const listRes = await waitForStdio(m => m.id === 2);
      const names = (listRes.result as { tools: Array<{ name: string }> }).tools.map(t => t.name);
      expect(names).toContain('calendar_create_event');
      expect(names).toContain('clipboard_read');
      expect(names).toContain('clipboard_write');
      expect(names).toContain('omnidesk_bridge_status');

      sendStdio({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'calendar_create_event',
          arguments: { date: '2026-12-01', title: 'E2E Launch Sync' },
        },
      });
      const calRes = await waitForStdio(m => m.id === 3);
      const calText = (calRes.result as { content: Array<{ text: string }> }).content[0].text;
      expect(JSON.parse(calText).created.title).toBe('E2E Launch Sync');

      sendStdio({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'clipboard_write', arguments: { text: 'Synced via MCP E2E' } },
      });
      await waitForStdio(m => m.id === 4);
      expect(clipboardValue).toBe('Synced via MCP E2E');

      sendStdio({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: 'clipboard_read', arguments: {} },
      });
      const clipReadRes = await waitForStdio(m => m.id === 5);
      const clipText = (clipReadRes.result as { content: Array<{ text: string }> }).content[0].text;
      expect(JSON.parse(clipText).text).toBe('Synced via MCP E2E');

      // Verify MCP Log captured end-to-end traffic
      const logs = client.getLogs();
      expect(logs.some(l => l.direction === 'incoming' && l.method === 'tools/call')).toBe(true);
      expect(logs.some(l => l.direction === 'outgoing' && !l.isError)).toBe(true);
    } finally {
      await client.disconnect();
      rl.close();
      child.stdin.end();
      await new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 2000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  });
});
