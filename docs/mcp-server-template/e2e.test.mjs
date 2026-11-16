import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, 'server.mjs');

function startServer(env) {
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const messages = [];
  const waiters = [];

  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const parsed = JSON.parse(trimmed);
    const waiterIdx = waiters.findIndex(w => w.predicate(parsed));
    if (waiterIdx >= 0) {
      const [waiter] = waiters.splice(waiterIdx, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(parsed);
    } else {
      messages.push(parsed);
    }
  });

  const bridgeReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket server URL')), 5000);
    let stderrBuffer = '';
    child.stderr.on('data', chunk => {
      stderrBuffer += chunk.toString('utf8');
      const match = stderrBuffer.match(/ws:\/\/127\.0\.0\.1:(\d+)\/bridge/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Server exited prematurely with code ${code}: ${stderrBuffer}`));
    });
  });

  function sendStdio(payload) {
    child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  function waitForMessage(predicate, timeoutMs = 5000) {
    const existingIdx = messages.findIndex(predicate);
    if (existingIdx >= 0) {
      const [found] = messages.splice(existingIdx, 1);
      return Promise.resolve(found);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = waiters.findIndex(w => w.resolve === resolve);
        if (idx >= 0) waiters.splice(idx, 1);
        reject(new Error('Timed out waiting for stdio JSON-RPC message'));
      }, timeoutMs);
      waiters.push({ predicate, resolve, timer });
    });
  }

  async function stop() {
    rl.close();
    child.stdin.end();
    await new Promise(resolve => {
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

  return { bridgeReady, sendStdio, waitForMessage, stop };
}

test('server.mjs performs end-to-end stdio <-> WebSocket MCP bridging and scoped FS access', async () => {
  const tempWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'omnidesk-mcp-e2e-'));
  await fs.writeFile(path.join(tempWorkspace, 'hello.txt'), 'Hello from OmniDesk workspace!', 'utf8');

  const proc = startServer({
    OMNIDESK_MCP_PORT: '0',
    OMNIDESK_MCP_TOKEN: 'e2e-secret-token',
    OMNIDESK_WORKSPACE_DIR: tempWorkspace,
  });

  try {
    const wsUrl = await proc.bridgeReady;

    proc.sendStdio({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const initRes = await proc.waitForMessage(m => m.id === 1);
    assert.equal(initRes.result.capabilities.tools.listChanged, true);

    proc.sendStdio({ jsonrpc: '2.0', method: 'notifications/initialized' });

    // Before desktop connects, diagnostic & workspace tools should exist
    proc.sendStdio({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'omnidesk_bridge_status', arguments: {} } });
    const statusBefore = await proc.waitForMessage(m => m.id === 2);
    assert.equal(JSON.parse(statusBefore.result.content[0].text).connected, false);

    // Connect simulated OmniDesk WebSocket client with matching token
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    ws.on('message', raw => {
      const req = JSON.parse(raw.toString('utf8'));
      if (req.method === 'tools/list') {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: req.id,
            result: {
              tools: [
                {
                  name: 'clipboard_read',
                  description: 'Read clipboard',
                  inputSchema: { type: 'object', properties: {} },
                },
              ],
            },
          })
        );
      } else if (req.method === 'tools/call' && req.params?.name === 'clipboard_read') {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: req.id,
            result: { content: [{ type: 'text', text: '{"text":"Clipped!"}' }] },
          })
        );
      }
    });

    ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'omnidesk/authenticate', params: { token: 'e2e-secret-token' } }));
    const changedNotice = await proc.waitForMessage(m => m.method === 'notifications/tools/list_changed');
    assert.equal(changedNotice.method, 'notifications/tools/list_changed');

    proc.sendStdio({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
    const listRes = await proc.waitForMessage(m => m.id === 3);
    const toolNames = listRes.result.tools.map(t => t.name);
    assert.ok(toolNames.includes('clipboard_read'));
    assert.ok(toolNames.includes('workspace_list_files'));
    assert.ok(toolNames.includes('omnidesk_bridge_status'));

    proc.sendStdio({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'clipboard_read', arguments: {} } });
    const clipRes = await proc.waitForMessage(m => m.id === 4);
    assert.equal(JSON.parse(clipRes.result.content[0].text).text, 'Clipped!');

    proc.sendStdio({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'workspace_read_text_file', arguments: { relativePath: 'hello.txt' } },
    });
    const fileRes = await proc.waitForMessage(m => m.id === 5);
    assert.equal(fileRes.result.content[0].text, 'Hello from OmniDesk workspace!');

    // Path traversal attempt must fail safely
    proc.sendStdio({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'workspace_read_text_file', arguments: { relativePath: '../outside.txt' } },
    });
    const traversalRes = await proc.waitForMessage(m => m.id === 6);
    assert.equal(traversalRes.result.isError, true);

    ws.close();
  } finally {
    await proc.stop();
    await fs.rm(tempWorkspace, { recursive: true, force: true });
  }
});
